import React, { Component } from "react";

class Home extends Component {
  render() {
    return (
      <div>
        <h2>HOMEPAGE</h2>
        {!this.props.authed ? (
          <p>Login to get started! 🎶</p>
        ) : (
          <p>
            Click on "Groups" to create a rehearsal group first, then "Projects"
            to create a project.{" "}
          </p>
        )}
      </div>
    );
  }
}

export default Home;
