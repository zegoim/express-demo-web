
let zg =  new ZegoExpressEngine(appID, server);
window.zg = zg

// setLogConfig
function setLogConfig(logConfig) {
  zg.setLogConfig(logConfig);
}

// setDebugVerbose
function setDebugVerbose(flag) {
  zg.setDebugVerbose(flag);
}

$('#SetLogConfig').on('click', function() {
  const logLevelList = ['debug', 'info', 'warn', 'error', 'report', 'disable']
  const remoteLogLevelList = ['debug', 'info', 'warn', 'error', 'disable']
  const logSelectIndex = $('#logLevel')[0].value
  const remoreLogSelectIndex = $('#remoteLogLevel')[0].value
  const config = {
    logLevel: logLevelList[logSelectIndex],
    remoteLogLevel: remoteLogLevelList[remoreLogSelectIndex],
    logURL: ''
  }
  setLogConfig(config);
  localStorage.setItem('logLevel', logSelectIndex);
  localStorage.setItem('remoteLogLevel', remoreLogSelectIndex);
  localStorage.setItem('logConfig', JSON.stringify(config));
  $('#successSvg').css("display", "inline-block")
})

$('#debug-check').on('change', function() {
  setDebugVerbose(this.checked);
  localStorage.setItem('DebugVerbose', this.checked);
})

// render 
$(function render() {
  $('#AppID').text(appID)
  $('#Server').text(server)
  $('#TokenUrl').text(tokenUrl)
  $('#SDKVersion').text(`SDK: ${zg.getVersion()}`)
  $('#DemoVersion').text(`Demo: ${zg.getVersion()}`)
  $('#debug-check')[0].checked = localStorage.getItem('DebugVerbose') === 'true' ? true : false

  const selectLog = $('#logLevel')[0][localStorage.getItem('logLevel')]
  $('#logLevel').val(!selectLog ? 0 : selectLog.value)
  const selectRemoteLog = $('#remoteLogLevel')[0][localStorage.getItem('remoteLogLevel')]
  $('#remoteLogLevel').val(!selectRemoteLog ? 0 : selectRemoteLog.value)
},)