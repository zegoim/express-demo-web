// require('../../../../jquery')
// let appID;   // from  /src/KeyCenter.js
// let server;  // from  /src/KeyCenter.js
// let tokenUrl;  // from  /src/KeyCenter.js

// ==============================================================
// This part of the code defines the default values and global values
// ==============================================================

let userID = util.queryObj['userID'] || util.getBrow() + '_' + new Date().getTime();
let roomID = '0004';
let streamID = parseInt(Math.random() * 999999) + '';

let zg = null;
let isChecked = false;
let isLogin = false; 
let localStream = null;
let published = false;
let playMultipleStreamList = [];
let palyedObj = {};
let playMultipleUserList = [];
let playObj = {};
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

function initEvent() {
	zg.on('roomStateUpdate', (roomId, state) => {
		if(state === 'CONNECTED' && isLogin) {
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
		if (result.state === 'PUBLISHING') {
			$('#publishStreamID-info').text(result.streamID);
		} else if (result.state === 'NO_PUBLISH') {
			$('#publishStreamID-info').text('');
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
		$('#sendBitrate').text(parseInt(stats.video.videoBitrate));
		$('#sendFPS').text(parseInt(stats.video.videoFPS));
		$('#sendRTT').text(parseInt(stats.video.videoFPS));
		$('#sendPacket').text(parseInt(stats.video.videoPacketsLostRate));
	});
}

function playMultipleEvent() {
	zg.on('playQualityUpdate', (streamId, stats) => {
		if (streamId === streamID) {
			$('#playResolution').text(`${stats.video.frameWidth} * ${stats.video.frameHeight}`);
			$('#receiveBitrate').text(parseInt(stats.video.videoBitrate));
			$('#receiveFPS').text(parseInt(stats.video.videoFPS));
			$('#receivePacket').text(parseInt(stats.video.videoPacketsLostRate));
		} else {
			const spanList = $(`[data-id=${streamId}] span`);
			spanList[0].innerText = `${stats.video.frameWidth} * ${stats.video.frameHeight}`;
			spanList[1].innerText = parseInt(stats.video.videoBitrate);
			spanList[2].innerText = parseInt(stats.video.videoFPS);
			spanList[3].innerText = parseInt(stats.video.videoPacketsLostRate);
		}
	});

	zg.on('roomStreamUpdate', async (roomID, updateType, streamList, extendedData) => {

		// streams added
		if (updateType === 'ADD') {
			for (let i = 0; i < streamList.length; i++) {
				playMultipleStreamList.push(streamList[i]);

				// add item to streamList
				appednHtml(streamList[i].streamID, streamList[i].user);
				if (playObj[streamList[i].user.userID]) {
					$(`#m-${streamList[i].user.userID}`).attr('data-id', streamList[i].streamID);
					stopTostart(playObj[streamList[i].user.userID], streamList[i].streamID);
					$(`#s-${streamList[i].user.userID}`).text(streamList[i].streamID);
				}
				playObj[streamList[i].user.userID] = streamList[i].streamID;
			}
		} else if (updateType == 'DELETE') { 	//  streams deleted

			for (let k = 0; k < playMultipleStreamList.length; k++) {
				for (let j = 0; j < streamList.length; j++) {
					if (playMultipleStreamList[k].streamID === streamList[j].streamID) {
						stopPlayingStream(playMultipleStreamList[k].streamID);
						// remove item from streamList
						removeHtml(playMultipleStreamList[k].streamID);
						const node = $(`[data-id=${streamList[j].streamID}]`)[0];
						if (node) {
							const id = node.id.split('-')[1];
							stopToChangeUI.call($(`#b-${id}`)[0], id);
						}
						playMultipleStreamList.splice(k--, 1);
						break;
					}
				}
			}
		}

		$('#streamList').text(`StreamList (${playMultipleStreamList.length})`);
	});

	zg.on('roomUserUpdate', (roomID, updateType, userList) => {
		if (updateType === 'ADD') { 	// users added

			for (let i = 0; i < userList.length; i++) {
				playMultipleUserList.push(userList[i]);
				palyedObj[userList[i].userID] = false;
				// add play cell to playList and add item to userList
				appednHtml(null, userList[i]);
				// bind event by userId
				addMultiplePlayingEvent(userList[i].userID);
			}
		} else if (updateType == 'DELETE') { // users deleted
			for (let k = 0; k < playMultipleUserList.length; k++) {
				for (let j = 0; j < userList.length; j++) {
					if (playMultipleUserList[k].userID === userList[j].userID) {
						// remove cell from playList and remove item from userList
						removeHtml(null, playMultipleUserList[k]);
						playMultipleUserList.splice(k--, 1);
						break;
					}
				}
			}
		}
		$('#userList').text(`UserList (${playMultipleUserList.length})`);
	});
}

function destroyStream() {
		localStream && zg.destroyStream(localStream);
		$('#publishVideo')[0].srcObject = null;
		localStream = null;
		published = false;
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

function loginRoom(roomId, userId, userName, token) {
	return zg.loginRoom(roomId, token, {
		userID: userId,
		userName
	});
}

function logoutRoom(roomId) {
	if (localStream) {
		stopPublishingStream($('#publishStreamID-info').text());
	}
	zg.logoutRoom(roomId);
	destroyStream();
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
	destroyStream();
}

async function startPlayingMultipleStream(streamId, options = {}) {
	try {
		const stream = await zg.startPlayingStream(streamId, options);
		$(`[data-id=${streamId}] video`)[0].srcObject = stream;
		return true;
	} catch (err) {
		return false;
	}
}

async function stopPlayingStream(streamId) {
	zg.stopPlayingStream(streamId);
	const video = $(`[data-id=${streamId}] video`)[0];
	if (video) {
		video.srcObject = null;
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

$('#startPublishing').on(
	'click',
	util.throttle(async function() {
		this.classList.add('border-primary');
		if (!published) {
			const flag = await startPublishingStream(streamID, getCreateStreamConfig());
			if (flag) {
				updateButton(this, 'Start Publishing', 'Stop Publishing');
				published = true;
				changeVideo();
				setDisabled(true);
			} else {
				changeVideo(true);
				this.classList.remove('border-primary');
				this.classList.add('border-error');
				this.innerText = 'Publishing Fail';
			}
			$('#publishStreamID-info').text(streamID);
		} else {
			stopPublishingStream(streamID);
			updateButton(this, 'Start Publishing', 'Stop Publishing');
			published = false;
			$('#publishStreamID-info').text('');
			setDisabled(false);
		}
	}, 500)
);

// bind event end

// ==============================================================
// This part of the code bias tool
// ==============================================================

function getCreateStreamConfig() {
	const resolution = $('#captureResolution').val().split('*');
	const config = {
		camera: {
			audioInput: 'default',
			videoInput: $('#CameraDevices').val(),
			video: $('#Camera')[0].checked,
			audio: $('#Microphone')[0].checked,
			videoQuality: 4,
			frameRate: $('#FPS').val() * 1,
			width: resolution[0] * 1,
			height: resolution[1] * 1,
			bitRate: $('#Bitrate').val() * 1
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
		$('video').each((index, video) => {
			video.setAttribute('transform', 'none');
		});
		return;
	}
	const value = $('#Mirror').val();
	if (value === 'onlyPreview') {
		$('#publishVideo').css('transform', 'scale(-1, 1)');
	} else if (value === 'onlyPlay') {
		$('video').each((index, video) => {
			if (video.id !== 'publishVideo') video.setAttribute('transform', 'scale(-1, 1)');
		});
	} else if (value === 'both') {
		$('video').each((index, video) => {
			video.setAttribute('transform', 'scale(-1, 1)');
		});
	}
}

// When users or streams added
function appednHtml(streamId, user) {
	if (streamId) {

		// add new item to streamList
		$('#streamListUl').append(`
    <li id="l-${streamId}">
    <div class="drop-item">
      <span class="f-b-3 t-nowrap m-r-10">StreamID: ${streamId}</span>
      <span class="f-b-3 t-nowrap m-r-5">UserID: ${user.userID}</span>
      <span class="f-b-3 t-nowrap ">Name: ${user.userName}</span>
    </div>
    </li>
    `);
	}

	if (!streamId && user) {
		// add new item to PlayList
		$('#videoList').append(
			`<div class="preview-playInfo col-6" id="m-${user.userID}">
        <div class="preview-content">
        <div class="preview-action">
          <div class="preview-info">
            <div>Resolution: <span></span></div>
            <div>Video Send Bitrate: <span></span></div>
            <div>Video Send FPS: <span></span></div>
            <div>Packet Loss: <span></span></div>
          </div>
          <div class="preview-video-action">
            <div class="font-12 publish-check m-b-5 m-t-5">
              <div class="check-wrappre m-r-5">
                <label class="form-check-label m-r-5">Video</label>
                <input class="check-input" type="checkbox" checked>
              </div>
              <div class="check-wrappre">
                <label class="form-check-label m-r-5">Audio</label>
                <input class="check-input" type="checkbox" checked>
              </div>
            </div>
            <button id='b-${user.userID}' class="m-b-5 play-pause-button">Start Playing</button>
          </div>
        </div>
        <video controls autoplay playsinline></video>
      </div>
      <div class="font-12 t-nowrap">
			StreamID: <span id="s-${user.userID}"></span>
        <div>UserName: <span class="m-r-5">${user.userName}</span></div>
      </div>
    </div>`
		);

		// add new item to userList
		$('#userListUl').append(`
    <li id="u-${user.userID}">
    <div class="drop-item">
      <span class="f-b-5 t-nowrap m-r-5">UserID: ${user.userID}</span>
      <span class="f-b-5 t-nowrap ">Name: ${user.userName}</span>
    </div>
    </li>
    `);
	}
}

// When users or streams deleted
function removeHtml(streamId, user) {
	if (streamId) {
		document.getElementById(`l-${streamId}`).remove();
	}

	if (!streamId && user) {
		document.getElementById(`m-${user.userID}`).remove();
		document.getElementById(`u-${user.userID}`).remove();
	}
}

// Bind event by userId
function addMultiplePlayingEvent(userId) {
	$(`#b-${userId}`).on(
		'click',
		util.throttle(async function() {
			const selectId = this.id.split('-')[1];
			const configInput = $(`#m-${selectId} input`);
			this.classList.add('border-primary');
			if (!palyedObj[userId]) {
				const config = {
					video: configInput[0].checked,
					audio: configInput[1].checked
				};
				const streamId = playObj[userId];
				streamId && $(`#m-${selectId}`).attr('data-id', streamId);
				const flag = await startPlayingMultipleStream(streamId, config);
				if (flag) {
					updateButton(this, 'Start Playing', 'Stop Playing');
					palyedObj[userId] = true;
					$(`#s-${userId}`).text(streamId);
					configInput.each((idx, item) => {
						item.disabled = true;
					});
				} else {
					this.classList.remove('border-primary');
					this.classList.add('border-error');
					this.innerText = 'Playing Fail';
				}
			} else {
				configInput.each((idx, item) => {
					item.disabled = false;
				});
				stopPlayingStream(playObj[userId]);
				stopToChangeUI.call(this, userId);
			}
		}, 500)
	);
}

function stopToChangeUI(userId) {
	updateButton(this, 'Start Playing', 'Stop Playing');
	const spanList = $(`#m-${userId} span`);
	spanList[0].innerText = '';
	spanList[1].innerText = '';
	spanList[2].innerText = '';
	spanList[3].innerText = '';
	spanList[4].innerText = '';
	palyedObj[userId] = false;
	$(`#s-${userId}`).text('');
}

function setDisabled(flag) {
	$('#captureResolution')[0].disabled = flag;
	$('#FPS')[0].disabled = flag;
	$('#Bitrate')[0].disabled = flag;
	$('#Mirror')[0].disabled = flag;
	$('#CameraDevices')[0].disabled = flag;
	$('#Camera')[0].disabled = flag;
	$('#Microphone')[0].disabled = flag;
}

async function stopTostart(oldId, newId) {
	await stopPlayingStream(oldId)
	startPlayingMultipleStream(newId)
}

// tool end

// ==============================================================
// This part of the code Initialization web page
// ==============================================================

async function render() {
	$('#roomInfo-id').text(roomID);
	$('#RoomID').val(roomID);
	$('#UserID').val(userID);
	createZegoExpressEngine();
	await checkSystemRequirements();
	// enumDevices();
	playMultipleEvent();
	initEvent();
	setLogConfig();
}

render();
// Initialization end
