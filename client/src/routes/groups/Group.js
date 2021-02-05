import React, { Component } from "react";
import Project from "./Project";
import "./Group.css";
import { Prompt } from "react-st-modal";

class Group extends Component {
  constructor() {
    super();
    this.state = {
      new_projects: [],
    };
    this.createNewProject = this.createNewProject.bind(this);
  }

  async createNewProject() {
    console.log("creating new project");
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
          console.log(obj);
          if (obj.status !== 400) {
            this.setState({
              new_projects: this.state.new_projects.concat([
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

  render() {
    return (
      <div>
        <h3>
          Group Name: {this.props.name}{" "}
          <button onClick={this.createNewProject}>+ New Project</button>
        </h3>
        <ul>
          {this.props.projects &&
            this.props.projects.length === 0 &&
            this.state.new_projects &&
            this.state.new_projects.length === 0 && (
              <p className="text-muted">No projects created yet!</p>
            )}
          {this.props.projects.map((projectInfo, i) => (
            <div key={`project_${i}`}>
              <Project
                project_name={projectInfo.project_name}
                project_id={projectInfo.id}
                project_hash={projectInfo.project_hash}
                group_name={this.props.name}
                group_id={this.props.id}
              />
            </div>
          ))}
          {this.state.new_projects.map((projectInfo, i) => (
            <div key={`project_${i}`}>
              <Project
                project_name={projectInfo.project_name}
                project_id={projectInfo.id}
                project_hash={projectInfo.project_hash}
                group_name={this.props.name}
                group_id={this.props.id}
              />
            </div>
          ))}
        </ul>
      </div>
    );
  }
}

export default Group;
