import React, { Component } from "react";
import "./DAW.css";
import Track from "./Track";
import LoadingGif from "./LoadingGif";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import { CustomDialog, Confirm, Alert } from "react-st-modal"; // https://github.com/Nodlik/react-st-modal
import AlignRecordingModalContent from "./AlignRecording";
// import Slider from "rc-slider";
// import "rc-slider/assets/index.css";

import IconButton from "@material-ui/core/IconButton";
import PlayArrowRoundedIcon from "@material-ui/icons/PlayArrowRounded";
import PauseRoundedIcon from "@material-ui/icons/PauseRounded";
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
      claimedTrackIds: {},
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
      numGroupMembersPrepared: 0,
      preparedGroupAction: null,
      withGroup: false,
      alreadyAligning: false,
      trackTimesInMillis: {},
      maxTime: 0,
      isPaused: true,
      seekEvent: null,
    };
    this.audioContext = null;
    this.gumStream = null;
    this.input = null;
    this.recorder = null;
    this.username = JSON.parse(localStorage.getItem("userDetails")).name;
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
      withGroup: true,
    });
  };

  beginGroupStopListener = async (data) => {
    console.log(
      "[SOCKET.IO] receiving begin group stop for " + this.props.projectName
    );
    if (!this.state.receivedImmediateStop) {
      if (
        typeof data.stopped_by === "string" &&
        data.stopped_by !== this.username
      ) {
        if (this.state.masterRecord) {
          await Alert(
            `${data.stopped_by} wants to stop! Press OK when you're done recording.`,
            `Group record stopped`
          );
          this.setState({ receivedImmediateStop: true, withGroup: false });
          this.toggleMasterStop();
        } else {
          this.setState({ receivedImmediateStop: true, withGroup: false });
          this.toggleMasterStop();
          await Alert(`${data.stopped_by} stopped!`, `Group rehearsal stopped`);
        }
      } else {
        this.setState({ receivedImmediateStop: true, withGroup: false });
        this.toggleMasterStop();
      }
    } else {
      console.log("begin group stop listener being called again..?");
      if (
        typeof data.stopped_by === "string" &&
        data.stopped_by !== this.username
      ) {
        if (this.state.masterRecord) {
          await Alert(
            `${data.stopped_by} wants to stop! Press OK when you're done recording.`,
            `Group record stopped`
          );
          this.toggleMasterStop();
        } else {
          this.toggleMasterStop();
          await Alert(
            `${data.stopped_by} stopped!!`,
            `Group rehearsal stopped`
          );
        }
      } else {
        this.toggleMasterStop();
      }
    }
    this.setState({
      requestingGroupRecord: false,
      requestingGroupPlayback: false,
      numGroupMembersPrepared: 0,
      preparedGroupAction: null,
    });
  };

  beginGroupRecordListener = () => {
    console.log("[SOCKET.IO] receiving begin group record");
    this.toggleMasterRecord();
    this.setState({
      requestingGroupRecord: false,
      preparedGroupAction: null,
      withGroup: true,
    });
  };

  updateNumPreparedListener = (data) => {
    console.log("[SOCKET.IO] updating number of prepared group members", data);
    if (data.num_prepared === 0) {
      // reset all group state
      this.setState({
        numGroupMembersPrepared: data.num_prepared,
        preparedGroupAction: null,
      });
    } else {
      this.setState({
        numGroupMembersPrepared: data.num_prepared,
        preparedGroupAction: data.action,
      });
    }
  };

  notifyWaitingGroupMember = async (data) => {
    console.log(
      "[SOCKET.IO] received request from group member " +
        data.requester +
        " to request " +
        data.action +
        " | num prepared: " +
        data.num_prepared
    );
    if (
      (data.action === "play" && this.state.requestingGroupPlayback) ||
      (data.action === "record" && this.state.requestingGroupRecord) ||
      data.num_prepared > 1
    ) {
      console.log("[SOCKET.IO] no need to notify me, already ready to go");
      return;
    }
    if (data.requester === null) {
      console.log("disconnected client attempting to start session");
      alert(
        `A group member tried to initiate "group ${data.action}" but their connection is faulty. Please ask them to refresh their page.`
      );
      return;
    }
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

  updateClaimedTracksListener = (data) => {
    console.log("[SOCKET.IO] updating claimed tracks", data);
    let newClaimedTrackIds = Object.assign({}, this.state.claimedTrackIds);
    if (data.track_id === null) {
      delete newClaimedTrackIds[data.claimed_by];
    } else {
      newClaimedTrackIds[data.claimed_by] = data.track_id;
    }
    this.setState({
      claimedTrackIds: newClaimedTrackIds,
    });
  };

  retrieveCurrentClaimedTracksListener = (callback) => {
    console.log(
      "[SOCKET.IO] received request to catch up new member: ",
      this.state.claimedTrackIds
    );
    let completeClaimedTrackIds = Object.assign({}, this.state.claimedTrackIds);
    completeClaimedTrackIds[this.username] = this.state.selectedTrackId;
    callback(completeClaimedTrackIds);
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

    this.username = JSON.parse(localStorage.getItem("userDetails")).name;
    this.setState({
      isRecording: false,
      masterRecord: false,
      selectedTrackId: null,
      soloTracks: [],
      mutedTracks: [],
      runningTime: 0,
    });

    this.seekSlider = document.getElementById(`seek-slider`);
    this.seekSlider.value = 0;
    if (this.timer) {
      clearInterval(this.timer);
    }

    // create socket io listeners + keyboard input (spacebar) listener
    console.log(
      `[SOCKET.IO] ${this.props.projectName} | creating DAW listeners for ${this.username}`
    );
    socket.on("beginGroupPlay", this.beginGroupPlayListener);
    socket.on("beginGroupStop", this.beginGroupStopListener);
    socket.on("beginGroupRecord", this.beginGroupRecordListener);
    socket.on("updateNumPrepared", this.updateNumPreparedListener);
    socket.on("notifyWaitingGroupMember", this.notifyWaitingGroupMember);
    socket.on("updateClaimedTracks", this.updateClaimedTracksListener);
    socket.on(
      "retrieveCurrentClaimedTracks",
      this.retrieveCurrentClaimedTracksListener
    );

    socket.emit("catch up new member", { channel: this.props.projectHash });
  }

  componentDidUpdate(prevProps) {
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
    if (
      this.props.numOnlineUsers === 1 &&
      prevProps.numOnlineUsers !== this.props.numOnlineUsers
    ) {
      this.resetGroupControls();
    } else if (
      (this.state.requestingGroupPlayback ||
        this.state.requestingGroupRecord ||
        this.state.preparedGroupAction !== null) &&
      this.state.numGroupMembersPrepared === 0
    ) {
      console.log("old state, resetting controls:", this.state);
      this.resetGroupControls();
    } else if (
      this.props.numOnlineUsers > 1 &&
      this.props.numOnlineUsers === this.state.numGroupMembersPrepared &&
      (this.state.requestingGroupRecord || this.state.requestingGroupPlayback)
    ) {
      console.log("all users that are online are ready to go!!!!!");
      if (this.state.requestingGroupRecord) {
        console.log("requesting group record");
        this.requestImmediateGroupRecord();
      } else if (this.state.requestingGroupPlayback) {
        console.log("requesting group play");
        this.requestImmediateGroupPlay();
      }
    }
    if (
      this.state.runningTime > this.state.maxTime &&
      this.state.maxTime !== 0 &&
      !(this.state.masterRecord || this.state.isRecording)
    ) {
      this.toggleMasterStop();
    }
  }

  resetGroupControls = () => {
    console.log("resetting group controls");
    this.setState({
      requestingGroupRecord: false,
      requestingGroupPlayback: false,
      receivedImmediateStop: false,
      numGroupMembersPrepared: 0,
      preparedGroupAction: null,
      withGroup: false,
    });
  };

  componentWillUnmount() {
    // remove socket io listeners
    console.log(
      `[SOCKET.IO] ${this.props.projectName} | removing DAW listeners`
    );
    socket.off("beginGroupPlay", this.beginGroupPlayListener);
    socket.off("beginGroupStop", this.beginGroupStopListener);
    socket.off("beginGroupRecord", this.beginGroupRecordListener);
    socket.off("updateNumPrepared", this.updateNumPreparedListener);
    socket.off("notifyWaitingGroupMember", this.notifyWaitingGroupMember);
    socket.off("updateClaimedTracks", this.updateClaimedTracksListener);
    socket.off(
      "retrieveCurrentClaimedTracks",
      this.retrieveCurrentClaimedTracksListener
    );
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
    if (this.state.isPaused && !this.state.masterPlay) {
      this.setState({ isPaused: !this.state.isPaused });
    }
    if (this.state.masterPlay) {
      this.setState({ isPaused: !this.state.isPaused });
      return;
    }
    this.setState((state) => {
      let startTime = Date.now() - this.state.runningTime;
      this.timer = setInterval(() => {
        if (!this.state.isPaused) {
          if (
            Math.abs(Date.now() - startTime - this.state.runningTime) > 1000
          ) {
            startTime = Date.now() - this.state.runningTime;
          }
          this.seekSlider.value =
            (this.state.runningTime / this.state.maxTime) * 100;
          this.setState({ runningTime: Date.now() - startTime });
        } else {
          startTime = Date.now() - this.state.runningTime;
        }
      });
      return { masterPlay: true };
    });
  };

  toggleMasterStop() {
    console.log("> master stop");
    clearInterval(this.timer);
    this.seekSlider.value = 0;
    if (!this.state.masterPlay) {
      console.log("stopped but not playing");
      this.setState({
        runningTime: 0,
        receivedImmediateStop: false,
        isPaused: true,
      });
      return;
    }
    if (!this.state.isRecording) {
      console.log("stopped but not recording");
      this.setState({
        masterStop: true,
        runningTime: 0,
        receivedImmediateStop: false,
        isPaused: true,
      });
    } else {
      this.setState({
        masterStop: true,
        runningTime: 0,
        stopMicProcessing: true,
        receivedImmediateStop: false,
        isRecording: false,
        isPaused: true,
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
      alert("Select a part to record!");
    } else {
      console.log("recording track " + this.state.selectedTrackId);
      // check if mic permissions are allowed before actually recording
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(() => {
          console.log("mic permission granted");
          this.startMicrophone();
          this.setState({
            showCountdown: true,
            isBlocked: false,
          });
        })
        .catch(() => {
          console.log("MIC PERMISSIOM DENIED");
          alert("Please allow access to your microphone!");
          this.setState({ isBlocked: true });
        });
    }
  }

  startMicrophone = () => {
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
            "[RECORDING] alignment tool is trying to pop up but shouldn't..."
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

  findNonRecordedTrackURLs = (targetTrackId) => {
    let nonRecordedTrackURLs;
    if (this.state.soloTracks.length > 0) {
      nonRecordedTrackURLs = Object.keys(this.props.trackMetadata)
        .filter((trackId) => {
          // only include unmuted tracks that are: 1) not the recorded track and 2) have recordings
          return (
            trackId !== targetTrackId &&
            this.state.soloTracks.includes(trackId) &&
            !this.state.mutedTracks.includes(trackId) &&
            Object.keys(this.props.trackMetadata[trackId].takes).length > 0
          );
        })
        .map((trackId) => {
          // TODO: made executive decision to just pick latest track, but eventually need to fix how take state is stored so DAW Object can access it
          const takeId = Object.keys(
            this.props.trackMetadata[trackId].takes
          ).pop();
          const audio_url =
            this.props.trackMetadata[trackId].takes[takeId].s3_info +
            "?cacheblock=true";
          return audio_url;
        });
    } else {
      nonRecordedTrackURLs = Object.keys(this.props.trackMetadata)
        .filter((trackId) => {
          // only include unmuted tracks that are: 1) not the recorded track and 2) have recordings
          return (
            trackId !== targetTrackId &&
            !this.state.mutedTracks.includes(trackId) &&
            Object.keys(this.props.trackMetadata[trackId].takes).length > 0
          );
        })
        .map((trackId) => {
          // TODO: made executive decision to just pick latest track, but eventually need to fix how take state is stored so DAW Object can access it
          const takeId = Object.keys(
            this.props.trackMetadata[trackId].takes
          ).pop();
          const audio_url =
            this.props.trackMetadata[trackId].takes[takeId].s3_info +
            "?cacheblock=true";
          return audio_url;
        });
    }
    console.log(
      "# tracks to be stacked for align tool backing track = " +
        nonRecordedTrackURLs.length
    );
    return nonRecordedTrackURLs;
  };

  stopMicrophone = async (blob) => {
    let file = new File(
      [blob],
      `recording_track_${this.state.selectedTrackId}.mp3`
    );
    let recordedURL = URL.createObjectURL(file);
    let latency = 0; // in ms
    this.setState({ stopMicProcessing: false });
    const numTotalTracks = Object.keys(this.props.trackMetadata).length;
    console.log(
      "[RECORDING] stopping microphone, not sending these muted tracks to alignment tool:",
      this.state.mutedTracks
    );
    let nonRecordedTrackURLs = this.findNonRecordedTrackURLs(
      this.state.selectedTrackId
    );
    // only align track if there is more than 1 track
    if (
      numTotalTracks > 1 &&
      nonRecordedTrackURLs.length > 0 &&
      this.state.selectedTrackId !== null &&
      !this.state.alreadyAligning
    ) {
      this.setState({ alreadyAligning: true });
      latency = await CustomDialog(
        <AlignRecordingModalContent
          recordedURL={recordedURL}
          backingTrackURLs={nonRecordedTrackURLs}
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
          alreadyAligning: false,
        });
        return;
      }
    }
    const isManualUpload = false;
    this.createTake(this.state.selectedTrackId, file, isManualUpload, latency);
    this.setState({
      isRecording: false,
      masterRecord: false,
      alreadyAligning: false,
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
    console.log("> [SOCKET.IO] broadcasting update claimed tracks");
    socket.emit("broadcast update claimed tracks", {
      channel: this.props.projectHash,
      track_id: id,
      claimed_by: this.username,
    });
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
    const confirm = await Confirm(
      `This will create a MP3 file containing the latest take from all parts. Are you sure you want to download?`,
      "Download Mix"
    );
    if (!confirm) {
      return;
    }

    let latestTakeURLs = Object.keys(this.props.trackMetadata)
      .filter((trackId) => {
        const numTakes = Object.keys(
          this.props.trackMetadata[trackId].takes
        ).length;
        return numTakes !== 0;
      })
      .map((trackId) => {
        const takes = this.props.trackMetadata[trackId].takes;
        const takeId = Object.keys(takes).pop();
        return takes[takeId].s3_info + "?cacheblock=true";
      });
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
    socket.emit("get current online users", {
      channel: this.props.projectHash,
    });
    socket.emit(
      "prepare group play",
      {
        channel: this.props.projectHash,
      },
      (shouldPlay) => {
        if (!shouldPlay) {
          this.setState({
            requestingGroupPlayback: true,
            preparedGroupAction: "play",
          });
        }
      }
    );
  };

  requestImmediateGroupPlay = () => {
    console.log("[SOCKET.IO] request immediate group play");
    socket.emit("immediate group play", {
      channel: this.props.projectHash,
    });
  };

  requestGroupStop = () => {
    console.log("[SOCKET.IO] request immediate group stop");
    if (this.state.withGroup) {
      socket.emit("immediate group stop", {
        channel: this.props.projectHash,
        user: this.username,
      });
    } else {
      console.log("wanted to stop again but not with group anymore");
    }
  };

  // TODO: needs to send which track it chose to record and
  // make sure there are no conflicts with other tracks
  requestGroupRecord = () => {
    console.log("[SOCKET.IO] request group record");
    if (this.state.selectedTrackId === null) {
      alert("Select a part before recording!");
    } else {
      socket.emit("get current online users", {
        channel: this.props.projectHash,
      });
      socket.emit(
        "prepare group record",
        {
          channel: this.props.projectHash,
        },
        (shouldRecord) => {
          if (!shouldRecord) {
            this.setState({
              requestingGroupRecord: true,
              preparedGroupAction: "record",
            });
          }
        }
      );
    }
  };

  requestImmediateGroupRecord = () => {
    console.log("[SOCKET.IO] request immediate group record");
    socket.emit("immediate group record", {
      channel: this.props.projectHash,
    });
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

  realignTake = async (realignTrackId, takeURL) => {
    let nonRecordedTrackURLs = this.findNonRecordedTrackURLs(realignTrackId);
    if (nonRecordedTrackURLs.length === 0) {
      alert(
        "Cannot realign: realign is only supported with 1+ other unmuted parts."
      );
      return;
    }
    const latency = await CustomDialog(
      <AlignRecordingModalContent
        recordedURL={takeURL}
        backingTrackURLs={nonRecordedTrackURLs}
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
    let file = new File([data], `recording_track_${realignTrackId}.mp3`);
    const isManualUpload = true;
    this.createTake(realignTrackId, file, isManualUpload, latency);
  };

  updateTrackTimesInMillis = (trackId, trackTimeInSecs) => {
    let newTrackTimes = Object.assign({}, this.state.trackTimesInMillis);
    newTrackTimes[trackId] = trackTimeInSecs * 1000;
    const maxTime = Math.max(...Object.values(newTrackTimes));
    this.setState({ trackTimesInMillis: newTrackTimes, maxTime: maxTime });
  };

  seek = (value) => {
    this.setState({
      runningTime: (value / 100) * this.state.maxTime,
      seekEvent: (value / 100) * this.state.maxTime,
    });
  };

  render() {
    const otherMembersOnline = this.props.numOnlineUsers > 1;
    const totalTakes = Object.keys(this.props.trackMetadata).reduce(
      (accumulator, trackId) => {
        return (
          accumulator +
          Object.keys(this.props.trackMetadata[trackId].takes).length
        );
      },
      0
    );
    const claimedTrackIdsKeys = Object.keys(this.state.claimedTrackIds);
    return (
      <div style={{ marginBottom: "10px" }}>
        <div>
          {this.props.trackMetadata &&
          Object.keys(this.props.trackMetadata).length > 0 ? (
            Object.keys(this.props.trackMetadata).map((trackId) => {
              const trackInfo = this.props.trackMetadata[trackId];
              const trackOwner = claimedTrackIdsKeys.find(
                (key) => this.state.claimedTrackIds[key] === trackId
              );
              const claimedBy =
                trackOwner !== this.username && trackOwner !== undefined
                  ? trackOwner
                  : null;
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
                      claimedBy={claimedBy}
                      updateTrackTimesInMillis={this.updateTrackTimesInMillis}
                      isPaused={this.state.isPaused}
                      seekEvent={this.state.seekEvent}
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
              style={{ marginLeft: "18px", height: "35px", marginTop: "8px" }}
              onClick={this.requestGroupRecord}
              disabled={
                this.state.masterPlay ||
                this.state.withGroup ||
                this.state.requestingGroupRecord ||
                this.state.requestingGroupPlayback ||
                this.state.preparedGroupAction === "play" ||
                this.state.showCountdown
              }
            >
              {this.state.requestingGroupRecord ? "waiting..." : "group record"}
            </button>
          )}
          {otherMembersOnline && (
            <button
              onClick={this.requestGroupStop}
              disabled={!this.state.withGroup || this.state.showCountdown}
              style={{ height: "35px", marginTop: "8px" }}
            >
              group stop
            </button>
          )}
          {otherMembersOnline && (
            <button
              onClick={this.requestGroupPlay}
              disabled={
                this.state.masterPlay ||
                this.state.withGroup ||
                this.state.requestingGroupPlayback ||
                this.state.requestingGroupRecord ||
                this.state.preparedGroupAction === "record" ||
                this.state.showCountdown ||
                totalTakes === 0
              }
              style={{ height: "35px", marginTop: "8px" }}
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
              style={{ height: "35px", marginTop: "8px" }}
            >
              cancel request
            </button>
          )}
          {otherMembersOnline &&
            this.state.preparedGroupAction !== null &&
            this.state.numGroupMembersPrepared !== 0 && (
              <div style={{ marginLeft: "10px", marginTop: "14px" }}>
                {this.state.numGroupMembersPrepared}/{this.props.numOnlineUsers}{" "}
                ready
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
        <Tooltip
          title={this.state.masterPlay ? "" : "Record selected part"}
          arrow
        >
          <span>
            <IconButton
              disableRipple
              aria-label="Record"
              onClick={this.toggleMasterRecord}
              disabled={
                this.state.masterPlay ||
                this.state.isBlocked ||
                this.state.withGroup ||
                this.state.showCountdown
              }
            >
              {this.state.masterPlay ||
              this.state.isBlocked ||
              this.state.withGroup ||
              this.state.showCountdown ? (
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
              disabled={!this.state.masterPlay || this.state.withGroup}
            >
              <StopRoundedIcon style={{ fontSize: 35 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip
          title={
            this.state.masterPlay || totalTakes === 0 ? "" : "Play all parts"
          }
          arrow
        >
          <span>
            <IconButton
              disableRipple
              aria-label="Play"
              onClick={this.toggleMasterPlay}
              disabled={
                this.state.masterRecord ||
                this.state.withGroup ||
                totalTakes === 0 ||
                this.state.showCountdown
              }
              style={{ marginLeft: "-5px" }}
            >
              {this.state.masterRecord ||
              this.state.withGroup ||
              totalTakes === 0 ||
              this.state.showCountdown ? (
                <PlayArrowRoundedIcon style={{ fontSize: 35 }} />
              ) : this.state.isPaused ? (
                <PlayArrowRoundedIcon
                  color="primary"
                  style={{ fontSize: 35, color: "#54ae1c" }}
                />
              ) : (
                <PauseRoundedIcon style={{ fontSize: 35 }} />
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
              marginTop: "4px",
            }}
          >
            <input
              type="range"
              id="seek-slider"
              max="100"
              defaultValue="0"
              onChange={(e) => this.seek(e.target.value)}
              disabled={this.state.withGroup}
              title={
                !this.state.withGroup
                  ? ""
                  : "Seeking during group play is not allowed."
              }
            />
          </div>
          <div
            style={
              this.state.masterRecord ||
              this.state.isRecording ||
              this.state.showCountdown
                ? {
                    position: "absolute",
                    marginLeft: "505px",
                    marginTop: "5px",
                    width: "85px",
                    color: "lightgray",
                  }
                : {
                    position: "absolute",
                    marginLeft: "505px",
                    marginTop: "4px",
                    width: "85px",
                  }
            }
          >
            {this.formattedTime(this.state.maxTime)}
          </div>
          {/* <div
            style={{
              position: "absolute",
              marginLeft: "320px",
              width: "55px",
            }}
          >
            Volume
            <Slider
              min={0}
              max={100}
              defaultValue={100}
              onChange={this.changeVolume}
            />
          </div> */}
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
              marginLeft: "715px",
              marginTop: "-95px",
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
              style={{
                marginTop: "6px",
                marginBottom: "10px",
                height: "25px",
              }}
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
