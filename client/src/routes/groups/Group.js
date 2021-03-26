import React, { Component } from "react";
import Project from "./Project";
import "./Group.css";
import { Prompt, Confirm } from "react-st-modal";

class Group extends Component {
  constructor(props) {
    super(props);
    this.state = {
      projects: props.projects,
    };
    this.createNewProject = this.createNewProject.bind(this);
    this.deleteProject = this.deleteProject.bind(this);
    this.renameProject = this.renameProject.bind(this);
  }

  async createNewProject() {
    const project_name = await Prompt("Name Your Project", {
      isRequired: true,
    });
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
      isRequired: true,
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

  render() {
    return (
      <div>
        <h3>
          Group Name: {this.props.name}{" "}
          <button onClick={this.createNewProject}>+ New Project</button>
        </h3>
        <ul>
          {this.state.projects && this.state.projects.length === 0 && (
            <p className="text-muted">No projects created yet!</p>
          )}
          {this.state.projects.map((projectInfo, i) => (
            <div key={`project_${i}`}>
              <div>
                <Project
                  project={projectInfo}
                  group_name={this.props.name}
                  group_id={this.props.id}
                />
                <button
                  onClick={() =>
                    this.renameProject(projectInfo.id, projectInfo.project_name)
                  }
                >
                  Rename Project
                </button>
                <button
                  style={{ marginBottom: "10px" }}
                  onClick={() =>
                    this.deleteProject(projectInfo.id, projectInfo.project_name)
                  }
                >
                  Delete Project
                </button>
              </div>
            </div>
          ))}
        </ul>
      </div>
    );
  }
}

export default Group;
