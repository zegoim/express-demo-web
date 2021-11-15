// require('../../../../jquery')
// let appID;   // from  /src/KeyCenter.js
// let server;  // from  /src/KeyCenter.js
// let tokenUrl;  // from  /src/KeyCenter.js

// ============================================================== 
// This part of the code defines the default values and global values 
// ============================================================== 

let userID = Util.getBrow() + '_' + new Date().getTime();
let roomID = '0010'
let streamID = '0010'

let zg = null;
let isLogin = false;
let localStream = null;
let remoteStream = null;
let published = false;
let played = false;
let isTurnCdn = false;
let cdnFlvPlayer = null;
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


function destroyStream() {
  localStream && zg.destroyStream(localStream);
  $('#publishVideo')[0].srcObject = null;
  localStream = null;
  published = false
  if($('#PublishID').val() === $('#PlayID').val()) {
    $('#playVideo')[0].srcObject = null;
    remoteStream = null;
    played = false
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
function loginRoom(roomId, userId, userName, token) {
	return zg.loginRoom(roomId, token, {
		userID: userId,
		userName
	});
}

async function startPublishingStream (streamId, config) {
  try {
    localStream = await zg.createStream(config);
    zg.startPublishingStream(streamId, localStream);
    $('#publishVideo')[0].srcObject = localStream;
    return true
  } catch(err) {
    return false
  }
  
}

async function stopPublishingStream(streamId, url) {
    // before stopPublishingStream remove cdn url
  if(isTurnCdn) {
      removePublishCdnUrl(streamId, url)
  }
  zg.stopPublishingStream(streamId)
  if(remoteStream && $('#PublishID').val() === $('#PlayID').val()) {
    stopPlayingStream(streamId)
  }
  destroyStream()
}

async function addPublishCdnUrl(streamId, url) {
  try {
    const { errorCode  } = await zg.addPublishCdnUrl(streamId, url)
    return errorCode
  } catch (err) {
    return 1
  }
}

async function removePublishCdnUrl(streamId, url) {
  try {
    const { errorCode  } = await zg.removePublishCdnUrl(streamId, url)
    return errorCode
  } catch (err) {
    return 1
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
$('#startPublishing').on('click', util.throttle( async function () {
  const id = $('#PublishID').val();
  if(!id) return alert('PublishID is empty')
  this.classList.add('border-primary')
  if(!published) {
      const flag =  await startPublishingStream(id);
      if(flag) {
        updateButton(this, 'Start Publishing', 'Stop Publishing');
        published = true
        changeVideo()
      } else {
        changeVideo(true)
        this.classList.remove('border-primary');
        this.classList.add('border-error')
        this.innerText = 'Publishing Fail'
      }

  } else {
      if(remoteStream && id === $('#PlayID').val()) {
        updateButton($('#startPlaying')[0], 'Start Playing', 'Stop Playing')
      }
      stopPublishingStream(id);
      $('#PublishCdnUrl')[0].disabled = false
      updateButton(this, 'Start Publishing', 'Stop Publishing')
      published = false
      $('#PublishID')[0].disabled = false
  }
}, 500))

$('#AddPublishCdnUrl').on('click', util.throttle(async function() {
  if(!published) return alert('must Publishing Stream before addPublishCdnUrl')
  const url = $('#PublishCdnUrl').val()
  if(!url) return alert('url is empty')
  $('#AddPublishCdnUrlErrorSvg').css('display', 'none')
  $('#AddPublishCdnUrlSuccessSvg').css('display', 'none')

  const flag = await addPublishCdnUrl(streamID, url)
  if(flag === 0) {
    $('#AddPublishCdnUrlErrorSvg').css('display', 'none')
    $('#AddPublishCdnUrlSuccessSvg').css('display', 'inline-block')
    $('#PublishCdnUrl')[0].disabled = true
  } else {
    $('#AddPublishCdnUrlSuccessSvg').css('display', 'none')
    $('#AddPublishCdnUrlErrorSvg').css('display', 'inline-block')
  }
}, 500))

$('#PlayStreamFromURL').on('click', util.throttle( async function () {
  const url = $('#CdnUrl').val()
  if(!url) alert('url is empty')
  const cdnVideoElement = $('#playVideo')[0] || 
  $('CdnPlay').append(
    `
    <video controls id="playVideo" autoplay muted preload="auto"
    x-webkit-airplay="true"
    x5-video-player-type="h5-page"
    webkit-playsinline="true"
    playsinline></video>
    `
  )
  let hasVideo = true;
  let hasAudio = true;
  if (flvjs.isSupported()) {
      //若支持flv.js
      if (cdnFlvPlayer != null) {
        cdnFlvPlayer.pause();
        cdnFlvPlayer.unload();
        cdnFlvPlayer.detachMediaElement();
        cdnFlvPlayer.destroy();
        cdnFlvPlayer = null;
      }
      cdnFlvPlayer = flvjs.createPlayer({
          type: 'flv',
          isLive: true,
          url,
          hasAudio: hasAudio,
          hasVideo: hasVideo,
      });
      cdnFlvPlayer.on(flvjs.Events.LOADING_COMPLETE, function () {
          console.error('LOADING_COMPLETE');
          cdnFlvPlayer.play();
      });
      cdnFlvPlayer.attachMediaElement(cdnVideoElement);
      cdnFlvPlayer.load();
      cdnVideoElement.muted = false;
      cdnVideoElement.controls = true;
      cdnFlvPlayer.play();
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

function changeVideo(flag) {
  if(flag) {
    $('#publishVideo').css('transform', 'none')
    $('#playVideo').css('transform', 'none')
    return
  }
  const value =  $('#Mirror').val()
  if(value === 'onlyPreview') {
    $('#publishVideo').css('transform', 'scale(-1, 1)')
  } else if(value === 'onlyPlay'){
    $('#playVideo').css('transform', 'scale(-1, 1)')
  } else if(value === 'both') {
    $('#publishVideo').css('transform', 'scale(-1, 1)')
    $('#playVideo').css('transform', 'scale(-1, 1)')
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
}

render()

// Initialization end