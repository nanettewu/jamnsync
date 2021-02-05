import React, { Component } from "react";
import Track from "./Track";

class Tracks extends Component {
  render() {
    return (
      <div>
        <p>
          <b>Tracks</b>
        </p>
        <p className="text-muted">No existing tracks found!</p>
        {/* <Track trackName={"Backing"} />
        <Track trackName={"Clarinet"} />
        <Track trackName={"Piano"} /> */}
      </div>
    );
  }
}

export default Tracks;
