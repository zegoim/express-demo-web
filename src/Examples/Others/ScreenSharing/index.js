// require('../../../../jquery')
// let appID;   // from  /src/KeyCenter.js
// let server;  // from  /src/KeyCenter.js
// let tokenUrl;  // from  /src/KeyCenter.js

// ==============================================================
// This part of the code defines the default values and global values
// ==============================================================

let userID = Util.getBrow() + '_' + new Date().getTime();
let token = ""
let roomID = '0033';
let streamID = '0033';

let zg = null;
let isChecked = false;
let isLogin = false;
let localStream = null;
let remoteStream = null;
let published = false;
let played = false;
let videoCodec = localStorage.getItem('VideoCodec') === 'H.264' ? 'H264' : 'VP8'

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

async function loginRoom(roomId, userId, userName, token) {
	return await zg.loginRoom(roomId, token, {
		userID: userId,
		userName
	});
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

	zg.on('publisherStateUpdate', (result) => {
		console.warn('publisherStateUpdate', result);
		if (result.state === 'PUBLISHING') {
			$('#pushlishInfo-id').text(result.streamID);
		} else if (result.state === 'NO_PUBLISH') {
			$('#pushlishInfo-id').text('');
		}
	});

	zg.on('playerStateUpdate', (result) => {
		console.warn('playerStateUpdate', result);
		if (result.state === 'PLAYING') {
			$('#playInfo-id').text(result.streamID);
		} else if (result.state === 'NO_PLAY') {
			$('#playInfo-id').text('');
		}
	});

	zg.on('publishQualityUpdate', (streamId, stats) => {
		console.warn('publishQualityUpdate', streamId, stats);
	});

	zg.on('playQualityUpdate', (streamId, stats) => {
		console.warn('playQualityUpdate', streamId, stats);
	});
	zg.on('screenSharingEnded', (stream) => {
		console.warn('screen sharing end');
	});
}


function destroyStream() {
	localStream && zg.destroyStream(localStream);
	remoteStream = null;
	$('#playVideo')[0].srcObject = null;
	isStart = false;
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
		localStream = await zg.createZegoStream(config);
		zg.zegoWebRTC.rtcModules.streamCenter.isPeer = false;
		zg.startPublishingStream(streamId, localStream, { videoCodec });
		if (zg.getVersion() < "2.17.0") {
			$('#publishVideo')[0].srcObject = localStream;
			$('#publishVideo').show()
			$('#localVideo').hide()
		} else {
			const localView = zg.createLocalStreamView(localStream);
			localView.play("localVideo", {
				mirror: false,
				objectFit: "contain",

			})

			$('#localVideo').show()
		}
		localStream.playVideo($('#localVideo')[0], {
			mirror: false,
			objectFit: "contain",

		})
		$('#localVideo').show()
		return true;
	} catch (err) {
		return false;
	}
}

async function stopPublishingStream(streamId) {
	zg.stopPublishingStream(streamId);
	if (remoteStream && $('#PublishID').val() === $('#PlayID').val()) {
		stopPlayingStream(streamId);
	}
	destroyStream();
}

async function startPlayingStream(streamId, options = {}) {
	try {
		remoteStream = await zg.startPlayingStream(streamId, options);
		$('#playVideo')[0].controls = "true"
		if (zg.getVersion() < "2.17.0") {
			$('#playVideo').srcObject = remoteStream;
			$('#playVideo').show()
			$('#remoteVideo').hide()
		} else {
			const remoteView = zg.createRemoteStreamView(remoteStream);
			remoteView.play("remoteVideo", {
				objectFit: "cover"
			})
			$('#playVideo').hide()
			$('#remoteVideo').show()
		}
		return true;
	} catch (err) {
		return false;
	}
}

async function stopPlayingStream(streamId) {
	zg.stopPlayingStream(streamId);
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
				isLogin = await loginRoom(id, userID, userID, token);
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
		const id = $('#PublishID').val();
		if (!id) return alert('PublishID is empty');
		if (!published) {
			const flag = await startPublishingStream(id, getCreateStreamConfig());
			if (flag) {
				updateButton(this, 'Start Screen Capture', 'Stop Screen Capture');
				published = true;
				$('#PublishID')[0].disabled = true;
				changeVideo();
			}
		} else {
			if (remoteStream && id === $('#PlayID').val()) {
				$('#PlayID')[0].disabled = false;
				updateButton($('#startPlaying')[0], 'Start Playing', 'Stop Playing');
				reSetVideoInfo();
			}
			stopPublishingStream(id);
			updateButton(this, 'Start Screen Capture', 'Stop Screen Capture');
			published = false;
			$('#PublishID')[0].disabled = false;
			reSetVideoInfo('publish');
		}
	}, 500)
);

$('#startPlaying').on(
	'click',
	util.throttle(async function () {
		const id = $('#PlayID').val();
		if (!id) return alert('PlayID is empty');
		this.classList.add('border-primary');
		if (!played) {
			const flag = await startPlayingStream(id);
			if (flag) {
				updateButton(this, 'Start Playing', 'Stop Playing');
				played = true;
				$('#PlayID')[0].disabled = true;
				changeVideo();
			} else {
				this.classList.remove('border-primary');
				this.classList.add('border-error');
				this.innerText = 'Playing Fail';
				changeVideo(true);
			}
		} else {
			stopPlayingStream(id);
			updateButton(this, 'Start Playing', 'Stop Playing');
			played = false;
			$('#PlayID')[0].disabled = false;
			reSetVideoInfo('play');
		}
	}, 500)
);

// bind event end

// ==============================================================
// This part of the code bias tool
// ==============================================================

function getCreateStreamConfig() {
	const elemid = $("#screenMode").val();
	const captureElement = elemid && $("#" + elemid)[0] || undefined
	const config = {
		videoBitrate: {
			bitrate: 3000,
			startBitrate: 'target'
		},
		screen: {
			audio: true,
			video: {
				frameRate: 20,
				width: 1080,
				height: 720,
				quality: 4,
				captureElement
			}
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

// tool end

// ==============================================================
// This part of the code Initialization web page
// ==============================================================

async function render() {
	$('#roomInfo-id').text(roomID);
	$('#RoomID').val(roomID);
	$('#UserName').val(userID);
	$('#UserID').val(userID);
	$('#Token').val(token);
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
