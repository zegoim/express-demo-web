// ==============================================================
// This part of the code defines the default values and global values
// ==============================================================
let test_appID = 1739272706; // test appID
let webRTC = false;
let capture = false;
let H264State = false;
let H265State = false;
let VP8State = false;
let localStream = null;
let isAudioInput = false;
let isVideoInput = false;
let audioinputInfos = '';
let videoinputInfos = '';
let audiooutputInfos = '';
const resolutionList=[
  { height: 180, width: 320, resolutionState: '' },
  { height: 240, width: 320, resolutionState: '' },
  { height: 264, width: 480, resolutionState: '' },
  { height: 360, width: 640, resolutionState: '' },
  { height: 480, width: 640, resolutionState: '' },
  { height: 540, width: 960, resolutionState: '' },
  { height: 720, width: 1280, resolutionState: '' },
  { height: 1080, width: 1920, resolutionState: '' }
]
// part end

// ==============================================================
// This part of the code uses the SDK
// ==============================================================
function createZegoExpressEngine() {
    zg = new ZegoExpressEngine(test_appID, server);
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
  return zg.enumDevices().then(devices => {
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
    const config = {
      ...resolutionList[i],
      videoQuality: 4,
      frameRate: 15,
      bitRate: 800
    };
    const supported = await resolutionDetection(config);
    localStream && zg.destroyStream(localStream);
    resolutionList[i].resolutionState = supported ? $.i18n.map['resolution.supported'] : $.i18n.map['resolution.unsupported'];
    render();
  }
}
// uses SDK end


// ==============================================================
// This part of the code renders the WebRTC capability check results
// ==============================================================
function render() {
  function _h(state,suc,err){
    return state ? `<div class="alert alert-success">${suc}</div>` : `<div class="alert alert-danger">${err}</div>`
  }
  $("#webrtc").html(_h(webRTC,$.i18n.map['webrtc.support.yes'],$.i18n.map['webrtc.support.no']))
  $("#capture").html(_h(capture,$.i18n.map['device.capture.yes'],$.i18n.map['device.capture.no']))
  $("#H264State").html(_h(H264State,$.i18n.map['codec.h264.yes'],$.i18n.map['codec.h264.no']))
  $("#H265State").html(_h(H265State,$.i18n.map['codec.h265.yes'],$.i18n.map['codec.h265.no']))
  $("#VP8State").html(_h(VP8State,$.i18n.map['codec.vp8.yes'],$.i18n.map['codec.vp8.no']))
  if($('#videoinputState').text() === $.i18n.map['DetectionComplete']){
    let videoInputContent = _h(isVideoInput,$.i18n.map['device.video.yes'],$.i18n.map['device.video.no'])
    isVideoInput && (videoInputContent+=videoinputInfos);
    $("#videoinputInfos").html(videoInputContent)
  }
  
  if($('#audioinputState').text() === $.i18n.map['DetectionComplete']){
    let audioInputContent = _h(isAudioInput,$.i18n.map['device.audio.yes'],$.i18n.map['device.audio.no'])
    isAudioInput && (audioInputContent+=audioinputInfos);
    $("#audioinputInfos").html(audioInputContent)
  }
  
  $("#audiooutputInfos").html(audiooutputInfos)

  if($('#resolutionState').text() === $.i18n.map['DetectionComplete']){
    $('#resolutionList').empty();
    resolutionList.forEach(item => {
      $('#resolutionList').append(
        `<p>
          ${item.width}x${item.height}：
          <span>${item.resolutionState || $.i18n.map['resolution.pending']}</span>
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
  $('.webrtcState').text($.i18n.map['Detecting']);
  
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
      $('.webrtcState').text($.i18n.map['DetectionComplete']);
      $('#audioinputState').text($.i18n.map['Detecting']);
      $('#videoinputState').text($.i18n.map['Detecting']);
      setTimeout(async () => {
        await checkDeviceSupport();
        $('#audioinputState').text($.i18n.map['DetectionComplete']);
        $('#videoinputState').text($.i18n.map['DetectionComplete']);
        $('#resolutionState').text($.i18n.map['Detecting']);
        render()
        setTimeout(() => {
          checkResolution();
          $('#resolutionState').text($.i18n.map['DetectionComplete']);
        }, 2500);
      }, 2500);
    }, 2500);
    
}
$('#startTest').on('click', startTest);
// part end