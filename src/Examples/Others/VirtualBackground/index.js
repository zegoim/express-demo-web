// require('../../../../jquery')
// let appID;   // from  /src/KeyCenter.js
// let server;  // from  /src/KeyCenter.js
// let tokenUrl;  // from  /src/KeyCenter.js

// ==============================================================
// This part of the code defines the default values and global values
// ==============================================================
ZegoExpressEngine.use(BackgroundProcess)

let userID = Util.getBrow() + '_' + new Date().getTime();
let roomID = '0033';
let streamID = userID;
let zg = null;
let isChecked = false;
let isLogin = false;
let localStream = null;
let remoteStream = null;
let published = false;
let played = false;
let videoCodec = localStorage.getItem('VideoCodec') === 'H.264' ? 'H264' : 'VP8'

let isBeautyEnabled = false;
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
	localStream = null;
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

async function initBackground() {
	if ((
		navigator.userAgent.match(/Mobi/i) ||
		navigator.userAgent.match(/Android/i) ||
		navigator.userAgent.match(/iPhone/i)
	)) {
		return alert('Not support in Mobile, Please use in Desktop')
	}
	try {
            zg.initBackgroundModule && await zg.initBackgroundModule(0, "./assets");
    } catch (err) {
        console.error(err);
    }
}


async function preview() {
	try {
		localStream = await zg.createStream({
			camera: {
				videoQuality: 4,
				width: 480,
				height: 320,
				bitrate: 1000,
        		frameRate: 15
			}
		});
		const localView = zg.createLocalStreamView(localStream);
		localView.play("localVideo", {
			mirror: true,
			objectFit: "cover",
			enableAutoplayDialog: true,
		})
		$('#localVideo').show()
		return true;
	} catch (err) {
		return false;
	}
}

async function setBackgroundProcess(enable) {
	try {
		await zg.enableBackgroundProcess(localStream, enable, 0);
	} catch (err) {
		console.error(err)
	}
}

async function setBlurEffect() {
	const blurDegree = parseInt($('[name=blur-degree]:checked').val())
	zg.setBackgroundBlurOptions(localStream, {
		blurDegree
	});
	await setBackgroundProcess(true)
}

async function setVirtualEffect() {
	const img = document.getElementById("backImg");
	
	zg.setVirtualBackgroundOptions(localStream, {
		source: img,
		objectFit: 'cover'
	});
	await setBackgroundProcess(true)
}

async function setBackgroundEffect() {
	const checked = $('[name=bg-mode]:checked')
	const mode = checked.val()

	switch (mode) {
		case 'none': 
			await setBackgroundProcess(false)
			break;
		case 'blur':
			setBlurEffect()
			break;
		case 'virtual':
			setVirtualEffect();
			break;
	}
}

function logoutRoom(roomID) {
	destroyStream()
	zg.logoutRoom(roomID)
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
				isLogin = true
				await loginRoom(id, userID, userID, token)
				updateButton(this, 'Login Room', 'Logout Room');
				$('#UserID')[0].disabled = true;
				$('#RoomID')[0].disabled = true;
				// $('#LoginRoom').hide()
				const previewSuc = await preview();
				previewSuc && setBackgroundEffect();
			} catch (err) {
				isLogin = false;
				this.classList.remove('border-primary');
				this.classList.add('border-error');
				this.innerText = 'Login Fail Try Again';
			}
		} else {
			isLogin = false;
			logoutRoom(id);
			updateButton(this, 'Login Room', 'Logout Room');
			$('#UserID')[0].disabled = false;
			$('#RoomID')[0].disabled = false;
		}
	}, 500)
);

$('[name=bg-mode]').change(function () {
	setBackgroundEffect()
})

$('[name=blur-degree]').change(function () {
    const checked = $('[name=bg-mode]:checked')
    if (checked.val() === 'blur') {
		setBlurEffect()
	}
})

$('#selectImg').click(function() {
	$('#inputImg').click()
})

$('#inputImg').change(function() {
	const img = this.files[0];

	if (!img.type.startsWith('image')) {
		alert('只支持图片')
	}
	const backImg = document.getElementById("backImg");
	backImg.onload = () => {
		setVirtualEffect()
	}
	const url = URL.createObjectURL(img);
	backImg.src = url;
	
})
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

// tool end

// ==============================================================
// This part of the code Initialization web page
// ==============================================================

async function render() {
	$('#roomInfo-id').text(roomID);
	$('#RoomID').val(roomID);
	$('#UserName').val(userID);
	$('#UserID').val(userID);
	createZegoExpressEngine();
	await checkSystemRequirements();
	enumDevices();
	initEvent();
	setLogConfig();
	initBackground();
}

render();

// Initialization end
