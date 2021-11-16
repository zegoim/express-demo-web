let appID,// 请从官网控制台获取对应的appID
  server // 请从官网控制台获取对应的server地址，否则可能登录失败

let appInfo = {}
if (!appID || !server) {
  try {
    const appInfoStr = localStorage.getItem("app_info")
    const parseAppInfo = JSON.parse(appInfoStr)
    appInfo = parseAppInfo || appInfo
  } catch (error) {
    localStorage.removeItem("app_info")
  }
} else {
  localStorage.setItem("app_info", JSON.stringify({
    appID,
    server
  }))
}
appID = appInfo.appID;
server = appInfo.server;

$("#AppID").val(appID)
$("#Server").val(server)

function setAppIDAndServer(newAppID, newServer) {
  if (isNaN(newAppID)) {
    alert("AppID is wrong")
    return false
  } else if (!newServer) {
    alert("Server is wrong")
    return false
  } else {
    appID = newAppID
    server = newServer
    localStorage.setItem("app_info", JSON.stringify({
      appID,
      server
    }))
  }
  return true
}

$("#submit").click(() => {
  const newAppID = parseInt($("#AppID").val())
  const newServer = $("#Server").val()
  const result = setAppIDAndServer(newAppID, newServer)
  if(result) {
    const isLink = confirm("Set successfully! Link to function page.")
    var baseURL = window.location.href.match(/.*\/Examples/)[0]
    if(isLink) {
      window.location.href = `${baseURL}/QuickStart/VideoTalk/index.html`
    }
  }
})