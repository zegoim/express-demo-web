let zg = new ZegoExpressEngine(appID, server);
window.zg = zg;
let videoCodec =  localStorage.getItem('VideoCodec') === 'H.264' ? 'H264' : 'VP8'

// setLogConfig
function setLogConfig(logConfig) {
	zg.setLogConfig(logConfig);
}

// setDebugVerbose
function setDebugVerbose(flag) {
	zg.setDebugVerbose(flag);
}

$('#SetLogConfig').on('click', function () {
	const logLevelList = ['debug', 'info', 'warn', 'error', 'report', 'disable'];
	const remoteLogLevelList = ['debug', 'info', 'warn', 'error', 'disable'];
	const logSelectIndex = $('#logLevel')[0].value;
	const remoreLogSelectIndex = $('#remoteLogLevel')[0].value;
	const config = {
		logLevel: logLevelList[logSelectIndex],
		remoteLogLevel: remoteLogLevelList[remoreLogSelectIndex],
		logURL: ''
	};
	setLogConfig(config);
	localStorage.setItem('logLevel', logSelectIndex);
	localStorage.setItem('remoteLogLevel', remoreLogSelectIndex);
	localStorage.setItem('logConfig', JSON.stringify(config));
	$('#successSvg').css('display', 'inline-block');
});

$('#logLevel').on('change', function () {
	$('#successSvg').css('display', 'none');
})

$('#remoteLogLevel').on('change', function () {
	$('#successSvg').css('display', 'none');
})

$('#debug-check').on('change', function () {
	$('#successSvg').css('display', 'none');
	setDebugVerbose(this.checked);
	localStorage.setItem('DebugVerbose', this.checked);
});

$('#radio-one').on('change', function ({ target }) {
	if (target.checked) {
		localStorage.setItem('Language', target.value);
	}
	setTimeout(() => {
		location.reload()
	}, 100)
});

$('#radio-two').on('change', function ({ target }) {
	if (target.checked) {
		localStorage.setItem('Language', target.value);
	}
	setTimeout(() => {
		location.reload()
	}, 100)
});

$('#radio-video-one').on('change', function ({ target }) {
	if (target.checked) {
		localStorage.setItem('VideoCodec', target.value);
	}
	setTimeout(() => {
		location.reload()
	}, 100)
});

$('#radio-video-two').on('change', function ({ target }) {
	if (target.checked) {
		localStorage.setItem('VideoCodec', target.value);
	}
	setTimeout(() => {
		location.reload()
	}, 100)
});

// render
$(function render() {
	$('#AppID').text(appID);
	$('#Server').text(server);
	$('#SDKVersion').text(`SDK: ${zg.getVersion()}`);
	$('#DemoVersion').text(`Demo: ${zg.getVersion()}`);
	$('#debug-check')[0].checked = localStorage.getItem('DebugVerbose') === 'true' ? true : false;

	const selectLog = $('#logLevel')[0][localStorage.getItem('logLevel')];
	$('#logLevel').val(!selectLog ? 0 : selectLog.value);
	const selectRemoteLog = $('#remoteLogLevel')[0][localStorage.getItem('remoteLogLevel')];
	$('#remoteLogLevel').val(!selectRemoteLog ? 0 : selectRemoteLog.value);

	const language = localStorage.getItem('Language');
	const flag = !language ? true : language === 'zh' ? true : false
	if (flag) {
		$('#radio-one').attr('checked', true)
		$('#radio-two').remove('checked')
	} else {
		$('#radio-two').attr('checked', true)
		$('#radio-one').remove('checked')
	}

	const videoCodec = localStorage.getItem('VideoCodec');
	const flagVideo = !videoCodec ? true : videoCodec === 'VP8' ? true : false
	if (flagVideo) {
		$('#radio-video-one').attr('checked', true)
		$('#radio-video-two').remove('checked')
	} else {
		$('#radio-video-two').attr('checked', true)
		$('#radio-video-one').remove('checked')
	}
});
