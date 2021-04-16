import React, { Component } from "react";
import Project from "./Project";
import "./Group.css";
import { Prompt, Confirm } from "react-st-modal";

import IconButton from "@material-ui/core/IconButton";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";

const RENAME_GROUP_OPTION = "Rename Group";
const DELETE_GROUP_OPTION = "Delete Group";
const options = [RENAME_GROUP_OPTION, DELETE_GROUP_OPTION];

class Group extends Component {
  constructor(props) {
    super(props);
    this.state = {
      projects: props.projects,
      threeDotsAnchorElement: null,
    };
    this.createNewProject = this.createNewProject.bind(this);
    this.deleteProject = this.deleteProject.bind(this);
    this.renameProject = this.renameProject.bind(this);
  }

  async createNewProject() {
    const project_name = await Prompt("Name Your Project");
    if (project_name) {
      const formData = new FormData();
      formData.append("project_name", project_name);
      formData.append("group_id", this.props.id);
      const requestOptions = {
        method: "POST",
        body: formData,
      };

      fetch("/api/project", requestOptions)
        .then((resp) =>
          resp.json().then((data) => ({ status: resp.status, body: data }))
        )
        .then((obj) => {
          if (obj.status !== 400) {
            this.setState({
              projects: this.state.projects.concat([
                {
                  project_name: project_name,
                  id: obj.body.project_id,
                  project_hash: obj.body.project_hash,
                },
              ]),
            });
          }
        });
    }
  }

  async deleteProject(id, name) {
    const result = await Confirm(
      `Are you sure you want to delete "${name}"?`,
      "Delete Project"
    );
    if (result) {
      const formData = new FormData();
      formData.append("project_id", id);
      const requestOptions = {
        method: "DELETE",
        body: formData,
      };
      fetch("/api/project", requestOptions)
        .then((resp) =>
          resp.json().then((data) => ({ status: resp.status, body: data }))
        )
        .then((obj) => {
          if (obj.status === 200) {
            const updatedProjects = [...this.state.projects].filter(
              (i) => i.id !== id
            );
            this.setState({
              projects: updatedProjects,
            });
          }
        });
    }
  }

  async renameProject(id, name) {
    const new_name = await Prompt("Rename Your Project", {
      defaultValue: name,
    });
    if (new_name) {
      const formData = new FormData();
      formData.append("project_id", id);
      formData.append("new_name", new_name);
      const requestOptions = {
        method: "PUT",
        body: formData,
      };

      fetch("/api/project", requestOptions)
        .then((resp) =>
          resp.json().then((data) => ({ status: resp.status, body: data }))
        )
        .then((obj) => {
          if (obj.status === 200) {
            const updatedProjects = [
              ...this.state.projects,
            ].map((projectInfo) =>
              projectInfo.id === id
                ? { ...projectInfo, project_name: new_name }
                : projectInfo
            );
            this.setState({
              projects: updatedProjects,
            });
          }
        });
    }
  }

  clickThreeDotsMenu = (e) => {
    this.setState({ threeDotsAnchorElement: e.currentTarget });
  };

  closeThreeDotsMenu = (e) => {
    const option = e.target.innerText;
    if (option === RENAME_GROUP_OPTION) {
      this.props.renameGroup(this.props.id, this.props.name);
    } else if (option === DELETE_GROUP_OPTION) {
      this.props.deleteGroup(this.props.id, this.props.name);
    }
    this.setState({ threeDotsAnchorElement: null });
  };

  render() {
    return (
      <div style={{ marginTop: "-5px", marginBottom: "-15px" }}>
        <h3>
          Group: {this.props.name}
          {"  "}
          <button style={{ marginLeft: "5px" }} onClick={this.createNewProject}>
            + New Project
          </button>
          <IconButton
            aria-label="more"
            aria-controls="group-menu"
            aria-haspopup="true"
            onClick={this.clickThreeDotsMenu}
            style={{ marginLeft: "5px" }}
          >
            <MoreHorizIcon />
          </IconButton>
          <Menu
            id="group-menu"
            anchorEl={this.state.threeDotsAnchorElement}
            keepMounted
            open={this.state.threeDotsAnchorElement !== null}
            onClose={this.closeThreeDotsMenu}
            PaperProps={{
              style: {
                maxHeight: 40 * 4.5,
                width: "20ch",
              },
            }}
          >
            {options.map((option) => (
              <MenuItem key={option} onClick={this.closeThreeDotsMenu}>
                {option}
              </MenuItem>
            ))}
          </Menu>
        </h3>
        <div style={{ marginTop: "-25px" }}>
          <ul>
            {this.state.projects && this.state.projects.length === 0 && (
              <p className="text-muted" style={{ marginTop: "25px" }}>
                No projects created yet!
              </p>
            )}
            {this.state.projects.map((projectInfo, i) => (
              <div key={`project_${i}`}>
                <div style={{ marginTop: "-20px", marginBottom: "-10px" }}>
                  <Project
                    project={projectInfo}
                    group_name={this.props.name}
                    group_id={this.props.id}
                    renameProject={this.renameProject}
                    deleteProject={this.deleteProject}
                  />
                </div>
              </div>
            ))}
          </ul>
        </div>
      </div>
    );
  }
}

export default Group;
