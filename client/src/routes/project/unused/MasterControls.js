import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import React, { Component } from "react";

// TODO: pass down callbacks for buttons
class MasterControls extends Component {
  constructor() {
    super();
    this.playIcon = "images/daw/play.png";
    this.pauseIcon = "images/daw/pause.png";
    this.state = {
      playing: false,
      playPauseIcon: this.playIcon,
    };
  }
  record = () => {};

  playPause = () => {
    this.setState({
      playing: !this.state.playing,
      playPauseIcon: this.state.playing ? this.pauseIcon : this.playIcon,
    });
  };

  stop = () => {};

  rewind = () => {};

  fastForward = () => {};

  seek = () => {};

  render() {
    return (
      <div>
        <p>
          <b>Master Controls</b>
        </p>

        <div>
          <div
            style={{
              display: "inline-block",
              marginRight: "10px",
            }}
          >
            Volume:
            <Slider
              min={0}
              max={100}
              defaultValue={50}
              onChange={this.changeVolume}
            />
          </div>
          <button onClick={this.record}>
            <img src="images/daw/record.png"></img>
          </button>
          <button onClick={this.stop}>
            <img src="images/daw/stop.png"></img>
          </button>
          <button onClick={this.rewind}>
            <img src="images/daw/rw.png"></img>
          </button>
          <button onClick={this.playPause}>
            <img src={this.state.playPauseIcon}></img>
          </button>
          <button onClick={this.fastForward}>
            <img src="images/daw/ff.png"></img>
          </button>
        </div>
      </div>
    );
  }
}

export default MasterControls;
