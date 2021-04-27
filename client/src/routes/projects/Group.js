import React, { Component } from "react";
import Project from "./Project";
import "./Group.css";
import { Prompt, Confirm } from "react-st-modal";

const RENAME_GROUP_OPTION = "Rename Group";
const DELETE_GROUP_OPTION = "Delete Group";

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

  componentDidUpdate(prevProps) {
    if (this.props.projects !== prevProps.projects) {
      this.setState({ projects: this.props.projects });
    }
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
    let sortedProjects = this.state.projects.sort((a, b) =>
      a.id > b.id ? 1 : -1
    );
    return (
      <div style={{ marginTop: "25px", marginBottom: "-10px" }}>
        <p>
          Group: {this.props.name}
          {"  "}
          <button onClick={this.createNewProject}>+ Project</button>
        </p>
        <div style={{ marginTop: "20px" }}>
          <ul>
            {this.state.projects && this.state.projects.length === 0 && (
              <p
                className="text-muted"
                style={{ marginTop: "-10px", marginBottom: "20px" }}
              >
                No projects created yet!
              </p>
            )}
            {sortedProjects.map((projectInfo, i) => (
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
