import React, { Component } from "react";

class Home extends Component {
  render() {
    return (
      <div>
        <h2>HOME PAGE</h2>
        {!this.props.authed ? (
          <p>Login to get started! 🎶</p>
        ) : (
          <div>
            <p> To get started on a project: </p>
            <ol>
              <li>
                Click "Groups" to create a new rehearsal group and add group
                members.
              </li>
              <li>
                Click "Projects" to create a project and begin rehearsing!{" "}
              </li>
            </ol>
          </div>
        )}
      </div>
    );
  }
}

export default Home;
