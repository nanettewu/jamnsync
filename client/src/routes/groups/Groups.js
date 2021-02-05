import React, { Component } from "react";
import Group from "./Group";
import "./Groups.css";
import { Prompt } from "react-st-modal"; // https://github.com/Nodlik/react-st-modal

class Groups extends Component {
  constructor() {
    super();
    this.state = {
      groups: [],
    };
    fetch("/api/groups", {
      method: "GET",
    })
      .then((resp) => resp.json())
      .then((res) => {
        this.setState({
          groups: res,
        });
        console.log(res);
      });
    this.createNewGroup = this.createNewGroup.bind(this);
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
          console.log(obj);
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

  render() {
    return (
      <div>
        <h2>GROUPS</h2>
        {this.state.groups.map((groupInfo, i) => (
          <div key={`group_${i}`}>
            <Group
              id={groupInfo.id}
              name={groupInfo.group_name}
              projects={groupInfo.projects}
            />
          </div>
        ))}
        <button className="stitched" onClick={this.createNewGroup}>
          Create New Group
        </button>
      </div>
    );
  }
}

export default Groups;
