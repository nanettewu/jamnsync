import React, { Component } from "react";
import "./DAW.css";
import Track from "./Track";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import { CustomDialog } from "react-st-modal"; // https://github.com/Nodlik/react-st-modal
import AlignRecordingModalContent from "./AlignRecording";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

import IconButton from "@material-ui/core/IconButton";
import PlayArrowRoundedIcon from "@material-ui/icons/PlayArrowRounded";
import StopRoundedIcon from "@material-ui/icons/StopRounded";
import FiberManualRecordRoundedIcon from "@material-ui/icons/FiberManualRecordRounded";
import Tooltip from "@material-ui/core/Tooltip";

const AudioContext = window.AudioContext || window.webkitAudioContext;
const WebAudioRecorder = window.WebAudioRecorder; // https://github.com/higuma/web-audio-recorder-js

class DAW extends Component {
  constructor() {
    super();
    this.state = {
      masterPlay: false,
      masterStop: false,
      masterRecord: false,
      isRecording: false,
      selectedTrackId: null, // to record
      isBlocked: true,
      showCountdown: false,
      runningTime: 0,
      soloTracks: [],
      masterVolume: 0.5,
      initialLoad: true,
      isRehearsing: false,
    };
    this.audioContext = null;
    this.gumStream = null;
    this.input = null;
    this.recorder = null;
    this.toggleMasterRecord = this.toggleMasterRecord.bind(this);
    this.toggleMasterStop = this.toggleMasterStop.bind(this);
    this.stopMicrophone = this.stopMicrophone.bind(this);

    // this.test = this.test.bind(this);
  }

  componentDidUpdate() {
    if (this.state.initialLoad) {
      if (Object.keys(this.props.trackMetadata).length === 0) {
        this.createTrack();
      }
      this.setState({ initialLoad: false });
    }
    if (this.state.masterPlay && this.state.masterStop) {
      this.setState({
        masterPlay: false,
        masterStop: false,
        runningTime: 0,
      });
    }
  }

  componentDidMount() {
    console.log("reloading DAW");
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        console.log("mic permission granted");
        this.setState({ isBlocked: false });
      })
      .catch(() => {
        console.log("MIC PERMISSIOM DENIED");
        this.setState({ isBlocked: true });
      });

    this.setState({
      isRecording: false,
      masterRecord: false,
      selectedTrackId: null,
      soloTracks: [],
    });
  }

  // TRACK OPERATIONS

  createTrack = () => {
    this.props.createTrack();
  };

  renameTrack = (id, name) => {
    this.props.renameTrack(id, name);
  };

  deleteTrack = (id, name) => {
    const successfulDelete = this.props.deleteTrack(id, name);
    if (successfulDelete) {
      // if deleted a selected track, reset selected track
      this.setState({ selectedTrackId: null });
    }
  };

  // TAKE OPERATIONS

  createTake = (track_id, file, is_aligned, latency = 0) => {
    this.props.createTake(track_id, file, is_aligned, latency);
  };

  deleteTake = (track_id, take_number, take_id) => {
    this.props.deleteTake(track_id, take_number, take_id);
  };

  // PLAYBACK OPERATIONS

  toggleMasterPlay = () => {
    console.log("> master play");
    this.setState((state) => {
      const startTime = Date.now() - this.state.runningTime;
      this.timer = setInterval(() => {
        this.setState({ runningTime: Date.now() - startTime });
      });
      return { masterPlay: true };
    });
  };

  async toggleMasterStop() {
    console.log("> master stop");
    if (!this.state.masterPlay) {
      return;
    }
    clearInterval(this.timer);
    this.setState({ masterStop: true, runningTime: 0 });
    // let recordedURL, file;
    if (this.state.isRecording) {
      //stop microphone access
      this.gumStream.getAudioTracks()[0].stop();
      this.recorder.finishRecording();
    }
  }

  // https://codesandbox.io/s/v67oz43lm7?file=/src/index.js
  async toggleMasterRecord() {
    console.log("> master record");
    if (this.state.selectedTrackId === null) {
      alert("Select a track to record!");
    } else {
      console.log("recording track " + this.state.selectedTrackId);
      this.startMicrophone();
      this.setState((state) => {
        return {
          masterRecord: true,
          showCountdown: true,
          isRecording: true,
        };
      });
    }
  }

  startMicrophone = () => {
    console.log("begin start recording");
    this.audioContext = new AudioContext();
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      console.log(
        "getUserMedia() success, stream created, initializing WebAudioRecorder..."
      );
      this.gumStream = stream;

      /* use the stream */
      this.input = this.audioContext.createMediaStreamSource(stream);

      this.recorder = new WebAudioRecorder(this.input, {
        workerDir: "js/", // must end with slash
        encoding: "mp3",
        numChannels: 2, //2 is the default, mp3 encoding supports only 2
      });

      this.recorder.setOptions({
        timeLimit: 600,
        encodeAfterRecord: true,
        mp3: { bitRate: 320 },
      });

      this.recorder.onComplete = async (recorder, blob) => {
        console.log("encoding complete");
        this.gumStream.getAudioTracks()[0].stop();
        await this.stopMicrophone(blob);
      };

      this.recorder.startRecording();
    });
  };

  async stopMicrophone(blob) {
    console.log("stopping microphone with blob", blob);
    let file = new File(
      [blob],
      `recording_track_${this.state.selectedTrackId}.mp3`
    );
    let recordedURL = URL.createObjectURL(file);
    let latency = -1; // in ms
    if (Object.keys(this.props.trackMetadata).length > 1) {
      latency = await CustomDialog(
        <AlignRecordingModalContent
          recordedURL={recordedURL}
          recordedTrackId={this.state.selectedTrackId}
          trackMetadata={this.props.trackMetadata}
        />,
        {
          title: "Check Recording",
          showCloseIcon: true,
        }
      );
      console.log("latency:", latency);
    }
    const isAligned = Object.keys(this.props.trackMetadata).length <= 1; // no need to align if no other tracks
    this.createTake(this.state.selectedTrackId, file, isAligned, latency);
    this.setState({
      isRecording: false,
      masterRecord: false,
    });
  }

  handleFileUpload = (files, targetId) => {
    console.log("handling file upload for target track id", targetId);
    if (
      files === null ||
      files[0] === null ||
      typeof files[0] === "undefined"
    ) {
      return;
    }
    if (/\.(mp3|ogg|wav|flac|aac|aiff|m4a)$/i.test(files[0].name)) {
      console.log("> validated file: ", files[0].name);
      const isAligned = true;
      this.createTake(targetId, files[0], isAligned);
    } else {
      alert(
        "Please upload valid audio file type (mp3, ogg, wav, flac, aac, aiff, m4a)"
      );
      return;
    }
  };

  setSelectedTrack = (id) => {
    const newId = id !== null ? id : null;
    console.log("selecting track to record: " + newId);
    this.setState({ selectedTrackId: newId });
  };

  formattedTime = (ms) => {
    let minutes = Math.floor(ms / 60000);
    let seconds = ((ms % 60000) / 1000).toFixed(2);
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
  };

  updateSoloTracks = (trackId) => {
    let newSoloTracks = [...this.state.soloTracks];
    let index = newSoloTracks.indexOf(trackId);

    if (index !== -1) {
      // remove
      newSoloTracks.splice(index, 1);
    } else {
      // add
      newSoloTracks.push(trackId);
    }
    console.log("new solo tracks:", newSoloTracks);
    this.setState({ soloTracks: newSoloTracks });
  };

  changeVolume = (value) => {
    this.setState({ masterVolume: value / 100 });
  };

  rehearse = () => {
    console.log("currently rehearsing:", this.state.isRehearsing);
    this.setState({
      isRehearsing: !this.state.isRehearsing,
    });
  };

  render() {
    return (
      <div>
        <div>
          {this.props.trackMetadata &&
          Object.keys(this.props.trackMetadata).length > 0 ? (
            Object.keys(this.props.trackMetadata).map((trackId) => {
              const trackInfo = this.props.trackMetadata[trackId];
              return (
                <div key={`track_${trackId}`}>
                  <div>
                    <Track
                      trackName={trackInfo.track_name}
                      trackId={trackId}
                      takes={trackInfo.takes}
                      masterPlay={this.state.masterPlay}
                      masterStop={this.state.masterStop}
                      masterRecord={this.state.masterRecord}
                      selectedTrackId={this.state.selectedTrackId}
                      setSelectedTrack={this.setSelectedTrack}
                      deleteTake={this.deleteTake}
                      soloTracks={this.state.soloTracks}
                      updateSoloTracks={this.updateSoloTracks}
                      masterVolume={this.state.masterVolume}
                      renameTrack={this.renameTrack}
                      deleteTrack={this.deleteTrack}
                      handleFileUpload={this.handleFileUpload}
                    />
                  </div>
                  {Object.keys(this.props.trackMetadata[trackId].takes)
                    .length === 0 && (
                    <div style={{ marginTop: "-20px" }}>
                      <input
                        style={{
                          marginLeft: "20px",
                          marginTop: "25px",
                          marginBottom: "20px",
                        }}
                        type="file"
                        onChange={(e) =>
                          this.handleFileUpload(e.target.files, trackId)
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ marginTop: "10px" }} />
          )}
        </div>
        <button
          style={{ marginTop: "10px", marginLeft: "5px", marginBottom: "20px" }}
          className="stitched"
          onClick={this.createTrack}
        >
          + New Track
        </button>
        <p style={{ marginBottom: "5px" }}>
          <b>Master Controls</b>
        </p>
        {this.state.isBlocked && (
          <p style={{ marginBottom: "5px" }}>
            Please allow access to your mic to record!
          </p>
        )}
        {/* TODO: Live Monitoring, Rehearse */}
        <Tooltip title="Record selected track" arrow>
          <span>
            <IconButton
              disableRipple
              aria-label="Record"
              onClick={this.toggleMasterRecord}
              disabled={this.state.masterPlay || this.state.isBlocked}
            >
              {this.state.masterPlay || this.state.isBlocked ? (
                <FiberManualRecordRoundedIcon style={{ fontSize: 28 }} />
              ) : (
                <FiberManualRecordRoundedIcon
                  style={{ fontSize: 28 }}
                  color="secondary"
                />
              )}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={this.state.masterPlay ? "Stop all tracks" : ""} arrow>
          <span>
            <IconButton
              disableRipple
              aria-label="Stop"
              onClick={this.toggleMasterStop}
              disabled={!this.state.masterPlay}
            >
              <StopRoundedIcon style={{ fontSize: 35 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Play all tracks" arrow>
          <span>
            <IconButton
              disableRipple
              aria-label="Play"
              onClick={this.toggleMasterPlay}
              disabled={
                this.state.masterPlay ||
                Object.keys(this.props.trackMetadata).length === 0
              }
              style={{ marginLeft: "-5px" }}
            >
              <PlayArrowRoundedIcon style={{ fontSize: 35 }} />
            </IconButton>
          </span>
        </Tooltip>{" "}
        <button onClick={this.rehearse}>
          {this.state.isRehearsing ? "Stop Rehearsing" : "Start Rehearsing!"}
        </button>{" "}
        {this.formattedTime(this.state.runningTime)}
        <div
          style={{
            position: "absolute",
            marginLeft: "360px",
            marginTop: "-45px",
            width: "100px",
          }}
        >
          Volume
          <Slider
            min={0}
            max={100}
            defaultValue={100}
            onChange={this.changeVolume}
          />
        </div>
        {this.state.showCountdown && (
          <div
            className="timer"
            style={{
              position: "absolute",
              marginLeft: "480px",
              marginTop: "-110px",
            }}
          >
            <CountdownCircleTimer
              isPlaying
              duration={3}
              colors={[["#0f52bd", 1]]}
              size={90}
              onComplete={() => {
                const startTime = Date.now() - this.state.runningTime;
                this.timer = setInterval(() => {
                  this.setState({ runningTime: Date.now() - startTime });
                });
                this.setState({ showCountdown: false, masterPlay: true });
              }}
            >
              {({ remainingTime }) => remainingTime}
            </CountdownCircleTimer>
            <button
              onClick={() => {
                this.setState({
                  showCountdown: false,
                });
                this.toggleMasterStop();
              }}
              style={{ marginTop: "10px", marginBottom: "10px" }}
            >
              Ahh I'm not ready!
            </button>
          </div>
        )}
      </div>
    );
  }
}

export default DAW;
