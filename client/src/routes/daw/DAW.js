import React, { Component } from "react";
import MasterControls from "./components/MasterControls";
import Toolbar from "./components/Toolbar";
import Track from "./components/Track";

class DAW extends Component {
  render() {
    return (
      <div>
        <h2>Piece Title</h2>
        <Toolbar />
        <Track trackName={"Backing"} />
        <Track trackName={"Clarinet"} />
        <Track trackName={"Piano"} />
        <MasterControls />
      </div>
    );
  }
}

export default DAW;
