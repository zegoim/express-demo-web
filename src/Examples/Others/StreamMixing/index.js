// require('../../../../jquery')
// let appID;   // from  /src/KeyCenter.js
// let server;  // from  /src/KeyCenter.js
// let tokenUrl;  // from  /src/KeyCenter.js

// ==============================================================
// This part of the code defines the default values and global values
// ==============================================================

let userID = Util.getBrow() + '_' + new Date().getTime();
let roomID = '0025';
let streamFirstID = '00251';
let streamSecondID = '00252';
let taskID = streamFirstID + streamSecondID;
let mixStreamID = 'mix_0025';

let zg = null;
let isChecked = false;
let isLogin = false;
let firstStream = null;
let secondStream = null;
let remoteStream = null;
let firstPublished = false;
let secondPublished = false;
let mixed = false;
let played = false;
let mixerOutputList = null;
let flvPlayer = null;
let videoCodec =  localStorage.getItem('VideoCodec') === 'H.264' ? 'H264' : 'VP8'

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

	zg.on('publisherStateUpdate', (result) => {
		console.warn('publisherStateUpdate', result);
		if (result.state === 'PUBLISHING') {
			$('#pushlishInfo-id').text(result.streamFirstID);
		} else if (result.state === 'NO_PUBLISH') {
			$('#pushlishInfo-id').text('');
		}
	});

	zg.on('playerStateUpdate', (result) => {
		console.warn('playerStateUpdate', result);
		if (result.state === 'PLAYING') {
			$('#playInfo-id').text(result.streamFirstID);
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
}

function clearStream(flag) {
	if (flag === 'first') {
		firstStream && zg.destroyStream(firstStream);
		$('#publishFirstVideo')[0].srcObject = null;
		firstStream = null;
		firstPublished = false;
	}

	if (flag === 'second') {
		secondStream && zg.destroyStream(secondStream);
		$('#publishSecondVideo')[0].srcObject = null;
		secondStream = null;
		secondPublished = false;
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
		firstStream = await zg.createStream(config);
		zg.startPublishingStream(streamId, firstStream, { videoCodec });
		$('#publishFirstVideo')[0].srcObject = firstStream;
		return true;
	} catch (err) {
		return false;
	}
}

async function startPublishingSecondStream(streamId, config) {
	try {
		secondStream = await zg.createStream(config);
		zg.startPublishingStream(streamId, secondStream);
		$('#publishSecondVideo')[0].srcObject = secondStream;
		return true;
	} catch (err) {
		return false;
	}
}

async function stopPublishingStream(streamId, way) {
	zg.stopPublishingStream(streamId);
	if (remoteStream && $('#PublishID').val() === $('#PlayID').val()) {
		stopPlayingStream(streamId);
	}
	clearStream(way);
}

async function startPlayingStream(streamId, options = {}) {
	try {
		console.log('play 123123');
		remoteStream = await zg.startPlayingStream(streamId, options);
		console.log('play end');
		$('#playVideo')[0].srcObject = remoteStream;
		return true;
	} catch (err) {
		return false;
	}
}

async function stopPlayingStream(streamId) {
	zg.stopPlayingStream(streamId);
}

async function startMixerTask(taskID, streamList, mixStreamId) {
	try {
		const res = await zg.startMixerTask({
			taskID,
			inputList: streamList,
			outputList: [ mixStreamId ],
			outputConfig: {
				outputBitrate: 300,
				outputFPS: 15,
				outputWidth: 320,
				outputHeight: 480
			}
		});
		mixerOutputList = JSON.parse(res.extendedData).mixerOutputList;
		return res.errorCode;
	} catch (err) {
		return 1;
	}
}

async function stopMixerTask(taskID) {
	await zg.stopMixerTask(taskID);
	clearStream('mixed');
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
			logoutRoom(id);
			updateButton(this, 'Login Room', 'Logout Room');
			$('#UserID')[0].disabled = false;
			$('#RoomID')[0].disabled = false;
		}
	}, 500)
);
$('#startFirstPublishing').on(
	'click',
	util.throttle(async function() {
		const id = streamFirstID;
		this.classList.add('border-primary');
		if (!firstPublished) {
			const flag = await startPublishingStream(id);
			if (flag) {
				updateButton(this, 'Start Publishing', 'Stop Publishing');
				firstPublished = true;
				$('#FirstStreamID')[0].disabled = true;
			} else {
				this.classList.remove('border-primary');
				this.classList.add('border-error');
				this.innerText = 'Publishing Fail';
			}
		} else {
			stopPublishingStream(id, 'first');
			updateButton(this, 'Start Publishing', 'Stop Publishing');
			firstPublished = false;
			$('#FirstStreamID')[0].disabled = false;
		}
	}, 500)
);

$('#startSecondPublishing').on(
	'click',
	util.throttle(async function() {
		const id = streamSecondID;
		this.classList.add('border-primary');
		if (!secondPublished) {
			const flag = await startPublishingSecondStream(id, getCreateStreamConfig());
			if (flag) {
				updateButton(this, 'Start Publishing', 'Stop Publishing');
				secondPublished = true;
				$('#SecondStreamID')[0].disabled = true;
			} else {
				this.classList.remove('border-primary');
				this.classList.add('border-error');
				this.innerText = 'Publishing Fail';
			}
		} else {
			stopPublishingStream(id, 'second');
			updateButton(this, 'Start Publishing', 'Stop Publishing');
			secondPublished = false;
			$('#SecondStreamID')[0].disabled = false;
		}
	}, 500)
);

$('#startMixTask').on(
	'click',
	util.throttle(async function() {
		const firstId = $('#FirstStreamID').val();
		const secondId = $('#SecondStreamID').val();
		const mixTask = $('#MixedStreamID').val();

		const streamList = [
			{
				streamID: firstId,
				layout: {
					top: 0,
					left: 0,
					bottom: 240,
					right: 320
				}
			},
			{
				streamID: secondId,
				layout: {
					top: 240,
					left: 0,
					bottom: 480,
					right: 320
				}
			}
		];

		this.classList.add('border-primary');
		if (!mixed) {
			const flag = await startMixerTask(mixTask, streamList, mixStreamID);
			if (flag === 0) {
				updateButton(this, 'Start Mix Task', 'Stop Mix Task');
				mixed = true;
				$('#MixedStreamID')[0].disabled = true;
			} else {
				this.classList.remove('border-primary');
				this.classList.add('border-error');
				this.innerText = 'Publishing Fail';
			}
		} else {
			stopMixerTask(mixTask);
			updateButton(this, 'Start Mix Task', 'Stop Mix Task');
			mixed = false;
			$('#MixedStreamID')[0].disabled = false;
		}
	}, 500)
);

$('#StartPlayingMixedStream').on(
	'click',
	util.throttle(async function() {
		if (!firstStream) return alert('no first stream');
		if (!secondStream) return alert('no second stream');
		if (!mixerOutputList) return alert('no mixed Stream');
		const videoEle = $('#playVideo')[0];
		if (!played) {
			if (navigator.userAgent.indexOf('iPhone') !== -1 && getBrowser() == 'Safari' && mixerOutputList[0].hlsURL) {
				const hlsUrl = mixerOutputList[0].hlsURL.replace('http', 'https');
				videoEle.src = hlsUrl;
			} else if (mixerOutputList[0].flvURL) {
				const flvUrl = mixerOutputList[0].flvURL.replace('http', 'https');
				if (flvjs.isSupported()) {
					flvPlayer = flvjs.createPlayer({
						type: 'flv',
						url: flvUrl
					});
					flvPlayer.attachMediaElement(videoEle);
					flvPlayer.load();
				}
			}
			updateButton(this, 'Start Playing Mixed Stream', 'Stop Playing Mixed Stream');
			played = true;
		} else {
			clearStream('play');
		}
	}, 500)
);

// bind event end

// ==============================================================
// This part of the code bias tool
// ==============================================================

function getCreateStreamConfig() {
	const config = {
		screen: {
			audio: true
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

// tool end

// ==============================================================
// This part of the code Initialization web page
// ==============================================================

async function render() {
	$('#roomInfo-id').text(roomID);
	$('#RoomID').val(roomID);
	$('#UserID').val(userID);
	$('#PublishFirstID').text(streamFirstID);
	$('#PublishSecondID').text(streamSecondID);
	$('#PlayID').val(mixStreamID);
	$('#FirstStreamID').val(streamFirstID);
	$('#SecondStreamID').val(streamSecondID);
	$('#MixedStreamID').val(mixStreamID);
	createZegoExpressEngine();
	await checkSystemRequirements();
	enumDevices();
	initEvent();
	setLogConfig();
}

render();

// Initialization end
