// require('../../../../jquery')
// let appID = 1739272706;   // from  /src/KeyCenter.js
// let server = 'wss://webliveroom-test.zego.im/ws';  // from  /src/KeyCenter.js
// let tokenUrl = 'https://wsliveroom-alpha.zego.im:8282/token';  // from  /src/KeyCenter.js

// ==============================================================
// This part of the code defines the default values and global values
// ==============================================================

let zg = null;
let rangeAudio = null;

const data = {}

// 登录房间
// Login Room
data.userID = Util.getBrow() + '_' + new Date().getTime()
data.roomID = 'rangeaudio'
data.isLogin = false

function setRoomID(val) {
  if (val || val === "") {
    data.roomID = val
    document.querySelector("#room-id").value = data.roomID
  } else {
    data.roomID = document.querySelector("#room-id").value
  }
  document.querySelector("#roomInfo-id").innerText = data.roomID
}
function setUserID(val) {
  if (val || val === "") {
    data.userID = val
    document.querySelector("input#user-id").value = data.userID
  } else {
    data.userID = document.querySelector("#user-id").value
  }
}
function setToken(val) {
  if (val || val === "") {
    data.token = val
    document.querySelector("input#token").value = data.token
  } else {
    data.token = document.querySelector("#token").value
  }
}
function setLoginState(val) {
  data.isLogin = val
  document.querySelector("#roomStateSuccessSvg").style.display = val ? "inline-block" : "none"
  document.querySelector("#roomStateErrorSvg").style.display = !val ? "inline-block" : "none"
  document.querySelector("#text-login-room").style.display = !val ? "inline-block" : "none"
  document.querySelector("#text-logout-room").style.display = val ? "inline-block" : "none"
  document.querySelector("input#user-id").disabled = data.isLogin
  document.querySelector("input#room-id").disabled = data.isLogin
  if (!data.isLogin) {
    updateMicState(false);
    updateSpeakerState(false);
    Object.keys(data.userListMap).forEach(item => {
      delete data.userListMap[item]
    })
  } else {
    // 初始化 3D 音效
    // Initialize 3D sound
    rangeAudio.enableSpatializer(data.isSpatializer);
    rangeAudio.enableAiDenoise && rangeAudio.enableAiDenoise(data.isAiDenoise);
    // 设置队伍 ID
    setTeamID(data.teamID)
  }

}
async function getToken(userID, roomId, expireTime) {
  let token = await $.get('https://wsliveroom-alpha.zego.im:8282/token', {
    app_id: appID,
    id_name: userID,
  });
  return token;
}

async function loginRoom() {
  const { userID, roomID } = data
  const token = await getToken(userID, roomID)
  if (!data.isLogin) {
    document.querySelector("#LoginRoom").disabled = true
    try {
      const result = await zg.loginRoom(roomID, token, {
        userID,
      }, {
        userUpdate: true
      });
      setLoginState(result)
      document.querySelector("#LoginRoom").disabled = false
    } catch (error) {
      document.querySelector("#LoginRoom").disabled = false
      let errorContent = JSON.stringify(error)
      errorContent === "{}" ? error + "" : errorContent
      alert(errorContent)
      console.error(errorContent)
    }
  } else {
    zg.logoutRoom()
    setLoginState(false)
    data.isLogin = false
  }
}
async function showMicrophones() {
  const micList = await zg.getMicrophones();
  const audioInputList = []
  micList.map((item, index) => {
    if (!item.deviceName) {
      item.deviceName = 'microphone' + index;
    }
    audioInputList.push(' <option value="' + item.deviceID + '">' + item.deviceName + '</option>');
    console.log('microphone: ' + item.deviceName);
    return item;
  });
  $('#MicDevices').html(audioInputList.join(''));
}

function changeMicrophone() {
  if (zg.getVersion() < "2.16.0") return
  rangeAudio.selectMicrophone($("#MicDevices").val()).then((res) => {
    if (!res) {
      alert("change microphone failed");
    } else {
      console.warn("selectMicrophone end", $("#MicDevices").val());
    }
  });
}


// 小队语音
// Team Mode
data.teamMode = 0
data.teamID = undefined


function setTeamMode(val) {
  data.teamMode = val
  rangeAudio.setRangeAudioMode(val)
}
function setTeamID(val) {
  if (val) {
    document.getElementById("team-id").value = val
    data.teamID = val
  } else {
    data.teamID = document.getElementById("team-id").value || undefined
  }
  rangeAudio.setTeamID(data.teamID);
  console.log('setTeamID', data.teamID);
}

// 范围语音
// Range Audio
data.isMicEnable = false;
data.isSpeakerEnable = false;
data.receiveRange = undefined;

function enableMicrophone() {
  rangeAudio.enableMicrophone(!data.isMicEnable);
}
function updateMicState(enable) {
  data.isMicEnable = enable
  document.querySelector("#text-mic-enable").style.display = !enable ? "inline-block" : "none"
  document.querySelector("#text-mic-disable").style.display = enable ? "inline-block" : "none"
  document.querySelector("#text-mic-on").style.display = enable ? "inline-block" : "none"
  document.querySelector("#text-mic-off").style.display = !enable ? "inline-block" : "none"
}
updateMicState(data.isMicEnable)
function enableSpeaker() {
  rangeAudio.enableSpeaker(!data.isSpeakerEnable);
  updateSpeakerState(!data.isSpeakerEnable)
}
function updateSpeakerState(enable) {
  data.isSpeakerEnable = enable
  document.querySelector("#text-speaker-enable").style.display = !enable ? "inline-block" : "none"
  document.querySelector("#text-speaker-disable").style.display = enable ? "inline-block" : "none"
  document.querySelector("#text-speaker-on").style.display = enable ? "inline-block" : "none"
  document.querySelector("#text-speaker-off").style.display = !enable ? "inline-block" : "none"
}
updateSpeakerState(data.isSpeakerEnable)
function setReceiveRange() {
  data.receiveRange = document.querySelector("#receive-range").value
  if (data.receiveRange < 0) {
    document.querySelector("#receive-range").value = 0
  } else if (data.receiveRange !== "") {
    rangeAudio.setAudioReceiveRange(data.receiveRange);
  }
}

// 3D 音效
// Spatializer
data.isSpatializer = true

function enableSpatializer(enable) {
  if (typeof enable === "boolean") {
    data.isSpatializer = !enable
  }
  rangeAudio.enableSpatializer(!data.isSpatializer);
  updateSpatializerState(!data.isSpatializer)
}
function updateSpatializerState(enable) {
  data.isSpatializer = enable
  document.querySelector("#text-3d-enable").style.display = !enable ? "inline-block" : "none"
  document.querySelector("#text-3d-disable").style.display = enable ? "inline-block" : "none"
  document.querySelector("#text-3d-on").style.display = enable ? "inline-block" : "none"
  document.querySelector("#text-3d-off").style.display = !enable ? "inline-block" : "none"
}
updateMicState(data.isSpatializer)


// AI 降噪
// AI Denoise
data.isAiDenoise = false
function enableAiDenoise() {
  rangeAudio.enableAiDenoise(!data.isAiDenoise);
  updateAiDenoiseState(!data.isAiDenoise)
}
function updateAiDenoiseState(enable) {
  data.isAiDenoise = enable
  document.querySelector("#text-ai-enable").style.display = !enable ? "inline-block" : "none"
  document.querySelector("#text-ai-disable").style.display = enable ? "inline-block" : "none"
  document.querySelector("#text-ai-on").style.display = enable ? "inline-block" : "none"
  document.querySelector("#text-ai-off").style.display = !enable ? "inline-block" : "none"
}

// 自身方位
// Self Position
data.selfPosition = [0, 0, 0]
data.selfRotate = {
  forward: 0,
  right: 0,
  up: 0
}
data.selfAxis = {
  forward: [1, 0, 0],
  right: [0, 1, 0],
  up: [0, 0, 1]
}
data.hasChangedPosition = false;

function setSelfPosition() {
  data.hasChangedPosition = true
  data.selfPosition[0] = document.querySelector("#position-forward").value
  data.selfPosition[1] = document.querySelector("#position-right").value
  data.selfPosition[2] = document.querySelector("#position-up").value
  document.querySelector("#position-forward-text").innerText = data.selfPosition[0]
  document.querySelector("#position-right-text").innerText = data.selfPosition[1]
  document.querySelector("#position-up-text").innerText = data.selfPosition[2]
}
function setSelfRotate() {
  data.hasChangedPosition = true
  data.selfRotate.forward = document.querySelector("#rotate-forward").value
  data.selfRotate.right = document.querySelector("#rotate-right").value
  data.selfRotate.up = document.querySelector("#rotate-up").value
  document.querySelector("#rotate-forward-text").innerText = data.selfRotate.forward + "deg"
  document.querySelector("#rotate-right-text").innerText = data.selfRotate.right + "deg"
  document.querySelector("#rotate-up-text").innerText = data.selfRotate.up + "deg"
  document.querySelector("#rotate-box").style.transform =
    `translate3d(-50%,-50%, 1px) rotateX(${data.selfRotate.right}deg) rotateY(${data.selfRotate.up}deg) rotateZ(${data.selfRotate.forward}deg)`
  const matrix = getMatrixFromCss(document.querySelector("#rotate-box"))
  if (matrix && matrix.length === 3) {
    data.selfAxis = {
      forward: matrix[0],
      right: matrix[1],
      up: matrix[2]
    }
  }
}
function getMatrixFromCss(el) {
  const transformStr = window.getComputedStyle(el).transform;
  const match = transformStr.match(/matrix3d\((.*)\)/);
  const arr = match && match[1].split(",").map(item => Number(item));
  if (arr) {
    const indexList = [0, 4, 8, 12];
    const matrix = [
      indexList.map(index => arr[index]).filter((item, index) => index <= 2),
      indexList
        .map(index => arr[index + 1])
        .filter((item, index) => index <= 2),
      indexList.map(index => arr[index + 2]).filter((item, index) => index <= 2)
    ];
    return [
      [matrix[2][2], matrix[0][2], matrix[1][2]],
      [matrix[2][0], matrix[0][0], matrix[1][0]],
      [matrix[2][1], matrix[0][1], matrix[1][1]]
    ];
  }
  return [[]];
}

// 自定义音源
data.onlineHasChangedPosition = false
data.onlineSrcPosition = [0, 0, 0]
data.onlineSrcRange = 100
data.localHasChangedPosition = false
data.localSrcPosition = [0, 0, 0]
data.localSrcRange = 100
data.streamHasChangedPosition = false
data.streamSrcPosition = [0, 0, 0]
data.streamSrcRange = 100
data.streamView = null
function updateSrcPosition(type) {
  data.hasChangedPosition = true
  data[`${type}SrcPosition`][0] = document.querySelector(`#${type}-position-forward`).value
  data[`${type}SrcPosition`][1] = document.querySelector(`#${type}-position-right`).value
  data[`${type}SrcPosition`][2] = document.querySelector(`#${type}-position-up`).value
  document.querySelector(`#${type}-position-forward-text`).innerText = data[`${type}SrcPosition`][0]
  document.querySelector(`#${type}-position-right-text`).innerText = data[`${type}SrcPosition`][1]
  document.querySelector(`#${type}-position-up-text`).innerText = data[`${type}SrcPosition`][2]
  data[`${type}HasChangedPosition`] = true
}
function updateSrcRange(type) {
  data[`${type}SrcRange`] = document.querySelector(`#${type}-range`).value
  if (type === "stream") {
    data.streamView &&
      rangeAudio.setCustomSourceVocalRange(
        data.streamView,
        data[`${type}SrcRange`]
      );
  } else {
    rangeAudio.setStreamVocalRange(
      document.querySelector(`#${type}-src-audio`),
      data[`${type}SrcRange`]
    );
  }
}
document.querySelector("#local-file").onchange = (file) => {
  var url = window.URL.createObjectURL(file.target.files[0]);
  document.querySelector("#local-src-audio").src = url

}


data.updatePositionInfoTimer = null
function enableUpdatePositionTimer(enable) {
  clearInterval(data.updatePositionInfoTimer)
  if (enable) {
    data.updatePositionInfoTimer = setInterval(async () => {
      if (data.hasChangedPosition) {
        data.hasChangedPosition = false;
        rangeAudio.updateSelfPosition(
          data.selfPosition,
          data.selfAxis.forward,
          data.selfAxis.right,
          data.selfAxis.up
        );
        await sendSelfPositionByMessage()
      }
      ["online", "local", "stream"].forEach(type => {
        if (data[`${type}HasChangedPosition`]) {
          data[`${type}HasChangedPosition`] = false;
          if (type === "stream") {
            data.streamView && rangeAudio.updateStreamPosition(
              data.streamView,
              data[`${type}SrcPosition`]
            );
          } else {
            rangeAudio.updateCustomSourcePosition(
              document.querySelector(`#${type}-src-audio`),
              data[`${type}SrcPosition`]
            );
          }
        }
      })
    }, 1000);
  } else {
    data.updatePositionInfoTimer = null
  }
}

// 用户列表
// User List
data.userListMap = new Proxy({}, {
  get(target, prop) {
    return Reflect.get(target, prop)
  },
  set(target, prop, value) {
    // 监听用户信息改变
    //Monitor user information changes
    if (rangeAudio) {
      rangeAudio.updateAudioSource(prop, value.position)
      console.log('updateAudioSource', prop, value);
      renderUserList()
    }
    return Reflect.set(target, prop, value)
  },
  deleteProperty(target, prop) {
    renderUserList()
    return Reflect.deleteProperty(target, prop)
  }
})


data.hasChangedUserList = false

function renderUserList(newUser) {
  setTimeout(() => {
    const wrapper = document.querySelector("#user-list")
    wrapper.innerHTML = Object.values(data.userListMap).reduce((result, item) => {
      const position = (newUser && newUser.position) || item.position;
      const userID = item.userID
      return result +
        `<div class="user-item">
      <div class="user-name">
        <span>userID</span>
        : <span>${userID}</span>
      </div>
      <div class="user-position">
        <span>Position</span>
        : <span>(${position.join(",")})</span>
      </div>
    </div>`
    }, "")
  }, 0)
}

// 依赖房间信令，来实现用户定位信息同步
// 注意: 这里是 demo 通过 ZEGO 的房间信令来同步位置信息。房间信令在使用上有频率和内容长度限制，开发者需要通过自己的后台服务器来同步位置信息，而不是使用房间消息接口。
// Rely on room signaling to realize user location information synchronization
// Note: here is the demo to synchronize the location information through the room signaling of ZEGO. There are frequency and content length restrictions on the use of room signaling. Developers need to synchronize location information through their own background server instead of using room message interface.
async function sendSelfPositionByMessage() {
  if (data.isLogin) {
    try {
      await zg.sendBroadcastMessage(data.roomID, data.selfPosition.join(","))
    } catch (error) {
      if (error.errorCode === 1109001) {
        setTimeout(async () => {
          await zg.sendBroadcastMessage(data.roomID, data.selfPosition.join(","))
        }, 1000);
      } else {
        throw error
      }
    }
    console.log('sendPosition', data.selfPosition.join(","));
  }
}
function syncPositionInfo() {
  if (zg) {
    zg.on("roomStateUpdate", async (roomID, state) => {
      if (roomID === data.roomID) {
        console.log("roomStateUpdate", state);
        if (state === "CONNECTED") {
          console.log('sendPosition when login');
          await sendSelfPositionByMessage()
          setTimeout(async () => {
            sendSelfPositionByMessage()
          }, 3000);
        }
      }
    })
    zg.on("roomUserUpdate", async (roomID, state, userList) => {
      console.log('roomUserUpdate', roomID, state, userList);
      if (roomID = data.roomID) {
        if (state === "ADD") {
          console.log('sendPosition when others login');
          await sendSelfPositionByMessage()
        } else {
          userList.forEach(item => {
            delete data.userListMap[item.userID]
          })
        }
      }
    })
    zg.on("IMRecvBroadcastMessage", (roomID, chatDataList) => {
      try {
        console.log('RecvPosition', roomID, chatDataList);
        if (roomID = data.roomID) {
          chatDataList.forEach(chatData => {
            const { fromUser, message } = chatData
            const { userID } = fromUser
            const position = message.split(",").map(item => Number(item));
            if (position.length === 3 && !position.find(item => isNaN(item))) {
              data.hasChangedUserList = true
              data.userListMap[userID] = {
                ...data.userListMap[userID] || {},
                userID: userID,
                position
              }
            } else {
              throw "message format error "
            }
          })
        }
      } catch (error) {
        console.error(error)
      }
    })
  }
}

async function customPlayStream() {
  if (!data.isLogin) {
    alert("not login")
    return
  }
  if (data.streamView) {
    alert("already playing")
    return
  }
  const stream = await zg.startPlayingStream(document.querySelector("#stream-custom-id").value)
  data.streamView = zg.createRemoteStreamView(stream);
  data.streamView.play("stream-src-audio");
}
function customStopStream() {
  document.querySelector(`#stream-position-forward`).value = 0
  document.querySelector(`#stream-position-right`).value = 0
  document.querySelector(`#stream-position-up`).value = 0
  document.querySelector(`#stream-range`).value = 0
  updateSrcRange("stream")
  updateSrcPosition("stream")
  zg.stopPlayingStream(document.querySelector("#stream-custom-id").value)
  data.streamView.stop()
  data.streamView = null
}


// 主入口函数
// Main
(() => {
  // 创建实例
  // Create Instance
  zg = new ZegoExpressEngine(appID, server)
  // zg.zegoWebRTC.setGWNode('119.23.246.255:8123')
  rangeAudio = zg.createRangeAudioInstance()
  showMicrophones()
  syncPositionInfo()
  zg.setDebugVerbose(false)
  zg.setSoundLevelDelegate(true, 1000, { enableInBackground: false })

  // 初始化房间信息
  // Initialize room information
  setLoginState(data.isLogin)
  setRoomID(data.roomID)
  setUserID(data.userID)
  document.getElementById("receive-range").value = data.receiveRange
  setReceiveRange(data.receiveRange)
  // 初始化小队信息
  // Initialization team information
  document.querySelector("#team-mode" + data.teamMode).checked = true
  // 初始化范围语音功能
  // Initialize range voice function
  document.querySelector("#receive-range").value = data.receiveRange
  rangeAudio.on("microphoneStateUpdate", (state) => {
    console.log("microphoneStateUpdate", state);
    updateMicState(state !== 0);
  })
  rangeAudio.on("aiDenoiseError", (code, msg) => {
    console.warn("aiDenoiseError", code, msg);
    if (code === 1101003) {
      alert("未使用带 AI 降噪 SDK 包");
    } else if (code === 1103080) {
      alert("AI 降噪运行失败");
    } else if (code === 1103081) {
      alert("浏览器不支持 AI 降噪");
    } else if (code === 1103082) {
      alert("AI 降噪性能消耗过载");
    }
  });
  rangeAudio.zegoAudioListener.setAudioVolume(200);
  // 初始化 3D 音效
  // Initialize 3D sound
  enableSpatializer(true);
  updateAiDenoiseState(data.isAiDenoise)
  // 初始化自身方位
  // Initialize self orientation
  setSelfPosition()
  setSelfRotate()
  // 开启更新自身位置
  enableUpdatePositionTimer(true)
  // 授权浏览器自动播放声音
  // Authorize the browser to automatically play sound
  const allowAutoPlay = rangeAudio.isAudioContextRunning()
  if (!allowAutoPlay) {
    document.querySelector("#btn-allow").onclick = () => {
      rangeAudio.resumeAudioContext()
      $('#notice-modal').modal('hide')
    }
    $('#notice-modal').modal('show')
  }
})()