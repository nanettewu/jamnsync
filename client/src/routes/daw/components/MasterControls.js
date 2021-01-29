import React, { Component } from "react";

class MasterControls extends Component {
  render() {
    return (
      <div>
        <p>
          <b>Master Controls</b>
        </p>
        Live Monitoring, Volume Slider, Time, Rehearse <button>Record</button>
        <button>Rewind</button>
        <button>Play/Pause</button>
        <button>Stop</button>
        <button>Fast Forward</button>
      </div>
    );
  }
}

export default MasterControls;
