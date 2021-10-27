// require('../../../../jquery')
// let appID;   // from  /src/KeyCenter.js
// let server;  // from  /src/KeyCenter.js
// let tokenUrl;  // from  /src/KeyCenter.js

// ==============================================================
// This part of the code defines the default values and global values
// ==============================================================

let userID = Util.getBrow() + '_' + new Date().getTime();
let roomID = '0036';
let streamID = '0036';

let zg = null;
let isChecked = false;
let isLogin = false;
let localStream = null;
let screenStream = null;
let cameraStream = null;
let MicrophoneStream = null;
let isMicrophone = false;
let published = false;
let videoCodec =  localStorage.getItem('VideoCodec') === 'H.264' ? 'H264' : 'VP8';

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
			location.reload();
		}
	});

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

	zg.on('publishQualityUpdate', (streamId, stats) => {
		$('#publishResolution').text(`${stats.video.frameWidth} * ${stats.video.frameHeight}`);
		$('#sendBitrate').text(parseInt(stats.video.videoBitrate) + 'kbps');
		$('#sendFPS').text(parseInt(stats.video.videoFPS) + ' f/s');
		$('#sendPacket').text(stats.video.videoPacketsLostRate.toFixed(1) + '%');
	});

	zg.on('playQualityUpdate', (streamId, stats) => {
		$('#playResolution').text(`${stats.video.frameWidth} * ${stats.video.frameHeight}`);
		$('#receiveBitrate').text(parseInt(stats.video.videoBitrate) + 'kbps');
		$('#receiveFPS').text(parseInt(stats.video.videoFPS) + ' f/s');
		$('#receivePacket').text(stats.video.videoPacketsLostRate.toFixed(1) + '%');
	});
}

function clearStream(flag) {
	if (flag === 'publish') {
		localStream && zg.destroyStream(localStream);
		$('#publishVideo')[0].srcObject = null;
		localStream = null;
		published = false;
		if(screenStream) {
			zg.destroyStream(screenStream);
			screenStream = null;
		}
		if(cameraStream) {
			zg.destroyStream(cameraStream);
			cameraStream = null;
		}
		MicrophoneStream && zg.destroyStream(MicrophoneStream);
		$('#radio-one')[0].checked = true;
		$('#radio-two')[0].checked = false;
		$('#Microphone')[0].checked = true;
		$('#CustomAudio')[0].checked = false;
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

async function stopPublishingStream(streamId) {
	zg.stopPublishingStream(streamId);
	clearStream('publish');
}

async function replaceTrack(track) {
	const { errorCode } = await zg.replaceTrack(localStream, track);
	return errorCode;
}

// uses SDK end

// ==============================================================
// This part of the code binds  event
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
				startPublishingStream(streamID, getCreateStreamConfig());
			} catch (err) {
				isLogin = false;
				this.classList.remove('border-primary');
				this.classList.add('border-error');
				this.innerText = 'Login Fail Try Again';
				throw err
			}
		} else {
			if (localStream) {
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
	util.throttle(async function() {
		const id = $('#PublishID').val();
		if (!id) return alert('PublishID is empty');
		this.classList.add('border-primary');
		if (!published) {
			const flag = await startPublishingStream(id);
			if (flag) {
				updateButton(this, 'Start Publishing', 'Stop Publishing');
				published = true;
				setDisabled(true, 'publish');
				$('#PublishID').addClass('color-w');
			} else {
				this.classList.remove('border-primary');
				this.classList.add('border-error');
				this.innerText = 'Publishing Fail';
			}
		} else {
			stopPublishingStream(id);
			updateButton(this, 'Start Publishing', 'Stop Publishing');
			published = false;
			setDisabled(false, 'publish');
			reSetVideoInfo('publish');
			$('#PublishID').removeClass('color-w');
		}
	}, 500)
);

$('#radio-one').on('change', async function({ target }) {
	if (target.checked) {
		try {
			if (!cameraStream) {
				cameraStream = await zg.createStream({
					camera: {
						audio: false
					}
				});
			}
			replaceTrack(cameraStream.getVideoTracks()[0]);
		} catch (err) {
			cameraStream = null;
			console.log(err);
		}
	}
});

$('#radio-two').on('change', async function({ target }) {
	if (target.checked) {
		try {
			if (!screenStream) {
				screenStream = await zg.createStream({ screen:  true });
			}
			replaceTrack(screenStream.getVideoTracks()[0]);
		} catch (err) {
			screenStream = null
			$('#radio-one')[0].checked = true;
			$('#radio-two')[0].checked = false;
		}
	}
});

$('#Microphone').on('change', async function({ target }) {
	if (target.checked) {
		$('#customAudio')[0].pause()
		try {
			if (!isMicrophone) {
				cameraStream = await zg.createStream({
					camera: {
						video: false
					}
				});
			}
			replaceTrack(cameraStream.getAudioTracks()[0]);
			isMicrophone = true;
		} catch (err) {
			isMicrophone = false;
			console.log(err);
		}
	}
});

$('#CustomAudio').on('change', async function({ target }) {
	if (target.checked) {
		$('#customAudio')[0].play()
		try {
			const track = $('#customAudio')[0].captureStream().getAudioTracks()[0]
			replaceTrack(track);
		} catch (err) {
			console.log(err);
		}
	}
});
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

function reSetVideoInfo(flag) {
	if (flag === 'publish' || !flag) {
		$('#publishResolution').text('');
		$('#sendBitrate').text('');
		$('#sendFPS').text('');
		$('#sendPacket').text('');
	}
	if (flag === 'play' || !flag) {
		$('#playResolution').text('');
		$('#receiveBitrate').text('');
		$('#receiveFPS').text('');
		$('#receivePacket').text('');
	}
}

function setDisabled(flag, type) {
	if (type === 'publish') {
		$('#PublishID')[0].disabled = flag;
		$('#radio-one')[0].disabled = !flag;
		$('#radio-two')[0].disabled = !flag;
		$('#Microphone')[0].disabled = !flag;
		$('#CustomAudio')[0].disabled = !flag;
	} else {
		$('#PlayID')[0].disabled = flag;
	}
}

// tool end

// ==============================================================
// This part of the code Initialization web page
// ==============================================================

async function render() {
	$('#roomInfo-id').text(roomID);
	$('#RoomID').val(roomID);
	$('#UserName').val(userID);
	$('#UserID').val(userID);
	$('#PublishID').val(streamID);
	$('#PlayID').val(streamID);
	createZegoExpressEngine();
	await checkSystemRequirements();
	enumDevices();
	initEvent();
	setLogConfig();
}

render();

// Initialization end
