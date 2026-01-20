// ==============================================================
// This part of the code defines the default values and global values
// ==============================================================
let webRTC = false;
let capture = false;
let H264State = false;
let H265State = false;
let VP8State = false;
let localStream = null;
let isAudioInput = false;
let isVideoInput = false;
let isSound = false;
let audioinputInfos = '';
let videoinputInfos = '';
let audiooutputInfos = '';
const resolutionList=[
  { width: 180, height: 320, resolutionState: '' },
  { width: 240, height: 320, resolutionState: '' },
  { width: 264, height: 480, resolutionState: '' },
  { width: 360, height: 640, resolutionState: '' },
  { width: 480, height: 640, resolutionState: '' },
  { width: 540, height: 960, resolutionState: '' },
  { width: 720, height: 1280, resolutionState: '' },
  { width: 1080, height: 1920, resolutionState: '' }
]
// part end

// ==============================================================
// This part of the code uses the SDK
// ==============================================================
function createZegoExpressEngine() {
    zg = new ZegoExpressEngine(appID, server);
    window.zg = zg;
}
createZegoExpressEngine()
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
setLogConfig()

function checkDeviceSupport() {
  zg.enumDevices().then(devices => {
    if (devices.cameras.length) {
      videoinputInfos = devices.cameras.map(i => i.deviceName).join(' ')
      isVideoInput = true;
    }

    if (devices.microphones.length) {
      audioinputInfos = devices.microphones.map(i => i.deviceName).join(' ')
      isAudioInput = true
    }

    if (devices.speakers.length) {
      audiooutputInfos = devices.speakers.map(i => i.deviceName).join(' ')
    }
    render()
  });
}

async function resolutionDetection(camera) {
  try {
    localStream = await zg.createStream({ camera });
    const settings = localStream.getVideoTracks()[0].getSettings();

    return (
      camera.width === settings.width &&
      camera.height === settings.height
    );
  } catch (e) {
    return false;
  }
}

async function checkResolution() {
  render();
  for (let i = 0; i < resolutionList.length; i++) {
    localStream && zg.destroyStream(localStream);
    const config = {
      ...resolutionList[i],
      videoQuality: 4,
      frameRate: 15,
      bitRate: 800
    };
    const supported = await resolutionDetection(config);
    resolutionList[i].resolutionState = supported ? '支持' : '不支持';
    render();
  }
}

// uses SDK end

// Check microphone sound level
function checkMicrophoneSound() {
  window.AudioContext =
    window.AudioContext || window.webkitAudioContext || mozAudioContext;
  navigator.getUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia;
  if (!window.AudioContext || !navigator.getUserMedia) return;
  let context = new AudioContext();
  let script = context.createScriptProcessor(2048, 1, 1);

  navigator.getUserMedia(
    {
      audio: true
    },
    (stream) => {
      let audioinput = context.createMediaStreamSource(stream);
      audioinput.connect(script);
      script.connect(context.destination);
      isSound = true;
      render()
    }
  );

  script.onaudioprocess = (event) => {
    let input = event.inputBuffer.getChannelData(0);
    let instant = 0.0;
    let sum = 0.0;
    for (let i = 0; i < input.length; ++i) {
      sum += input[i] * input[i];
    }
    instant = Math.sqrt(sum / input.length);
    const sounder = instant * 100;
    $("#soundProgress .progress-bar").attr('aria-valuenow', sounder).css('width', sounder * 4 + '%');
  };
}
// tool end

// ==============================================================
// This part of the code renders the WebRTC capability check results
// ==============================================================
function render() {
  function _h(state,suc,err){
    return state ? `<div class="alert alert-success">${suc}</div>` : `<div class="alert alert-danger">${err}</div>`
  }
  $("#webrtc").html(_h(webRTC,'当前浏览器支持webrtc！！！','当前浏览器暂不支持webrtc！！！'))
  $("#capture").html(_h(capture,'当前浏览器支持获取设备！！！','当前浏览器不支持获取设备！！！'))
  $("#H264State").html(_h(H264State,'当前浏览器支持H264编码！！！','当前浏览器不支持H264编码！！！'))
  $("#H265State").html(_h(H265State,'当前浏览器支持H265编码！！！','当前浏览器不支持H265编码！！！'))
  $("#VP8State").html(_h(VP8State,'当前浏览器支持VP8编码！！！','当前浏览器暂不支持VP8编码！！！'))
  if($('#videoinputState').text() === "检测完成"){
    let videoInputContent = _h(isVideoInput,'检测到视频输入设备！！！','未检测到视频输入设备！！！')
    isVideoInput && (videoInputContent+=videoinputInfos);
    $("#videoinputInfos").html(videoInputContent)
  }
  
  if($('#audioinputState').text() === "检测完成"){
    let audioInputContent = _h(isAudioInput,'检测到音频输入设备！！！','未检测到音频输入设备！！！')
    isAudioInput && (audioInputContent+=audioinputInfos);
    $("#audioinputInfos").html(audioInputContent)
    if(isSound){
      $("#soundProgress").show()
    }
  }
  
  $("#audiooutputInfos").html(audiooutputInfos)

  if($('#resolutionState').text() === "检测完成"){
    $('#resolutionList').empty();
    resolutionList.forEach(item => {
      $('#resolutionList').append(
        `<p>
          ${item.width}x${item.height}：
          <span>${item.resolutionState || '待检测'}</span>
        </p>`
      );
    });
  }
}
// part end

// ==============================================================
// This part of the code binds the button click event
// ==============================================================
function startTest() {
  $('.webrtcState').text('正在检测...');

  zg.checkSystemRequirements()
    .then(result => {
      webRTC = result.webRTC;
      capture = result.camera && result.microphone;
      H264State = result.videoCodec.H264;
      H265State = result.videoCodec.H265;
      VP8State = result.videoCodec.VP8;
    })
    .catch(console.error);
    setTimeout(() => {
      render()
      $('.webrtcState').text('检测完成');
      $('#audioinputState').text('正在检测...');
      $('#videoinputState').text('正在检测...');
      setTimeout(() => {
        checkDeviceSupport();
        checkMicrophoneSound();
        $('#audioinputState').text('检测完成');
        $('#videoinputState').text('检测完成');
        $('#resolutionState').text('正在检测...');
        
        setTimeout(() => {
          checkResolution();
          $('#resolutionState').text('检测完成');
        }, 2500);
      }, 2500);
    }, 2500);
    
}
$('#startTest').on('click', startTest);
// part end