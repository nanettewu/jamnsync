// import { Howl } from "howler";
// import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import React, { Component } from "react";
import "./Track.css";
import Dropdown from "react-dropdown";
import "react-dropdown/style.css";
import { Confirm } from "react-st-modal"; // https://github.com/Nodlik/react-st-modal

import IconButton from "@material-ui/core/IconButton";
import Tooltip from "@material-ui/core/Tooltip";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";
import HeadsetRoundedIcon from "@material-ui/icons/HeadsetRounded";
import VolumeOffRoundedIcon from "@material-ui/icons/VolumeOffRounded";

const FILE_UPLOAD_OPTION = "+ Upload File";
const RENAME_TRACK_OPTION = "Rename Track";
const DELETE_TRACK_OPTION = "Delete Track";

const options = [FILE_UPLOAD_OPTION, RENAME_TRACK_OPTION, DELETE_TRACK_OPTION];

class Track extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selected: false,
      playing: false,
      muted: false,
      s3URL: null,
      selectedTake: null,
      latestTake: 0,
      soloing: false,
      volume: 84.95,
      threeDotsAnchorElement: null,
    };
    this.audioFile = null;
    if (Object.keys(props.takes).length !== 0) {
      const latestKey = Object.keys(props.takes).pop();
      const url = props.takes[latestKey].s3_info;
      if (url) {
        this.state.s3URL = url;
        this.state.selectedTake = latestKey;
        this.audioFile = document.getElementById(
          `audio-file-${this.props.trackId}`
        );
      }
    }
    this.deleteTake = this.deleteTake.bind(this);
  }

  componentDidMount() {
    // if this track has takes and the page refreshed, select most recent take
    if (Object.keys(this.props.takes).length !== 0) {
      const latestKey = Object.keys(this.props.takes).pop();
      const url = this.props.takes[latestKey].s3_info;
      if (url) {
        this.setState({
          s3URL: url,
          selectedTake: latestKey,
          latestTake: latestKey,
        });
        this.audioFile = document.getElementById(
          `audio-file-${this.props.trackId}`
        );
      }
      // otherwise reset the take state
    } else {
      this.setState({
        selectedTake: null,
        s3URL: null,
        latestTake: 0,
      });
    }
  }

  componentDidUpdate(prevProps) {
    // set audio file
    if (this.state.s3URL && this.audioFile === null) {
      this.audioFile = document.getElementById(
        `audio-file-${this.props.trackId}`
      );
    } else if (this.state.s3URL === null && this.audioFile !== null) {
      this.audioFile = null;
    }

    // unselect selected track if a different track is selected
    if (
      this.state.selected &&
      this.props.selectedTrackId !== this.props.trackId
    ) {
      this.setState({ selected: false });
    }

    // if no take is currently selected and # of states updated
    if (
      (this.state.selectedTake === null ||
        this.state.latestTake !== Object.keys(this.props.takes).pop()) &&
      Object.keys(this.props.takes).length !== 0
    ) {
      const latestKey = Object.keys(this.props.takes).pop();
      const url = this.props.takes[latestKey].s3_info;
      if (url) {
        this.setState({
          latestTake: latestKey,
          selectedTake: latestKey,
          s3URL: url,
        });
      }
    } else if (Object.keys(this.props.takes).length === 0 && this.state.s3URL) {
      this.setState({
        selectedTake: null,
        s3URL: null,
        latestTake: 0,
      });
    }

    // play non-selected track during recording or stop if DAW master controls indicate
    if (
      this.props.masterPlay &&
      this.audioFile &&
      !this.state.playing &&
      (!this.state.selected ||
        (this.state.selected && !this.props.masterRecord))
    ) {
      console.log(`[${this.props.trackName}] playing 1: ${this.state.s3URL}`);
      this.audioFile.currentTime = 0;
      this.audioFile.play();
      this.setState({ playing: true });
    } else if (this.props.masterStop && this.audioFile && this.state.playing) {
      this.audioFile.pause();
      this.setState({ playing: false });
    }

    // update soloing
    if (
      !this.state.soloing &&
      this.props.soloTracks.length !== 0 &&
      !this.state.muted &&
      this.state.s3URL
    ) {
      this.audioFile.muted = true;
      this.setState({
        muted: true,
      });
    } else if (
      this.props.soloTracks.length === 0 &&
      this.state.muted &&
      this.state.s3URL &&
      prevProps.soloTracks.length !== 0
    ) {
      this.audioFile.muted = false;
      this.setState({
        muted: false,
      });
    }

    if (
      this.state.s3URL &&
      prevProps.masterVolume !== this.props.masterVolume
    ) {
      console.log(this.audioFile.volume);
      console.log(this.props.masterVolume);
      this.audioFile.volume = Math.min(1, this.props.masterVolume);
    }
  }

  componentWillUnmount() {
    if (this.audioFile) {
      this.audioFile.pause();
    }
  }

  // playPauseAudio = () => {
  //   if (this.state.playing) {
  //     this.audioFile.pause();
  //     this.setState({ playing: false });
  //   } else {
  //     this.audioFile.play();
  //     this.setState({ playing: true });
  //   }
  // };

  stop = () => {
    this.audioFile.currentTime = 0;
    this.audioFile.pause();
    this.setState({ playing: false });
  };

  changeVolume = (value) => {
    // convert linear 1->100 to log 1->100 via f(n) = 50 * log(n)
    // const volume = Math.max(0, 40 * Math.log10(value));
    //   Math.max(0, (1 - Math.log(value) / Math.log(0.5)) / 9.5) * 100;
    const volume = value;
    console.log(value);
    this.audioFile.volume = (this.props.masterVolume * volume) / 80;
    this.setState({ volume: volume });
  };

  seek = (value) => {
    this.audioFile.currentTime = value;
    this.audioFile.pause();
    if (this.state.playing) {
      this.audioFile.play();
    }
  };

  fastForward = () => {
    this.audioFile.pause();
    const duration = this.audioFile.duration();
    const currentSeek = this.audioFile.currentTime;
    const forwardTo = currentSeek + 5;
    if (forwardTo >= duration) {
      this.audioFile.currentTime = 0;
      this.audioFile.pause();
      return;
    }
    console.log("ff: " + currentSeek + " -> " + forwardTo);
    this.audioFile.currentTime = forwardTo;
    if (this.state.playing) {
      this.audioFile.play();
    }
  };

  rewind = () => {
    this.audioFile.pause();
    const currentSeek = this.audioFile.currentTime;
    let backwardTo = currentSeek - 5;
    if (backwardTo <= 0) {
      backwardTo = 0;
    }
    console.log("rewind: " + currentSeek + " -> " + backwardTo);
    this.audioFile.currentTime = backwardTo;
    if (this.state.playing) {
      this.audioFile.play();
    }
  };

  mute = () => {
    this.audioFile.muted = !this.state.muted;
    this.setState({
      muted: !this.state.muted,
    });
  };

  solo = () => {
    this.props.updateSoloTracks(this.props.trackId);
    if (!this.state.soloing) {
      this.audioFile.muted = false;
      this.setState({
        soloing: true,
        muted: false,
      });
    } else {
      this.setState({
        soloing: false,
      });
    }
  };

  selectToRecord = () => {
    const updatedTrackId = !this.state.selected ? this.props.trackId : null;
    this.props.setSelectedTrack(updatedTrackId);
    this.setState({ selected: !this.state.selected });
  };

  _onSelect = (option) => {
    console.log("Selected " + option.label);
    this.audioFile.currentTime = 0;
    this.audioFile.pause();
    const url = this.props.takes[option.value].s3_info;
    this.setState({
      playing: false,
      selectedTake: option.value,
      s3URL: url,
    });
    this.audioFile = document.getElementById(
      `audio-file-${this.props.trackId}`
    );
  };

  async deleteTake() {
    console.log("deleting take");
    const targetTake = this.state.selectedTake;
    const takeInfo = this.props.takes[targetTake];
    let d;
    if (takeInfo["date_uploaded"].lastIndexOf(" ") !== -1) {
      d = new Date(
        takeInfo["date_uploaded"].substr(
          0,
          takeInfo["date_uploaded"].lastIndexOf(" ") + 1
        )
      );
    } else {
      d = new Date(takeInfo["date_uploaded"]);
    }
    const formattedDateTime = d.toLocaleString("en-US");

    const name = `Take ${targetTake} - ${formattedDateTime}`;
    const result = await Confirm(
      `Are you sure you want to delete "${name}"?`,
      "Delete Take"
    );
    if (result) {
      if (this.audioFile) {
        this.audioFile.currentTime = 0;
        this.audioFile.pause();
      }
      await this.props.deleteTake(this.props.trackId, targetTake, takeInfo.id);

      let newSelectedTake = null;
      if (Object.keys(this.props.takes).length > 1) {
        const takeCopy = Object.keys(this.props.takes);
        takeCopy.splice(takeCopy.indexOf(targetTake), 1);
        newSelectedTake = Math.max.apply(Math, takeCopy);
        const newURL = this.props.takes[newSelectedTake].s3_info;
        this.setState({
          playing: false,
          selectedTake: newSelectedTake,
          s3URL: newURL,
          latestTake: newSelectedTake,
        });
      } else {
        console.log("unsetting audio file");
        this.setState({
          playing: false,
          selectedTake: newSelectedTake,
          s3URL: null,
          latestTake: 0,
        });
      }
    }
  }

  clickThreeDotsMenu = (e) => {
    this.setState({ threeDotsAnchorElement: e.currentTarget });
  };

  closeThreeDotsMenu = (e) => {
    const option = e.target.innerText;
    if (option === FILE_UPLOAD_OPTION) {
      document.getElementById(`file-upload-${this.props.trackId}`).click();
    } else if (option === RENAME_TRACK_OPTION) {
      this.props.renameTrack(this.props.trackId, this.props.trackName);
    } else if (option === DELETE_TRACK_OPTION) {
      this.props.deleteTrack(this.props.trackId, this.props.trackName);
    }
    this.setState({ threeDotsAnchorElement: null });
  };

  render() {
    let selectedKeyValue = { value: this.state.selectedTake };
    const takeDropdownOptions = Object.keys(this.props.takes)
      .reduce((acc, take) => {
        if (parseInt(take) <= parseInt(this.state.latestTake)) {
          const rawDate = this.props.takes[take]["date_uploaded"];
          const d = new Date(rawDate);
          const formattedDateTime = d.toLocaleString("en-US");
          if (take === this.state.selectedTake) {
            selectedKeyValue["label"] = `Take ${take} - ${formattedDateTime}`;
          }
          acc.push({
            value: take,
            label: `Take ${take} - ${formattedDateTime}`,
          });
        }
        return acc;
      }, [])
      .reverse();
    return (
      <div style={{ marginLeft: "5px" }}>
        <hr />
        <div>
          {this.state.selected ? (
            <div style={{ display: "inline-block" }}>
              <img
                src="images/daw/selected.png"
                alt="selected"
                width="10"
                height="10"
              />{" "}
              <b>Track: {this.props.trackName}</b>{" "}
            </div>
          ) : (
            <div style={{ display: "inline-block" }}>
              Track: {this.props.trackName}{" "}
            </div>
          )}
          <button
            title="Select/unselect track for recording"
            onClick={this.selectToRecord}
            style={{ marginLeft: "5px" }}
          >
            {this.state.selected ? "Unselect" : "Select to Record"}
          </button>
          <IconButton
            aria-label="more"
            aria-controls="track-menu"
            aria-haspopup="true"
            onClick={this.clickThreeDotsMenu}
            style={{ marginLeft: "5px" }}
          >
            <MoreHorizIcon />
          </IconButton>
          <input
            type="file"
            id={`file-upload-${this.props.trackId}`}
            hidden
            onChange={(e) => {
              this.props.handleFileUpload(e.target.files, this.props.trackId);
            }}
          />
          <Menu
            id="track-menu"
            anchorEl={this.state.threeDotsAnchorElement}
            keepMounted
            open={this.state.threeDotsAnchorElement !== null}
            onClose={this.closeThreeDotsMenu}
            PaperProps={{
              style: {
                maxHeight: 40 * 4.5,
                width: "20ch",
              },
            }}
          >
            {options.map((option) => (
              <MenuItem key={option} onClick={this.closeThreeDotsMenu}>
                {option}
              </MenuItem>
            ))}
          </Menu>
        </div>
        {this.state.s3URL && Object.keys(this.props.takes).length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <Tooltip title="Mute" arrow>
              <IconButton
                disableRipple
                aria-label="Mute this track"
                onClick={this.mute}
              >
                {this.state.muted ? (
                  <VolumeOffRoundedIcon
                    style={{ fontSize: 20 }}
                    color="secondary"
                  />
                ) : (
                  <VolumeOffRoundedIcon style={{ fontSize: 20 }} />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title="Solo" arrow>
              <IconButton
                disableRipple
                aria-label="Solo this track"
                onClick={this.solo}
              >
                {this.state.soloing ? (
                  <HeadsetRoundedIcon
                    style={{ fontSize: 20 }}
                    color="secondary"
                  />
                ) : (
                  <HeadsetRoundedIcon style={{ fontSize: 20 }} />
                )}
              </IconButton>
            </Tooltip>
            {/* <div
              style={{
                display: "inline-block",
                marginLeft: "10px",
                marginRight: "10px",
                width: "55px",
              }}
            >
              Volume
              <Slider
                min={0}
                max={80}
                defaultValue={40}
                onChange={this.changeVolume}
              />
            </div> */}

            <audio
              id={`audio-file-${this.props.trackId}`}
              src={this.state.s3URL}
              controls
              preload="auto"
              autobuffer
            />

            <div
              style={{
                marginLeft: "10px",
                display: "inline-flex",
                width: 310,
              }}
            >
              <Dropdown
                options={takeDropdownOptions}
                onChange={this._onSelect}
                value={selectedKeyValue}
                placeholder="Select an option"
              />
            </div>
            <div style={{ display: "inline-flex" }}>
              <form method="get" action={this.state.s3URL}>
                <button type="submit">Download Take</button>
              </form>
              <button onClick={this.deleteTake}>Delete Take</button>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default Track;
