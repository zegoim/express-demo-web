class CommonUsageReact extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            userID: Util.getBrow() + '_' + new Date().getTime(),
            roomID: '0001',
            token: '',
            streamID: '0001',
            playStreamID: '0001',
            zg: null,
            localStream: null,
            remoteStream: null,
            isLogin: false,
            videoCodec: localStorage.getItem('VideoCodec') === 'H.264' ? 'H264' : 'VP8',

            audioDeviceList: [],
            videoDeviceList: [],
            createSuccessSvgStatus: false,
            checkSystemRequireStatus: '',
            connectStatus: 'DISCONNECTED',
            microphoneDevicesVal: null,
            cameraDevicesVal: '',
            cameraCheckStatus: true,
            microphoneCheckStatus: true,
            publishStreamStatus: false,
            videoCheckStatus: true,
            audioCheckStatus: false,
            playStreamStatus: false,
            mirrorVal: 'none',
            publishInfoStreamID: '',
            playInfoStreamID: ''
        };
        this.createZegoExpressEngineOption = this.createZegoExpressEngineOption.bind(this)
        this.CheckSystemRequire = this.CheckSystemRequire.bind(this)
        this.loginRoomOption = this.loginRoomOption.bind(this)
        this.startPublishing = this.startPublishing.bind(this)
        this.startPlaying = this.startPlaying.bind(this)
        this.reset = this.reset.bind(this)
    }
    async enumDevices() {
        const deviceInfo = await zg.enumDevices();
        const audioDeviceList = deviceInfo &&
            deviceInfo.microphones.map((item, index) => {
                if (!item.deviceName) {
                    item.deviceName = 'microphone' + index;
                }
                console.log('microphone: ' + item.deviceName);
                return item;
            });
        audioDeviceList.push({ deviceID: 0, deviceName: '禁止' });
        const videoDeviceList = deviceInfo &&
            deviceInfo.cameras.map((item, index) => {
                if (!item.deviceName) {
                    item.deviceName = 'camera' + index;
                }
                console.log('camera: ' + item.deviceName);
                return item;
            });
        videoDeviceList.push({ deviceID: 0, deviceName: '禁止' });
        this.setState({
            videoDeviceList,
            audioDeviceList,
            microphoneDevicesVal: audioDeviceList[0].deviceID,
            cameraDevicesVal: videoDeviceList[0].deviceID
        })
    }
    initEvent() {
        this.state.zg.on('roomStateUpdate', (roomId, state) => {
            if (state === 'CONNECTED' && this.state.isLogin) {
                this.setState({
                    connectStatus: 'CONNECTED'
                })
            }
            if (state === 'DISCONNECTED' && !this.state.isLogin) {
                this.setState({
                    connectStatus: 'DISCONNECTED'
                })
            }
            if (state === 'DISCONNECTED' && this.state.isLogin) {
                location.reload()
            }
        })

        this.state.zg.on('publisherStateUpdate', (result) => {
            if (result.state === 'PUBLISHING') {
                this.setState({
                    publishInfoStreamID: result.streamID
                })
            } else if (result.state === 'NO_PUBLISH') {
                this.setState({
                    publishInfoStreamID: ""
                })
            }
        });

        this.state.zg.on('playerStateUpdate', (result) => {
            if (result.state === 'PLAYING') {
                $('#playInfo-id').text(result.streamID);
                this.setState({
                    playInfoStreamID: result.streamID
                })
            } else if (result.state === 'NO_PLAY') {
                this.setState({
                    playInfoStreamID: ""
                })
            }
        });
    }
    // Step2 Check system requirements
    async checkSystemRequirements() {
        console.log('sdk version is', zg.getVersion());
        try {
            const result = await zg.checkSystemRequirements();

            console.warn('checkSystemRequirements ', result);

            if (!result.webRTC) {
                console.error('browser is not support webrtc!!');
                return false;
            } else if (!result.videoCodec.H264 && !result.videoCodec.VP8) {
                console.error('browser is not support H264 and VP8');
                return false;
            } else if (!result.camera && !result.microphones) {
                console.error('camera and microphones not allowed to use');
                return false;
            } else if (result.videoCodec.VP8) {
                if (!result.screenSharing) console.warn('browser is not support screenSharing');
            } else {
                console.log('不支持VP8，请前往混流转码测试');
            }
            return true;
        } catch (err) {
            console.error('checkSystemRequirements', err);
            return false;
        }
    }
    // Step3 Login room
    loginRoom(roomId, userId, userName, token) {
        return zg.loginRoom(roomId, token, {
            userID: userId,
            userName
        });
    }
    // Step4 Start Publishing Stream
    async startPublishingStream(streamId, config) {
        try {
            this.state.localStream = await zg.createStream(config);
            zg.startPublishingStream(streamId, this.state.localStream, { videoCodec: this.state.videoCodec });
            this.refs.publishVideo.srcObject = this.state.localStream;
            return true;
        } catch (err) {
            return false;
        }
    }
    // Step5 Start Play Stream
    async startPlayingStream(streamId, options = {}) {
        try {
            this.state.remoteStream = await zg.startPlayingStream(streamId, options);
            this.refs.playVideo.srcObject = this.state.remoteStream;
            return true;
        } catch (err) {
            return false;
        }
    }
    // Logout room
    logoutRoom(roomId) {
        zg.logoutRoom(roomId);
    }
    // Stop Publishing Stream
    async stopPublishingStream(streamId) {
        zg.stopPublishingStream(streamId);
    }
    // Stop Play Stream
    async stopPlayingStream(streamId) {
        zg.stopPlayingStream(streamId);
    }
    clearStream() {
        this.state.localStream && zg.destroyStream(this.state.localStream);
        this.refs.publishVideo.srcObject = null;
        this.state.remoteStream && zg.destroyStream(this.state.remoteStream);
        this.refs.playVideo.srcObject = null;
        this.setState({
            localStream: null,
            remoteStream: null
        })
    }
    // Switch microphone device
    changeAudioDevices() {
        if (!zg || !this.state.localStream) {
            return
        }
        const isMicrophoneMuted = zg.isMicrophoneMuted();
        if (this.state.microphoneDevicesVal == '0' && !isMicrophoneMuted) {
            zg.muteMicrophone(true); //Turn off the microphone
            console.log('关闭')
        } else {
            zg.muteMicrophone(false);
            zg.useAudioDevice(this.state.localStream, this.state.microphoneDevicesVal);
        }
    }
    // ==============================================================
    // This part of the code binds the button click event
    // ==============================================================
    // Step1 Create ZegoExpressEngine
    createZegoExpressEngineOption() {
        const zg = new ZegoExpressEngine(appID, server)
        window.zg = zg;
        this.setState({
            zg: zg,
            createSuccessSvgStatus: true
        }, () => {
            this.initEvent();
        })
    }
    async CheckSystemRequire() {
        if (!this.state.zg) return alert('you should create zegoExpressEngine');
        const result = await this.checkSystemRequirements();
        if (result) {
            this.setState({
                checkSystemRequireStatus: 'SUCCESS'
            })
            this.enumDevices();
        } else {
            this.setState({
                checkSystemRequireStatus: 'ERROR'
            })
        }
    }
    async loginRoomOption() {
        try {
            await this.setState({
                isLogin: true
            })
            await this.loginRoom(this.state.roomID, this.state.userID, this.state.userID, this.state.token);
        } catch (err) {
            this.setState({
                isLogin: false
            })
            console.log(err);
        }
    }
    async startPublishing() {
        const flag = await this.startPublishingStream(this.state.streamID, {
            camera: {
                audioInput: this.state.microphoneDevicesVal,
                videoInput: this.state.cameraDevicesVal,
                video: this.state.cameraCheckStatus,
                audio: this.state.microphoneCheckStatus,
            }
        })
        if (flag) {
            this.setState({
                publishStreamStatus: true
            })
        }
    }
    async startPlaying() {
        const flag = await this.startPlayingStream(this.state.playStreamID, {
            video: this.state.videoCheckStatus,
            audio: this.state.audioCheckStatus
        });
        if (flag) {
            this.setState({
                playStreamStatus: true
            })
        }
    }
    async reset() {
        if (!this.state.zg) {
            return
        }
        await this.stopPublishingStream(this.state.streamID);
        await this.stopPlayingStream(this.state.playStreamID);
        if (this.state.isLogin) {
            await this.setState({
                isLogin: false
            })
            this.logoutRoom(this.state.roomID);
        }
        this.clearStream();
        this.zg = null;
        this.setState({
            playStreamStatus: false,
            publishStreamStatus: false,
            createSuccessSvgStatus: false,
            checkSystemRequireStatus: '',
            audioCheckStatus: false
        })
    }
    changeValue(e) {
        let value = e.target.value;
        let name = e.target.name;
        if (e.target.type == 'checkbox') {
            value = e.target.checked;
        }
        this.setState({
            [e.target.name]: value
        }, () => {
            if (name === 'microphoneDevicesVal') {
                this.changeAudioDevices()
            }
        })
    }
    render() {
        return <div className="row">
            <div className="col-12 col-lg-6 preview-wrapper">
                <div className="preview-roomInfo">
                    RoomID:&nbsp;<div id="roomInfo-id" className="m-r-10">{this.state.roomID}</div>
                    RoomState:&nbsp;<div id="roomInfo-state">
                        <div className="success-svg" id="roomStateSuccessSvg" style={{ display: this.state.connectStatus == 'CONNECTED' ? 'inline-block' : 'none' }}>
                            <svg className="ft-green-tick" xmlns="http://www.w3.org/2000/svg" height="10" width="10"
                                viewBox="0 0 48 48" aria-hidden="true">
                                <circle className="circle" fill="#5bb543" cx="24" cy="24" r="22" />
                            </svg>
                        </div>
                        <div className="error-svg" id="roomStateErrorSvg" style={{ display: this.state.connectStatus == 'DISCONNECTED' ? 'inline-block' : 'none' }}>
                            <svg className="ft-green-tick" xmlns="http://www.w3.org/2000/svg" height="10" width="10"
                                viewBox="0 0 48 48" aria-hidden="true">
                                <circle className="circle" fill="#5bb543" cx="24" cy="24" r="22" />
                            </svg>
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="preview-pushlishInfo col-lg-12 col-6">
                        <div className="pushlishInfo-title">
                            <span data-lang="Preview">Preview</span>&emsp;Publish StreamID: <span id="pushlishInfo-id">{this.state.publishInfoStreamID}</span>
                        </div>
                        <div className="preview-content">
                            <video controls ref="publishVideo" autoPlay playsInline muted
                                className={ `${(this.state.mirrorVal=='onlyPreview' || this.state.mirrorVal=='both') ?'mirror':''}`}></video>
                        </div>
                    </div>
                    <div className="preview-playInfo m-t-10 col-lg-12 col-6">
                        <div className="pushlishInfo-title">
                            <span data-lang="PlayStream">Play Stream</span>&emsp;StreamID: <span id="playInfo-id">{this.state.playInfoStreamID}</span>
                        </div>
                        <div className="preview-content">
                            <video controls ref="playVideo" autoPlay playsInline 
                                className={ `${(this.state.mirrorVal=='onlyPlay' || this.state.mirrorVal=='both') ?'mirror':''}`}></video>
                        </div>
                    </div>
                </div>
            </div>
            <div className="col-12 col-lg-6 action-wrapper">
                <div className="action-step">
                    <div className="action-title">
                        Step1&emsp;<span className="action-info">Create ZegoExpressEngine</span>
                    </div>
                    <div className="btn-wrapper">
                        <button id="CreateZegoExpressEngine" type="button" className="btn-outline-info btn cuBtn" title="new ZegoExpressEngine()"
                            onClick={this.createZegoExpressEngineOption}>
                            <div className="success-svg" id="createSuccessSvg" style={{ display: this.state.createSuccessSvgStatus ? 'inline-block' : 'none' }}>
                                <svg className="ft-green-tick" xmlns="http://www.w3.org/2000/svg" height="15" width="15"
                                    viewBox="0 0 48 48" aria-hidden="true">
                                    <circle className="circle" fill="#5bb543" cx="24" cy="24" r="22" />
                                    <path className="tick" fill="none" stroke="#FFF" strokeWidth="6" strokeLinecap="round"
                                        strokeLinejoin="round" strokeMiterlimit="10" d="M14 27l5.917 4.917L34 17" />
                                </svg>
                            </div>
                            Create Engine
                        </button>
                    </div>
                </div>
                <div className="action-step">
                    <div className="action-title">
                        Step2&emsp;<span className="action-info">Test Compatiblity</span>
                    </div>
                    <div className="btn-wrapper">
                        <button onClick={this.CheckSystemRequire} type="button"
                            className={`${this.state.checkSystemRequireStatus == 'ERROR' ? 'btn-outline-danger' : 'btn-outline-info'} btn cuBtn`} title="checkSystemRequirements()">
                            <div className="success-svg" id="checkSuccessSvg" style={{ display: this.state.checkSystemRequireStatus == 'SUCCESS' ? 'inline-block' : 'none' }}>
                                <svg className="ft-green-tick" xmlns="http://www.w3.org/2000/svg" height="15" width="15"
                                    viewBox="0 0 48 48" aria-hidden="true">
                                    <circle className="circle" fill="#5bb543" cx="24" cy="24" r="22" />
                                    <path className="tick" fill="none" stroke="#FFF" strokeWidth="6" strokeLinecap="round"
                                        strokeLinejoin="round" strokeMiterlimit="10" d="M14 27l5.917 4.917L34 17" />
                                </svg>
                            </div>
                            <div className="error-svg" id="checkErrorSvg" style={{ display: this.state.checkSystemRequireStatus == 'ERROR' ? 'inline-block' : 'none' }}>
                                <svg className="ft-green-tick" xmlns="http://www.w3.org/2000/svg" height="15" width="15"
                                    viewBox="0 0 48 48" aria-hidden="true">
                                    <circle className="circle" fill="#5bb543" cx="24" cy="24" r="22" />
                                    <path className="tick" fill="none" stroke="#FFF" strokeWidth="6" strokeLinecap="round"
                                        strokeLinejoin="round" strokeMiterlimit="10" d="M14 14 34 34 M34 14 14 34" />
                                </svg>
                            </div>
                            <div className="warn-svg" id="checkWarnSvg" style={{ display: 'none' }}>
                                <svg t="1617876217862" className="icon" viewBox="0 0 1024 1024" version="1.1"
                                    xmlns="http://www.w3.org/2000/svg" p-id="8340" width="15" height="15">
                                    <circle className="circle" fill="#5bb543" cx="512" cy="512" r="510" />
                                    <path className="tick" fill="none" stroke="#FFF" strokeWidth="6" strokeLinecap="round"
                                        d="M512 736.1m-63 0a63 63 0 1 0 126 0 63 63 0 1 0-126 0Z" fill="#FFFFFF" p-id="8344"></path>
                                    <path className="tick" fill="none" stroke="#FFF" strokeWidth="6" strokeLinecap="round"
                                        strokeMiterlimit="10"
                                        d="M512 611.8s63-220.5 63-306.3S549.5 204 512 204s-63 15.8-63 101.5 63 306.3 63 306.3z"></path>
                                </svg>
                            </div>
                            Test Compatiblity
                        </button>
                    </div>
                </div>
                <div className="action-step">
                    <div className="action-title">
                        Step3&emsp;<span className="action-info">Login Room</span>
                    </div>
                    <div className="action-content">
                        <div className="action-room font-14">
                            <div class="action-roomId ">
                                RoomID
                                <div class="icon-question">?
                                    <div class="pop-box" data-lang="RoomIDDesc">Tooltip text</div>
                                </div>
                                <input type="text" id="RoomID" name="roomID" value={this.state.roomID} onChange={this.changeValue.bind(this)} disabled={this.state.isLogin} />
                            </div>
                            <div class="action-userName">
                                UserID
                                <div class="icon-question">?
                                    <div class="pop-box">
                                        <span data-lang="UserIDDesc"></span>
                                    </div>
                                </div>
                                <input type="text" className="w-70" id="userID" name="userID" value={this.state.userID} onChange={this.changeValue.bind(this)} disabled={this.state.isLogin} />
                            </div>
                            <div class="action-token">
                                Token
                                <div class="icon-question">?
                                    <div class="pop-box">
                                        <span data-lang="TokenDesc"></span>
                                        <a href="https://console.zego.im" data-lang="ApplyToken" target="_blank"></a>
                                    </div>
                                </div>
                                <input type="text" className="w-70" id="Token" name="token" value={this.state.token} onChange={this.changeValue.bind(this)} disabled={this.state.isLogin} />
                            </div>
                        </div>
                        <button onClick={this.loginRoomOption} className="play-pause-button" title="loginRoom()">
                            <div className="success-svg m-r-5" id="loginSuccessSvg" style={{ display: this.state.isLogin ? 'inline-block' : 'none' }}>
                                <svg className="ft-green-tick" xmlns="http://www.w3.org/2000/svg" height="15" width="15"
                                    viewBox="0 0 48 48" aria-hidden="true">
                                    <circle className="circle" fill="#5bb543" cx="24" cy="24" r="22" />
                                    <path className="tick" fill="none" stroke="#FFF" strokeWidth="6" strokeLinecap="round"
                                        strokeLinejoin="round" strokeMiterlimit="10" d="M14 27l5.917 4.917L34 17" />
                                </svg>
                            </div>
                            Login Room
                        </button>
                    </div>
                </div>
                <div className="action-step">
                    <div className="action-title">
                        Step4&emsp;<span className="action-info">Start Publishing Stream</span>
                        <div className="action-content">
                            <div className="publish-setting m-t-10">
                                <div className="action-input font-14 m-b-15">
                                    Publish StreamID <input type="text" id="PublishID" name="streamID" value={this.state.streamID} onChange={this.changeValue.bind(this)} disabled={this.state.publishStreamStatus} />
                                </div>
                                <div className="font-12 publish-check m-b-15">
                                    <div className="check-wrappre m-r-5">
                                        <label className="form-check-label m-r-5" htmlFor="Camera" data-lang="Camera">Camera</label>
                                        <input className="check-input" type="checkbox" name="cameraCheckStatus" checked={this.state.cameraCheckStatus} onChange={this.changeValue.bind(this)} disabled={this.state.publishStreamStatus} />
                                    </div>
                                    <div className="check-wrappre">
                                        <label className="form-check-label m-r-5" htmlFor="Microphone" data-lang="Microphone">Microphone</label>
                                        <input className="check-input" type="checkbox" name="microphoneCheckStatus" checked={this.state.microphoneCheckStatus} onChange={this.changeValue.bind(this)} disabled={this.state.publishStreamStatus} />
                                    </div>
                                </div>
                            </div>
                            <button onClick={this.startPublishing} className="play-pause-button" title="createStream() / startPublishingStream()">
                                <div className="success-svg m-r-5" id="publishSuccessSvg" style={{ display: this.state.publishStreamStatus ? 'inline-block' : 'none' }}>
                                    <svg className="ft-green-tick" xmlns="http://www.w3.org/2000/svg" height="15" width="15"
                                        viewBox="0 0 48 48" aria-hidden="true">
                                        <circle className="circle" fill="#5bb543" cx="24" cy="24" r="22" />
                                        <path className="tick" fill="none" stroke="#FFF" strokeWidth="6" strokeLinecap="round"
                                            strokeLinejoin="round" strokeMiterlimit="10" d="M14 27l5.917 4.917L34 17" />
                                    </svg>
                                </div>Start Publishing</button>
                            <div className="publish-setting m-t-10 m-b-10">
                                <div className="font-12 select-wrapper">
                                    <span data-lang="Mirror">Mirror</span>
                                    <select className="form-control form-control-sm m-l-5" name="mirrorVal" value={this.state.mirrorVal} onChange={this.changeValue.bind(this)} disabled={this.state.publishStreamStatus}>
                                        <option value="none">none</option>
                                        <option value="onlyPreview">onlyPreview</option>
                                        <option value="onlyPlay">onlyPlay</option>
                                        <option value="both">both</option>
                                    </select>
                                </div>
                                <div className="font-12 select-wrapper f-b-7">
                                    <span data-lang="CameraSwitch">Camera Switch</span>
                                    <select className="form-control form-control-sm m-l-5" name="cameraDevicesVal" value={this.state.cameraDevicesVal || ''} onChange={this.changeValue.bind(this)} disabled={this.state.publishStreamStatus}>
                                        {
                                            this.state.videoDeviceList.map(item => {
                                                return (<option key={item.deviceID} value={item.deviceID}>{item.deviceName}</option>)
                                            })
                                        }
                                    </select>
                                </div>
                            </div>
                            <div className="font-12 select-wrapper">
                                <span data-lang="MicrophoneSwitch">Microphone Switch</span>
                                <select className="form-control form-control-sm m-l-5" name="microphoneDevicesVal" value={this.state.microphoneDevicesVal || ''} onChange={this.changeValue.bind(this)} disabled={!this.state.microphoneCheckStatus}>
                                    {
                                        this.state.audioDeviceList.map(item => {
                                            return (<option key={item.deviceID} value={item.deviceID}>{item.deviceName}</option>)
                                        })
                                    }
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="action-step">
                    <div className="action-title">
                        Step5&emsp;<span className="action-info">Start Play Stream</span>
                        <div className="action-content">
                            <div className="publish-setting m-t-5">
                                <div className="action-input font-14 m-b-15">
                                    Play StreamID <input type="text" id="PlayID" name="playStreamID" value={this.state.playStreamID} onChange={this.changeValue.bind(this)} disabled={this.state.playStreamStatus} />
                                </div>
                                <div className="font-12 publish-check m-b-15">
                                    <div className="check-wrappre m-r-5">
                                        <label className="form-check-label m-r-5" htmlFor="Video" data-lang="Video">Video</label>
                                        <input className="check-input" type="checkbox" id="Video" name="videoCheckStatus" checked={this.state.videoCheckStatus} onChange={this.changeValue.bind(this)} disabled={this.state.playStreamStatus} />
                                    </div>
                                    <div className="check-wrappre">
                                        <label className="form-check-label m-r-5" htmlFor="Audio" data-lang="Audio">Audio</label>
                                        <input className="check-input" type="checkbox" id="Audio" name="audioCheckStatus" checked={this.state.audioCheckStatus} onChange={this.changeValue.bind(this)} disabled={this.state.playStreamStatus} />
                                    </div>
                                </div>
                            </div>
                            <button onClick={this.startPlaying} className="play-pause-button" title="startPlayingStream()">
                                <div className="success-svg m-r-5" id="playSuccessSvg" style={{ display: this.state.playStreamStatus ? 'inline-block' : 'none' }}>
                                    <svg className="ft-green-tick" xmlns="http://www.w3.org/2000/svg" height="15" width="15"
                                        viewBox="0 0 48 48" aria-hidden="true">
                                        <circle className="circle" fill="#5bb543" cx="24" cy="24" r="22" />
                                        <path className="tick" fill="none" stroke="#FFF" strokeWidth="6" strokeLinecap="round"
                                            strokeLinejoin="round" strokeMiterlimit="10" d="M14 27l5.917 4.917L34 17" />
                                    </svg>
                                </div>Start Playing</button>
                        </div>
                    </div>
                </div>
                <div className="action-step">
                    <div className="action-content">
                        <button id="reset" onClick={this.reset} type="button" className="btn-danger btn cuBtn">Reset</button>
                    </div>
                    <div id="like_button_container"></div>
                </div>
            </div>
        </div>
    }
}

const domContainer = document.querySelector('#container-fluid');
ReactDOM.render(<CommonUsageReact></CommonUsageReact>, domContainer);