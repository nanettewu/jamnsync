import React, { Component } from "react";
import { Howl } from 'howler';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import MicRecorder from 'mic-recorder-to-mp3';

import 'video.js/dist/video-js.css';
import videojs from 'video.js';
import 'webrtc-adapter';
import RecordRTC from 'recordrtc';
// Required imports when recording audio-only using the videojs-wavesurfer plugin
import WaveSurfer from 'wavesurfer.js';
import MicrophonePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.microphone.js';

// Register videojs-wavesurfer plugin
import 'videojs-wavesurfer/dist/css/videojs.wavesurfer.css';
import Wavesurfer from 'videojs-wavesurfer/dist/videojs.wavesurfer.js';
import 'videojs-record/dist/css/videojs.record.css';
import Record from 'videojs-record/dist/videojs.record.js';

WaveSurfer.microphone = MicrophonePlugin;
const Mp3Recorder = new MicRecorder({ bitRate: 128 });

const videoJsOptions = {
  controls: true,
  bigPlayButton: false,
  width: 600,
  height: 200,
  fluid: false,
  plugins: {

    // wavesurfer section is only needed when recording audio-only
    wavesurfer: {
      backend: 'WebAudio',
      waveColor: '#36393b',
      progressColor: 'black',
      debug: true,
      cursorWidth: 1,
      hideScrollbar: true,
      plugins: [
        // enable microphone plugin
        WaveSurfer.microphone.create({
          bufferSize: 4096,
          numberOfInputChannels: 1,
          numberOfOutputChannels: 1,
          constraints: {
            video: false,
            audio: true
          }
        })
      ]
    },
    record: {
      audio: true,
      video: false,
      maxLength: 20,
      displayMilliseconds: true,
      debug: true
    }
  }
};

class AudioPlayer extends Component {
  constructor() {
    super();
    this.sound = new Howl({
      src: ["./audio/gersh.mp3"],
      volume: 0.5
    })
    this.state = {
      playing: false,
      muted: false,
      recording: false,
      isBlocked: false,
      blobURL: '',
    }
  }

  componentDidMount() {
    navigator.getUserMedia({ audio: true },
      () => {
        console.log('Permission Granted');
        this.setState({ isBlocked: false });
      },
      () => {
        console.log('Permission Denied');
        this.setState({ isBlocked: true })
      },
    );

    // instantiate Video.js
    this.player = videojs(this.videoNode, videoJsOptions, () => {
      // print version information at startup
      const version_info = 'Using video.js ' + videojs.VERSION +
        ' with videojs-record ' + videojs.getPluginVersion('record') +
        ' and recordrtc ' + RecordRTC.version;
      videojs.log(version_info);
    });

    // device is ready
    this.player.on('deviceReady', () => {
      console.log('device is ready!');
    });

    // user clicked the record button and started recording
    this.player.on('startRecord', () => {
      console.log('started recording!');
    });

    // user completed recording and stream is available
    this.player.on('finishRecord', () => {
      // recordedData is a blob object containing the recorded data that
      // can be downloaded by the user, stored on server etc.
      console.log('finished recording: ', this.player.recordedData);
    });

    // error handling
    this.player.on('error', (element, error) => {
      console.warn(error);
    });

    this.player.on('deviceError', () => {
      console.error('device error:', this.player.deviceErrorCode);
    });
  }

  componentWillUnmount() {
    this.handleStop()
    if (this.player) {
      this.player.dispose();
    }
  }

  handlePlayPause = () => {
    if (this.state.playing) {
      console.log("pause")
      this.sound.pause()
      this.setState({ playing: false })
    } else {
      console.log("play")
      this.sound.play()
      this.setState({ playing: true })
    }
  }

  handleStop = () => {
    this.sound.stop()
    this.setState({ playing: false })
  }

  handleMute = () => {
    if (this.state.muted) {
      console.log("unmute")
      this.sound.mute(false)
      this.setState({ muted: false })
    } else {
      console.log("mute")
      this.sound.mute(true)
      this.setState({ muted: true })
    }
  }

  changeVolume = (value) => {
    this.sound.volume(value / 100)
  }

  changeSpeed = (value) => {
    this.sound.rate(value / 100)
  }

  startRecording = () => {
    if (this.state.isBlocked) {
      console.log('Permission Denied');
      alert('Permission Denied!')
    } else {
      Mp3Recorder
        .start()
        .then(() => {
          this.setState({ recording: true });
        }).catch((e) => console.error(e));
    }
  }

  stopRecording = () => {
    Mp3Recorder
      .stop()
      .getMp3()
      .then(([buffer, blob]) => {
        const blobURL = URL.createObjectURL(blob)
        this.setState({ blobURL, recording: false });
      }).catch((e) => console.log(e));
  }

  render() {
    return (
      <div>
        <h2>AUDIO PLAYER</h2>
        <p>testing gershwin</p>
        {this.state.playing
          ? <button onClick={this.handlePlayPause}>pause</button>
          : <button onClick={this.handlePlayPause}>play</button>
        }
        <button onClick={this.handleStop}>stop</button>
        {this.state.muted
          ? <button onClick={this.handleMute}>unmute</button>
          : <button onClick={this.handleMute}>mute</button>
        }
        <div style={{ width: 200 }}>
          <p>volume control:</p>
          <Slider min={0} max={100} defaultValue={50} onChange={this.changeVolume} />
        </div>
        <div style={{ width: 200 }}>
          <p>speed control [TODO]:</p>
          <Slider min={0} max={100} defaultValue={50} onChange={this.changeSpeed} />
        </div>
        <div style={{ width: 500 }}>
          <p>basic record:</p>
          <button onClick={this.startRecording} disabled={this.state.recording}>Record</button>
          <button onClick={this.stopRecording} disabled={!this.state.recording}>Stop</button>
          <div>
            {this.state.blobURL != '' && <audio src={this.state.blobURL} controls="controls" />}
          </div>
        </div>
        <div>
          <p>videojs record</p>
          <div data-vjs-player>
            <video id="myVideo" ref={node => this.videoNode = node} className="video-js vjs-default-skin" playsInline></video>
          </div>
        </div>
      </div>
    );
  }
}

export default AudioPlayer;