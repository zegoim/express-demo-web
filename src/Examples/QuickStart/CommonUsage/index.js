// require('../../../../jquery')
let appID = 1739272706;
let server = 'wss://webliveroom-test.zego.im/ws';
let tokenUrl = 'https://wsliveroom-demo.zego.im:8282/token';
let userID = Util.getBrow() + '_' + new Date().getTime();
let roomID = '0001'

let loaclStream = null;
let remoteStream = null;
let zg = null;

// Step1 Create ZegoExpressEngine
function createZegoExpressEngine() {
  zg = new ZegoExpressEngine(appID, server);
  window.zg = zg
}

// Step2 Login room
function loginRoom(userId, userName) {
  return new Promise((resolve, reject) => {
    $.get(
      tokenUrl,
      {
        app_id: appID,
        id_name: userID
      },
      async (token) => {
        try {
          await zg.loginRoom(roomID, token, {
            userID: userId,
            userName
          });
          resolve()
        } catch (err) {
          reject()
        }
      }
    );
  })
}

// Step3 Start Publishing Stream

async function startPublishingStream (config, options = {}) {
  try {
    loaclStream = await zg.createStream(config);
    zg.startPublishingStream(streamID, loaclStream, options);
    return true
  } catch(err) {
    return false
  }
  
}


// Step4 Start Play Stream
async function startPlayingStream(streamId, options = {}) {
  try {
    remoteStream = await zg.startPlayingStream(streamId, options)
    return true
  } catch (err) {
    return false
  }
}

$('#CreateZegoExpressEngine').on('click', function () {
  createZegoExpressEngine()
  this.setAttribute('class', 'btn-info btn cuBtn')
  this.setAttribute('disabled', 'disabled')
  this.innerText = 'create success'
});

$('#CheckSystemRequire').on('click', async function () {
  if(!zg) return alert('you should create zegoExpressEngine')
  const result = await checkSystemRequirements();
  if(result) {
    this.setAttribute('class', 'btn-info btn cuBtn')
  }
})


async function checkSystemRequirements() {
  console.log('sdk version is', zg.getVersion());
  try {
      const result = await zg.checkSystemRequirements();

      console.warn('checkSystemRequirements ', result);
      !result.videoCodec.H264 && $('#videoCodeType option:eq(1)').attr('disabled', 'disabled');
      !result.videoCodec.VP8 && $('#videoCodeType option:eq(2)').attr('disabled', 'disabled');

      if (!result.webRTC) {
          console.log('browser is not support webrtc!!');
          return false;
      } else if (!result.videoCodec.H264 && !result.videoCodec.VP8) {
        console.log('browser is not support H264 and VP8');
          return false;
      } else if (result.videoCodec.H264) {
          supportScreenSharing = result.screenSharing;
          if (!supportScreenSharing) console.log('browser is not support screenSharing');
          previewVideo = $('#previewVideo')[0];
          // start();
      } else {
        console.log('不支持H264，请前往混流转码测试');
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

  $('#audioList').html(audioInputList.join(''));
  $('#videoList').html(videoInputList.join(''));
}