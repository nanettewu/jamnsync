import React, { Component } from "react";
import { Howl } from "howler";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import MicRecorder from "mic-recorder-to-mp3";

// import 'video.js/dist/video-js.css';
// import videojs from 'video.js';
// import 'webrtc-adapter';
// import RecordRTC from 'recordrtc';
// Required imports when recording audio-only using the videojs-wavesurfer plugin
import WaveSurfer from "wavesurfer.js";
import MicrophonePlugin from "wavesurfer.js/dist/plugin/wavesurfer.microphone.js";

// Register videojs-wavesurfer plugin
import "videojs-wavesurfer/dist/css/videojs.wavesurfer.css";
// eslint-disable-next-line
import Wavesurfer from "videojs-wavesurfer/dist/videojs.wavesurfer.js";
import "videojs-record/dist/css/videojs.record.css";
// eslint-disable-next-line
import Record from "videojs-record/dist/videojs.record.js";

WaveSurfer.microphone = MicrophonePlugin;
const Mp3Recorder = new MicRecorder({ bitRate: 128 });

// const videoJsOptions = {
//   controls: true,
//   bigPlayButton: false,
//   width: 600,
//   height: 200,
//   fluid: false,
//   plugins: {

//     // wavesurfer section is only needed when recording audio-only
//     wavesurfer: {
//       backend: 'WebAudio',
//       waveColor: '#36393b',
//       progressColor: 'black',
//       debug: true,
//       cursorWidth: 1,
//       hideScrollbar: true,
//       plugins: [
//         // enable microphone plugin
//         WaveSurfer.microphone.create({
//           bufferSize: 4096,
//           numberOfInputChannels: 1,
//           numberOfOutputChannels: 1,
//           constraints: {
//             video: false,
//             audio: true
//           }
//         })
//       ]
//     },
//     record: {
//       audio: true,
//       video: false,
//       maxLength: 20,
//       displayMilliseconds: true,
//       debug: true
//     }
//   }
// };

var kq_bg = new Howl({
  src: ["audio/kq/KillerQueen_bg.wav"],
  volume: 0.5,
  format: ["wav"],
  preload: true,
});

var kq_solo = new Howl({
  src: ["audio/kq/KillerQueen_solo.wav"],
  volume: 0.5,
  format: ["wav"],
  preload: true,
});

class AudioPlayer extends Component {
  constructor() {
    super();
    // this.sound = new Howl({
    //   src: ["./audio/gersh.mp3"],
    //   volume: 0.5
    // })
    this.state = {
      playing: false,
      muted: false,
      recording: false,
      isBlocked: false,
      blobURL: "",
      file: null,
      sound: null,
      recordedTrack: null,
      public_s3_test: null,
      s3_test: null,
      s3_howl: null,
      s3_upload_url: "",
      upload_success: false,
      audio: null,
      audioIsRecording: false,
    };
  }

  componentDidMount() {
    navigator.mediaDevices.getUserMedia(
      { audio: true },
      () => {
        console.log("Permission Granted");
        this.setState({ isBlocked: false });
      },
      () => {
        console.log("Permission Denied");
        this.setState({ isBlocked: true });
      }
    );

    // // instantiate Video.js
    // this.player = videojs(this.videoNode, videoJsOptions, () => {
    //   // print version information at startup
    //   const version_info = 'Using video.js ' + videojs.VERSION +
    //     ' with videojs-record ' + videojs.getPluginVersion('record') +
    //     ' and recordrtc ' + RecordRTC.version;
    //   videojs.log(version_info);
    // });

    // // device is ready
    // this.player.on('deviceReady', () => {
    //   console.log('device is ready!');
    // });

    // // user clicked the record button and started recording
    // this.player.on('startRecord', () => {
    //   console.log('started recording!');
    // });

    // // user completed recording and stream is available
    // this.player.on('finishRecord', () => {
    //   // recordedData is a blob object containing the recorded data that
    //   // can be downloaded by the user, stored on server etc.
    //   console.log('finished recording: ', this.player.recordedData);
    // });

    // // error handling
    // this.player.on('error', (element, error) => {
    //   console.warn(error);
    // });

    // this.player.on('deviceError', () => {
    //   console.error('device error:', this.player.deviceErrorCode);
    // });
  }

  componentWillUnmount() {
    if (this.state.sound) {
      this.handleStop();
    }
    if (this.player) {
      this.player.dispose();
    }
  }

  handlePlayPause = () => {
    console.log(this.state.sound);
    if (this.state.playing) {
      console.log("pause");
      this.state.sound.pause();
      this.setState({ playing: false });
    } else {
      console.log("play");
      this.state.sound.play();
      this.setState({ playing: true });
    }
  };

  handleStop = () => {
    this.state.sound.stop();
    this.setState({ playing: false });
  };

  handleMute = () => {
    if (this.state.muted) {
      console.log("unmute");
      this.state.sound.mute(false);
      this.setState({ muted: false });
    } else {
      console.log("mute");
      this.state.sound.mute(true);
      this.setState({ muted: true });
    }
  };

  changeVolume = (value) => {
    this.state.sound.volume(value / 100);
  };

  changePan = (value) => {
    this.state.sound.stereo(value / 100);
  };

  changeSpeed = (value) => {
    this.state.sound.rate(value / 100);
  };

  startRecording = () => {
    if (this.state.isBlocked) {
      console.log("Permission Denied");
      alert("Permission Denied!");
    } else {
      Mp3Recorder.start()
        .then(() => {
          this.setState({ recording: true });
        })
        .catch((e) => console.error(e));
    }
  };

  stopRecording = () => {
    Mp3Recorder.stop()
      .getMp3()
      .then(([buffer, blob]) => {
        const blobURL = URL.createObjectURL(blob);
        this.setState({
          blobURL,
          recording: false,
          recordedTrack: new Howl({
            src: [blobURL],
            volume: 0.5,
            format: ["wav"],
            preload: true,
          }),
        });
      })
      .catch((e) => console.log(e));
  };

  handleFileUpload = (event) => {
    if (
      event.target.files[0] === null ||
      typeof event.target.files[0] === "undefined"
    ) {
      return;
    }

    if (/\.(mp3|wav|aiff)$/i.test(event.target.files[0].name)) {
      console.log("file uploaded!");
      console.log(event.target.files[0]);
      this.setState({
        file: event.target.files[0],
        sound: new Howl({
          src: [URL.createObjectURL(event.target.files[0])],
          volume: 0.5,
          format: ["wav"],
        }),
      });
    } else {
      alert("please upload valid audio file type (mp3, wav, aiff)");
    }
  };

  handlePlayAndRecord = () => {
    this.startRecording();
    // this.handlePlayPause();
    setTimeout(() => {
      this.handlePlayPause();
    }, 350);
  };

  handleStopPlayAndRecord = () => {
    this.stopRecording();
    this.handleStop();
  };

  handlePlayTwoTracks = () => {
    console.log("playing two tracks");
    console.log(this.state);
    if (!this.state.recordedTrack.playing() && !this.state.sound.playing()) {
      this.state.recordedTrack.play();
      this.state.sound.play();
    } else {
      this.state.recordedTrack.pause();
      this.state.sound.pause();
    }
    // this.state.recordedTrack.playing() ? this.state.recordedTrack.pause() : this.state.recordedTrack.play();
    // this.state.sound.playing() ? this.state.sound.pause() : this.state.sound.play(); //background
    // kq_bg.playing() ? kq_bg.pause() : kq_bg.play();
    // kq_solo.playing() ? kq_solo.pause() : kq_solo.play();
  };

  handlePlayTwoTracksKQ = () => {
    console.log("playing two tracks KQ");
    kq_bg.playing() ? kq_bg.pause() : kq_bg.play();
    kq_solo.playing() ? kq_solo.pause() : kq_solo.play();
  };

  handleTestPublicS3File = () => {
    console.log("test public file download");

    fetch("https://jamnsync.s3.amazonaws.com/click_104bpm_30sec.mp3", {
      method: "get",
    })
      .then((res) => res.blob())
      .then((blob) => {
        console.log(blob);
        this.setState({ public_s3_test: URL.createObjectURL(blob) });
      });
  };

  handleTestS3Download = () => {
    console.log("testing s3 file download");
    fetch("/download/surprise.mp3", {
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        console.log(blob);
        const s3blobURL = URL.createObjectURL(blob);
        console.log(s3blobURL);
        this.setState({
          s3_test: s3blobURL,
          s3_howl: new Howl({
            src: [s3blobURL],
            volume: 0.3,
            format: ["mp3"],
            preload: true,
          }),
        });
      });
  };

  handleTestS3Upload = () => {
    const data = new FormData();
    data.append("file", this.state.file);
    fetch("/upload", { method: "POST", body: data }).then((res) => {
      this.setState({ upload_success: true });
    });
  };

  handleS3UploadChange = () => {
    this.setState({ upload_success: false, s3_upload_url: "" });
  };

  handlePlayS3File = () => {
    console.log("playing s3 file download");
    console.log(this.state.s3_howl);
    this.state.s3_howl.play();
  };

  handleRecord = () => {
    if (this.state.isBlocked) {
      console.log("Permission Denied");
      alert("Permission Denied!");
    } else {
      console.log("recording now");
      this.setState({ audioIsRecording: true });
    }
  };

  handleStopRecord = () => {
    console.log("stopped now");
    this.setState({ audioIsRecording: false });
  };

  render() {
    return (
      <div>
        <h2>AUDIO PLAYER</h2>

        <div>
          <p>file upload</p>
          <input type="file" onChange={this.handleFileUpload} />
        </div>

        {this.state.file && (
          <div>
            <p>test s3 upload</p>
            <button onClick={this.handleTestS3Upload}>upload to s3</button>
            {this.state.upload_success && <p>---upload success!</p>}
            <p>file player</p>
            playback only:
            {this.state.playing ? (
              <button onClick={this.handlePlayPause}>pause</button>
            ) : (
              <button onClick={this.handlePlayPause}>play</button>
            )}
            <button onClick={this.handleStop}>stop</button>
            {this.state.muted ? (
              <button onClick={this.handleMute}>unmute</button>
            ) : (
              <button onClick={this.handleMute}>mute</button>
            )}
            <div>
              recording:
              <button
                disabled={this.state.recording}
                onClick={this.handlePlayAndRecord}
              >
                play+record
              </button>
              <button
                disabled={!this.state.recording}
                onClick={this.handleStopPlayAndRecord}
              >
                stop play+record
              </button>
            </div>
            <div>
              {this.state.blobURL !== "" && (
                <div>
                  <audio src={this.state.blobURL} controls="controls" />
                  <button onClick={this.handlePlayTwoTracks}>
                    play/pause recording and back track
                  </button>
                </div>
              )}
            </div>
            <div style={{ width: 200 }}>
              <p>volume control:</p>
              <Slider
                min={0}
                max={100}
                defaultValue={50}
                onChange={this.changeVolume}
              />
              <p>pan:</p>
              <Slider
                min={-100}
                max={100}
                defaultValue={0}
                onChange={this.changePan}
              />
            </div>
          </div>
        )}

        {/* <div>
          <p>
            <b>[NEW]</b> test download public s3 file:
            https://jamnsync.s3.amazonaws.com/click_104bpm_30sec.mp3
          </p>
          <button onClick={this.handleTestPublicS3File}>
            download public file
          </button>
          {this.state.public_s3_test && (
            <audio src={this.state.public_s3_test} controls="controls" />
          )}
        </div> */}

        {/* <div>
          <p>test s3 audio file download</p>
          <button onClick={this.handleTestS3Download}>download</button>
          {this.state.s3_howl && (
            <button onClick={this.handlePlayS3File}>play s3 file</button>
          )}
        </div> */}

        {/* <div>
          <p>test playing simultaneously</p>
          <button onClick={this.handlePlayTwoTracksKQ}>
            play/pause killer queen
          </button>
        </div> */}
      </div>
    );
  }
}

export default AudioPlayer;
