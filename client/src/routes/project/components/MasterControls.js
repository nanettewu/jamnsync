import React, { Component } from "react";

// TODO: pass down callbacks for buttons
class MasterControls extends Component {
  playPause = () => {};

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
        {/* Live Monitoring, Volume Slider, Time, Rehearse <button>Record</button> */}
        <button onClick={this.rewind}>Rewind</button>
        <button onClick={this.playPause}>Play/Pause</button>
        <button onClick={this.stop}>Stop</button>
        <button onClick={this.fastForward}>Fast Forward</button>
      </div>
    );
  }
}

export default MasterControls;
