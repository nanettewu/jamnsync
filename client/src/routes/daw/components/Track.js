import React, { Component } from "react";

class Track extends Component {
  render() {
    return (
      <div>
        <p>
          Track: {this.props.trackName} (Volume Slider) <button>Mute</button>
          <button>Solo</button>
        </p>

        <img
          src="https://hackernoon.com/hn-images/0*IqN97cZPYRGHk7A6."
          height="50"
        />
      </div>
    );
  }
}

export default Track;
