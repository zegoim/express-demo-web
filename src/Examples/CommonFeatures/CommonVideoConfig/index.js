// require('../../../../jquery')
// let appID = 1739272706;   // from  /src/KeyCenter.js
// let server = 'wss://webliveroom-test.zego.im/ws';  // from  /src/KeyCenter.js
// let tokenUrl = 'https://wsliveroom-demo.zego.im:8282/token';  // from  /src/KeyCenter.js
let userID = Util.getBrow() + '_' + new Date().getTime();
let roomID = '0004'
let streamID = '0004'

let zg = null;
let isChecked = false;
let isLoginRoom = false;
let localStream = null;
let remoteStream = null;
let published = false;
let played = false;

// Step1 Create ZegoExpressEngine
function createZegoExpressEngine() {
  zg = new ZegoExpressEngine(appID, server);
  window.zg = zg
}

// Step2 Login room
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

// Step2 Logout room
function logoutRoom(roomId) {
  if(localStream) {
    stopPublishingStream($('#pushlishInfo-id').text())
  }
  if(remoteStream) {
    stopPlayingStream($('#playInfo-id').text())
  }
  zg.logoutRoom(roomId)
  clearStream('room')
}

// Step3 Start Publishing Stream

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

//Step3 Stop Publishing Stream
async function stopPublishingStream(streamId) {
  zg.stopPublishingStream(streamId)
  if(remoteStream) {
    stopPlayingStream($('#playInfo-id').text())
  }
  clearStream('publish')
}

// Step4 Start Play Stream
async function startPlayingStream(streamId, options = {}) {
  try {
    remoteStream = await zg.startPlayingStream(streamId, options)
    $('#playVideo')[0].srcObject = remoteStream;
    return true
  } catch (err) {
    return false
  }
}

// Step4 Stop Play Stream
async function stopPlayingStream(streamId) {
  zg.stopPlayingStream(streamId)
  clearStream()
}

$('#CreateZegoExpressEngine').on('click', function () {
  createZegoExpressEngine()
  // this.setAttribute('class', 'btn-info btn cuBtn')
  this.setAttribute('disabled', 'disabled')
  $('#createSuccessSvg').css('display', 'inline-block')
  initEvent()
});

$('#CheckSystemRequire').on('click', async function () {
  if(!zg) return alert('you should create zegoExpressEngine')
  const result = await checkSystemRequirements();
  if(result) {
    this.setAttribute('disabled', 'disabled')
    $('#checkSuccessSvg').css('display', 'inline-block')
    enumDevices()
  } else {
    this.setAttribute('class', 'btn-outline-danger btn cuBtn')
    $('#checkErrorSvg').css('display', 'inline-block')
  }
  isChecked = true;
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
})

$('#LoginRoom').on('click', util.throttle( async function () {
  if(!zg) return alert('should create zegoExpressEngine')
  if(!isChecked) return alert('should test compatiblity')

  const userName = $('#UserName').val()
  const id = $('#RoomID').val()

  if(!userName) return alert('UserName is Empty')
  if(!id) return alert('RoomID is Empty')
  this.classList.add('border-primary')
  if(!isLoginRoom) {
    try {
      await loginRoom(id, userID, userName);
      updateButton(this, 'Login Room', 'Logout Room')
      isLoginRoom = true;
      $('#UserName')[0].disabled = true
      $('#RoomID')[0].disabled = true
      $('#roomStateSuccessSvg').css('display', 'inline-block')
      $('#roomStateErrorSvg').css('display', 'none')
    } catch(err) {
      this.classList.remove('border-primary');
      this.classList.add('border-error')
      this.innerText = 'Login Fail Try Again'
    }
  } else {
      if(localStream) {
      $('#PublishID')[0].disabled = false
        updateButton($('#startPublishing')[0], 'Start Publishing', 'Stop Publishing')
      }
      if(remoteStream) {
      $('#PlayID')[0].disabled = false
        updateButton($('#startPlaying')[0], 'Start Playing', 'Stop Playing')
      }
      logoutRoom(id);
      updateButton(this, 'Login Room', 'Logout Room')
      isLoginRoom = false;
      $('#UserName')[0].disabled = false
      $('#RoomID')[0].disabled = false
      $('#roomStateSuccessSvg').css('display', 'none')
      $('#roomStateErrorSvg').css('display', 'inline-block')
  }
}, 500))

$('#startPublishing').on('click', util.throttle( async function () {
  if(!zg) return alert('should create zegoExpressEngine')
  if(!isChecked) return alert('should test compatiblity')
  if(!isLoginRoom) return alert('should login room')

  const id = $('#PublishID').val()
  if(!id) return alert('StreamID is Empty')
  this.classList.add('border-primary')
  if(!published) {
      const flag =  await startPublishingStream(id, getCreateStreamConfig());
      if(flag) {
        updateButton(this, 'Start Publishing', 'Stop Publishing');
        published = true
        $('#PublishID')[0].disabled = true
      } else {
        this.classList.remove('border-primary');
        this.classList.add('border-error')
        this.innerText = 'Publishing Fail Try Again'
      }

  } else {
      if(remoteStream) {
      $('#PlayID')[0].disabled = false
        updateButton($('#startPlaying')[0], 'Start Playing', 'Stop Playing')
      }
      stopPublishingStream($('#pushlishInfo-id').text());
      updateButton(this, 'Start Publishing', 'Stop Publishing')
      published = false
      $('#PublishID')[0].disabled = false
  }
}, 500))

$('#startPlaying').on('click', util.throttle( async function () {
  if(!zg) return alert('should create zegoExpressEngine')
  if(!isChecked) return alert('should test compatiblity')
  if(!isLoginRoom) return alert('should login room')

  const id = $('#PlayID').val()
  if(!id) return alert('StreamID is Empty')
  this.classList.add('border-primary')
  if(!played) {
      const config = {
        video: $('#Video')[0].checked,
        audio: $('#Audio')[0].checked
      }
      const flag =  await startPlayingStream(id, config);
      if(flag) {
        updateButton(this, 'Start Playing', 'Stop Playing');
        played = true
        $('#PlayID')[0].disabled = true
      } else {
        this.classList.remove('border-primary');
        this.classList.add('border-error')
        this.innerText = 'Playing Fail Try Again'
      }

  } else {
      stopPlayingStream($('#playInfo-id').text());
      updateButton(this, 'Start Playing', 'Stop Playing')
      played = false
      $('#PlayID')[0].disabled = false
  }
}, 500))

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

function render() {
  $('#roomInfo-id').text(roomID)
  $('#RoomID').val(roomID)
  $('#UserName').val(userID)
  $('#PublishID').val(streamID)
  $('#PlayID').val(streamID)
  $('#Camera')[0].checked = true
  $('#Microphone')[0].checked = true
  $('#Video')[0].checked = true
}

render()

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

function getCreateStreamConfig() {
  const config = {
    camera: {
      audioInput: $('#MirrorDevices').val(),
      videoInput: $('#CameraDevices').val(),
      video:  $('#Camera')[0].checked,
      audio: $('#Microphone')[0].checked,
    },
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

}

function clearStream(flag) {
  if(localStream && flag) {
    zg.destroyStream(localStream);
  }
  if(remoteStream) {
    zg.destroyStream(remoteStream);
  }
  if(flag) {
    $('#pubshlishVideo')[0].srcObject = null;
    localStream = null;
  }
  $('#playVideo')[0].srcObject = null;
  remoteStream = null;
  if(flag === 'room') {
    isLoginRoom = false
  }
  if(flag === 'room' || flag === 'publish') {
    published = false
  }

  played = false
}