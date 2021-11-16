var baseURL = window.location.href.match(/.*\/Examples/)[0]
const menu = `
<aside class="left-sidebar">
<div class="scroll-sidebar">
  <nav class="sidebar-nav">
    <ul id="sidebarnav">
      <span class="sidebar-title" data-lang="Quickstart">快速开始</span>
      <li>
        <a href="${baseURL}/QuickStart/VideoTalk/index.html" class="waves-effect" data-lang="VideoTalk">视频通话</a>
      </li>
      <li>
        <a href="${baseURL}/QuickStart/CommonUsage/index.html" class="waves-effect" data-lang="CommonUsage">实现流程</a>
      </li>
      <li>
        <a href="${baseURL}/QuickStart/Publishing/index.html" class="waves-effect" data-lang="Publishing">推流</a>
      </li>
      <li>
        <a href="${baseURL}/QuickStart/Playing/index.html" class="waves-effect" data-lang="Playing">拉流</a>
      </li>
      <span class="sidebar-title" data-lang="Scenes">最佳实践</span>
      <li>
        <a href="${baseURL}/Scenes/VideoForMultipleUsers/index.html" class="waves-effect" data-lang="VideoForMultipleUsers">多人视频通话</a>
      </li>
      <li>
        <a href="${baseURL}/Framework/Vue/index.html" class="waves-effect" data-lang="UseVue">使用 Vue 实现音视频功能</a>
      </li>
      <li>
        <a href="${baseURL}/Framework/Angular/dist/index.html" class="waves-effect" data-lang="UseAngular">使用 Angular 实现音视频功能</a>
      </li>
      <li>
        <a href="${baseURL}/Framework/React/index.html" class="waves-effect" data-lang="UseReact">使用 React 实现音视频功能</a>
      </li>
      <span class="sidebar-title" data-lang="CommonFeatures">常用功能</span>
      <li>
        <a href="${baseURL}/CommonFeatures/CommonVideoConfig/index.html" class="waves-effect"
          data-lang="CommonVideoConfig">常用视频配置</a>
      </li>
      <li>
        <a href="${baseURL}/CommonFeatures/RoomMessage/index.html" class="waves-effect"
          data-lang="RoomMessage">实时消息</a>
      </li>
      <span class="sidebar-title" data-lang="AdvancedStreaming">推拉流进阶</span>
      <li>
        <a href="${baseURL}/AdvancedStreaming/StreamMonitoring/index.html" class="waves-effect"
          data-lang="StreamMonitoring">推流、拉流信息监测</a>
      </li>
      <li>
        <a href="${baseURL}/AdvancedStreaming/PublishingMultipleStreams/index.html" class="waves-effect"
          data-lang="PublishingMultipleStreams">同时推多路流</a>
      </li>
      <li>
        <a href="${baseURL}/AdvancedStreaming/StreamByCDN/index.html" class="waves-effect"
          data-lang="StreamByCDN">通过CDN推流、拉流</a>
      </li>
      <li>
        <a href="${baseURL}/AdvancedStreaming/LowLatencyLive/index.html" class="waves-effect"
          data-lang="LowLatencyLive">低延迟直播</a>
      </li>
      <span class="sidebar-title" data-lang="AdvancedVideoProcessing">视频进阶</span>
      <li>
        <a href="${baseURL}/AdvancedVideoProcessing/EncodingAndDecoding/index.html" class="waves-effect"
          data-lang="SetVideoProperties">设置视频属性</a>
      </li>
      <li>
        <a href="${baseURL}/AdvancedVideoProcessing/CustomVideoCapture/index.html" class="waves-effect"
          data-lang="CustomVideoCapture">自定义视频采集</a>
      </li>
      <span class="sidebar-title" data-lang="AdvancedAudioProcessing">音频进阶</span>
      <li>
        <a href="${baseURL}/AdvancedAudioProcessing/EarReturnAndChannelSettings/index.html" class="waves-effect"
          data-lang="EarReturnAndChannelSettings">耳返</a>
      </li>
      <li>
        <a href="${baseURL}/AdvancedAudioProcessing/SoundLevelAndAudioSpectrum/index.html" class="waves-effect"
          data-lang="SoundLevelAndAudioSpectrum">音频频谱与声浪</a>
      </li>
      <li>
        <a href="${baseURL}/AdvancedAudioProcessing/AEC_ANS_AGC/index.html" class="waves-effect"
          data-lang="AEC_ANS_AGC">音频3A处理</a>
      </li>
      <li>
        <a href="${baseURL}/AdvancedAudioProcessing/AudioMixing/index.html" class="waves-effect"
          data-lang="AudioMixing">混音</a>
      </li>
      <li>
        <a href="${baseURL}/AdvancedAudioProcessing/CustomAudioCaptureAndRendering/index.html" class="waves-effect"
          data-lang="CustomAudioCaptureAndRendering">自定义音频采集与渲染</a>
      </li>
      <span class="sidebar-title" data-lang="Others">其他功能</span>
      <li>
        <a href="${baseURL}/Others/StreamMixing/index.html" class="waves-effect" data-lang="StreamMixing">混流</a>
      </li>
      <li>
        <a href="${baseURL}/Others/ScreenSharing/index.html" class="waves-effect" data-lang="ScreenSharing">屏幕共享</a>
      </li>
      <li>
        <a href="${baseURL}/Others/MediaTrackReplacement/index.html" class="waves-effect"
          data-lang="MediaTrackReplacement">音视频轨道替换</a>
      </li>
      <li>
        <a href="${baseURL}/Others/RangeAudio/index.html" class="waves-effect" data-lang="RangeAudio">范围语音</a>
      </li>
      <span class="sidebar-title" data-lang="DebugAndConfig">调试与配置</span>
      <li>
        <a href="${baseURL}/DebugAndConfig/InitSettings/index.html" class="waves-effect"
          data-lang="InitSettings">初始设置</a>
      </li>
      <li>
        <a href="${baseURL}/DebugAndConfig/LogAndVersionAndDebug/index.html" class="waves-effect"
          data-lang="Log_Version_Debug">日志、版本号、调试信息</a>
      </li>
    </ul>
  </nav>
</div>
</aside>
`

const wrapper = document.querySelector(".container.main-wrapper")

const div = document.createElement("div")
div.innerHTML = menu
wrapper.appendChild(div)