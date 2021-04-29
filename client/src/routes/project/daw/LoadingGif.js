import React, { Component } from "react";

class LoadingGif extends Component {
  render() {
    return (
      <div style={{ display: "flex", marginBottom: "-8px" }}>
        <img
          style={{
            marginLeft: "10px",
            marginRight: "5px",
            marginTop: "10px",
          }}
          src="images/daw/loading.gif"
          alt="loading"
          width="32"
          height="32"
        />

        <p>{` ${this.props.text}`}</p>
      </div>
    );
  }
}

export default LoadingGif;
