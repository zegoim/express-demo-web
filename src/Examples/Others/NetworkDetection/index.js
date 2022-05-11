// require('../../../../jquery')
// let appID;   // from  /src/KeyCenter.js
// let server;  // from  /src/KeyCenter.js

let zg = null;
let isDetecting = false;

let userID = 'user' + Date.now();
let roomID = '0001'

const netQualityTextMap = {
  "-1": "☆☆☆☆☆",
  "0": "★★★★★",
  "1": "★★★★☆",
  "2": "★★★☆☆",
  "3": "★★☆☆☆",
  "4": "★☆☆☆☆"
}
/**
 * Use ZegoExpressEngine to detect network quality.
 * @param {ZegoExpressEngine} zg -- ZegoExpressEngine
 * @param {number} seconds -- Test duration, in seconds, at least 8s. 检测时长，至少 8 秒
 * @returns Promise asynchronous return of detection results
 */
function detectNetworkQuality(zg, seconds = 10) {
  return new Promise(async (resolve, reject) => {
    if (!zg) return

    let isLogin = false;
    let localStream = null
    let testStreamID = "for_testing_" + Date.now()
    let uplinkList = []
    let downlinkList = []
    let timeoutTimer = null

    function onDetectionEnd(error) {
      // 检测结束注销事件、销毁流、登出房间
      zg.off("publishQualityUpdate", eventHandler.publishQualityUpdate)
      zg.off("playQualityUpdate", eventHandler.playQualityUpdate)
      zg.off("publisherStateUpdate", eventHandler.publisherStateUpdate)
      zg.off("playerStateUpdate", eventHandler.playerStateUpdate)
      if (localStream) {
        zg.destroyStream(localStream)
        localStream = null
      }
      zg.logoutRoom()
      isLogin = false

      if (error) {
        reject(error)
      }
      // 计算上下行网络平均值
      const downlink = downlinkList.length ? (downlinkList.reduce((result, item) => (result + item), 0) / downlinkList.length) : -1
      const uplink = uplinkList.length ? (uplinkList.reduce((result, item) => (result + item), 0) / uplinkList.length) : -1
      resolve({
        downlink: Math.round(downlink),
        uplink: Math.round(uplink)
      })
    }
    const eventHandler = {
      playQualityUpdate: (streamID, stats) => {
        // 通过监听 playQualityUpdate 事件获取下行网络质量 stats.video.videoQuality
        const quality = stats.video.videoQuality
        if (quality > -1) {
          downlinkList.push(quality)
        }
        $("#downlink").text(netQualityTextMap[quality])
      },
      publishQualityUpdate: (streamID, stats) => {
        // 通过监听 publishQualityUpdate 事件获取上行网络质量 stats.video.videoQuality
        const quality = stats.video.videoQuality
        if (quality > -1) {
          uplinkList.push(quality)
        }
        $("#uplink").text(netQualityTextMap[quality])
      },
      publisherStateUpdate: ({ streamID, state }) => {
        if (streamID === testStreamID && state === "PUBLISHING") {
          // 调用 startPlayingStream 进行拉流
          zg.startPlayingStream(streamID)
        }
      },
      playerStateUpdate: async ({ streamID, state }) => {
        if (streamID === testStreamID && state === "PLAYING") {
          if (timeoutTimer) {
            clearTimeout(timeoutTimer)
            timeoutTimer = null
          }
          setTimeout(() => {
            onDetectionEnd()
          }, seconds * 1e3)
        }
      }
    }

    zg.on("publishQualityUpdate", eventHandler.publishQualityUpdate)
    zg.on("playQualityUpdate", eventHandler.playQualityUpdate)
    zg.on("publisherStateUpdate", eventHandler.publisherStateUpdate)
    zg.on("playerStateUpdate", eventHandler.playerStateUpdate)

    timeoutTimer = setTimeout(() => {
      onDetectionEnd("Time out")
    }, seconds * 1e3)

    // 调用 loginRoom 接口登录用于测试网络的房间。   
    const roomID = $('#RoomID').val();
    const userID = $('#UserID').val();
    const token = $('#Token').val();
    isLogin = await zg.loginRoom(roomID, token, {
      userID
    }).catch(error => {
      let errMsg = error.msg
      if (error.code === 1102016) {
        errMsg = "Token error"
      }
      onDetectionEnd(errMsg)
      throw error
    })
    if (!isLogin) {
      onDetectionEnd("Login failed")
    }
    // 调用 createStream 接口创建摄像头相关的媒体流对象，在 createStream 接口参数中设置期望网络满足的视频质量参数和码率
    // Call the createstream interface to create the media stream object related to the camera, and set the video quality parameters and bit rate expected to be met by the network in the createstream interface parameters
    localStream = await zg.createStream({
      camera: {
        videoQuality: 3
      }
    }).catch(error => {
      onDetectionEnd(errMsg)
      throw error
    })
    // 调用 startPublishingStream 进行推流
    zg.startPublishingStream(testStreamID, localStream)
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
    detectNetworkQuality(zg, 10).then(({ uplink, downlink }) => {
      $("#LoginRoom").attr("disabled", false)
      $("#uplink").text(netQualityTextMap[uplink])
      $("#downlink").text(netQualityTextMap[downlink])
      alert("Detection Finish")
    }).catch(err => {
      $("#LoginRoom").attr("disabled", false)
      $("#uplink").text(netQualityTextMap[-1])
      $("#downlink").text(netQualityTextMap[-1])
      alert(err)
    })
  })

}
render()