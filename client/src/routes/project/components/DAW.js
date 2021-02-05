import React, { Component } from "react";
import { Howl } from "howler";
import MasterControls from "./MasterControls";
import Toolbar from "./Toolbar";
import Tracks from "./Tracks";

class DAW extends Component {
  constructor() {
    super();
    this.state = {
      file: null,
      tracks: [],
    };
  }

  handleFileUpload = (event) => {
    if (
      event.target.files[0] === null ||
      typeof event.target.files[0] === "undefined"
    ) {
      return;
    }

    // TODO: either on server side or client side, check validity of file (size, etc.)
    if (/\.(mp3|wav|aiff)$/i.test(event.target.files[0].name)) {
      console.log("file uploaded!");
      console.log(event.target.files[0]);
      this.setState({
        file: event.target.files[0],
        // sound: new Howl({
        //   src: [URL.createObjectURL(event.target.files[0])],
        //   volume: 0.5,
        //   format: ["wav"],
        // }),
      });
      // TODO: logic to upload file to server
    } else {
      alert("please upload valid audio file type (mp3, wav, aiff)");
      return false;
    }
  };

  render() {
    return (
      <div>
        {/* <Toolbar /> */}
        <Tracks tracks={this.state.tracks} />
        <button>+ New Recorded Track</button>
        <div>
          <p>backing track upload </p>
          <input type="file" onChange={this.handleFileUpload} />
        </div>
        <br></br>
        <MasterControls />
      </div>
    );
  }
}

export default DAW;
