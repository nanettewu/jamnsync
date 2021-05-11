import React, { Component } from "react";
import "./Groups.css";
import Group from "./Group";
import { Confirm, Prompt } from "react-st-modal"; // https://github.com/Nodlik/react-st-modal

import SyncRoundedIcon from "@material-ui/icons/SyncRounded";
import IconButton from "@material-ui/core/IconButton";
import Tooltip from "@material-ui/core/Tooltip";

import { socket } from "../../App";

class Groups extends Component {
  constructor() {
    super();
    this.state = {
      groups: [],
      isLoaded: false,
      refresh: 0,
    };
    this.fetchGroups();
    this.createNewGroup = this.createNewGroup.bind(this);
    this.deleteGroup = this.deleteGroup.bind(this);
    this.renameGroup = this.renameGroup.bind(this);
  }

  // SOCKET IO LISTENERS:

  updateGroupsListener = () => {
    console.log("[SOCKET.IO] receiving updateGroups");
    this.refresh();
  };

  // REACT MAIN FUNCTIONS

  componentDidMount() {
    console.log("[SOCKET.IO] creating Groups page listener");
    socket.on("updateGroups", this.updateGroupsListener);
  }

  componentWillUnmount() {
    console.log("[SOCKET.IO] removing Groups page listener");
    socket.off("updateGroups", this.updateGroupsListener);
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

  async createNewGroup() {
    console.log("creating new group!");
    const group_name = await Prompt("Name Your Group");
    if (group_name) {
      const formData = new FormData();
      formData.append("group_name", group_name);
      const requestOptions = {
        method: "POST",
        body: formData,
      };

      fetch("/api/group", requestOptions)
        .then((resp) =>
          resp.json().then((data) => ({ status: resp.status, body: data }))
        )
        .then((obj) => {
          if (obj.status !== 400) {
            this.setState({
              groups: this.state.groups.concat([
                { group_name: group_name, id: obj.body.group_id, projects: [] },
              ]),
            });
          }
        })
        .catch((error) => {
          alert(
            'Server Error: Group name taken, use a different name instead of "' +
              group_name +
              '"!'
          );
        });
    }
  }

  async deleteGroup(id, name) {
    console.log("deleting group");
    const result = await Confirm(
      `Are you sure you want to delete "${name}"?`,
      "Delete Group"
    );
    if (result) {
      const formData = new FormData();
      formData.append("group_id", id);
      const requestOptions = {
        method: "DELETE",
        body: formData,
      };
      fetch("/api/group", requestOptions)
        .then((resp) =>
          resp.json().then((data) => ({ status: resp.status, body: data }))
        )
        .then((obj) => {
          if (obj.status === 200) {
            const updatedGroups = [...this.state.groups].filter(
              (i) => i.id !== id
            );
            this.setState({
              groups: updatedGroups,
            });
            socket.emit("broadcast update groups");
          }
        });
    }
  }

  async renameGroup(id, name) {
    console.log("renaming group");
    const new_name = await Prompt("Rename Your Group", {
      defaultValue: name,
    });
    if (new_name) {
      const formData = new FormData();
      formData.append("new_name", new_name);
      formData.append("group_id", id);
      const requestOptions = {
        method: "PUT",
        body: formData,
      };

      fetch("/api/group", requestOptions)
        .then((resp) =>
          resp.json().then((data) => ({ status: resp.status, body: data }))
        )
        .then((obj) => {
          if (obj.status === 200) {
            const updatedGroups = [...this.state.groups].map((groupInfo) =>
              groupInfo.id === id
                ? { ...groupInfo, group_name: new_name }
                : groupInfo
            );
            this.setState({
              groups: updatedGroups,
            });
            socket.emit("broadcast update groups");
          }
        });
    }
  }

  refresh = () => {
    console.log("refreshing groups");
    fetch("/api/groups", {
      method: "GET",
    })
      .then((resp) =>
        resp.json().then((data) => ({ status: resp.status, body: data }))
      )
      .then((res) => {
        if (res.status !== 400) {
          this.setState({
            groups: res.body,
            isLoaded: true,
            refresh: this.state.refresh + 1,
          });
        } else {
          this.setState({ refresh: this.state.refresh + 1 });
        }
      });
  };

  render() {
    if (!this.state.isLoaded) {
      return <div>Loading...</div>;
    }
    return (
      <div>
        <h2 style={{ marginBottom: "-35px" }}>
          REHEARSAL GROUPS
          <Tooltip title="Refresh latest groups" arrow placement="right">
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
        {this.state.groups &&
          this.state.groups.map((groupInfo, i) => (
            <div key={`group_${i}`}>
              <Group
                id={groupInfo.id}
                name={groupInfo.group_name}
                projects={groupInfo.projects}
                renameGroup={this.renameGroup}
                deleteGroup={this.deleteGroup}
                refresh={this.state.refresh}
              />
            </div>
          ))}
        <button
          style={{ marginTop: "30px" }}
          className="stitched"
          onClick={this.createNewGroup}
        >
          + New Rehearsal Group
        </button>
      </div>
    );
  }
}

export default Groups;
