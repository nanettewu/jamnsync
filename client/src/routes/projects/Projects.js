import React, { Component } from "react";
import Group from "./Group";
import "./Projects.css";

import SyncRoundedIcon from "@material-ui/icons/SyncRounded";
import IconButton from "@material-ui/core/IconButton";
import Tooltip from "@material-ui/core/Tooltip";

import { socket } from "../../App";

class Projects extends Component {
  constructor() {
    super();
    this.state = {
      groups: [],
      isLoaded: false,
    };
    this.fetchGroups();
  }

  // SOCKET IO LISTENER:
  updateProjectsListener = () => {
    console.log("[SOCKET.IO] receiving updateProjects");
    this.refresh();
  };

  componentDidMount() {
    console.log("[SOCKET.IO] creating Projects page listener");
    socket.on("updateProjects", this.updateProjectsListener);
  }

  componentWillUnmount() {
    console.log("[SOCKET.IO] removing Projects page listener");
    socket.off("updateProjects", this.updateProjectsListener);
  }

  fetchGroups = () => {
    fetch("/api/groups", {
      method: "GET",
    })
      .then((resp) =>
        resp.json().then((data) => ({ status: resp.status, body: data }))
      )
      .then((res) => {
        if (res.status !== 400) {
          this.setState({ groups: res.body, isLoaded: true });
        }
      });
  };

  refresh = () => {
    this.fetchGroups();
  };

  render() {
    if (!this.state.isLoaded) {
      return <div>Loading...</div>;
    }
    return (
      <div style={{ marginBottom: "10px" }}>
        <h2 style={{ marginBottom: "-25px" }}>
          PROJECTS
          <Tooltip title="Refresh latest projects" arrow placement="right">
            <IconButton
              style={{ marginTop: "-3px" }}
              disableRipple
              aria-label="Sync"
              onClick={this.refresh}
            >
              <SyncRoundedIcon style={{ fontSize: 25 }} />
            </IconButton>
          </Tooltip>
        </h2>
        {this.state.groups && this.state.groups.length === 0 && (
          <p style={{ marginTop: "20px" }} class="text-muted">
            Create a group first!
          </p>
        )}
        {this.state.groups &&
          this.state.groups.map((groupInfo, i) => (
            <div key={`group_${i}`}>
              <Group
                id={groupInfo.id}
                name={groupInfo.group_name}
                projects={groupInfo.projects}
                renameGroup={this.renameGroup}
                deleteGroup={this.deleteGroup}
              />
            </div>
          ))}
      </div>
    );
  }
}

export default Projects;
