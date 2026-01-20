// ==============================================================
// This part of the code defines the default values and global values
// ==============================================================

let userID = localStorage.getItem("userID") ? localStorage.getItem("userID") : Util.getBrow() + '_' + new Date().getTime();
let roomID = localStorage.getItem("roomID") ? localStorage.getItem("roomID") : '0001';
let token = localStorage.getItem("token") ? localStorage.getItem("token") : '';
let streamID = 'web_' + new Date().getTime();
let remoteStreamID = null;

let zg = null;
let isChecked = false;
let isLogin = false;
let localStream = null;
let remoteStream = null;
let published = false;
let videoCodec = localStorage.getItem('VideoCodec') === 'H.264' ? 'H264' : 'VP8';

// part end

// ==============================================================
// This part of the code uses the SDK
// ==============================================================

function createZegoExpressEngine() {
    zg = new ZegoExpressEngine(appID, server);
    window.zg = zg;
}


//Check system requirements
async function checkSystemRequirements() {
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
}

function setLogConfig() {
    let config = localStorage.getItem('logConfig');
    const DebugVerbose = localStorage.getItem('DebugVerbose') === 'true' ? true : false;
    if (config) {
        config = JSON.parse(config);
        zg.setLogConfig({
            logLevel: config.logLevel,
            remoteLogLevel: config.remoteLogLevel,
            logURL: ''
        });
    }
    zg.setDebugVerbose(DebugVerbose);
}

function initEvent() {
    zg.on('roomStateUpdate', (roomId, state) => {
        console.warn('roomStateUpdate',roomId,state)
    })

    zg.on('publisherStateUpdate', (result) => {
        console.warn('publisherStateUpdate',result)
    });

    zg.on('playerStateUpdate', (result) => {
        console.warn('playerStateUpdate',result)
    });

    zg.on('roomStreamUpdate', async (roomID, updateType, streamList, extendedData) => {
        console.warn(roomID, updateType, streamList, extendedData)
        // streams added
        if (updateType === 'ADD') {
            const addStream = streamList[streamList.length - 1]
            if (addStream && addStream.streamID) {
                // play the last stream
                if (remoteStreamID) {
                    zg.stopPlayingStream(remoteStreamID)
                }
                remoteStreamID = addStream.streamID
                $('#PlayUserID').text(addStream.user.userID)
                remoteStream = await zg.startPlayingStream(remoteStreamID)

                if (zg.getVersion() < "2.17.0") {
                    $('#playVideo').srcObject = remoteStream;
                    $('#playVideo').show()
                    
                    $('#remoteVideo').hide()
                } else {
                    const remoteView = zg.createRemoteStreamView(remoteStream);
                    remoteView.play("remoteVideo", {
                        objectFit: "cover"        
                    })
                    $('#playVideo').hide()
                    $('#remoteVideo').show()
                }
            }
        } else if (updateType == 'DELETE') {
            //  del stream
            const delStream = streamList[streamList.length - 1]
            if (delStream && delStream.streamID) {
                if (delStream.streamID === remoteStreamID) {
                    zg.stopPlayingStream(remoteStreamID)
                    remoteStreamID = null
                }
            }
        }
    });
}

function setLogConfig() {
    let config = localStorage.getItem('logConfig');
    const DebugVerbose = localStorage.getItem('DebugVerbose') === 'true' ? true : false;
    if (config) {
        config = JSON.parse(config);
        zg.setLogConfig({
            logLevel: config.logLevel,
            remoteLogLevel: config.remoteLogLevel,
            logURL: ''
        });
    }
    zg.setDebugVerbose(DebugVerbose);
}

//  Login room
async function loginRoom(roomId, userId, userName) {


    return new Promise(async (resolve, reject) => {
        // Need to get the token before logging in to the room
        let token = $("#Token").val()
        localStorage.setItem('roomID', roomID);
        localStorage.setItem("userID", userID);
        localStorage.setItem("token", token);
        try {
            await zg.loginRoom(roomId, token, {
                userID: userId,
                userName
            });
            resolve(true);
        } catch (err) {
            reject();
        }
    })
}

// Logout room
function logoutRoom(roomId) {
    localStream && stopPublishingStream($('#PublishID').val());
    zg.logoutRoom(roomId);
}

//  Start Publishing Stream
async function startPublishingStream(streamId, config) {
    try {
        localStream = await zg.createZegoStream(config);
        zg.startPublishingStream(streamId, localStream, { videoCodec });
        localStream.playVideo($('#localVideo')[0], {
            objectFit: "cover"
        })
        
        $('#localVideo').show()

        return true;
    } catch (err) {
        console.error(11,err)
        return false;
    }
}

function stopPublishingStream(streamId) {
    zg.stopPublishingStream(streamId);
    zg.destroyStream(localStream)
    published = false
    localStream = null
}
// uses SDK end


// ==============================================================
// This part of the code binds the button click event
// ==============================================================

$('#LoginRoom').on(
	'click',
	util.throttle(async function () {

		const userID = $('#UserID').val();
		const id = $('#RoomID').val();
		const token = $('#Token').val();

		if (!userID) return alert('userID is Empty');
		if (!id) return alert('RoomID is Empty');
		roomID = id;
		this.classList.add('border-primary');
		if (!isLogin) {
			try {
				isLogin = await loginRoom(id, userID, userID, token);
				updateButton(this, 'Login Room', 'Logout Room');
				$('#UserID')[0].disabled = true;
				$('#RoomID')[0].disabled = true;
			} catch (err) {
				isLogin = false;
				this.classList.remove('border-primary');
				this.classList.add('border-error');
				this.innerText = 'Login Fail Try Again';
				throw err;
			}
		} else {
			if (localStream) {
				$('#PublishID')[0].disabled = false;
				updateButton($('#startPublishing')[0], 'Start Publishing', 'Stop Publishing');
			}
			isLogin = false;
			logoutRoom(id);
			updateButton(this, 'Login Room', 'Logout Room');
			$('#UserID')[0].disabled = false;
			$('#RoomID')[0].disabled = false;
		}
	}, 500)
);

$('#startPublishing').on(
	'click',
	util.throttle(async function () {
		if (!isLogin) return alert('should login room');

		const id = $('#PublishID').val();
		if (!id) return alert('StreamID is Empty');
		this.classList.add('border-primary');
		if (!published) {
			const flag = await startPublishingStream(id);
			if (flag) {
				updateButton(this, 'Start Publishing', 'Stop Publishing');
				published = true;
				$('#PublishID')[0].disabled = true;
				changeVideo();
			} else {
				this.classList.remove('border-primary');
				this.classList.add('border-error');
				this.innerText = 'Publishing Fail Try Again';
				changeVideo(true);
			}
		} else {
			stopPublishingStream($('#PublishID').val());
			updateButton(this, 'Start Publishing', 'Stop Publishing');
			published = false;
			$('#PublishID')[0].disabled = false;
			changeVideo(true);
		}
	}, 500)
);

// bind event end

function updateButton(button, preText, afterText) {
	if (button.classList.contains('playing')) {
		button.classList.remove('paused', 'playing', 'border-error', 'border-primary');
		button.classList.add('paused');
		button.innerText = afterText;
	} else {
		if (button.classList.contains('paused')) {
			button.classList.remove('border-error', 'border-primary');
			button.classList.add('playing');
			button.innerText = preText;
		}
	}
	if (!button.classList.contains('paused')) {
		button.classList.remove('border-error', 'border-primary');
		button.classList.add('paused');
		button.innerText = afterText;
	}
}

// Change video direction
function changeVideo(flag) {
	if (flag) {
		$('#publishVideo').css('transform', 'none');
		$('#playVideo').css('transform', 'none');
		return;
	}
	const value = $('#Mirror').val();
	if (value === 'onlyPreview') {
		$('#publishVideo').css('transform', 'scale(-1, 1)');
	} else if (value === 'onlyPlay') {
		$('#playVideo').css('transform', 'scale(-1, 1)');
	} else if (value === 'both') {
		$('#publishVideo').css('transform', 'scale(-1, 1)');
		$('#playVideo').css('transform', 'scale(-1, 1)');
	}
}

// tool end

// ==============================================================
// This part of the code Initialization web page
// ==============================================================

async function render() {
	$('#RoomID').val(roomID);
	$('#UserID').val(userID);
	$('#Token').val(token);
	$('#PublishID').val(streamID);
	$('#localVideo').hide()
    $('#playVideo').hide()
	createZegoExpressEngine();
	await checkSystemRequirements();
    initEvent();
	setLogConfig();
}

render();

// Initialization end