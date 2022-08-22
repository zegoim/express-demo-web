// require('../../../../jquery')
// let appID;   // from  /src/KeyCenter.js
// let server;  // from  /src/KeyCenter.js
// let tokenUrl;  // from  /src/KeyCenter.js

// ============================================================== 
// This part of the code defines the default values and global values 
// ============================================================== 

let userID = Util.getBrow() + '_' + new Date().getTime();
let roomID = '0014'
let streamID = '0014'

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
  window.zg = zg
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

async function enumDevices() {
  const audioInputList = [],
    videoInputList = [];
  const deviceInfo = await zg.enumDevices();

  deviceInfo &&
    deviceInfo.microphones.map((item, index) => {
      if (!item.deviceName) {
        item.deviceName = 'microphone' + index;
      }
      audioInputList.push(' <option value="' + item.deviceID + '">' + item.deviceName + '</option>');
      console.log('microphone: ' + item.deviceName);
      return item;
    });

  deviceInfo &&
    deviceInfo.cameras.map((item, index) => {
      if (!item.deviceName) {
        item.deviceName = 'camera' + index;
      }
      videoInputList.push(' <option value="' + item.deviceID + '">' + item.deviceName + '</option>');
      console.log('camera: ' + item.deviceName);
      return item;
    });

  audioInputList.push('<option value="0">禁止</option>');
  videoInputList.push('<option value="0">禁止</option>');

  $('#MirrorDevices').html(audioInputList.join(''));
  $('#CameraDevices').html(videoInputList.join(''));
}

function initEvent() {
  zg.on('roomStateUpdate', (roomId, state) => {
    if (state === 'CONNECTED') {
      console.log(111);
      $('#roomStateSuccessSvg').css('display', 'inline-block');
      $('#roomStateErrorSvg').css('display', 'none');
    }

    if (state === 'DISCONNECTED') {
      $('#roomStateSuccessSvg').css('display', 'none');
      $('#roomStateErrorSvg').css('display', 'inline-block');
    }
  })

  zg.on('publisherStateUpdate', result => {
    if (result.state === "PUBLISHING") {
      $('#pushlishInfo-id').text(result.streamID)
    } else if (result.state === "NO_PUBLISH") {
      $('#pushlishInfo-id').text('')
    }
  })

  zg.on('publishQualityUpdate', (streamId, stats) => {
    console.warn('publishQualityUpdate', streamId, stats);
  })
}

function destroyStream(flag) {
  localStream && zg.destroyStream(localStream);
  $('#publishVideo')[0].srcObject = null;
  localStream = null;
  published = false;
  if ($('#PublishID').val() === $('#PlayID').val()) {
    $('#playVideo')[0].srcObject = null;
    remoteStream = null;
    played = false;
  }
}

function setLogConfig() {
  let config = localStorage.getItem('logConfig')
  const DebugVerbose = localStorage.getItem('DebugVerbose') === 'true' ? true : false
  if (config) {
    config = JSON.parse(config)
    zg.setLogConfig({
      logLevel: config.logLevel,
      remoteLogLevel: config.remoteLogLevel,
      logURL: '',
    });
  }
  zg.setDebugVerbose(DebugVerbose);
}

async function loginRoom(roomId, userId, userName, token) {
  return await zg.loginRoom(roomId, token, {
    userID: userId,
    userName
  });
}

async function startPublishingStream(streamId) {
  try {
    const video = $('#customLocalVideo')[0];
    const customSource = $("#GetCanvasMediaStream").prop("checked") ? getStreamThroughCanvas(video) : video
    localStream = await zg.createStream({
      custom: {
        source: customSource
      }
    });
    zg.startPublishingStream(streamId, localStream, { videoCodec });
    if (zg.getVersion() < "2.17.0") {
      $('#publishVideo')[0].srcObject = localStream;
      $('#publishVideo').show()
      $('#localVideo').hide()
    } else {
      const localView = zg.createLocalStreamView(localStream);
      localView.play("localVideo", {
          mirror: false,
          objectFit: "contain"
      })
      $('#publishVideo').hide()
      $('#localVideo').show()
    }
    return true
  } catch (err) {
    console.error(err);
    return false
  }

}

/**
 * Compatible with the problem that the video of customized captured stream is abnormal when chrome 88-92 turns on hardware acceleration
 * @param {*} video 
 * @returns 
 */
function getStreamThroughCanvas(video) {

  let canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const draw = function () {
    if(!canvas) return
    if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
    if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setTimeout(draw, 66);
  };

  draw();

  const media = canvas.captureStream();

  // overwrite stop track function
  const track = media.getVideoTracks()[0];
  const q = track.stop;
  track.stop = () => {
    q.call(track);
    draw();
    canvas.width = 0;
    canvas.remove();
    canvas = null
  };

  // get audio track
  const stream = video.captureStream && video.captureStream()
  if (stream instanceof MediaStream && stream.getAudioTracks().length) {
    const micro = stream.getAudioTracks()[0];
    media.addTrack(micro);
  }
  return media;
}

async function stopPublishingStream(streamId) {
  zg.stopPublishingStream(streamId)
  if (remoteStream && $('#PublishID').val() === $('#PlayID').val()) {
    stopPlayingStream(streamId)
  }
  destroyStream()
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
    $("#roomInfo-id").text(id)

    if (!userID) return alert('userID is Empty');
    if (!id) return alert('RoomID is Empty');
    this.classList.add('border-primary');
    if (!isLogin) {
      try {
        isLogin = true;
        await loginRoom(id, userID, userID, token);
        updateButton(this, 'Login Room', 'Logout Room');
        $('#UserID')[0].disabled = true;
        $('#RoomID')[0].disabled = true;
        $('#LoginRoom').hide()
      } catch (err) {
        isLogin = false;
        this.classList.remove('border-primary');
        this.classList.add('border-error');
        this.innerText = 'Login Fail Try Again';
        throw err;
      }
    } else {
      if (localStream) {
        updateButton($('#startPublishing')[0], 'Start Publishing', 'Stop Publishing');
      }
      isLogin = false;
      updateButton(this, 'Login Room', 'Logout Room');
      $('#UserID')[0].disabled = false;
      $('#RoomID')[0].disabled = false;
    }
  }, 500)
);
$('#startPublishing').on('click', util.throttle(async function () {
  const id = $('#PublishID').val();
  if (!id) return alert('PublishID is empty')
  this.classList.add('border-primary')
  if (!published) {
    const flag = await startPublishingStream(id);
    if (flag) {
      updateButton(this, 'Start Publishing', 'Stop Publishing');
      published = true
    } else {
      this.classList.remove('border-primary');
      this.classList.add('border-error')
      this.innerText = 'Publishing Fail'
    }

  } else {
    if (remoteStream && id === $('#PlayID').val()) {
      $('#PlayID')[0].disabled = false
      updateButton($('#startPlaying')[0], 'Start Playing', 'Stop Playing')
    }
    stopPublishingStream(id);
    updateButton(this, 'Start Publishing', 'Stop Publishing')
    published = false
    $('#PublishID')[0].disabled = false
  }
}, 500))

// bind event end


// ============================================================== 
// This part of the code bias tool
// ============================================================== 

function updateButton(button, preText, afterText) {
  if (button.classList.contains('playing')) {
    button.classList.remove('paused', 'playing', 'border-error', 'border-primary');
    button.classList.add('paused');
    button.innerText = afterText
  } else {
    if (button.classList.contains('paused')) {
      button.classList.remove('border-error', 'border-primary');
      button.classList.add('playing');
      button.innerText = preText
    }
  }
  if (!button.classList.contains('paused')) {
    button.classList.remove('border-error', 'border-primary');
    button.classList.add('paused');
    button.innerText = afterText
  }
}

function checkVideo() {
  const timer = setTimeout(() => {
    resolve(false)
  }, 3000)
  return new Promise((resolve) => {
    $('#customLocalVideo').on('error', function () {
      resolve(false)
      clearTimeout(timer)
    })
    $('#customLocalVideo').on('loadeddata', function () {
      resolve(true)
      clearTimeout(timer)
    })
  })
}
// tool end

// ============================================================== 
// This part of the code Initialization web page
// ============================================================== 
async function render() {
  $('#roomInfo-id').text(roomID)
  $('#RoomID').val(roomID)
  $('#UserName').val(userID)
  $('#UserID').val(userID)
  $('#PublishID').val(streamID)
  createZegoExpressEngine()
  await checkSystemRequirements()
  enumDevices()
  initEvent()
  setLogConfig()
}

render()
// Initialization end