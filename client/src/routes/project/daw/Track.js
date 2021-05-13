import React, { Component } from "react";
import Dropdown from "react-dropdown";
import "react-dropdown/style.css";
import { Confirm } from "react-st-modal"; // https://github.com/Nodlik/react-st-modal
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

import IconButton from "@material-ui/core/IconButton";
import Tooltip from "@material-ui/core/Tooltip";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";
import HeadsetRoundedIcon from "@material-ui/icons/HeadsetRounded";
import VolumeOffRoundedIcon from "@material-ui/icons/VolumeOffRounded";
import GetAppRoundedIcon from "@material-ui/icons/GetAppRounded";
import DeleteRoundedIcon from "@material-ui/icons/DeleteRounded";

const REALIGN_OPTION = "Realign Take";
const RENAME_TRACK_OPTION = "Rename Part";
const DELETE_TRACK_OPTION = "Delete Part";
const FILE_UPLOAD_OPTION = "+ Upload File";

const options = [
  REALIGN_OPTION,
  DELETE_TRACK_OPTION,
  RENAME_TRACK_OPTION,
  FILE_UPLOAD_OPTION,
];

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
      claimedBy: null,
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
        this.audioFile.onloadedmetadata = () => {
          const duration = this.audioFile.duration;
          console.log("track duration", duration);
          this.props.updateTrackTimesInMillis(this.props.trackId, duration);
        };
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
      this.audioFile.onloadedmetadata = () => {
        const duration = this.audioFile.duration;
        console.log("track duration", duration);
        this.props.updateTrackTimesInMillis(this.props.trackId, duration);
      };
    } else if (this.state.s3URL === null && this.audioFile !== null) {
      this.audioFile = null;
      console.log("track duration is 0");
      this.props.updateTrackTimesInMillis(this.props.trackId, 0);
    }

    // unselect selected track if a different track is selected
    if (
      this.state.selected &&
      this.props.selectedTrackId !== this.props.trackId
    ) {
      this.setState({ selected: false });
    }

    if (prevProps.claimedBy !== this.props.claimedBy) {
      this.setState({ claimedBy: this.props.claimedBy });
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
      console.log(
        `[TRACK: ${this.props.trackName}] playing: ${this.state.s3URL}`
      );
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
    const volume = value;
    this.audioFile.volume = (this.props.masterVolume / 100) * volume;
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
    const duration = this.audioFile.duration;
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
    this.props.updateMutedTracks(this.props.trackId);
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
    this.audioFile.onloadedmetadata = () => {
      const duration = this.audioFile.duration;
      console.log("track duration", duration);
      this.props.updateTrackTimesInMillis(this.props.trackId, duration);
    };
  };

  async deleteTake() {
    console.log("deleting take");
    const targetTake = this.state.selectedTake;
    const takeInfo = this.props.takes[targetTake];
    const d = new Date(takeInfo["date_uploaded"]);
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
    } else if (option === REALIGN_OPTION) {
      this.props.realignTake(this.props.trackId, this.state.s3URL);
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

    let buttonSelectText;
    if (this.state.claimedBy !== null) {
      buttonSelectText = `Selected by ${this.state.claimedBy}`;
    } else {
      buttonSelectText = this.state.selected ? "Unselect" : "Select to Record";
    }

    return (
      <div style={{ marginLeft: "5px" }}>
        <hr />
        <div
          style={
            this.state.selected
              ? {
                  backgroundColor: "#eee",
                  padding: "1px 12px",
                  borderLeft: "4px solid #2153c9",
                  marginBottom: "15px",
                  fontWeight: "bold",
                }
              : this.state.claimedBy !== null
              ? {
                  backgroundColor: "#f6f6f6",
                  color: "#a8a8a8",
                  padding: "1px 12px",
                  borderLeft: "4px solid #d1e0f8",
                  marginBottom: "15px",
                }
              : { marginBottom: "17px" }
          }
        >
          <div style={{ display: "inline-block" }}>
            Part: {this.props.trackName}{" "}
          </div>
          <button
            title="Select/unselect track for recording"
            onClick={this.selectToRecord}
            style={
              this.state.claimedBy === null
                ? { marginLeft: "10px", height: "25px", cursor: "pointer" }
                : { marginLeft: "10px", height: "25px" }
            }
            disabled={this.state.claimedBy !== null}
          >
            {buttonSelectText}
          </button>
          <IconButton
            aria-label="more"
            aria-controls="track-menu"
            aria-haspopup="true"
            onClick={this.clickThreeDotsMenu}
            style={{ marginLeft: "2px" }}
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
          <div
            style={{
              display: "flex",
              marginBottom: "10px",
            }}
          >
            <div style={{ marginTop: "-13px" }}>
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
            </div>
            <div style={{ marginTop: "-14px" }}>
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
            </div>
            <div
              style={{
                width: "55px",
              }}
            >
              <Slider
                min={0}
                max={100}
                defaultValue={100}
                onChange={this.changeVolume}
              />
            </div>

            <audio
              id={`audio-file-${this.props.trackId}`}
              src={`${this.state.s3URL}?cacheblock=true`}
              preload="auto"
              autobuffer="true"
            />

            <div
              style={{
                flex: "0 1 300px",
                marginLeft: "25px",
                marginTop: "-8px",
              }}
            >
              <Dropdown
                options={takeDropdownOptions}
                onChange={this._onSelect}
                value={selectedKeyValue}
                placeholder="Select an option"
              />
            </div>
            <div
              style={{
                flex: "0 0 20px",
                marginLeft: "10px",
                marginTop: "-14px",
              }}
            >
              <form method="get" action={`${this.state.s3URL}?cacheblock=true`}>
                <Tooltip title="Download take" arrow>
                  <IconButton
                    disableRipple
                    aria-label="Download this take"
                    type="submit"
                  >
                    <GetAppRoundedIcon style={{ fontSize: 23 }} />
                  </IconButton>
                </Tooltip>
              </form>
            </div>
            <div style={{ marginTop: "-15px" }}>
              <Tooltip title="Delete take" arrow>
                <IconButton
                  disableRipple
                  aria-label="Delete this take"
                  onClick={this.deleteTake}
                  disabled={this.props.masterPlay}
                >
                  <DeleteRoundedIcon style={{ fontSize: 22 }} />
                </IconButton>
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default Track;
