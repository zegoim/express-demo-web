$(function () {
    new Vue({
        el: '#page-wrapper',
        data: {
            userID: Util.getBrow() + '_' + new Date().getTime(),
            roomID: '0001',
            token: "",
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
        },
        methods: {
            async enumDevices() {
                const deviceInfo = await this.zg.enumDevices();
                this.audioDeviceList = deviceInfo &&
                    deviceInfo.microphones.map((item, index) => {
                        if (!item.deviceName) {
                            item.deviceName = 'microphone' + index;
                        }
                        console.log('microphone: ' + item.deviceName);
                        return item;
                    });
                this.audioDeviceList.push({ deviceID: 0, deviceName: '禁止' });
                this.microphoneDevicesVal = this.audioDeviceList[0].deviceID;
                this.videoDeviceList = deviceInfo &&
                    deviceInfo.cameras.map((item, index) => {
                        if (!item.deviceName) {
                            item.deviceName = 'camera' + index;
                        }
                        console.log('camera: ' + item.deviceName);
                        return item;
                    });
                this.videoDeviceList.push({ deviceID: 0, deviceName: '禁止' });
                this.cameraDevicesVal = this.videoDeviceList[0].deviceID;
            },
            initEvent() {
                this.zg.on('roomStateUpdate', (roomId, state) => {
                    if (state === 'CONNECTED') {
                        this.connectStatus = 'CONNECTED';
                    }
                    if (state === 'DISCONNECTED') {
                        this.connectStatus = 'DISCONNECTED';
                    }
                })

                this.zg.on('publisherStateUpdate', (result) => {
                    if (result.state === 'PUBLISHING') {
                        this.publishInfoStreamID = result.streamID;
                    } else if (result.state === 'NO_PUBLISH') {
                        this.publishInfoStreamID = "";
                    }
                });

                this.zg.on('playerStateUpdate', (result) => {
                    if (result.state === 'PLAYING') {
                        this.playInfoStreamID = result.streamID;
                    } else if (result.state === 'NO_PLAY') {
                        this.playInfoStreamID = "";
                    }
                });
            },
            // Step1 Create ZegoExpressEngine
            createZegoExpressEngine() {
                this.zg = new ZegoExpressEngine(appID, server);
                window.zg = this.zg;
            },
            // Step2 Check system requirements
            async checkSystemRequirements() {
                console.log('sdk version is', this.zg.getVersion());
                try {
                    const result = await this.zg.checkSystemRequirements();

                    console.warn('checkSystemRequirements ', result);

                    if (!result.webRTC) {
                        console.error('browser is not support webrtc!!');
                        return false;
                    } else if (!result.videoCodec.H264 && !result.videoCodec.VP8) {
                        console.error('browser is not support H264 and VP8');
                        return false;
                    } else if (!result.camera && !result.microphone) {
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
            },
            // Step3 Login room
            async loginRoom(roomId, userId, userName, token) {
                return await this.zg.loginRoom(roomId, token, {
                    userID: userId,
                    userName
                });
            },
            // Step4 Start Publishing Stream
            async startPublishingStream(streamId, config) {
                try {
                    this.localStream = await this.zg.createStream(config);
                    this.zg.startPublishingStream(streamId, this.localStream, { videoCodec: this.videoCodec });
                    if (this.zg.getVersion() < "2.17.0") {
                        this.$refs['publishVideo'].srcObject = this.localStream;
                    } else {
                        const localView = this.zg.createLocalStreamView(this.localStream)
                        localView.play("localVideo", {
                            mirror: true,
                            objectFit: "cover",
                            enableAutoplayDialog: true,
                        })
                    }
                    return true;
                } catch (err) {
                    console.error('error', err);
                    return false;
                }
            },
            // Step5 Start Play Stream
            async startPlayingStream(streamId, options = {}) {
                try {
                    this.remoteStream = await this.zg.startPlayingStream(streamId, options);
                    if (this.zg.getVersion() < "2.17.0") {
                        this.$refs['playVideo'].srcObject = this.remoteStream;
                    } else {
                        const remoteView = this.zg.createRemoteStreamView(this.remoteStream);
                        remoteView.play("remoteVideo", {
                            objectFit: "cover",
                            enableAutoplayDialog: true,
                        })
                    }
                    return true;
                } catch (err) {
                    return false;
                }
            },
            // Logout room
            logoutRoom(roomId) {
                this.zg.logoutRoom(roomId);
            },
            // Stop Publishing Stream
            async stopPublishingStream(streamId) {
                this.zg.stopPublishingStream(streamId);
            },
            // Stop Play Stream
            async stopPlayingStream(streamId) {
                this.zg.stopPlayingStream(streamId);
            },
            clearStream() {
                this.localStream && this.zg.destroyStream(this.localStream);
                this.localStream = null;
                this.remoteStream && this.zg.destroyStream(this.remoteStream);
                this.remoteStream = null;
                if (zg.getVersion() < "2.17.0") {
                    this.$refs['publishVideo'].srcObject = null;
                    this.$refs['playVideo'].srcObject = null;
                }
            },
            changeAudioDevices() {
                if (!this.zg || !this.localStream) {
                    return
                }
                const isMicrophoneMuted = this.zg.isMicrophoneMuted();
                if (!isNaN(this.microphoneDevicesVal) && !isMicrophoneMuted) {
                    this.zg.muteMicrophone(true);
                } else {
                    this.zg.muteMicrophone(false);
                    this.zg.useAudioDevice(this.localStream, this.microphoneDevicesVal);
                }
            },
            // ==============================================================
            // This part of the code binds the button click event
            // ==============================================================
            createZegoExpressEngineOption() {
                if (!this.createSuccessSvgStatu) {
                    this.createZegoExpressEngine();
                    this.createSuccessSvgStatus = true;
                    this.initEvent();
                }
            },
            async checkSystemRequire() {
                if (!this.zg) return alert('you should create zegoExpressEngine');
                const result = await this.checkSystemRequirements();
                if (result) {
                    this.checkSystemRequireStatus = 'SUCCESS';
                    this.enumDevices();
                } else {
                    this.checkSystemRequireStatus = 'ERROR';
                }
            },
            async loginRoomOption() {
                try {
                    this.isLogin = await this.loginRoom(this.roomID, this.userID, this.userID, this.token);
                } catch (err) {
                    this.isLogin = false;
                    console.log(err);
                }
            },
            async startPublishing() {
                const flag = await this.startPublishingStream(this.streamID, {
                    camera: {
                        audioInput: this.microphoneDevicesVal,
                        videoInput: this.cameraDevicesVal,
                        video: this.cameraCheckStatus,
                        audio: this.microphoneCheckStatus,
                    }
                })
                if (flag) {
                    this.publishStreamStatus = true;
                }
            },
            async startPlaying() {
                const flag = await this.startPlayingStream(this.playStreamID, {
                    video: this.videoCheckStatus,
                    audio: this.audioCheckStatus
                });
                if (flag) {
                    this.playStreamStatus = true;
                }
            },
            async reset() {
                if (!this.zg) {
                    return
                }
                await this.stopPublishingStream(this.streamID);
                await this.stopPlayingStream(this.playStreamID);
                if (this.isLogin) {
                    this.isLogin = false;
                    this.logoutRoom(this.roomID);
                }
                this.clearStream();
                this.zg = null;
                window.zg = null;
                this.playStreamStatus = false;
                this.publishStreamStatus = false;
                this.createSuccessSvgStatus = false;
                this.checkSystemRequireStatus = '';
                this.audioCheckStatus = false;
            }
        },
        computed: {
            version() {
                return this.zg?.getVersion() || 0
            }
        }
    })
})