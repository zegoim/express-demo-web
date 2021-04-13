// require('../../../../jquery')
// let appID;   // from  /src/KeyCenter.js
// let server;  // from  /src/KeyCenter.js
// let tokenUrl;  // from  /src/KeyCenter.js

// ============================================================== 
// This part of the code defines the default values and global values 
// ============================================================== 

let userID = Util.getBrow() + '_' + new Date().getTime();
let roomID = '0017'
let streamID = '0017'

let zg = null;
let isChecked = false;
let isLoginRoom = false;
let localStream = null;
let remoteStream = null;
let published = false;
let played = false;

// part end

// ============================================================== 
// This part of the code uses the SDK
// ==============================================================  

function createZegoExpressEngine() {
  zg = new ZegoExpressEngine(appID, server);
  window.zg = zg
}

async function checkSystemRequirements() {
  console.log('sdk version is', zg.getVersion());
  try {
      const result = await zg.checkSystemRequirements();

      console.warn('checkSystemRequirements ', result);
      !result.videoCodec.H264 && $('#videoCodeType option:eq(1)').attr('disabled', 'disabled');
      !result.videoCodec.VP8 && $('#videoCodeType option:eq(2)').attr('disabled', 'disabled');

      if (!result.webRTC) {
          console.log('browser is not support webrtc!!');
          return false;
      } else if (!result.videoCodec.H264 && !result.videoCodec.VP8) {
        console.log('browser is not support H264 and VP8');
          return false;
      } else if (result.videoCodec.H264) {
          supportScreenSharing = result.screenSharing;
          if (!supportScreenSharing) console.log('browser is not support screenSharing');
          previewVideo = $('#previewVideo')[0];
          // start();
      } else {
        console.log('不支持H264，请前往混流转码测试');
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

function loginRoom(roomId, userId, userName) {
  return new Promise((resolve, reject) => {
    $.get(
      tokenUrl,
      {
        app_id: appID,
        id_name: userID
      },
      async (token) => {
        try {
          await zg.loginRoom(roomId, token, {
            userID: userId,
            userName
          });
          resolve()
        } catch (err) {
          reject()
        }
      }
    );
  })
}

async function startPublishingStream (streamId, config) {
  try {
    localStream = await zg.createStream(config);
    zg.startPublishingStream(streamId, localStream);
    $('#pubshlishVideo')[0].srcObject = localStream;
    return true
  } catch(err) {
    return false
  }
  
}

async function stopPublishingStream(streamId) {
  zg.stopPublishingStream(streamId)
  if(remoteStream && $('#PublishID').val() === $('#PlayID').val()) {
    stopPlayingStream(streamId)
  }
  clearStream('publish')
}

async function startPlayingStream(streamId, options = {}) {
  try {
    remoteStream = await zg.startPlayingStream(streamId, options)
    $('#playVideo')[0].srcObject = remoteStream;
    return true
  } catch (err) {
    return false
  }
}

async function stopPlayingStream(streamId) {
  zg.stopPlayingStream(streamId)
  clearStream('play')
}

// uses SDK end


// ============================================================== 
// This part of the code binds the button click event and onchange event
// ==============================================================  

$('#startPublishing').on('click', util.throttle( async function () {
  const id = $('#PublishID').val();
  if(!id) return alert('PublishID is empty')
  this.classList.add('border-primary')
  if(!published) {
      const flag =  await startPublishingStream(id, getCreateStreamConfig());
      if(flag) {
        updateButton(this, 'Start Publishing', 'Stop Publishing');
        published = true
        $('#PublishID')[0].disabled = true
        setHeadphoneMonitor($('#HeadphoneMonitor')[0].checked)
      } else {
        this.classList.remove('border-primary');
        this.classList.add('border-error')
        this.innerText = 'Publishing Fail'
      }

  } else {
      if(remoteStream && id === $('#PlayID').val()) {
      $('#PlayID')[0].disabled = false
        updateButton($('#startPlaying')[0], 'Start Playing', 'Stop Playing')
        reSetVideoInfo()
      }
      stopPublishingStream(id);
      updateButton(this, 'Start Publishing', 'Stop Publishing')
      published = false
      $('#PublishID')[0].disabled = false
      setHeadphoneMonitor(false)
      reSetVideoInfo('publish')
  }
}, 500))

$('#startPlaying').on('click', util.throttle( async function () {
  const id = $('#PlayID').val();
  if(!id) return alert('PublishID is empty')
  this.classList.add('border-primary')
  if(!played) {
      const flag =  await startPlayingStream(id);
      if(flag) {
        updateButton(this, 'Start Playing', 'Stop Playing');
        played = true
      $('#PlayID')[0].disabled = true
        changeVideo()
      } else {
        this.classList.remove('border-primary');
        this.classList.add('border-error')
        this.innerText = 'Playing Fail'
        changeVideo(true)
      }

  } else {
      stopPlayingStream(id);
      updateButton(this, 'Start Playing', 'Stop Playing')
      played = false
      $('#PlayID')[0].disabled = false
      reSetVideoInfo('play')
  }
}, 500))

$('#HeadphoneMonitor').on('change', async function({target}) {
})

$('#VolumeInput').on('change', async function({ target }) {
  $('#VolumeValue').text(target.value)
})

// bind event end


// ============================================================== 
// This part of the code bias tool
// ============================================================== 

function getCreateStreamConfig() {
  const config = {
    camera: {
      video: true,
      audio: true,
      channelCount: $('#Channel').val() * 1
    }
  }
  return config
}

function initEvent() {
  zg.on('publisherStateUpdate', result => {
    if(result.state === "PUBLISHING") {
      $('#pushlishInfo-id').text(result.streamID)
    } else if(result.state === "NO_PUBLISH") {
      $('#pushlishInfo-id').text('')
    }
  })

  zg.on('playerStateUpdate', result => {
    if(result.state === "PLAYING") {
      $('#playInfo-id').text(result.streamID)
    } else if(result.state === "NO_PLAY") {
      $('#playInfo-id').text('')
    }
  })

  zg.on('publishQualityUpdate', (streamId, stats) => {
    $('#publishResolution').text(`${stats.video.frameWidth} * ${stats.video.frameHeight}`) 
    $('#sendBitrate').text(parseInt(stats.video.videoBitrate) + 'kbps')
    $('#sendFPS').text(parseInt(stats.video.videoFPS) + ' f/s')
    $('#sendPacket').text(stats.video.videoPacketsLostRate.toFixed(1) + '%')
  })

  zg.on('playQualityUpdate', (streamId, stats) => {
      $('#playResolution').text(`${stats.video.frameWidth} * ${stats.video.frameHeight}`) 
      $('#receiveBitrate').text(parseInt(stats.video.videoBitrate) + 'kbps')
      $('#receiveFPS').text(parseInt(stats.video.videoFPS) + ' f/s')
      $('#receivePacket').text(stats.video.videoPacketsLostRate.toFixed(1) + '%')
  })
}

function clearStream(flag) {

  if(flag === 'publish') {
    localStream && zg.destroyStream(localStream);
    $('#pubshlishVideo')[0].srcObject = null;
    localStream = null;
    published = false
    if($('#PublishID').val() === $('#PlayID').val()) {
      remoteStream && zg.destroyStream(remoteStream);
      $('#playVideo')[0].srcObject = null;
      remoteStream = null;
      played = false
    }
  }

  if(flag === 'play') {
    remoteStream && zg.destroyStream(remoteStream);
    $('#playVideo')[0].srcObject = null;
    remoteStream = null;
    played = false
  }
}

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

function setLogConfig() {
  let config = localStorage.getItem('logConfig')
  const DebugVerbose = localStorage.getItem('DebugVerbose') === 'true' ? true : false
  if(config) {
    config = JSON.parse(config)
    zg.setLogConfig({
      logLevel: config.logLevel,
      remoteLogLevel: config.remoteLogLevel,
      logURL: '',
  });
  }
  zg.setDebugVerbose(DebugVerbose);
}

function changeVideo(flag) {
  if(flag) {
    $('#pubshlishVideo').css('transform', 'none')
    $('#playVideo').css('transform', 'none')
    return
  }
  const value =  $('#Mirror').val()
  if(value === 'onlyPreview') {
    $('#pubshlishVideo').css('transform', 'scale(-1, 1)')
  } else if(value === 'onlyPlay'){
    $('#playVideo').css('transform', 'scale(-1, 1)')
  } else if(value === 'both') {
    $('#pubshlishVideo').css('transform', 'scale(-1, 1)')
    $('#playVideo').css('transform', 'scale(-1, 1)')
  }
}

function reSetVideoInfo(flag) {
  if(flag === 'publish' || !flag) {
    $('#publishResolution').text('') 
    $('#sendBitrate').text('')
    $('#sendFPS').text('')
    $('#sendPacket').text('')
  }
  if(flag === 'play' || !flag) {
    $('#playResolution').text('') 
    $('#receiveBitrate').text('')
    $('#receiveFPS').text('')
    $('#receivePacket').text('')
  }
}

function setHeadphoneMonitor(flag) {
  if(flag) {
    $('#pubshlishVideo').attr('volume', $('#VolumeInput').val())
  } else {
    $('#pubshlishVideo').removeAttr('volume')
  }
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
  $('#PlayID').val(streamID)
  createZegoExpressEngine()
  await checkSystemRequirements()
  enumDevices()
  initEvent()
  setLogConfig()
  try {
    await loginRoom(roomID, userID, userID)
    $('#roomStateSuccessSvg').css('display', 'inline-block')
    $('#roomStateErrorSvg').css('display', 'none')
  } catch (err) {
    $('#roomStateSuccessSvg').css('display', 'none')
    $('#roomStateErrorSvg').css('display', 'inline-block')
  }
}

render()

// Initialization end