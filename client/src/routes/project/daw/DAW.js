import React, { Component } from "react";
import "./DAW.css";
import Track from "./Track";
import LoadingGif from "./LoadingGif";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import { CustomDialog, Confirm } from "react-st-modal"; // https://github.com/Nodlik/react-st-modal
import AlignRecordingModalContent from "./AlignRecording";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

import IconButton from "@material-ui/core/IconButton";
import PlayArrowRoundedIcon from "@material-ui/icons/PlayArrowRounded";
import StopRoundedIcon from "@material-ui/icons/StopRounded";
import FiberManualRecordRoundedIcon from "@material-ui/icons/FiberManualRecordRounded";
import Tooltip from "@material-ui/core/Tooltip";
import Crunker from "crunker";

import { socket } from "../../../App";

const AudioContext = window.AudioContext || window.webkitAudioContext;
const WebAudioRecorder = window.WebAudioRecorder; // https://github.com/higuma/web-audio-recorder-js
const crunker = new Crunker();

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
      mutedTracks: [],
      soloTracks: [],
      masterVolume: 0.5,
      initialLoad: true,
      isRehearsing: false,
      stopMicProcessing: false,
      requestingGroupRecord: false,
      requestingGroupPlayback: false,
      receivedImmediateStop: false,
      numGroupMembersPrepared: 1,
      numGroupMembersTotal: 1,
      preparedGroupAction: null,
    };
    this.audioContext = null;
    this.gumStream = null;
    this.input = null;
    this.recorder = null;
    this.toggleMasterRecord = this.toggleMasterRecord.bind(this);
    this.toggleMasterStop = this.toggleMasterStop.bind(this);
  }

  // SOCKET IO LISTENERS:

  beginGroupPlayListener = () => {
    console.log("[SOCKET.IO] receiving begin group play");
    this.toggleMasterPlay();
    this.setState({
      requestingGroupPlayback: false,
      preparedGroupAction: null,
    });
  };

  beginGroupStopListener = (data) => {
    console.log(
      "[SOCKET.IO] receiving begin group stop for " + this.props.projectName
    );
    if (!this.state.receivedImmediateStop) {
      this.setState({ receivedImmediateStop: true });
      this.toggleMasterStop();
      const username = JSON.parse(localStorage.getItem("userDetails")).name;
      if (typeof data.stopped_by === "string" && data.stopped_by !== username) {
        alert(`${data.stopped_by} stopped!`);
      }
    }
  };

  beginGroupRecordListener = () => {
    console.log("[SOCKET.IO] receiving begin group record");
    this.toggleMasterRecord();
    this.setState({ requestingGroupRecord: false, preparedGroupAction: null });
  };

  updateNumPreparedListener = (data) => {
    console.log("[SOCKET.IO] updating number of prepared group members");
    this.setState({
      numGroupMembersPrepared: data.num_prepared,
      numGroupMembersTotal: data.num_total,
      preparedGroupAction: data.action,
    });
  };

  notifyWaitingGroupMember = async (data) => {
    console.log(
      "[SOCKET.IO] received request from group member " +
        data.requester +
        " to request " +
        data.action
    );
    const readyToJoin = await Confirm(
      `${data.requester} wants to group ${data.action}. Ready to join?`,
      "Incoming Request",
      "Yes",
      "No"
    );
    if (readyToJoin) {
      console.log(`[SOCKET.IO] ready to join for ${data.action}!`);
      if (data.action === "play") {
        this.requestGroupPlay();
      } else {
        this.requestGroupRecord();
      }
    } else {
      console.log(`[SOCKET.IO] not ready to join for ${data.action}...`);
      this.setState({ preparedGroupAction: data.action });
    }
  };

  // REACT MAIN FUNCTIONS:

  componentDidMount() {
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
      mutedTracks: [],
    });

    // create socket io listeners + keyboard input (spacebar) listener
    console.log(
      `[SOCKET.IO] ${this.props.projectName} | creating DAW listeners`
    );
    socket.on("beginGroupPlay", this.beginGroupPlayListener);
    socket.on("beginGroupStop", this.beginGroupStopListener);
    socket.on("beginGroupRecord", this.beginGroupRecordListener);
    socket.on("updateNumPrepared", this.updateNumPreparedListener);
    socket.on("notifyWaitingGroupMember", this.notifyWaitingGroupMember);
    document.body.addEventListener("keypress", this.createAnnotation);
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

  componentWillUnmount() {
    // remove socket io listeners + keyboard input (spacebar) listener
    console.log(
      `[SOCKET.IO] ${this.props.projectName} | removing DAW listeners`
    );
    socket.off("beginGroupPlay", this.beginGroupPlayListener);
    socket.off("beginGroupStop", this.beginGroupStopListener);
    socket.off("beginGroupRecord", this.beginGroupRecordListener);
    socket.off("updateNumPrepared", this.updateNumPreparedListener);
    socket.off("notifyWaitingGroupMember", this.notifyWaitingGroupMember);
    document.body.removeEventListener("keypress", this.createAnnotation);
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
      this.setState({ selectedTrackId: null });
    }
  };

  // TAKE OPERATIONS

  createTake = (track_id, file, is_manual_upload, latency = 0) => {
    this.props.createTake(track_id, file, is_manual_upload, latency);
  };

  deleteTake = (track_id, take_number, take_id) => {
    this.props.deleteTake(track_id, take_number, take_id);
  };

  // PLAYBACK OPERATIONS

  toggleMasterPlay = () => {
    console.log("> master play");
    if (this.state.masterPlay) {
      return;
    }
    this.setState((state) => {
      const startTime = Date.now() - this.state.runningTime;
      this.timer = setInterval(() => {
        this.setState({ runningTime: Date.now() - startTime });
      });
      return { masterPlay: true };
    });
  };

  toggleMasterStop() {
    console.log("> master stop");
    clearInterval(this.timer);
    if (!this.state.masterPlay) {
      return;
    }
    if (!this.state.isRecording) {
      this.setState({
        masterStop: true,
        runningTime: 0,
        receivedImmediateStop: false,
      });
    } else {
      this.setState({
        masterStop: true,
        runningTime: 0,
        stopMicProcessing: true,
        receivedImmediateStop: false,
        isRecording: false,
      });
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
          showCountdown: true,
        };
      });
    }
  }

  startMicrophone = () => {
    console.log("[RECORDING] start microphone");
    this.audioContext = new AudioContext();
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      console.log(
        "[RECORDING] getUserMedia() success, stream created, initializing WebAudioRecorder..."
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
        mp3: { bitRate: 256 },
      });

      this.recorder.onComplete = async (recorder, blob) => {
        if (!this.state.masterRecord) {
          console.log(
            "[RECORDING] alignment tool is trying to pop up but shouldn't:",
            this.state
          );
          return;
        }
        console.log("[RECORDING] encoding complete");
        this.gumStream.getAudioTracks()[0].stop();
        await this.stopMicrophone(blob);
      };

      this.recorder.startRecording();
    });
  };

  stopMicrophone = async (blob) => {
    console.log("[RECORDING] stopping microphone");
    let file = new File(
      [blob],
      `recording_track_${this.state.selectedTrackId}.mp3`
    );
    let recordedURL = URL.createObjectURL(file);
    let latency = 0; // in ms
    this.setState({ stopMicProcessing: false });
    const numTotalTracks = Object.keys(this.props.trackMetadata).length;
    // const mutedTracks = this.state.mutedTracks.length;
    // console.log(
    //   "stopping microphone, sending these muted tracks to alignment tool:",
    //   this.state.mutedTracks
    // );
    // only align track if there is more than 1 track
    if (numTotalTracks > 1 && this.state.selectedTrackId !== null) {
      latency = await CustomDialog(
        <AlignRecordingModalContent
          recordedURL={recordedURL}
          recordedTrackId={this.state.selectedTrackId}
          trackMetadata={this.props.trackMetadata}
          mutedTracks={this.state.mutedTracks}
          hasCountdownLatency={true}
        />,
        {
          title: "Check Recording",
          isCanClose: false,
          // showCloseIcon: true,
        }
      );
      // delete recording instead
      if (latency === "scrap") {
        this.setState({
          isRecording: false,
          masterRecord: false,
        });
        return;
      }
    }
    const isManualUpload = false;
    this.createTake(this.state.selectedTrackId, file, isManualUpload, latency);
    this.setState({
      isRecording: false,
      masterRecord: false,
    });
  };

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
      const isManualUpload = true;
      this.createTake(targetId, files[0], isManualUpload);
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

  updateMutedTracks = (trackId) => {
    let newMutedTracks = [...this.state.mutedTracks];
    let index = newMutedTracks.indexOf(trackId);

    if (index !== -1) {
      // remove
      newMutedTracks.splice(index, 1);
    } else {
      // add
      newMutedTracks.push(trackId);
    }
    console.log("new muted tracks:", newMutedTracks);
    this.setState({ mutedTracks: newMutedTracks });
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

  downloadMixedTrack = async () => {
    console.log("downloading track");
    const confirm = await Confirm(
      `This will create a MP3 file containing the latest take from all parts. Are you sure you want to download?`,
      "Download Mix"
    );
    if (!confirm) {
      return;
    }

    let latestTakeURLs = Object.keys(this.props.trackMetadata)
      .filter((trackId) => {
        const numTakes = Object.keys(this.props.trackMetadata[trackId].takes)
          .length;
        return numTakes !== 0;
      })
      .map((trackId) => {
        const takes = this.props.trackMetadata[trackId].takes;
        const takeId = Object.keys(takes).pop();
        console.log(takeId);
        return takes[takeId].s3_info + "?cacheblock=true";
      });
    console.log(latestTakeURLs);
    crunker
      .fetchAudio(...latestTakeURLs)
      .then((buffers) => {
        return crunker.mergeAudio(buffers);
      })
      .then((merged) => {
        return crunker.export(merged, "audio/mp3");
      })
      .then((output) => {
        // https://stackoverflow.com/questions/50694881/how-to-download-file-in-react-js
        const link = document.createElement("a");
        link.href = output.url;
        const d = new Date();
        const datestring = `${d.getFullYear()}_${
          d.getMonth() + 1
        }_${d.getDate()}`;
        const timestring = `${d.getHours()}_${d.getMinutes()}_${d.getDate()}_${
          d.getHours() >= 12 ? "PM" : "AM"
        }`;
        const outputFilename = `${this.props.projectName}_${datestring}-${timestring}`;
        link.setAttribute("download", outputFilename);

        document.body.appendChild(link); // Append to html link element page
        link.click(); // Start download
        link.parentNode.removeChild(link); // Clean up and remove the link
      });
  };

  requestGroupPlay = () => {
    console.log("[SOCKET.IO] requesting group play");
    socket.emit(
      "prepare group play",
      {
        channel: this.props.projectHash,
      },
      (shouldPlay) => {
        if (shouldPlay) {
          this.toggleMasterPlay();
        } else {
          this.setState({
            requestingGroupPlayback: true,
            preparedGroupAction: "play",
          });
        }
      }
    );
  };

  requestGroupStop = () => {
    console.log("[SOCKET.IO] request immediate group stop");
    const username = JSON.parse(localStorage.getItem("userDetails")).name;
    socket.emit("immediate group stop", {
      channel: this.props.projectHash,
      user: username,
    });
  };

  // TODO: needs to send which track it chose to record and
  // make sure there are no conflicts with other tracks
  requestGroupRecord = () => {
    console.log("[SOCKET.IO] request group record");
    if (this.state.selectedTrackId === null) {
      alert("Select a track before requesting group record!");
    } else {
      socket.emit(
        "prepare group record",
        {
          channel: this.props.projectHash,
        },
        (shouldRecord) => {
          if (shouldRecord) {
            this.toggleMasterRecord();
          } else {
            this.setState({
              requestingGroupRecord: true,
              preparedGroupAction: "record",
            });
          }
        }
      );
    }
  };

  cancelRequest = () => {
    console.log("[SOCKET.IO] cancel current request");
    socket.emit("cancel request", { channel: this.props.projectHash }, () => {
      this.setState({
        requestingGroupPlayback: false,
        requestingGroupRecord: false,
        preparedGroupAction: null,
      });
    });
  };

  // seek = (value) => {
  //   console.log("seek:", value);
  // };

  createAnnotation = (event) => {
    if (event.keyCode === 32 && this.state.masterPlay) {
      console.log(
        "SPACE BAR PRESS:" + this.formattedTime(this.state.runningTime)
      );
    }
  };

  realignTake = async (trackId, takeURL) => {
    const latency = await CustomDialog(
      <AlignRecordingModalContent
        recordedURL={takeURL}
        recordedTrackId={trackId}
        trackMetadata={this.props.trackMetadata}
        mutedTracks={this.state.mutedTracks}
        hasCountdownLatency={false}
      />,
      {
        title: "Check Recording",
        isCanClose: false,
        // showCloseIcon: true,
      }
    );
    // delete recording instead
    if (latency === "scrap") {
      return;
    }
    let response = await fetch(takeURL);
    let data = await response.blob();
    let file = new File([data], `recording_track_${trackId}.mp3`);
    const isManualUpload = true;
    this.createTake(trackId, file, isManualUpload, latency);
  };

  render() {
    const otherMembersOnline = this.props.numOnlineUsers > 1;
    return (
      <div style={{ marginBottom: "10px" }}>
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
                      updateMutedTracks={this.updateMutedTracks}
                      claimedTracks={this.state.claimedTracks}
                      masterVolume={this.state.masterVolume}
                      renameTrack={this.renameTrack}
                      deleteTrack={this.deleteTrack}
                      handleFileUpload={this.handleFileUpload}
                      realignTake={this.realignTake}
                    />
                  </div>
                  {Object.keys(this.props.trackMetadata[trackId].takes)
                    .length === 0 && (
                    <div style={{ marginTop: "-8px" }}>
                      <input
                        style={{
                          marginLeft: "20px",
                          marginBottom: "10px",
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
          style={{ marginTop: "10px", marginLeft: "5px", marginBottom: "28px" }}
          className="stitched"
          onClick={this.createTrack}
        >
          + New Part
        </button>
        <div style={{ display: "flex" }}>
          <p style={{ marginBottom: "5px" }}>
            <b>Master Controls</b>
          </p>
          {otherMembersOnline && (
            <button
              style={{ marginLeft: "12px" }}
              onClick={this.requestGroupRecord}
              disabled={
                this.state.masterPlay ||
                this.state.requestingGroupRecord ||
                this.state.requestingGroupPlayback
              }
            >
              {this.state.requestingGroupRecord ? "waiting..." : "group record"}
            </button>
          )}
          {otherMembersOnline && (
            <button
              onClick={this.requestGroupStop}
              disabled={!this.state.masterPlay}
            >
              group stop
            </button>
          )}
          {otherMembersOnline && (
            <button
              onClick={this.requestGroupPlay}
              disabled={
                this.state.masterPlay ||
                this.state.requestingGroupPlayback ||
                this.state.requestingGroupRecord
              }
            >
              {this.state.requestingGroupPlayback ? "waiting..." : "group play"}
            </button>
          )}
          {otherMembersOnline && (
            <button
              onClick={this.cancelRequest}
              disabled={
                !this.state.requestingGroupRecord &&
                !this.state.requestingGroupPlayback
              }
            >
              cancel request
            </button>
          )}
          {this.state.preparedGroupAction !== null &&
            this.state.numGroupMembersPrepared !== 0 && (
              <div style={{ marginLeft: "10px", marginTop: "10px" }}>
                {this.state.numGroupMembersPrepared}/
                {this.state.numGroupMembersTotal} ready
                {this.state.preparedGroupAction &&
                  ` for ${this.state.preparedGroupAction}`}
              </div>
            )}
          {this.state.stopMicProcessing && (
            <LoadingGif text={"Saving Recording..."} />
          )}
        </div>
        {this.state.isBlocked && (
          <p style={{ marginBottom: "5px" }}>
            Please allow access to your mic to record!
          </p>
        )}
        {/* TODO: Live Monitoring */}
        <Tooltip title="Record selected part" arrow>
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
        <Tooltip title={this.state.masterPlay ? "Stop all parts" : ""} arrow>
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
        <Tooltip title="Play all parts" arrow>
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
              {this.state.masterPlay ||
              Object.keys(this.props.trackMetadata).length === 0 ? (
                <PlayArrowRoundedIcon style={{ fontSize: 35 }} />
              ) : (
                <PlayArrowRoundedIcon
                  color="primary"
                  style={{ fontSize: 35, color: "#54ae1c" }}
                />
              )}
            </IconButton>
          </span>
        </Tooltip>{" "}
        <div style={{ display: "flex", marginTop: "-45px" }}>
          <div style={{ marginLeft: "170px", marginTop: "5px" }}>
            {this.state.isRecording ? (
              <span style={{ color: "#F60457" }}>
                <b>{this.formattedTime(this.state.runningTime)}</b>
              </span>
            ) : this.state.masterPlay || this.state.showCountdown ? (
              <span>
                <b>{this.formattedTime(this.state.runningTime)}</b>
              </span>
            ) : (
              <span>{this.formattedTime(this.state.runningTime)}</span>
            )}
          </div>
          <div
            style={{
              position: "absolute",
              marginLeft: "250px",
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

          {/* <div
            style={{
              position: "absolute",
              marginLeft: "395px",
              width: "200px",
            }}
          >
            Seek
            <Slider min={0} max={100} defaultValue={0} onChange={this.seek} />
          </div> */}
          <button
            onClick={this.downloadMixedTrack}
            className="download-full-mix"
          >
            Download full mix
          </button>
        </div>
        {this.state.showCountdown && (
          <div
            className="timer"
            style={{
              position: "absolute",
              marginLeft: "525px",
              marginTop: "-100px",
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
                this.setState({
                  showCountdown: false,
                  masterPlay: true,
                  masterRecord: true,
                  isRecording: true,
                });
              }}
            >
              {({ remainingTime }) => remainingTime}
            </CountdownCircleTimer>
            <button
              onClick={() => {
                this.setState({
                  showCountdown: false,
                  isRecording: false,
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
