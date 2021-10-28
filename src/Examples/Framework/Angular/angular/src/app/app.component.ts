import { Component } from '@angular/core';
import getBrow from '../assets/js/util';
import { ZegoExpressEngine } from 'zego-express-engine-webrtc';
import { DeviceInfo } from './device';
import { HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(public http: HttpClient) { }
  appID: number = 1739272706; // 请从官网控制台获取对应的appID
  server: string = 'wss://webliveroom-test.zego.im/ws'; // 请从官网控制台获取对应的server地址，否则可能登录失败
  tokenUrl: string = 'https://wsliveroom-alpha.zego.im:8282/token';
  userID: string = getBrow() + '_' + new Date().getTime();
  roomID: string = '0001';
  token: string = '';
  streamID: string = '0001';
  playStreamID: string = '0001';
  zg: any = null;
  localStream: any = null;
  remoteStream: any = null;
  isLogin: boolean = false;
  videoCodec: string = localStorage.getItem('VideoCodec') === 'H.264' ? 'H264' : 'VP8'

  createSuccessSvgStatus: Boolean = false;
  connectStatus: string = 'DISCONNECTED';
  checkSystemRequireStatus: string = "";
  audioDeviceList: DeviceInfo[] = [];
  videoDeviceList: DeviceInfo[] = [];
  microphoneDevicesVal: string | number = "";
  cameraDevicesVal: string = "";
  cameraCheckStatus: boolean = true;
  microphoneCheckStatus: boolean = true;
  publishStreamStatus: boolean = false;
  mirrorVal: string = "none";
  playStreamStatus: boolean = false;
  videoCheckStatus: boolean = true;
  audioCheckStatus: boolean = false;
  publishInfoStreamID: string = "";
  playInfoStreamID: string = "";

  async enumDevices() {
    const deviceInfo = await this.zg.enumDevices();
    this.audioDeviceList = deviceInfo &&
      deviceInfo.microphones.map((item: DeviceInfo, index: number) => {
        if (!item.deviceName) {
          item.deviceName = 'microphone' + index;
        }
        console.log('microphone: ' + item.deviceName);
        return item;
      });
    this.audioDeviceList.push({ deviceID: '0', deviceName: '禁止' });
    this.microphoneDevicesVal = this.audioDeviceList[0].deviceID;
    this.videoDeviceList = deviceInfo &&
      deviceInfo.cameras.map((item: DeviceInfo, index: number) => {
        if (!item.deviceName) {
          item.deviceName = 'camera' + index;
        }
        console.log('camera: ' + item.deviceName);
        return item;
      });
    this.videoDeviceList.push({ deviceID: '0', deviceName: '禁止' });
    this.cameraDevicesVal = this.videoDeviceList[0].deviceID;
  }
  initEvent() {
    this.zg.on('roomStateUpdate', (roomId: string, state: string) => {
      if (state === 'CONNECTED' && this.isLogin) {
        this.connectStatus = 'CONNECTED';
      }
      if (state === 'DISCONNECTED' && !this.isLogin) {
        this.connectStatus = 'DISCONNECTED';
      }
      if (state === 'DISCONNECTED' && this.isLogin) {
        location.reload()
      }
    })

    this.zg.on('publisherStateUpdate', (result: any) => {
      if (result.state === 'PUBLISHING') {
        this.publishInfoStreamID = result.streamID;
      } else if (result.state === 'NO_PUBLISH') {
        this.publishInfoStreamID = "";
      }
    });

    this.zg.on('playerStateUpdate', (result: any) => {
      if (result.state === 'PLAYING') {
        this.playInfoStreamID = result.streamID;
      } else if (result.state === 'NO_PLAY') {
        this.playInfoStreamID = "";
      }
    });
  }
  // Step1 Create ZegoExpressEngine
  createZegoExpressEngine() {
    this.zg = new ZegoExpressEngine(this.appID, this.server);
  }
  // Step2 Check system requirements
  async checkSystemRequirements() {
    console.log('sdk version is', this.zg.getVersion());
    try {
      const result = await this.zg.checkSystemRequirements();

      console.warn('checkSystemRequirements ', result);

      if (!result.webRTC) {
        console.error('browser is not support webrtc!!');
        return false;
      } else if (!result.videoCodec.H264 && !result.videoCodec.VP8) {
        console.error('browser is not support H264 and VP8');
        return false;
      } else if (!result.camera && !result.microphones) {
        console.error('camera and microphones not allowed to use');
        return false;
      } else if (result.videoCodec.VP8) {
        if (!result.screenSharing) console.warn('browser is not support screenSharing');
      } else {
        console.log('不支持VP8，请前往混流转码测试');
      }
      return true;
    } catch (err) {
      console.error('checkSystemRequirements', err);
      return false;
    }
  }
  //Step3 Login room
  async loginRoom(roomId: string, userId: string, userName: string, token: string) {
    return this.zg.loginRoom(roomId, token, {
      userID: userId,
      userName
    })
  }
  // Step4 Start Publishing Stream
  async startPublishingStream(streamId: string, config: any) {
    try {
      this.localStream = await this.zg.createStream(config);
      this.zg.startPublishingStream(streamId, this.localStream, { videoCodec: this.videoCodec });
      return true;
    } catch (err) {
      return false;
    }
  }
  // Step5 Start Play Stream
  async startPlayingStream(streamId: string, options = {}) {
    try {
      this.remoteStream = await this.zg.startPlayingStream(streamId, options);
      return true;
    } catch (err) {
      return false;
    }
  }
  // Logout room
  logoutRoom(roomId: string) {
    this.zg.logoutRoom(roomId);
  }
  // Stop Publishing Stream
  async stopPublishingStream(streamId: string) {
    this.zg.stopPublishingStream(streamId);
  }
  // Stop Play Stream
  async stopPlayingStream(streamId: string) {
    this.zg.stopPlayingStream(streamId);
  }
  clearStream() {
    this.localStream && this.zg.destroyStream(this.localStream);
    //   this.$refs['publishVideo'].srcObject = null;
    this.localStream = null;
    this.remoteStream && this.zg.destroyStream(this.remoteStream);
    //   this.$refs['playVideo'].srcObject = null;
    this.remoteStream = null;
  }
  changeAudioDevices() {
    if (!this.zg || !this.localStream) {
      return
    }
    const isMicrophoneMuted = this.zg.isMicrophoneMuted();
    if (!isNaN(this.microphoneDevicesVal as number) && !isMicrophoneMuted) {
      this.zg.muteMicrophone(true);
    } else {
      this.zg.muteMicrophone(false);
      this.zg.useAudioDevice(this.localStream, this.microphoneDevicesVal);
    }
  }
  // ==============================================================
  // This part of the code binds the button click event
  // ==============================================================
  createZegoExpressEngineOption(): void {
    this.createZegoExpressEngine();
    this.createSuccessSvgStatus = true;
    this.initEvent();
  }
  async checkSystemRequire() {
    if (!this.zg) return alert('you should create zegoExpressEngine');
    const result = await this.checkSystemRequirements();
    if (result) {
      this.checkSystemRequireStatus = 'SUCCESS';
      this.enumDevices();
    } else {
      this.checkSystemRequireStatus = 'ERROR';
    }
  }
  async loginRoomOption() {
    if (!this.zg) return alert('you should create zegoExpressEngine');
    try {
      this.isLogin = true;
      await this.loginRoom(this.roomID, this.userID, this.userID, this.token);
    } catch (err) {
      this.isLogin = false;
      console.log(err);
    }
  }
  async startPublishing() {
    const flag = await this.startPublishingStream(this.streamID, {
      camera: {
        audioInput: this.microphoneDevicesVal,
        videoInput: this.cameraDevicesVal,
        video: this.cameraCheckStatus,
        audio: this.microphoneCheckStatus,
      }
    })
    if (flag) {
      this.publishStreamStatus = true;
    }
  }
  async startPlaying() {
    const flag = await this.startPlayingStream(this.playStreamID, {
      video: this.videoCheckStatus,
      audio: this.audioCheckStatus
    });
    if (flag) {
      this.playStreamStatus = true;
    }
  }
  async reset() {
    if (!this.zg) {
      return
    }
    await this.stopPublishingStream(this.streamID);
    await this.stopPlayingStream(this.playStreamID);
    if (this.isLogin) {
      this.isLogin = false;
      this.logoutRoom(this.roomID);
    }
    this.clearStream();
    this.zg = null;
    this.playStreamStatus = false;
    this.publishStreamStatus = false;
    this.createSuccessSvgStatus = false;
    this.checkSystemRequireStatus = '';
    this.audioCheckStatus = false;
  }
}
