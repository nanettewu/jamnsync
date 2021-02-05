import React, { Component } from "react";
import DAW from "./components/DAW";

class Project extends Component {
  constructor() {
    super();
  }
  render() {
    console.log(this.props.location.state);
    return (
      <div>
        {this.props.location.state && (
          <div>
            <h2>Project: {this.props.location.state.project_name}</h2>
            <p>Group: {this.props.location.state.group_name}</p>
          </div>
        )}
        <DAW />
      </div>
    );
  }
}

export default Project;
