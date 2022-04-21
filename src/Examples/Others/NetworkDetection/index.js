// require('../../../../jquery')
// let appID;   // from  /src/KeyCenter.js
// let server;  // from  /src/KeyCenter.js

let zg = null;
let isDetecting = false;

let userID = 'user' + new Date().getTime();
let roomID = '0001'

const netQualityTextMap = {
  "-1": "unknown",
  "0": "★★★★★",
  "1": "★★★★☆",
  "2": "★★★☆☆",
  "3": "★★☆☆☆",
  "4": "★☆☆☆☆"
}

function startDetecting() {
  return new Promise(async (resolve, reject) => {
    if (!zg) return;

    let localStream = null
    function onDetectionEnd(error) {
      zg.off("publishQualityUpdate", eventHandler.playQualityUpdate);
      zg.off("playQualityUpdate", eventHandler.publishQualityUpdate);
      zg.off("publisherStateUpdate", eventHandler.publisherStateUpdate);
      zg.off("playerStateUpdate", eventHandler.playerStateUpdate);
      if (localStream) {
        zg.destroyStream(localStream)
        localStream = null
      }
      zg.logoutRoom();
      if (error) {
        reject(error)
      }
      resolve()
    }
    const eventHandler = {
      playQualityUpdate: (streamID, stats) => {
        console.warn(
          "downlink " +
          streamID +
          " " +
          `videoQuality: ${stats.video.videoQuality} videoPacketsLostRate: ${stats.video.videoPacketsLostRate}`
        )
        $("#downlink").text(netQualityTextMap[stats.video.videoQuality])
      },
      publishQualityUpdate: (streamID, stats) => {
        console.warn(
          "uplink " +
          streamID +
          " " +
          `videoQuality: ${stats.video.videoQuality} videoPacketsLostRate: ${stats.video.videoPacketsLostRate}`
        );
        $("#uplink").text(netQualityTextMap[stats.video.videoQuality])
      },
      publisherStateUpdate:  ({ streamID, state }) => {
        if (state === "PUBLISHING" && streamID === "for_testing") {
           zg.startPlayingStream(streamID)
        }
      },
      playerStateUpdate: async ({ state }) => {
        if (state === "PLAYING") {
          setTimeout(() => {
            onDetectionEnd()
          }, 10 * 1e3);
        }
      }
    }

    zg.on("publishQualityUpdate", eventHandler.playQualityUpdate);
    zg.on("playQualityUpdate", eventHandler.publishQualityUpdate);
    zg.on("publisherStateUpdate", eventHandler.publisherStateUpdate);
    zg.on("playerStateUpdate", eventHandler.playerStateUpdate);

    const roomId = $('#RoomID').val();
    const userID = $('#UserID').val();
    const token = $('#Token').val();
    const result = await zg.loginRoom(roomId, token, {
      userID
    }).catch(error => {
      let errMsg = error.msg
      if (error.code === 1102016) {
        errMsg = "Token error"
      }
      onDetectionEnd(errMsg)
      throw error
    })
    if (!result) {
      onDetectionEnd(errMsg)
    }
    // 根据业务需求的视频质量和码率进行设置和测试
    // Set and test according to the video quality and bit rate required by the service
    localStream = await zg.createStream({
      camera: {
        videoQuality: 3
      }
    }).catch(error => {
      onDetectionEnd(errMsg)
      throw error
    })
    zg.startPublishingStream("for_testing", localStream);
  })
}

async function render() {
  $('#RoomID').val(roomID)
  $('#UserID').val(userID)

  zg = new ZegoExpressEngine(appID, server)

  $("#LoginRoom").click(() => {
    $("#LoginRoom").attr("disabled", true)
    $("#uplink").text("detecting...")
    $("#downlink").text("detecting...")
    startDetecting().then(() => {
      $("#LoginRoom").attr("disabled", false)
    }).catch(err => {
      $("#LoginRoom").attr("disabled", false)
      $("#uplink").text("unknown")
      $("#downlink").text("unknown")
      alert(err)
    })
  })

}
render()