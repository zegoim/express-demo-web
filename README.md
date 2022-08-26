# Zego Express Example Web

This is Express Example (Sample topic Demo) Web repositories

## Preparation before development
 
  1. Jquery.i18n is used in the project for internationalization, and it is necessary to simulate the server environment to read the configuration file. You can use a vscode plug-in Live Server to simulate. 
  
  Check out this [article](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) to learn how to use

  2. Need to fill in appID and Server and tokenUrl in `/src/keyCenter.js `

## Directory structure diagram

### Coding

```tree
express-demo-web
├── README.md
└── src - 源码文件夹
    ├── Examples - 示例代码
    │   ├── AdvancedAudioProcessing - 音频进阶功能
    │   │   ├── AEC_ANS_AGC - 音频3A处理
    │   │   ├── AudioMixing - 混音
    │   │   ├── CustomAudioCaptureAndRendering - 自定义音频采集
    │   │   ├── EarReturnAndChannelSettings - 耳返与声道设置
    │   │   └── SoundLevelAndAudioSpectrum - 音量变换
    │   ├── AdvancedStreaming - 推拉流进阶
    │   │   ├── LowLatencyLive - 低延迟直播
    │   │   ├── PublishingMultipleStreams - 同时推多路流
    │   │   ├── StreamByCDN - 通过CND推流、拉流
    │   │   └── StreamMonitoring - 推流、拉流信息监测
    │   ├── AdvancedVideoProcessing - 视频进阶功能
    │   │   ├── CustomVideoCapture - 设置视频编码属性
    │   │   └── EncodingAndDecoding - 自定义视频采集
    │   ├── CommonFeatures - 常用功能
    │   │   ├── CommonVideoConfig - 常用视频配置
    │   │   └── RoomMessage - 房间实时消息
    │   ├── DebugAndConfig - 调试与配置
    │   │   ├── InitSettings - 初始化设置
    │   │   └── LogAndVersionAndDebug - 日志、版本号、调试信息
    │   ├── Framework - 最佳实践/框架相关
    │   │   ├── Angular - 使用Angular实现音视频功能
    │   │   ├── React - 使用React实现音视频功能
    │   │   └── Vue - 使用Vue实现音视频功能
    │   ├── Others - 其他功能
    │   │   ├── DeviceDetection - 设备检测
    │   │   ├── EffectsBeauty - 基础美颜
    │   │   ├── MediaTrackReplacement - 音视频轨道替换
    │   │   ├── NetworkDetection - 网络检测
    │   │   ├── RangeAudio - 范围语音
    │   │   ├── ScreenSharing - 屏幕共享
    │   │   └── StreamMixing - 混流
    │   ├── QuickStart - 快速开始
    │   │   ├── CommonUsage - 实现流程
    │   │   ├── Playing - 拉流
    │   │   ├── Publishing - 推流
    │   │   └── VideoTalk - 视频通话
    │   └── Scenes - 最佳实践/场景相关
    │       └── VideoForMultipleUsers - 多人视频通话
    ├── assets - 资源文件夹，存放项目共用的资源文件
    │   ├── css - 项目共用的css文件
    │   ├── images - 静态图片资源
    │   ├── js - 项目共用的js文件，包括sdk、各类依赖库等
    │   └── translate - 翻译相关的配置文件
    └── KeyCenter.js - 配置相关文件，可以配置appID、server地址等
```
