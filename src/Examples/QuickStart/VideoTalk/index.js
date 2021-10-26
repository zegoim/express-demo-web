// require('../../../../jquery')
// let appID;   // from  /src/KeyCenter.js
// let server;  // from  /src/KeyCenter.js
// let tokenUrl;  // from  /src/KeyCenter.js

// ==============================================================
// This part of the code defines the default values and global values
// ==============================================================

let userID = Util.getBrow() + '_' + new Date().getTime();
let roomID = '0001';
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

// Step1 Check system requirements
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


function initEvent() {
    zg.on('roomStateUpdate', (roomId, state) => {
        if (state === 'CONNECTED' && isLogin) {
            $('#roomStateSuccessSvg').css('display', 'inline-block');
            $('#roomStateErrorSvg').css('display', 'none');
        }

        if (state === 'DISCONNECTED' && !isLogin) {
            $('#roomStateSuccessSvg').css('display', 'none');
            $('#roomStateErrorSvg').css('display', 'inline-block');
        }

        if (state === 'DISCONNECTED' && isLogin) {
            location.reload()
        }
    })

    zg.on('publisherStateUpdate', (result) => {
        if (result.state === 'PUBLISHING') {
            $('#pushlishInfo-id').text(result.streamID);
        } else if (result.state === 'NO_PUBLISH') {
            $('#pushlishInfo-id').text('');
        }
    });

    zg.on('playerStateUpdate', (result) => {
        if (result.state === 'PLAYING') {
            $('#playInfo-id').text(result.streamID);
        } else if (result.state === 'NO_PLAY') {
            $('#playInfo-id').text('');
        }
    });

    const playVideoEl = $('.preview-playInfo')
    playVideoEl.hide();
    zg.on('roomStreamUpdate', async (roomID, updateType, streamList, extendedData) => {

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
                $('#playVideo')[0].srcObject = remoteStream;
                playVideoEl.show();
            }
        } else if (updateType == 'DELETE') {
            //  del stream
            const delStream = streamList[streamList.length - 1]
            if (delStream && delStream.streamID) {
                if (delStream.streamID === remoteStreamID) {
                    zg.stopPlayingStream(remoteStreamID)
                    remoteStreamID = null
                    playVideoEl.hide();
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
function loginRoom(roomId, userId, userName) {
    return new Promise(async (resolve, reject) => {
        // Need to get the token before logging in to the room
        let token = $("#Token").val()
        try {
            await zg.loginRoom(roomId, token, {
                userID: userId,
                userName
            });
            resolve();
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
        localStream = await zg.createStream(config);
        zg.startPublishingStream(streamId, localStream, { videoCodec });
        $('#publishVideo')[0].srcObject = localStream;
        return true;
    } catch (err) {
        return false;
    }
}

function stopPublishingStream(streamId) {
    zg.stopPublishingStream(streamId);
    zg.destroyStream(localStream)
    localStream = null
}



// uses SDK end

// ==============================================================
// This part of the code binds the button click event
// ==============================================================

$('#LoginRoom').on(
    'click',
    util.throttle(async function () {

        userID = $('#UserID').val();
        const id = $('#RoomID').val();
        const streamID = $('#PublishID').val()
        if (!userID) return alert('userID is Empty');
        if (!id) return alert('RoomID is Empty');
        if (!streamID) return alert('StreamID is Empty');

        this.classList.add('border-primary');
        if (!isLogin) {
            try {
                isLogin = true;
                await loginRoom(id, userID, userID);
                updateButton(this, 'Login Room', 'Logout Room');
                $('#UserID')[0].disabled = true;
                $('#RoomID')[0].disabled = true;
                const flag = await startPublishingStream(streamID, { camera: {} });
                published = true;
                $('#PublishID')[0].disabled = true;
            } catch (err) {
                isLogin = false;
                this.classList.remove('border-primary');
                this.classList.add('border-error');
                this.innerText = 'Login Fail Try Again';
                throw err
            }
        } else {
            if (localStream) {
                $('#PublishID')[0].disabled = false;
            }
            isLogin = false;
            logoutRoom(id);
            updateButton(this, 'Login Room', 'Logout Room');
            $('#UserID')[0].disabled = false;
            $('#RoomID')[0].disabled = false;
            $('#PublishID')[0].disabled = false;
            $('.preview-playInfo').hide();
            published = false;
        }
    }, 500)
);


// bind event end

// ==============================================================
// This part of the code bias tool
// ==============================================================


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



// tool end

// ==============================================================
// This part of the code Initialization web page
// ==============================================================

async function render() {
    $('#RoomID').val(roomID);
    $('#UserID').val(userID);
    $('#UserID').val(userID);
    $('#PublishID').val(streamID);
    createZegoExpressEngine();
    await checkSystemRequirements();
    initEvent();
    setLogConfig();
}

render();

// Initialization end
