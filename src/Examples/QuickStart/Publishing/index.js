// require('../../../../jquery')
// let appID = 1739272706;   // from  /src/KeyCenter.js
// let server = 'wss://webliveroom-test.zego.im/ws';  // from  /src/KeyCenter.js
// let tokenUrl = 'https://wsliveroom-alpha.zego.im:8282/token';  // from  /src/KeyCenter.js

// ==============================================================
// This part of the code defines the default values and global values
// ==============================================================

let userID = Util.getBrow() + '_' + new Date().getTime();
let roomID = '0002';
let streamID = '0002';

let zg = null;
let localStream = null;
let isLogin = false;
let published = false;
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

//  Create ZegoExpressEngine
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


//  Login room
function loginRoom(roomId, userId, userName, token) {
	return zg.loginRoom(roomId, token, {
		userID: userId,
		userName
	});
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

// Logout room
function logoutRoom(roomId) {
	localStream && stopPublishingStream($('#PublishID').val());
	zg.logoutRoom(roomId);
	clearStream()
}

// Stop Publishing Stream
async function stopPublishingStream(streamId) {
	zg.stopPublishingStream(streamId);
	clearStream();
}

function clearStream() {
	localStream && zg.destroyStream(localStream);
	$('#publishVideo')[0].srcObject = null;
	localStream = null;
	published = false
}

function useVideoDevice(deviceID) {
	localStream && zg.useVideoDevice(localStream, deviceID);
}

function useAudioDevice(deviceID) {
	localStream && zg.useAudioDevice(localStream, deviceID);
}

// uses SDK end

// ==============================================================
// This part of the code binds the button click event and change event
// ==============================================================

$('#LoginRoom').on(
	'click',
	util.throttle(async function () {

		const userID = $('#UserID').val();
		const id = $('#RoomID').val();
		const token = $('#Token').val();

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
			} catch (err) {
				isLogin = false;
				this.classList.remove('border-primary');
				this.classList.add('border-error');
				this.innerText = 'Login Fail Try Again';
			}
		} else {
			if (localStream) {
				$('#PublishID')[0].disabled = false;
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
	util.throttle(async function () {
		if (!isLogin) return alert('should login room');

		const id = $('#PublishID').val();
		if (!id) return alert('StreamID is Empty');
		this.classList.add('border-primary');
		if (!published) {
			const flag = await startPublishingStream(id, getCreateStreamConfig());
			if (flag) {
				updateButton(this, 'Start Publishing', 'Stop Publishing');
				published = true;
				$('#PublishID')[0].disabled = true;
				$('#Camera')[0].disabled = true;
				$('#Microphone')[0].disabled = true;
				$('#Mirror')[0].disabled = true;
				changeVideo();
			} else {
				this.classList.remove('border-primary');
				this.classList.add('border-error');
				this.innerText = 'Publishing Fail Try Again';
				changeVideo(true);
			}
		} else {
			stopPublishingStream($('#pushlishInfo-id').text());
			updateButton(this, 'Start Publishing', 'Stop Publishing');
			published = false;
			$('#PublishID')[0].disabled = false;
			$('#Camera')[0].disabled = false;
			$('#Microphone')[0].disabled = false;
			$('#Mirror')[0].disabled = false;
			changeVideo(true);
		}
	}, 500)
);

$('#CameraDevices').on('change', function ({ target }) {
	useVideoDevice(target.value)
});

$('#MicrophoneDevices').on('change', function ({ target }) {
	useAudioDevice(target.value)
})

// bind event end

// ==============================================================
// This part of the code bias tool
// ==============================================================

// get some stream config
function getCreateStreamConfig() {
	const config = {
		camera: {
			audioInput: $('#MicrophoneDevices').val(),
			videoInput: $('#CameraDevices').val(),
			video: $('#Camera')[0].checked,
			audio: $('#Microphone')[0].checked
		}
	};
	return config;
}

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

async function render() {
	$('#roomInfo-id').text(roomID);
	$('#RoomID').val(roomID);
	$('#UserID').val(userID);
	$('#PublishID').val(streamID);
	$('#PlayID').val(streamID);
	$('#Camera')[0].checked = true;
	$('#Microphone')[0].checked = true;
	createZegoExpressEngine();
	await checkSystemRequirements();
	enumDevices();
	initEvent();
	setLogConfig();
}

render();

// Initialization end
