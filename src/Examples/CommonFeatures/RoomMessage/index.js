// require('../../../../jquery')
// let appID;   // from  /src/KeyCenter.js
// let server;  // from  /src/KeyCenter.js
// let tokenUrl;  // from  /src/KeyCenter.js

// ============================================================== 
// This part of the code defines the default values and global values 
// ============================================================== 

let userID = Util.getBrow() + '_' + new Date().getTime();
let roomID = '0007'
let streamID = '0007'

let zg = null;
let isChecked = false;
let isLogin = false;
let localStream = null;
let remoteStream = null;
let published = false;
let played = false;
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
      console.log(111);
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

  zg.on('publisherStateUpdate', result => {
    if (result.state === "PUBLISHING") {
      $('#pushlishInfo-id').text(result.streamID)
    } else if (result.state === "NO_PUBLISH") {
      $('#pushlishInfo-id').text('')
    }
  })

  zg.on('playerStateUpdate', result => {
    if (result.state === "PLAYING") {
      $('#playInfo-id').text(result.streamID)
    } else if (result.state === "NO_PLAY") {
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

  zg.on('IMRecvBroadcastMessage', (roomID, messageInfo) => {
    for (let i = 0; i < messageInfo.length; i++) {
      updateLogger(`[BroadcastMessage] ${messageInfo[i].fromUser.userName}: ${messageInfo[i].message}`)
      $('#BroadcastMessageReceived').text(messageInfo[i].message)
    }
  })
  zg.on('IMRecvBarrageMessage', (roomID, chatData) => {
    for (let i = 0; i < chatData.length; i++) {
      updateLogger(`[BarrageMessage] ${chatData[i].fromUser.userName}: ${chatData[i].message}`)
      $('#BarrageMessageReceived').text(chatData[i].message)
    }
  })
  zg.on('IMRecvCustomCommand', (roomID, fromUser, command) => {
    updateLogger(`[CustomCommand] ${fromUser.userName}: ${command}`)
    $('#CustomCommandReceived').text(command)
  })
  zg.on('roomExtraInfoUpdate', (roomID, roomExtraInfoList) => {
    for (let i = 0; i < roomExtraInfoList.length; i++) {
      updateLogger(`[roomExtraInfo] ${roomExtraInfoList[i].updateUser.userName} 
      set key: ${roomExtraInfoList[i].key} value: ${roomExtraInfoList[i].value}`)
      $('#RoomExtraInfo').text(roomExtraInfoList[i].value)
    }
  })

  zg.on('roomUserUpdate', (roomID, updateType, userList) => {
    console.log(userList);
  })
}

function destroyStream() {
  localStream && zg.destroyStream(localStream);
  $('#publishVideo')[0].srcObject = null;
  localStream = null;
  published = false
  if ($('#PublishID').val() === $('#PlayID').val()) {
    $('#playVideo')[0].srcObject = null;
    remoteStream = null;
    played = false
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

function loginRoom(roomId, userId, userName, token) {
  return zg.loginRoom(roomId, token, {
    userID: userId,
    userName
  });
}

async function startPublishingStream(streamId, config) {
  try {
    localStream = await zg.createStream(config);
    zg.startPublishingStream(streamId, localStream, { videoCodec });
    $('#publishVideo')[0].srcObject = localStream;
    return true
  } catch (err) {
    return false
  }

}

async function stopPublishingStream(streamId) {
  zg.stopPublishingStream(streamId)
  if (remoteStream && $('#PublishID').val() === $('#PlayID').val()) {
    stopPlayingStream($('#playInfo-id').text())
  }
  destroyStream()
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
}

async function sendBroadcastMessage(roomId, message) {
  try {
    const data = await zg.sendBroadcastMessage(roomId, message)
    return data
  } catch (err) {
    return { errorCode: 1, extendedData: JSON.stringify(err) }
  }
}

async function sendBarrageMessage(roomId, message) {
  try {
    const data = await zg.sendBarrageMessage(roomId, message)
    return data
  } catch (err) {
    return { errorCode: 1, extendedData: JSON.stringify(err) }
  }
}

async function sendCustomCommand(roomId, message, userId) {
  try {
    const data = await zg.sendCustomCommand(roomId, message, [userId])
    return data
  } catch (err) {
    return { errorCode: 1, extendedData: JSON.stringify(err) }
  }
}

async function setRoomExtraInfo(roomId, key, value) {
  try {
    const data = await zg.setRoomExtraInfo(roomId, key, value)
    return data
  } catch (err) {
    return { errorCode: 1, extendedData: JSON.stringify(err) }
  }
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
      $('#PublishID')[0].disabled = true
      changeVideo()
    } else {
      changeVideo(true)
      this.classList.remove('border-primary');
      this.classList.add('border-error')
      this.innerText = 'Publishing Fail'
    }

  } else {
    if (remoteStream && id === $('#PlayID').val()) {
      $('#PlayID')[0].disabled = false
      updateButton($('#startPlaying')[0], 'Start Playing', 'Stop Playing')
      reSetVideoInfo()
    }
    stopPublishingStream(id);
    updateButton(this, 'Start Publishing', 'Stop Publishing')
    published = false
    $('#PublishID')[0].disabled = false
    reSetVideoInfo('publish')
  }
}, 500))

$('#startPlaying').on('click', util.throttle(async function () {
  const id = $('#PlayID').val();
  if (!id) return alert('PublishID is empty')
  this.classList.add('border-primary')
  if (!played) {
    const flag = await startPlayingStream(id);
    if (flag) {
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

$('#BroadcastMessageBtn').on('click', util.throttle(async function () {
  const message = $('#BroadcastMessage').val()
  if (!message) return alert('message is empty')

  updateLogger('[action] sendBroadcastMessage')
  const result = await sendBroadcastMessage(roomID, message)
  if (result.errorCode === 0) {
    updateLogger('[info] sendBroadcastMessage success')
    updateLogger(`[BroadcastMessage] ${userID}: ${message}`)
    $('#BroadcastMessage').val('')
  } else {
    updateLogger(`[info] sendBroadcastMessage fail, extendedData: ${result.extendedData || ''}`)
  }
}, 500))

$('#BarrageMessageBtn').on('click', util.throttle(async function () {
  const message = $('#BarrageMessage').val()
  if (!message) return alert('message is empty')

  updateLogger('[action] sendBarrageMessage')
  const result = await sendBarrageMessage(roomID, message)
  if (result.errorCode === 0) {
    updateLogger('[info] sendBarrageMessage success')
    updateLogger(`[BarrageMessage] ${userID}: ${message}`)
    $('#BarrageMessage').val('')
  } else {
    updateLogger(`[info] sendBarrageMessage fail, extendedData: ${result.extendedData || ''}`)
  }
}, 500))

$('#CustomCommandBtn').on('click', util.throttle(async function () {
  const message = $('#CustomCommand').val()
  const userId = $('#CustomCommandUserId').val()
  if (!message) return alert('message is empty')
  if (!userId) return alert('userId is empty')

  updateLogger('[action] sendCustomCommand')
  const result = await sendCustomCommand(roomID, message, userId)
  if (result.errorCode === 0) {
    updateLogger('[info] sendCustomCommand success')
    updateLogger(`[sendCustomCommand] ${userID}: ${message}`)
    $('#CustomCommand').val('')
    $('#CustomCommandUserId').val('')
  } else {
    updateLogger(`[info] sendCustomCommand fail, extendedData: ${result.extendedData || ''}`)
  }
}, 500))

$('#RoomExtraInfoBtn').on('click', util.throttle(async function () {

  const key = $('#RoomExtraInfoKey').val()
  const value = $('#RoomExtraInfoValue').val()
  if (!key) return alert('key is empty')
  if (!value) return alert('value is empty')

  updateLogger('[action] setRoomExtraInfo')
  const result = await setRoomExtraInfo(roomID, key, value)
  if (result.errorCode === 0) {
    updateLogger('[info] setRoomExtraInfo success')
  } else {
    updateLogger(`[info] setRoomExtraInfo fail, extendedData: ${result.extendedData || ''}`)
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

function updateLogger(text) {
  $('#logger').append(`
    <div>${text}</div>
  `)
  const scrollHeight = $('#logger').prop("scrollHeight");
  $('#logger').scrollTop(scrollHeight, 200);
}

function changeVideo(flag) {
  if (flag) {
    $('#publishVideo').css('transform', 'none')
    $('#playVideo').css('transform', 'none')
    return
  }
  const value = $('#Mirror').val()
  if (value === 'onlyPreview') {
    $('#publishVideo').css('transform', 'scale(-1, 1)')
  } else if (value === 'onlyPlay') {
    $('#playVideo').css('transform', 'scale(-1, 1)')
  } else if (value === 'both') {
    $('#publishVideo').css('transform', 'scale(-1, 1)')
    $('#playVideo').css('transform', 'scale(-1, 1)')
  }
}

function reSetVideoInfo(flag) {
  if (flag === 'publish' || !flag) {
    $('#publishResolution').text('')
    $('#sendBitrate').text('')
    $('#sendFPS').text('')
    $('#sendPacket').text('')
  }
  if (flag === 'play' || !flag) {
    $('#playResolution').text('')
    $('#receiveBitrate').text('')
    $('#receiveFPS').text('')
    $('#receivePacket').text('')
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
  updateLogger(`[action] create ExpressEngine`)
  createZegoExpressEngine()
  updateLogger(`[action] checkSystemRequirements`)
  await checkSystemRequirements()
  initEvent()
  setLogConfig()
  updateLogger(`[action] LoginRoom RoomID: ${roomID}`)

}

render()

// Initialization end