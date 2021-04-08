import React, { Component } from "react";
import "./DAW.css";
import Track from "./Track";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import { CustomDialog } from "react-st-modal"; // https://github.com/Nodlik/react-st-modal
import AlignRecordingModalContent from "./AlignRecording";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import vmsg from "vmsg"; // https://github.com/Kagami/vmsg

import IconButton from "@material-ui/core/IconButton";
import PlayArrowRoundedIcon from "@material-ui/icons/PlayArrowRounded";
import StopRoundedIcon from "@material-ui/icons/StopRounded";
import FiberManualRecordRoundedIcon from "@material-ui/icons/FiberManualRecordRounded";

const recorder = new vmsg.Recorder({
  wasmURL: "https://unpkg.com/vmsg@0.3.0/vmsg.wasm", // ! TODO
});

class DAW extends Component {
  constructor() {
    super();
    this.state = {
      masterPlay: false,
      masterStop: false,
      masterRecord: false,
      isRecording: false,
      selectedTrackId: null, // to record
      isBlocked: false,
      showCountdown: false,
      runningTime: 0,
      soloTracks: [],
      masterVolume: 0.5,
    };
    this.toggleMasterRecord = this.toggleMasterRecord.bind(this);
    this.toggleMasterStop = this.toggleMasterStop.bind(this);
    // this.test = this.test.bind(this);
  }

  componentDidUpdate() {
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

  createTake = (track_id, file, latency = 0) => {
    this.props.createTake(track_id, file, latency);
  };

  deleteTake = (track_id, take_number, take_id) => {
    this.props.deleteTake(track_id, take_number, take_id);
  };

  // PLAYBACK OPERATIONS

  toggleMasterPlay = () => {
    console.log("master play");
    this.setState((state) => {
      const startTime = Date.now() - this.state.runningTime;
      this.timer = setInterval(() => {
        this.setState({ runningTime: Date.now() - startTime });
      });
      return { masterPlay: true };
    });
  };

  async toggleMasterStop() {
    console.log("master stop");
    if (!this.state.masterPlay) {
      return;
    }
    clearInterval(this.timer);
    this.setState({ masterStop: true, runningTime: 0 });
    // let recordedURL, file;
    if (this.state.isRecording) {
      const blob = await recorder.stopRecording();
      // Mp3Recorder.stop()
      //   .getMp3()
      //   .then(([buffer, blob]) => {
      let file = new File(
        [blob],
        `recording_track_${this.state.selectedTrackId}.mp3`
      );
      let recordedURL = URL.createObjectURL(file);
      console.log(recordedURL);
      //   return { file: file, recordedURL: recordedURL };
      // })
      // .then(async (obj) => {
      let latency = -1; // in ms
      if (Object.keys(this.props.trackMetadata).length > 1) {
        // ! TODO
        // latency = await CustomDialog(
        //   <AlignRecordingModalContent
        //     recordedURL={recordedURL}
        //     recordedTrackId={this.state.selectedTrackId}
        //     trackMetadata={this.props.trackMetadata}
        //   />,
        //   {
        //     title: "Check Recording",
        //     showCloseIcon: true,
        //   }
        // );
        // console.log("latency:", latency);
      }
      this.createTake(this.state.selectedTrackId, file, latency); // ! TODO
      this.setState({ isRecording: false, masterRecord: false });
      // })
      // .catch((e) => console.log(e));
    }
  }

  async test() {
    const latency = await CustomDialog(
      <AlignRecordingModalContent recordedURL={"test1"} />,
      {
        title: "Check Recording",
        showCloseIcon: true,
      }
    );
    console.log("latency:", latency);
  }

  // https://codesandbox.io/s/v67oz43lm7?file=/src/index.js
  async toggleMasterRecord() {
    console.log("master record!");
    if (this.state.isBlocked) {
      console.log("Permission Denied");
      alert("Permission Denied!");
    } else if (this.state.selectedTrackId === null) {
      alert("Select a track to record!");
    } else {
      console.log("recording" + this.state.selectedTrackId);
      // Mp3Recorder.start();
      await recorder.initAudio();
      await recorder.initWorker();
      recorder.startRecording();

      this.setState((state) => {
        return {
          masterRecord: true,
          showCountdown: true,
          isRecording: true,
        };
      });
    }
  }

  handleFileUpload = (files, targetId) => {
    console.log("handling file upload");
    if (
      files === null ||
      files[0] === null ||
      typeof files[0] === "undefined"
    ) {
      return;
    }
    if (/\.(mp3|ogg|wav|flac|aac|aiff|m4a)$/i.test(files[0].name)) {
      console.log("> validated file: ", files[0].name);
      this.createTake(targetId, files[0]);
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
    // convert linear 1->100 to log 1->100 via f(n) = 50 * log(n)
    this.setState({ masterVolume: value / 75 });
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
          style={{ marginTop: "10px", marginLeft: "5px" }}
          className="stitched"
          onClick={this.createTrack}
        >
          + New Track
        </button>
        <p>
          <b>Master Controls</b>
        </p>
        {/* TODO: Live Monitoring, Rehearse */}
        <IconButton
          disableRipple
          aria-label="Stop"
          onClick={this.toggleMasterRecord}
          disabled={this.state.masterPlay}
        >
          {this.state.masterPlay ? (
            <FiberManualRecordRoundedIcon style={{ fontSize: 28 }} />
          ) : (
            <FiberManualRecordRoundedIcon
              style={{ fontSize: 28 }}
              color="secondary"
            />
          )}
        </IconButton>
        <IconButton
          disableRipple
          aria-label="Stop"
          onClick={this.toggleMasterStop}
          disabled={!this.state.masterPlay}
        >
          <StopRoundedIcon style={{ fontSize: 35 }} />
        </IconButton>
        <IconButton
          disableRipple
          aria-label="Play"
          onClick={this.toggleMasterPlay}
          disabled={this.state.masterPlay}
          style={{ marginLeft: "-5px" }}
        >
          <PlayArrowRoundedIcon style={{ fontSize: 35 }} />
        </IconButton>{" "}
        <button onClick={this.test}>Test</button>{" "}
        {this.formattedTime(this.state.runningTime)}
        <div
          style={{
            position: "absolute",
            marginLeft: "285px",
            marginTop: "-45px",
            width: "100px",
          }}
        >
          Volume
          <Slider
            min={0}
            max={100}
            defaultValue={50}
            onChange={this.changeVolume}
          />
        </div>
        {this.state.showCountdown && (
          <div className="timer" style={{ marginTop: "10px" }}>
            <CountdownCircleTimer
              isPlaying
              duration={3}
              colors={[["#0f52bd", 1]]}
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
              style={{ marginTop: "10px" }}
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
