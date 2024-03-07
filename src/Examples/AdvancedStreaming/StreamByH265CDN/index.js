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
let zegoExpressPlayer = null;
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

function initEvent() {
  zg.on('roomStateUpdate', (roomId, state) => {
		if(state === 'CONNECTED') {
			$('#roomStateSuccessSvg').css('display', 'inline-block');
			$('#roomStateErrorSvg').css('display', 'none');
		}
		
		if (state === 'DISCONNECTED') {
			$('#roomStateSuccessSvg').css('display', 'none');
			$('#roomStateErrorSvg').css('display', 'inline-block');
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
      $('#playInfo-id-exp').text(result.streamID)
    } else if(result.state === "NO_PLAY") {
      $('#playInfo-id').text('')
      $('#playInfo-id-exp').text('')
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
async function loginRoom(roomId, userId, userName, token) {
	return await zg.loginRoom(roomId, token, {
		userID: userId,
		userName
	});
}

async function bindExpressPlayer({
    zg,
    box,
    panelWidth,
    panelHeight,
    token,
    userID
}) {
  let muted = false;
  let isFull = false;
  let played = false;
  const sign = Date.now();
  const template = `
      <div id="player-panel-${sign}" class="zep-player">
          <div id="loading-wrapper-${sign}" class="zep-center zep-display-none">
              <div class="zep-loading"></div>
          </div>
          <div id="express-player-${sign}" class="zep-express-player">
              <div zg-width="${panelWidth}"></div>
          </div>
          <div class="zep-player-control" id="player-control-${sign}">
              <div class="zep-play-btn" id="playOrPause-${sign}">
                  <svg style="display: none;" t="1709655626374" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3841" width="26" height="26"><path d="M320 938.666667a21.333333 21.333333 0 0 1-21.333333-21.333334V106.666667a21.333333 21.333333 0 0 1 42.666666 0v810.666666a21.333333 21.333333 0 0 1-21.333333 21.333334z m405.333333-21.333334V106.666667a21.333333 21.333333 0 0 0-42.666666 0v810.666666a21.333333 21.333333 0 0 0 42.666666 0z" fill="#ffffff" p-id="3842"></path></svg> 
                  <svg t="1709655581363" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2794" width="26" height="26"><path d="M224 938.713333a53.58 53.58 0 0 1-53.333333-53.433333V138.72a53.333333 53.333333 0 0 1 80.886666-45.666667l618.666667 373.28a53.333333 53.333333 0 0 1 0 91.333334l-618.666667 373.28a53.16 53.16 0 0 1-27.553333 7.766666z m0.046667-810.666666a10.98 10.98 0 0 0-5.333334 1.42 10.466667 10.466667 0 0 0-5.38 9.253333v746.56a10.666667 10.666667 0 0 0 16.18 9.133333l618.666667-373.28a10.666667 10.666667 0 0 0 0-18.266666l-618.666667-373.28a10.386667 10.386667 0 0 0-5.446666-1.586667z" fill="#fff" p-id="2795"></path></svg>
              </div>
              <div class="zep-fullscreen-btn" id="fullscreen-${sign}">
                  <svg style="display: none;" fill="#fff" width="30" height="30" t="1709654976070" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1596" ><path d="M354.133333 682.666667H256v-42.666667h170.666667v170.666667H384v-98.133334L243.2 853.333333l-29.866667-29.866666L354.133333 682.666667z m358.4 0l140.8 140.8-29.866666 29.866666-140.8-140.8V810.666667h-42.666667v-170.666667h170.666667v42.666667h-98.133334zM354.133333 384L213.333333 243.2l29.866667-29.866667L384 354.133333V256h42.666667v170.666667H256V384h98.133333z m358.4 0H810.666667v42.666667h-170.666667V256h42.666667v98.133333L823.466667 213.333333l29.866666 29.866667L712.533333 384z" p-id="1597"></path></svg>
                  <svg fill="#fff" width="30" height="30" t="1709654341764" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1457"><path d="M285.866667 810.666667H384v42.666666H213.333333v-170.666666h42.666667v98.133333l128-128 29.866667 29.866667-128 128z m494.933333 0l-128-128 29.866667-29.866667 128 128V682.666667h42.666666v170.666666h-170.666666v-42.666666h98.133333zM285.866667 256l128 128-29.866667 29.866667-128-128V384H213.333333V213.333333h170.666667v42.666667H285.866667z m494.933333 0H682.666667V213.333333h170.666666v170.666667h-42.666666V285.866667l-128 128-29.866667-29.866667 128-128z" p-id="1458"></path></svg>
              </div>
              <div class="zep-mute-btn" id="mute-${sign}">
                  <svg t="1709690759407" style="display: none;" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5111" width="26" height="26"><path d="M448 938.666667a21.333333 21.333333 0 0 1-15.093333-6.246667L225.833333 725.333333H53.333333a53.393333 53.393333 0 0 1-53.333333-53.333333V352a53.393333 53.393333 0 0 1 53.333333-53.333333h172.5l207.08-207.086667A21.333333 21.333333 0 0 1 469.333333 106.666667v810.666666a21.333333 21.333333 0 0 1-21.333333 21.333334zM53.333333 341.333333a10.666667 10.666667 0 0 0-10.666666 10.666667v320a10.666667 10.666667 0 0 0 10.666666 10.666667h181.333334a21.333333 21.333333 0 0 1 15.086666 6.246666L426.666667 865.833333V158.166667L249.753333 335.086667A21.333333 21.333333 0 0 1 234.666667 341.333333z m964.42 377.753334a21.333333 21.333333 0 0 0 0-30.173334L840.833333 512l176.92-176.913333a21.333333 21.333333 0 1 0-30.173333-30.173334L810.666667 481.833333 633.753333 304.913333a21.333333 21.333333 0 0 0-30.173333 30.173334L780.5 512l-176.92 176.913333a21.333333 21.333333 0 0 0 30.173333 30.173334L810.666667 542.166667l176.913333 176.92a21.333333 21.333333 0 0 0 30.173333 0z" fill="#ffffff" p-id="5112"></path></svg>
                  <svg t="1709690846825" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5377" width="26" height="26"><path d="M448 938.666667a21.333333 21.333333 0 0 1-15.093333-6.246667L225.833333 725.333333H53.333333a53.393333 53.393333 0 0 1-53.333333-53.333333V352a53.393333 53.393333 0 0 1 53.333333-53.333333h172.5l207.08-207.086667A21.333333 21.333333 0 0 1 469.333333 106.666667v810.666666a21.333333 21.333333 0 0 1-21.333333 21.333334zM53.333333 341.333333a10.666667 10.666667 0 0 0-10.666666 10.666667v320a10.666667 10.666667 0 0 0 10.666666 10.666667h181.333334a21.333333 21.333333 0 0 1 15.086666 6.246666L426.666667 865.833333V158.166667L249.753333 335.086667A21.333333 21.333333 0 0 1 234.666667 341.333333z m664.266667 437.246667a21.333333 21.333333 0 0 1-13.733333-37.666667c6.666667-5.586667 13.146667-11.553333 19.333333-17.726666C779.6 666.78 810.666667 591.78 810.666667 512s-31.066667-154.78-87.48-211.186667c-6.173333-6.173333-12.666667-12.14-19.333334-17.726666a21.333333 21.333333 0 1 1 27.446667-32.666667 346.585333 346.585333 0 0 1 22.046667 20.213333 341.066667 341.066667 0 0 1 0 482.72 346.585333 346.585333 0 0 1-22.046667 20.213334 21.24 21.24 0 0 1-13.7 5.013333zM629.333333 625.72a21.333333 21.333333 0 0 1-16.733333-34.546667 127.366667 127.366667 0 0 0 0-158.346666 21.333333 21.333333 0 0 1 33.486667-26.433334 170.733333 170.733333 0 0 1 0 211.213334A21.333333 21.333333 0 0 1 629.333333 625.72z" fill="#ffffff" p-id="5378"></path></svg>
              </div>
          </div>
      </div>
  `
  box.innerHTML = template;
  const panel = document.querySelector(`#player-panel-${sign}`);
  panel.style.width = panelWidth + "px";
  panel.style.height = panelHeight + "px";
  const container = document.querySelector(`#express-player-${sign} div`);
  const video = document.querySelector(`#express-player-${sign}`);
  const controlBar = document.querySelector(`#player-control-${sign}`);
  const fullscreenButton = document.querySelector(`#fullscreen-${sign}`);
  const fullscreenIcons = document.querySelectorAll(`#fullscreen-${sign} svg`);
  const fullScreenPrefixes = ["", "moz", "webkit", "ms"];
  fullscreenIcons[0].style.display = 'none';
  const playButton = document.querySelector(`#playOrPause-${sign}`);
  const playButtonIcons = document.querySelectorAll(`#playOrPause-${sign} svg`);
  playButtonIcons[0].style.display = 'none';
  const muteButton = document.querySelector(`#mute-${sign}`);
  const muteButtonIcons = document.querySelectorAll(`#mute-${sign} svg`);
  muteButtonIcons[0].style.display = 'none';
  const loadingIcon = document.querySelector(`#loading-wrapper-${sign}`);
  const activePlayerControlBar = activePlayerControlBar_();
  let mediaInfo = null;
  let bindScreenChangeEvent = false;
  resizeControlBar();

  const player = new window.ZegoExpressPlayer(zg, {
      container: container,
      mode: "live",
  });

  const res = await player.verify(token, userID);
  if (!res) {
    alert("播放器鉴权失败");
    return;
  }
  activePlayerControlBar();

  panel.onmousemove = function() {
      activePlayerControlBar();
  }

  playButton.onclick = function() {
      switchPlay();
  }

  muteButton.onclick = function() {
      switchMute();
  }

  video.onclick = function() {
      switchPlay();
      activePlayerControlBar();
  }

  player.onPlay = () => {
      setPlayed(true);
  }

  player.onPaused = () => {
      setPlayed(false);
  }

  player.onError = (err) => {
      player.pause();
      setPlayed(false);
      activePlayerControlBar();
      console.error(err);
      if (err.code === 100006) {
        // 自动播放失败处理，引导用户点击后调 player.play();
    }
  }

  player.onWaiting = () => {
      loadingIconEnable();
  }
  
  player.onPlaying = () => {
      loadingIconDisable();
  }

  player.onEnded = () => {
      loadingIconDisable();
  }

  player.onCanPlay = () => {
      loadingIconDisable();
  }
  
  player.onLoaded = () => {
      loadingIconDisable();
  }

  player.onRecvSEI = (byte) => {
      console.warn("recv SEI: ", byte);
  }

  player.onMediaInfoUpdate = (info) => {
      mediaInfo = info;
      mediaInfo && switchVideoSize(info.frameWidth, info.frameHeight, panel.clientWidth, panel.clientHeight);
  }

  fullscreenButton.onclick = function() {
      if (isIOS() && !hasRequestFullScreenApi()) {
          switchPageFull();
      } else {
          switchScreenFull();
      }
  }

  window.addEventListener("resize", function() {
      const nextHeight = panel.clientHeight;
      const nextWidth = panel.clientWidth;
      mediaInfo && switchVideoSize(mediaInfo.frameWidth, mediaInfo.frameHeight, nextWidth, nextHeight);
  });

  function resizeControlBar() {
      if (window.screen.width < 500) {
          controlBar.style.height = "80px";
          const barButtons = document.querySelectorAll(`#player-control-${sign} div`)
          barButtons.forEach(div => {                    
              div.style.width = "80px";
              div.style.height = "80px";
          });
          const barIcons = document.querySelectorAll(`#player-control-${sign} svg`);
          barIcons.forEach(svg => {
              svg.style.width = "80px";
              svg.style.height = "80px";
          })
      }
  }

  function setMute(bool) {
      if (bool) {
          player.setMuted(true);
          muted = true;
          muteButtonIcons[0].style.display = 'block';
          muteButtonIcons[1].style.display = 'none';
      } else {
          player.setMuted(false);
          muted = false;
          muteButtonIcons[0].style.display = 'none';
          muteButtonIcons[1].style.display = 'block';
      }
  }

  function switchMute() {
      if (muted) {
          setMute(false);
      } else {
          setMute(true);
      }
  }

  function switchPageFull() {
      if (!isFull) {
          onFullScreenEnter();
      } else {
          onFullScreenOut();
      }
  }

  function switchScreenFull() {
      if (!bindScreenChangeEvent) {
          fullScreenPrefixes.forEach(prefix => {
              document.addEventListener(prefix + "fullscreenchange", onFullScreenChange);
          });
          bindScreenChangeEvent = true;
      }
      requestDivFullScreen(panel);
  }

  function onFullScreenChange() {
      if (windowIsFullScreen()) {
          onFullScreenEnter();
      } else {
          onFullScreenOut();
      }
  }

  function isIOS() {
      return /(iPhone|iPad|iPod|iOS|ios)/i.test(navigator.userAgent);
  }

  function hasRequestFullScreenApi() {
      return !!document.fullscreenEnabled;
  }

  function switchVideoSize(frameWidth, frameHeight, panelWidth, panelHeight) {
      if (frameHeight <= 0 || frameWidth <= 0) {
          return;
      }
      const scale = frameWidth / frameHeight;
      if (panelHeight * scale > panelWidth) {
          container.setAttribute("zg-width", panelWidth);
          container.removeAttribute("zg-height");
      } else {
          container.setAttribute("zg-height", panelHeight);
          container.removeAttribute("zg-width");
      }
  }

  function activePlayerControlBar_() {
      let timer = null;
      return function() {
          if (timer) {
              clearTimeout(timer);
              timer = null;
          }
          if (controlBar.style.display === 'none') {
              controlBar.style.display = 'block';
          }
          timer = setTimeout(()=>{
              controlBar.style.display = 'none';
          }, 3000);
      }
  }

  function setPlayed(bool) {
      if (bool) {
          played = true;
          playButtonIcons[0].style.display = 'block';
          playButtonIcons[1].style.display = 'none';
      } else {
          played = false;
          playButtonIcons[0].style.display = 'none';
          playButtonIcons[1].style.display = 'block';
      }
  }

  function switchPlay() {
      if (!played) {
          player.play();
          setPlayed(true);
      } else {
          player.pause();
          setPlayed(false);
      }
  }

  function windowIsFullScreen(div) {
      return document.fullscreenElement || /* Standard syntax */
      // @ts-ignore
      document.webkitFullscreenElement || /* Chrome, Safari and Opera syntax */
      // @ts-ignore
      document.mozFullScreenElement || /* Firefox syntax */
      // @ts-ignore
      document.msFullscreenElement || /* IE/Edge syntax */
      // @ts-ignore
      document.webkitCurrentFullScreenElement
  }

  function loadingIconEnable() {
      if (loadingIcon && loadingIcon.classList.contains("zep-display-none")) {
          loadingIcon.classList.remove("zep-display-none");
      }
  }

  function loadingIconDisable() {
      if (loadingIcon && !loadingIcon.classList.contains("zep-display-none")) {
          loadingIcon.classList.add("zep-display-none");
      }
  }

  function requestDivFullScreen(div) {
      if (!div) return;

      if (windowIsFullScreen(div)) {
          document.exitFullscreen();
      } else {
          // 检查浏览器是否支持全屏功能
          if (div.requestFullscreen) {
              div.requestFullscreen();
          } else if (div.mozRequestFullScreen) { // Firefox
              div.mozRequestFullScreen();
          } else if (div.webkitRequestFullscreen) { // Chrome, Safari 和 Opera]
              div.webkitRequestFullscreen();
          } else if (div.msRequestFullscreen) { // Internet Explorer and Edge
              div.msRequestFullscreen();
          } else if (div.webkitSupportsFullscreen && div.webkitEnterFullscreen) {
              div.webkitEnterFullscreen(); // Mobile Safari
          }
      }
  }

  function onFullScreenEnter() {
      if (panel && !panel.classList.contains("zep-fullscreen")) {
          panel.classList.add("zep-fullscreen");
      }
      const nextHeight = panel.clientHeight;
      const nextWidth = panel.clientWidth;
      switchVideoSize(mediaInfo.frameWidth, mediaInfo.frameHeight, nextWidth, nextHeight);

      fullscreenIcons[0].style.display = 'block';
      fullscreenIcons[1].style.display = 'none';
      isFull = true;
  }

  function onFullScreenOut() {
      if (panel && panel.classList.contains("zep-fullscreen")) {
          panel.classList.remove("zep-fullscreen");
      }
      const nextHeight = panel.clientHeight;
      const nextWidth = panel.clientWidth;
      switchVideoSize(mediaInfo.frameWidth, mediaInfo.frameHeight, nextWidth, nextHeight);
      fullscreenIcons[0].style.display = 'none';
      fullscreenIcons[1].style.display = 'block';
      isFull = false;
  }

  return {
      player,
      loadingIconEnable,
      loadingIconDisable,
      setMute,
      setPlayed
  };
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
			isLogin = false;
			updateButton(this, 'Login Room', 'Logout Room');
			$('#UserID')[0].disabled = false;
			$('#RoomID')[0].disabled = false;
		}
	}, 500)
);

$('#PlayStreamFromURL-exp').on('click', util.throttle(async function () {
  const url = $('#CdnUrl-exp').val()
  if(!url) alert('url is empty')
  const userID = $('#UserID').val();
  if(!userID) alert('userID is empty')
	const token = $('#Token').val();
  if(!token) alert('token is empty')


  if (zegoExpressPlayer != null) {
    zegoExpressPlayer.destroy();
    zegoExpressPlayer = null;
  }
  
  try {
    const box = document.getElementById("expressPlayerContainer");
    const { player } = await bindExpressPlayer({
      zg,
      box,
      panelHeight: box.clientHeight,
      panelWidth: box.clientWidth,
      token,
      userID
    });
    zegoExpressPlayer = player;

    zegoExpressPlayer.src = url;
    zegoExpressPlayer.play();
  } catch (err) {
    console.error(err);
    alert(JSON.stringify(err));
    return;
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
	$('#localVideo').hide()
  $('#publishVideo').hide()
  createZegoExpressEngine()
  await checkSystemRequirements()
  enumDevices()
  initEvent()
  setLogConfig()
}

render()

// Initialization end