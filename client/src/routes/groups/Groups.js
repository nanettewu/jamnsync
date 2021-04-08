import React, { Component } from "react";
import Group from "./Group";
import "./Groups.css";
import { Confirm, Prompt } from "react-st-modal"; // https://github.com/Nodlik/react-st-modal

class Groups extends Component {
  constructor() {
    super();
    this.state = {
      groups: [],
      isLoaded: false,
    };
    this.fetchGroups();
    this.createNewGroup = this.createNewGroup.bind(this);
    this.deleteGroup = this.deleteGroup.bind(this);
    this.renameGroup = this.renameGroup.bind(this);
  }

  componentDidUpdate() {
    if (!this.state.isLoaded) {
      this.fetchGroups();
    }
  }

  fetchGroups() {
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
  }

  async createNewGroup() {
    console.log("creating new group!");
    const group_name = await Prompt("Name Your Group", {
      isRequired: true,
    });
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
          }
        });
    }
  }

  async renameGroup(id, name) {
    console.log("renaming group");
    const new_name = await Prompt("Rename Your Group", {
      isRequired: true,
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
          }
        });
    }
  }

  render() {
    if (!this.state.isLoaded) {
      return <div>Loading...</div>;
    }
    return (
      <div>
        <h2>GROUPS</h2>
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
        <button className="stitched" onClick={this.createNewGroup}>
          + New Group
        </button>
      </div>
    );
  }
}

export default Groups;
