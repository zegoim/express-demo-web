let cameraList = []
let microphoneList = []
let speakerList = []
const deviceTypes = ["camera", "microphone", "speaker"]
let zg = new ZegoExpressEngine(appID, server);

/**
 * Get media devices since SDK version 2.14.0
 */
async function checkDeviceConnection() {
  detectMicrophone(false)
  detectCamera(false)
  detectSpeaker(false)

  // display microphones
  zg.getMicrophones().then(list => {
    microphoneList = list
    const options = microphoneList.map((item, index) => {
      if (!item.deviceName) {
        item.deviceName = 'microphone' + index;
      }
      return ' <option value="' + item.deviceID + '">' + item.deviceName + '</option>';
    });
    if (microphoneList.length > 0) {
      $('#select-mic').html(options.join('')).show();
      $('#conn-mic').hide()
    }
  }).catch(error => {
    microphoneList = []
    $('#select-mic').hide()
    $('#conn-mic').show()
  })

  // display cameras
  zg.getCameras().then(list => {
    cameraList = list
    const options = cameraList.map((item, index) => {
      if (!item.deviceName) {
        item.deviceName = 'cameraList' + index;
      }
      return ' <option value="' + item.deviceID + '">' + item.deviceName + '</option>';
    });
    if (cameraList.length > 0) {
      $('#select-camera').html(options.join('')).show();
      $('#conn-camera').hide()
    }
  }).catch(error => {
    cameraList = []
    $('#select-camera').hide()
    $('#conn-camera').show()
  })

  // display speakers
  zg.getSpeakers().then(list => {
    speakerList = list
    const options = speakerList.map((item, index) => {
      if (!item.deviceName) {
        item.deviceName = 'speakerList' + index;
      }
      return ' <option value="' + item.deviceID + '">' + item.deviceName + '</option>';
    });
    if (speakerList.length > 0) {
      $('#select-speaker').html(options.join('')).show();
      $('#conn-speaker').hide()
    }
  }).catch(error => {
    speakerList = []
    $('#select-speaker').hide()
    $('#conn-speaker').show()
  })
}

/**
 * Get media devices before SDK version 2.14.0
 */
async function checkDeviceConnectionV2() {
  detectMicrophone(false)
  detectCamera(false)
  detectSpeaker(false)
  // get media device permissions
  try {
    const stream = await zg.createStream({ camera: { video: true, audio: true } });
    zg.destroyStream(stream);
  } catch (error) {
    microphoneList = []
    $('#select-mic').hide()
    $('#conn-mic').show()
    cameraList = []
    $('#select-camera').hide()
    $('#conn-camera').show()
    speakerList = []
    $('#select-speaker').hide()
    $('#conn-speaker').show()
    throw error
  }
  // enum devices
  zg.enumDevices().then((devices) => {
    // display microphones
    microphoneList = devices.microphones
    let options = microphoneList.map((item, index) => {
      if (!item.deviceName) {
        item.deviceName = 'microphone' + index;
      }
      return ' <option value="' + item.deviceID + '">' + item.deviceName + '</option>';
    });
    if (microphoneList.length > 0) {
      $('#select-mic').html(options.join('')).show();
      $('#conn-mic').hide()
    } else {
      $('#select-mic').hide()
      $('#conn-mic').show()
    }
    // display cameras
    cameraList = devices.cameras
    options = cameraList.map((item, index) => {
      if (!item.deviceName) {
        item.deviceName = 'cameraList' + index;
      }
      return ' <option value="' + item.deviceID + '">' + item.deviceName + '</option>';
    });
    if (cameraList.length > 0) {
      $('#select-camera').html(options.join('')).show();
      $('#conn-camera').hide()
    } else {
      $('#select-camera').hide()
      $('#conn-camera').show()
    }
    // display speakers
    speakerList = devices.speakers
    options = speakerList.map((item, index) => {
      if (!item.deviceName) {
        item.deviceName = 'speakerList' + index;
      }
      return ' <option value="' + item.deviceID + '">' + item.deviceName + '</option>';
    });
    if (speakerList.length > 0) {
      $('#select-speaker').html(options.join('')).show();
      $('#conn-speaker').hide()
    } else {
      $('#select-speaker').hide()
      $('#conn-speaker').show()
    }
  })
}


const detectMicrophone = (() => {
  micStream = null
  return async (detect = true) => {
    detect ? $("#result-microphone").show() : $("#result-microphone").hide()
    if (micStream) {
      zg.destroyStream(micStream)
      micStream = null
      zg.setSoundLevelDelegate(false);
      $("#mic-progress").val(0)
    }
    if (!detect) return
    const deviceID = $("#select-mic").val()
    if (deviceID !== undefined) {
      micStream = await zg.createStream({
        camera: {
          video: false,
          audio: true,
          audioInput: deviceID
        }
      }).catch(
        error => {
          console.error("Detect microphone fail:", error);
        }
      )
      zg.setSoundLevelDelegate(true, 300);
    }
  }
})()

const detectCamera = (() => {
  stream = null
  return async (detect = true) => {
    detect ? $("#result-camera").show() : $("#result-camera").hide()
    if (stream) {
      zg.destroyStream(stream)
      stream = null
      document.querySelector("#camera-view").srcObject = undefined
    }
    if (!detect) return
    const deviceID = $("#select-camera").val()
    if (deviceID !== undefined) {
      stream = await zg.createStream({
        camera: {
          video: true,
          videoInput: deviceID,
          audio: false
        }
      }).catch(
        error => {
          console.error("Detect camera fail:", error);
        }
      )
      document.querySelector("#camera-view").srcObject = stream
    }
  }
})()

function detectSpeaker(detect = true) {
  const player = document.querySelector("#music-player")
  detect ? $("#result-speaker").show() : $("#result-speaker").hide()
  if (!detect) {
    player?.pause()
    return
  }
  const deviceID = $("#select-speaker").val()
  if (deviceID !== undefined) {
    try {
      // `useAudioOutputDevice`  is supported since version 2.15.0
      zg.useAudioOutputDevice(player, deviceID)
      player?.play()
    } catch (error) {
      console.error("Detect speaker fail:", error);
    }
  }
}

function detectDevice(type) {
  if (type === "camera") {
    detectCamera()
    detectMicrophone(false)
    detectSpeaker(false)
  } else if (type === "microphone") {
    detectMicrophone()
    detectCamera(false)
    detectSpeaker(false)
  } else if (type === "speaker") {
    detectSpeaker()
    detectMicrophone(false)
    detectCamera(false)
  }
}



// 主入口函数
// Main
function main() {
  // bind SDK events
  zg.on("capturedSoundLevelUpdate", (level) => {
    $("#mic-progress").val(level)
  })
  checkDeviceConnection()
}
main()