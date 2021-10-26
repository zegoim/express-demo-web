// require('../../../../jquery')
// let appID = 1739272706;   // from  /src/KeyCenter.js
// let server = 'wss://webliveroom-test.zego.im/ws';  // from  /src/KeyCenter.js
// let tokenUrl = 'https://wsliveroom-alpha.zego.im:8282/token';  // from  /src/KeyCenter.js

// ==============================================================
// This part of the code defines the default values and global values
// ==============================================================

let userID = Util.getBrow() + '_' + new Date().getTime();
let roomID = '0001';
let streamID = '0001';

let zg = null;
let localStream = null;
let remoteStream = null;
let isLogin = false;
let videoCodec = localStorage.getItem('VideoCodec') === 'H.264' ? 'H264' : 'VP8'

// part end

// ==============================================================
// This part of the code uses the SDK
// ==============================================================

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

	$('#MicrophoneDevices').html(audioInputList.join(''));
	$('#CameraDevices').html(videoInputList.join(''));
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
}

// Step1 Create ZegoExpressEngine
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

// Step3 Login room
function loginRoom(roomId, userId, userName, token) {
	return zg.loginRoom(roomId, token, {
		userID: userId,
		userName
	});
}

// Step4 Start Publishing Stream
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

// Step5 Start Play Stream
async function startPlayingStream(streamId, options = {}) {
	try {
		remoteStream = await zg.startPlayingStream(streamId, options);
		$('#playVideo')[0].srcObject = remoteStream;
		return true;
	} catch (err) {
		return false;
	}
}

// Logout room
function logoutRoom(roomId) {
	zg.logoutRoom(roomId);
}

// Stop Publishing Stream
async function stopPublishingStream(streamId) {
	zg.stopPublishingStream(streamId);
}

// Stop Play Stream
async function stopPlayingStream(streamId) {
	zg.stopPlayingStream(streamId);
}

function clearStream() {
	localStream && zg.destroyStream(localStream);
	$('#publishVideo')[0].srcObject = null;
	localStream = null;
	remoteStream && zg.destroyStream(remoteStream);
	$('#playVideo')[0].srcObject = null;
	remoteStream = null;
}

// uses SDK end

// ==============================================================
// This part of the code binds the button click event
// ==============================================================

$('#CreateZegoExpressEngine').on('click', function () {
	createZegoExpressEngine();
	this.disabled = false;
	$('#createSuccessSvg').css('display', 'inline-block');
	initEvent();
});

$('#CheckSystemRequire').on('click', async function () {
	if (!zg) return alert('you should create zegoExpressEngine');
	const result = await checkSystemRequirements();
	if (result) {
		this.disabled = false;
		$('#checkSuccessSvg').css('display', 'inline-block');
		enumDevices();
	} else {
		this.setAttribute('class', 'btn-outline-danger btn cuBtn');
		$('#checkErrorSvg').css('display', 'inline-block');
	}
});

$('#LoginRoom').on('click', async function () {
	const userID = $('#UserID').val();
	const id = $('#RoomID').val();
	const token = $('#Token').val();
	try {
		isLogin = true;
		await loginRoom(id, userID, userID, token);
		$('#loginSuccessSvg').css('display', 'inline-block');
	} catch (err) {
		isLogin = false;
		console.log(err);
	}
	$('#UserID')[0].disabled = true;
	$('#RoomID')[0].disabled = true;
});

$('#startPublishing').on('click', async function () {
	const id = $('#PublishID').val();

	const flag = await startPublishingStream(id, getCreateStreamConfig());
	if (flag) {
		$('#PublishID')[0].disabled = true;
		$('#Camera')[0].disabled = true;
		$('#Microphone')[0].disabled = true;
		$('#Mirror')[0].disabled = true;
		$('#CameraDevices')[0].disabled = true;
		$('#publishSuccessSvg').css('display', 'inline-block');
		changeVideo();
	}
});

$('#startPlaying').on('click', async function () {
	const id = $('#PlayID').val();
	const config = {
		video: $('#Video')[0].checked,
		audio: $('#Audio')[0].checked
	};
	const flag = await startPlayingStream(id, config);
	if (flag) {
		$('#PlayID')[0].disabled = true;
		$('#Video')[0].disabled = true;
		$('#Audio')[0].disabled = true;
		$('#playSuccessSvg').css('display', 'inline-block');
	}
});

$('#reset').on('click', async function () {
	await stopPublishingStream($('#PublishID').val());
	await stopPlayingStream($('#PlayID').val());
	if (isLogin) {
		isLogin = false;
		logoutRoom($('#RoomID').val());
	}
	clearStream();
	zg = null;
	$('#PlayID')[0].disabled = false;
	$('#Video')[0].disabled = false;
	$('#Audio')[0].disabled = false;
	$('#PublishID')[0].disabled = false;
	$('#Camera')[0].disabled = false;
	$('#Microphone')[0].disabled = false;
	$('#Mirror')[0].disabled = false;
	$('#CameraDevices')[0].disabled = false;
	$('#UserID')[0].disabled = false;
	$('#RoomID')[0].disabled = false;
	$('#createSuccessSvg').css('display', 'none');
	$('#checkSuccessSvg').css('display', 'none');
	$('#loginSuccessSvg').css('display', 'none');
	$('#publishSuccessSvg').css('display', 'none');
	$('#playSuccessSvg').css('display', 'none');
	$('#checkErrorSvg').css('display', 'none');
	'#CreateZegoExpressEngine'[0].disabled = true;
	'#CheckSystemRequire'[0].disabled = true;
});

// bind event end

// ==============================================================
// This part of the code bias tool
// ==============================================================

// get some stream config
function getCreateStreamConfig() {
	const config = {
		camera: {
			audioInput: $('#MirrorDevices').val(),
			videoInput: $('#CameraDevices').val(),
			video: $('#Camera')[0].checked,
			audio: $('#Microphone')[0].checked,
		}
	};
	return config;
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

function render() {
	$('#roomInfo-id').text(roomID);
	$('#RoomID').val(roomID);
	$('#UserID').val(userID);
	$('#PublishID').val(streamID);
	$('#PlayID').val(streamID);
	$('#Camera')[0].checked = true;
	$('#Microphone')[0].checked = true;
	$('#Video')[0].checked = true;
}

render();

// Initialization end
