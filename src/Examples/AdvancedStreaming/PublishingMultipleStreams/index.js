// require('../../../../jquery')
// let appID;   // from  /src/KeyCenter.js
// let server;  // from  /src/KeyCenter.js
// let tokenUrl;  // from  /src/KeyCenter.js

// ============================================================== 
// This part of the code defines the default values and global values 
// ============================================================== 

let userID = Util.getBrow() + '_' + new Date().getTime();
let roomID = '0009'
let streamID = '0009'
let secondStreamID = '00091'

let zg = null;
let isLogin = false;
let localStream = null;
let localSecondStream = null;
let remoteStream = null;
let remoteSecondStream = null;
let published = false;
let played = false;
let publishedSecond = false;
let playedSecond = false;
let videoCodec =  localStorage.getItem('VideoCodec') === 'H.264' ? 'H264' : 'VP8';


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

function loginRoom(roomId, userId, userName, token) {
	return zg.loginRoom(roomId, token, {
		userID: userId,
		userName
	});
}

function initEvent() {
  zg.on('roomStateUpdate', (roomId, state) => {
		if(state === 'CONNECTED' && isLogin) {
			console.log(111);
			$('#roomStateSuccessSvg').css('display', 'inline-block');
			$('#roomStateErrorSvg').css('display', 'none');
		}
		
		if (state === 'DISCONNECTED' && !isLogin) {
			$('#roomStateSuccessSvg').css('display', 'none');
			$('#roomStateErrorSvg').css('display', 'inline-block');
		}

		if(state === 'DISCONNECTED' && isLogin) {
			location.reload()
		}
	})
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
    $('#publishVideo')[0].srcObject = null;
    localStream = null;
    published = false
  }

  if(flag === 'publishSecond') {
    localSecondStream && zg.destroyStream(localSecondStream);
    $('#publishSecondVideo')[0].srcObject = null;
    localSecondStream = null;
    publishedSecond = false
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

async function startPublishingStream (streamId, config) {
  try {
    localStream = await zg.createStream(config);
    zg.startPublishingStream(streamId, localStream, { videoCodec });
    $('#publishVideo')[0].srcObject = localStream;
    return true
  } catch(err) {
    return false
  }
  
}

async function startPublishingSecondStream (streamId, config) {
  try {
    localSecondStream = await zg.createStream(config);
    zg.startPublishingStream(streamId, localSecondStream, { videoCodec });
    $('#publishSecondVideo')[0].srcObject = localSecondStream;
    return true
  } catch(err) {
    return false
  }
  
}

async function stopPublishingStream(streamId, clearWay) {
  zg.stopPublishingStream(streamId)
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
  if(!publishedSecond) {
      const flag =  await startPublishingSecondStream(id, {
        screen: {
					audio: true,
          bitrate: 1500,
          frameRate: 30
				}
      });
      if(flag) {
        updateButton(this, 'Start Publishing', 'Stop Publishing');
        publishedSecond = true
        $('#PublishSecondID')[0].disabled = true
      }

  } else {
      stopPublishingStream(id, 'publishSecond');
      updateButton(this, 'Start Publishing', 'Stop Publishing')
      publishedSecond = false
      $('#PublishSecondID')[0].disabled = false
  }
}, 500))

$('#startSecondPlaying').on('click', util.throttle( async function () {
  const id = $('#PlaySecondID').val();
  if(!id) return alert('PublishID is empty')
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
      updateButton(this, 'Start Playing', 'Stop Playing')
      playedSecond = false
      $('#PlaySecondID')[0].disabled = false
      reSetVideoInfo('play')
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
  $('#PublishSecondID').val(secondStreamID)
  $('#PlaySecondID').val(secondStreamID)
  createZegoExpressEngine()
  await checkSystemRequirements()
  enumDevices()
  initEvent()
  setLogConfig()
}

render()

// Initialization end