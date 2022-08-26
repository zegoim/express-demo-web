# Zego Express Example Web

This is Express Example (Sample topic Demo) Web repositories

## Preparation before development
 
  1. Jquery.i18n is used in the project for internationalization, and it is necessary to simulate the server environment to read the configuration file. You can use a vscode plug-in Live Server to simulate. 
  
  Check out this [article](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) to learn how to use

  2. Need to fill in appID and Server and tokenUrl in `/src/keyCenter.js `

## Directory structure diagram

### Coding

````tree
express-demo-web
├── README.md
...
└── src # Source folder
    ├── Examples # Examples code
    │ ├── AdvancedAudioProcessing # Audio advanced functions
    │ │ ├── AEC_ANS_AGC # Audio 3A processing
    │ │ ├── AudioMixing # Audio Mixing
    │ │ ├── CustomAudioCaptureAndRendering # Custom audio capture and rendering
    │ │ ├── EarReturnAndChannelSettings # Ear return and channel settings
    │ │ └── SoundLevelAndAudioSpectrum # Volume change
    │ ├── AdvancedStreaming # Push-pull streaming advanced
    │ │ ├── LowLatencyLive # Low Latency Live
    │ │ ├── PublishingMultipleStreams # Simultaneously push multiple streams
    │ │ ├── StreamByCDN # Push and pull streams through CND
    │ │ └── StreamMonitoring # Push stream, pull stream information monitoring
    │ ├── AdvancedVideoProcessing # Video advanced functions
    │ │ ├── CustomVideoCapture # Set video encoding properties
    │ │ └── EncodingAndDecoding # Custom video capture
    │ ├── CommonFeatures # Common features
    │ │ ├── CommonVideoConfig # Common video configuration
    │ │ └── RoomMessage # Room real-time message
    │ ├── DebugAndConfig # Debug and configure
    │ │ ├── InitSettings # Initialize settings
    │ │ └── LogAndVersionAndDebug # log, version number, debugging information
    │ ├── Framework # Best practices/framework related
    │ │ ├── Angular # Use Angular to implement audio and video functions
    │ │ ├── React # Use React to implement audio and video functions
    │ │ └── Vue # Use Vue to implement audio and video functions
    │ ├── Others # Other functions
    │ │ ├── DeviceDetection # Device detection
    │ │ ├── EffectsBeauty # Basic Beauty
    │ │ ├── MediaTrackReplacement # Audio and video track replacement
    │ │ ├── NetworkDetection # Network detection
    │ │ ├── RangeAudio # Range audio
    │ │ ├── ScreenSharing # Screen sharing
    │ │ └── StreamMixing # Mixing streams
    │ ├── QuickStart # Quick start
    │ │ ├── CommonUsage # Implementation process
    │ │ ├── Playing # Pull flow
    │ │ ├── Publishing # Push stream
    │ │ └── VideoTalk # Video call
    │ └── Scenes # Best practices/scenario related
    │ └── VideoForMultipleUsers # Multi-person video call
    ├── assets # Resource folder, storing resource files shared by the project
    │ ├── css # CSS file shared by the project
    │ ├── images # Static image resources
    │ ├── js # js files shared by the project, including sdk, various dependent libraries, etc.
    │ └── translate # translate related configuration files
    └── KeyCenter.js # Configure related files, you can configure appID, server address, etc.
````
