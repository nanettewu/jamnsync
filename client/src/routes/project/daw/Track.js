import { Howl } from "howler";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import React, { Component } from "react";
import "./Track.css";
import Dropdown from "react-dropdown";
import "react-dropdown/style.css";
import { Confirm } from "react-st-modal"; // https://github.com/Nodlik/react-st-modal

class Track extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selected: false,
      playing: false,
      muted: false,
      audioFile: null,
      s3URL: null,
      selectedTake: null,
      latestTake: 0,
      soloing: false,
      volume: 84.95,
    };
    if (Object.keys(props.takes).length !== 0) {
      const latestKey = Object.keys(props.takes).pop();
      const url = props.takes[latestKey].s3_info;
      if (url) {
        this.state.audioFile = new Howl({
          src: [url],
          volume: 0.5,
          format: ["mp3", "wav"],
          preload: true,
        });
        this.state.s3URL = url;
        this.state.selectedTake = latestKey;
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
          audioFile: new Howl({
            src: [url],
            volume: 0.5,
            format: ["mp3", "wav"],
            preload: true,
          }),
          s3URL: url,
          selectedTake: latestKey,
          latestTake: latestKey,
        });
      }
      // otherwise reset the take state
    } else {
      this.setState({
        selectedTake: null,
        audioFile: null,
        s3URL: null,
        latestTake: 0,
      });
    }
  }

  componentDidUpdate(prevProps) {
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
        console.log("updated take to take " + latestKey);
        this.setState({
          latestTake: latestKey,
          selectedTake: latestKey,
          audioFile: new Howl({
            src: [url],
            volume: 0.5,
            format: ["mp3", "wav"],
            preload: true,
          }),
          s3URL: url,
        });
      }
    } else if (
      Object.keys(this.props.takes).length === 0 &&
      this.state.audioFile
    ) {
      this.setState({
        selectedTake: null,
        audioFile: null,
        s3URL: null,
        latestTake: 0,
      });
    }

    // play non-selected track during recording or stop if DAW master controls indicate
    if (
      this.props.masterPlay &&
      this.state.audioFile &&
      !this.state.playing &&
      (!this.state.selected ||
        (this.state.selected && !this.props.masterRecord))
    ) {
      console.log(`[${this.props.trackName}] playing 1: ${this.state.s3URL}`);
      this.state.audioFile.seek(0);
      this.state.audioFile.play();
      this.setState({ playing: true });
    } else if (
      this.props.masterStop &&
      this.state.audioFile &&
      this.state.playing
    ) {
      this.state.audioFile.stop();
      this.setState({ playing: false });
    }

    // update soloing
    if (
      !this.state.soloing &&
      this.props.soloTracks.length !== 0 &&
      !this.state.muted
    ) {
      this.state.audioFile.mute(true);
      this.setState({
        muted: true,
      });
    } else if (
      this.props.soloTracks.length === 0 &&
      this.state.muted &&
      prevProps.soloTracks.length !== 0
    ) {
      this.state.audioFile.mute(false);
      this.setState({
        muted: false,
      });
    }

    if (prevProps.masterVolume !== this.props.masterVolume) {
      this.state.audioFile.volume(
        (this.props.masterVolume * this.state.volume) / 100
      );
    }
  }

  componentWillUnmount() {
    if (this.state.audioFile) {
      this.state.audioFile.stop();
    }
  }

  playPauseAudio = () => {
    if (this.state.playing) {
      this.state.audioFile.pause();
      this.setState({ playing: false });
    } else {
      this.state.audioFile.play();
      this.setState({ playing: true });
    }
  };

  stop = () => {
    this.state.audioFile.stop();
    this.setState({ playing: false });
  };

  changeVolume = (value) => {
    // convert linear 1->100 to log 1->100 via f(n) = 50 * log(n)
    const volume = Math.max(0, 50 * Math.log10(value));
    this.state.audioFile.volume((this.props.masterVolume * volume) / 100);
    this.setState({ volume: volume });
  };

  seek = (value) => {
    this.state.audioFile.pause();
    this.state.audioFile.seek(value);
    if (this.state.playing) {
      this.state.audioFile.play();
    }
  };

  fastForward = () => {
    this.state.audioFile.pause();
    const duration = this.state.audioFile.duration();
    const currentSeek = this.state.audioFile.seek();
    const forwardTo = currentSeek + 5;
    if (forwardTo >= duration) {
      this.state.audioFile.stop();
      return;
    }
    console.log("ff: " + currentSeek + " -> " + forwardTo);
    this.state.audioFile.seek(forwardTo);
    if (this.state.playing) {
      this.state.audioFile.play();
    }
  };

  rewind = () => {
    this.state.audioFile.pause();
    const currentSeek = this.state.audioFile.seek();
    let backwardTo = currentSeek - 5;
    if (backwardTo <= 0) {
      backwardTo = 0;
    }
    console.log("rewind: " + currentSeek + " -> " + backwardTo);
    this.state.audioFile.seek(backwardTo);
    if (this.state.playing) {
      this.state.audioFile.play();
    }
  };

  mute = () => {
    this.state.audioFile.mute(!this.state.muted);
    this.setState({
      muted: !this.state.muted,
    });
  };

  solo = () => {
    this.props.updateSoloTracks(this.props.trackId);
    if (!this.state.soloing) {
      this.state.audioFile.mute(false);
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
    this.state.audioFile.stop();
    const url = this.props.takes[option.value].s3_info;
    this.setState({
      playing: false,
      selectedTake: option.value,
      audioFile: new Howl({
        src: [url],
        volume: 0.5,
        format: ["mp3", "wav"],
        preload: true,
      }),
      s3URL: url,
    });
  };

  async deleteTake() {
    console.log("deleting take");
    const targetTake = this.state.selectedTake;
    const takeInfo = this.props.takes[targetTake];
    const d = new Date(
      takeInfo["date_uploaded"].substr(
        0,
        takeInfo["date_uploaded"].lastIndexOf(" ") + 1
      )
    );
    const formattedDateTime = d.toLocaleString("en-US");

    const name = `Take ${targetTake} - ${formattedDateTime}`;
    const result = await Confirm(
      `Are you sure you want to delete "${name}"?`,
      "Delete Take"
    );
    if (result) {
      this.state.audioFile.stop();
      await this.props.deleteTake(this.props.trackId, targetTake, takeInfo.id);

      let newSelectedTake = null;
      if (Object.keys(this.props.takes).length > 1) {
        console.log("selecting existing take");
        const takeCopy = Object.keys(this.props.takes);
        takeCopy.splice(takeCopy.indexOf(targetTake), 1);
        newSelectedTake = Math.max.apply(Math, takeCopy);
        const newURL = this.props.takes[newSelectedTake].s3_info;
        this.setState({
          playing: false,
          selectedTake: newSelectedTake,
          audioFile: new Howl({
            src: [newURL],
            volume: this.props.masterVolume * 0.5,
            format: ["mp3", "wav"],
            preload: true,
          }),
          s3URL: newURL,
          latestTake: newSelectedTake,
        });
      } else {
        console.log("unsetting audio file");
        this.setState({
          playing: false,
          selectedTake: newSelectedTake,
          audioFile: null,
          s3URL: null,
          latestTake: 0,
        });
      }
    }
  }

  render() {
    let selectedKeyValue = { value: this.state.selectedTake };
    const takeDropdownOptions = Object.keys(this.props.takes)
      .reduce((acc, take) => {
        if (parseInt(take) <= parseInt(this.state.latestTake)) {
          const rawDate = this.props.takes[take]["date_uploaded"];
          const d = new Date(rawDate.substr(0, rawDate.lastIndexOf(" ") + 1));
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

    // let takeDropdownOptions = Object.keys(this.props.takes)
    //   .map((take) => {
    //     console.log(take);
    //     const rawDate = this.props.takes[take]["date_uploaded"];
    //     const d = new Date(rawDate.substr(0, rawDate.lastIndexOf(" ") + 1));
    //     const formattedDateTime = d.toLocaleString("en-US");
    //     return {
    //       value: take,
    //       label: `Take ${take} - ${formattedDateTime}`,
    //     };
    //   })
    //   .reverse();
    // takeDropdownOptions = takeDropdownOptions.filter(
    //   (item) => parseInt(item.value) <= parseInt(this.state.latestTake)
    // );

    return (
      <div>
        {this.state.selected ? (
          <p>
            <img
              src="images/daw/selected.png"
              alt="selected"
              width="10"
              height="10"
            />{" "}
            <b>Track: {this.props.trackName}</b>{" "}
            <button onClick={this.selectToRecord}>
              {this.state.selected ? "Unselect" : "Select to Record"}
            </button>
          </p>
        ) : (
          <p>
            Track: {this.props.trackName}{" "}
            <button onClick={this.selectToRecord}>
              {this.state.selected ? "Unselect" : "Select to Record"}
            </button>
          </p>
        )}

        {this.state.audioFile && Object.keys(this.props.takes).length > 0 && (
          <div>
            <button className="muteButton" onClick={this.mute}>
              {!this.state.muted ? "Mute" : "Unmute"}
            </button>
            <button onClick={this.solo}>
              {!this.state.soloing ? "Solo" : "Unsolo"}
            </button>
            <div
              style={{
                display: "inline-block",
                marginLeft: "10px",
                marginRight: "10px",
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
            {/* <button onClick={this.rewind}>Rewind</button> */}
            {/* <button onClick={this.playPauseAudio}>
              {this.state.playing ? "Pause" : "Play"}
            </button> */}
            {/* <button onClick={this.fastForward}>Fast Forward</button> */}
            {/* <button onClick={this.stop}>Stop</button> */}
            {/* <div
              style={{
                display: "inline-block",
                width: "200px",
                marginLeft: "10px",
              }}
            >
              Seek:
              <Slider
                min={0}
                max={Math.round(this.state.audioFile.duration())}
                defaultValue={0}
                onChange={this.seek}
              />
            </div> */}
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
