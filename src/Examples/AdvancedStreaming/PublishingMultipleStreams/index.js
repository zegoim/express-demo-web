// require('../../../../jquery')
// let appID;   // from  /src/KeyCenter.js
// let server;  // from  /src/KeyCenter.js
// let tokenUrl;  // from  /src/KeyCenter.js
let userID = Util.getBrow() + '_' + new Date().getTime();
let roomID = '0009'
let streamID = '0009'

let zg = null;
let localStream = null;
let localSecondStream = null;
let remoteStream = null;
let remoteSecondStream = null;
let published = false;
let played = false;
let publishedSecond = false;
let playedSecond = false;

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

async function startPublishingSecondStream (streamId, config) {
  try {
    localSecondStream = await zg.createStream(config);
    zg.startPublishingStream(streamId, localSecondStream);
    $('#pubshlishSecondVideo')[0].srcObject = localSecondStream;
    return true
  } catch(err) {
    return false
  }
  
}

async function stopPublishingStream(streamId, clearWay) {
  zg.stopPublishingStream(streamId)
  if(clearWay === 'publish') {
    if(remoteStream && $('#PublishID').val() === $('#PlayID').val()) {
      stopPlayingStream(streamId)
    }
  } else {
    if(remoteSecondStream && $('#PublishSecondID').val() === $('#PlaySecondID').val()) {
      stopPlayingStream(streamId)
    }
  }
  clearStream(clearWay)
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

async function startPlayingSecondStream(streamId, options = {}) {
  try {
    remoteSecondStream = await zg.startPlayingStream(streamId, options)
    $('#playSecondVideo')[0].srcObject = remoteSecondStream;
    return true
  } catch (err) {
    return false
  }
}

async function stopPlayingStream(streamId, clearWay) {
  zg.stopPlayingStream(streamId)
  clearStream(clearWay)
}


$('#startPublishing').on('click', util.throttle( async function () {
  const id = $('#PublishID').val();
  if(!id) return alert('PublishID is empty')
  if(id === $('#PublishSecondID').val() && publishedSecond) return alert('PublishID already exists')
  this.classList.add('border-primary')
  if(!published) {
      const flag =  await startPublishingStream(id);
      if(flag) {
        updateButton(this, 'Start Publishing', 'Stop Publishing');
        published = true
        $('#PublishID')[0].disabled = true
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
      stopPublishingStream(id, 'publish');
      updateButton(this, 'Start Publishing', 'Stop Publishing')
      published = false
      $('#PublishID')[0].disabled = false
      reSetVideoInfo('publish')
  }
}, 500))

$('#startPlaying').on('click', util.throttle( async function () {
  const id = $('#PlayID').val();
  if(!id) return alert('PublishID is empty')
  if(id === $('#PublishSecondID').val()) return alert('Don\'t use Aux Channel')
  this.classList.add('border-primary')
  if(!played) {
      const flag =  await startPlayingStream(id);
      if(flag) {
        updateButton(this, 'Start Playing', 'Stop Playing');
        played = true
      $('#PlayID')[0].disabled = true
      } else {
        this.classList.remove('border-primary');
        this.classList.add('border-error')
        this.innerText = 'Playing Fail'
      }

  } else {
      stopPlayingStream(id, 'play');
      updateButton(this, 'Start Playing', 'Stop Playing')
      played = false
      $('#PlayID')[0].disabled = false
      reSetVideoInfo('play')
  }
}, 500))

$('#startSecondPublishing').on('click', util.throttle( async function () {
  const id = $('#PublishSecondID').val();
  if(!id) return alert('PublishID is empty')
  if(id === $('#PublishID').val() && published) return alert('PublishID already exists')
  this.classList.add('border-primary')
  if(!publishedSecond) {
      const flag =  await startPublishingSecondStream(id, {
        screen: true
      });
      if(flag) {
        updateButton(this, 'Start Publishing', 'Stop Publishing');
        publishedSecond = true
        $('#PublishSecondID')[0].disabled = true
      } else {
        this.classList.remove('border-primary');
        this.classList.add('border-error')
        this.innerText = 'Publishing Fail'
      }

  } else {
      if(remoteSecondStream && id === $('#PlaySecondID').val()) {
      $('#PlaySecondID')[0].disabled = false
        updateButton($('#startSecondPlaying')[0], 'Start Playing', 'Stop Playing')
      }
      stopPublishingStream(id, 'publishSecond');
      updateButton(this, 'Start Publishing', 'Stop Publishing')
      publishedSecond = false
      $('#PublishSecondID')[0].disabled = false
  }
}, 500))

$('#startSecondPlaying').on('click', util.throttle( async function () {
  const id = $('#PlaySecondID').val();
  if(!id) return alert('PublishID is empty')
  if(id === $('#PublishID').val()) return alert('Don\'t use Main Channel')
  this.classList.add('border-primary')
  if(!playedSecond) {
      const flag =  await startPlayingSecondStream(id);
      if(flag) {
        updateButton(this, 'Start Playing', 'Stop Playing');
        playedSecond = true
      $('#PlaySecondID')[0].disabled = true
      } else {
        this.classList.remove('border-primary');
        this.classList.add('border-error')
        this.innerText = 'Playing Fail'
      }

  } else {
      stopPlayingStream(id, 'playSeconed');
      updateButton(this, 'Start Playing', 'Stop Playing')
      playedSecond = false
      $('#PlaySecondID')[0].disabled = false
      reSetVideoInfo('play')
  }
}, 500))


function initEvent() {
  zg.on('publisherStateUpdate', result => {
    console.warn('publisherStateUpdate', result);
    if(result.state === "PUBLISHING") {
      $('#pushlishInfo-id').text(result.streamID)
    } else if(result.state === "NO_PUBLISH") {
      $('#pushlishInfo-id').text('')
    }
  })

  zg.on('playerStateUpdate', result => {
    console.warn('playerStateUpdate', result);
    if(result.state === "PLAYING") {
      $('#playInfo-id').text(result.streamID)
    } else if(result.state === "NO_PLAY") {
      $('#playInfo-id').text('')
    }
  })

  zg.on('publishQualityUpdate', (streamId, stats) => {
    console.warn('publishQualityUpdate', streamId, stats);
  })

  zg.on('playQualityUpdate', (streamId, stats) => {
      console.warn('publishQualityUpdate', streamId, stats);
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

  if(flag === 'publishSecond') {
    localSecondStream && zg.destroyStream(localSecondStream);
    $('#pubshlishSecondVideo')[0].srcObject = null;
    localSecondStream = null;
    publishedSecond = false
    if($('#PublishSecondID').val() === $('#PlaySecondID').val()) {
      remoteSecondStream && zg.destroyStream(remoteSecondStream);
      $('#playSecondVideo')[0].srcObject = null;
      remoteSecondStream = null;
      playedSecond = false;
    }
  }

  if(flag === 'playSeconed') {
    remoteSecondStream && zg.destroyStream(remoteSecondStream);
    $('#playSecondVideo')[0].srcObject = null;
    remoteSecondStream = null;
    playedSecond = false;
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