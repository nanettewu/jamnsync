import React, { Component } from "react";
import DAW from "./daw/DAW";
import { Prompt, Confirm } from "react-st-modal"; // https://github.com/Nodlik/react-st-modal

class Project extends Component {
  constructor(props) {
    super(props);
    this.state = {
      project_name: null,
      group_name: null,
      project_id: null,
      track_metadata: null,
      project_hash: props.location.pathname.split("/").pop(),
    };
    if (this.state.project_hash === "project") {
      this.state.project_hash = null;
    }
    this.createTrack = this.createTrack.bind(this);
    this.deleteTrack = this.deleteTrack.bind(this);
    this.renameTrack = this.renameTrack.bind(this);
    this.createTake = this.createTake.bind(this);
    this.deleteTake = this.deleteTake.bind(this);
  }

  componentDidMount() {
    this.retrieveProject(this.state.project_hash);
  }

  componentDidUpdate(prevProps) {
    const pathname = this.props.location.pathname.split("/").pop();
    // fetch project if last page was project search page
    if (
      pathname !== "project" &&
      pathname !== null &&
      this.props.location.pathname !== prevProps.location.pathname
    ) {
      this.retrieveProject(pathname);
      // loaded project search page
    } else if (pathname === "project" && this.state.project_hash !== null) {
      this.setState({
        project_hash: null,
        project_name: null,
        group_name: null,
        project_id: null,
        track_metadata: null,
      });
    }
  }

  retrieveProject = (project_hash) => {
    console.log("retrieving project: " + project_hash);
    if (project_hash === null || project_hash === "") {
      return;
    }
    fetch("/api/project?" + new URLSearchParams({ project_hash: project_hash }))
      .then((resp) =>
        resp.json().then((data) => ({ status: resp.status, body: data }))
      )
      .then((obj) => {
        const tracks = obj.body.tracks
          ? obj.body.tracks.reduce((obj, item) => {
              const formatted_takes = item["takes"].reduce((obj, item) => {
                obj[item["take"]] = {
                  date_uploaded: item["date_uploaded"],
                  id: item["id"],
                  s3_info: item["s3_info"],
                  track_id: item["track_id"],
                };
                return obj;
              }, {});
              obj[item["id"]] = {
                takes: formatted_takes,
                track_name: item["track_name"],
              };
              return obj;
            }, {})
          : {};
        if (obj.status === 200) {
          this.setState({
            project_hash: project_hash,
            project_name: obj.body.project_name,
            group_name: obj.body.group.group_name,
            project_id: obj.body.id,
            track_metadata: tracks,
          });
        }
      });
  };

  async createTrack() {
    console.log("creating new track");
    const track_name = await Prompt("Name Your Track");
    if (track_name) {
      const formData = new FormData();
      formData.append("track_name", track_name);
      formData.append("project_id", this.state.project_id);
      const requestOptions = {
        method: "POST",
        body: formData,
      };
      fetch("/api/track", requestOptions)
        .then((resp) =>
          resp.json().then((data) => ({ status: resp.status, body: data }))
        )
        .then((obj) => {
          if (obj.status !== 400) {
            console.log("added new track");
            let updatedTracks = Object.assign({}, this.state.track_metadata);
            updatedTracks[obj.body.track_id] = {
              id: parseInt(obj.body.track_id),
              project_id: this.state.projectId,
              takes: {},
              track_name: track_name,
            };
            this.setState({ track_metadata: updatedTracks });
          }
        });
    }
  }

  async renameTrack(id, name) {
    console.log("renaming track");
    const new_name = await Prompt("Rename Your Track", {
      defaultValue: name,
    });
    if (new_name) {
      const formData = new FormData();
      formData.append("track_id", id);
      formData.append("new_name", new_name);
      const requestOptions = {
        method: "PUT",
        body: formData,
      };
      fetch("/api/track", requestOptions)
        .then((resp) =>
          resp.json().then((data) => ({ status: resp.status, body: data }))
        )
        .then((obj) => {
          if (obj.status === 200) {
            let updatedTracks = Object.assign({}, this.state.track_metadata);
            updatedTracks[id].track_name = new_name;
            this.setState({ track_metadata: updatedTracks });
          }
        });
    }
  }

  async deleteTrack(id, name) {
    const result = await Confirm(
      `Are you sure you want to delete "${name}"?`,
      "Delete Track"
    );
    if (result) {
      const formData = new FormData();
      formData.append("track_id", id);
      const requestOptions = {
        method: "DELETE",
        body: formData,
      };
      fetch("/api/track", requestOptions)
        .then((resp) =>
          resp.json().then((data) => ({ status: resp.status, body: data }))
        )
        .then((obj) => {
          if (obj.status === 200) {
            const updatedTracks = Object.assign({}, this.state.track_metadata);
            delete updatedTracks[id];
            this.setState({ track_metadata: updatedTracks });
            return true;
          }
        });
    }
    return false;
  }

  createTake(track_id, file, latency) {
    console.log("creating new take for", track_id);
    const formData = new FormData();
    formData.append("track_id", track_id);
    formData.append("file", file);
    formData.append("latency", latency);
    formData.append("tz_offset", new Date().getTimezoneOffset() / 60);
    const requestOptions = {
      method: "POST",
      body: formData,
    };

    fetch("/api/take", requestOptions)
      .then((resp) =>
        resp.json().then((data) => ({ status: resp.status, body: data }))
      )
      .then((obj) => {
        if (obj.status !== 400) {
          console.log("CREATED TAKE:", obj);
          let updatedTracks = Object.assign({}, this.state.track_metadata);
          updatedTracks[parseInt(track_id)].takes[parseInt(obj.body.take)] = {
            id: parseInt(obj.body.take_id),
            track_id: parseInt(track_id),
            s3_info: obj.body.s3_info,
            date_uploaded: new Date(obj.body.timestamp).toString(),
          };
          this.setState({ track_metadata: updatedTracks });
        }
      });
  }

  deleteTake(track_id, take_number, take_id) {
    const formData = new FormData();
    formData.append("take_id", take_id);
    const requestOptions = {
      method: "DELETE",
      body: formData,
    };
    fetch("/api/take", requestOptions)
      .then((resp) =>
        resp.json().then((data) => ({ status: resp.status, body: data }))
      )
      .then((obj) => {
        if (obj.status === 200) {
          const updatedTracks = Object.assign({}, this.state.track_metadata);
          delete updatedTracks[track_id].takes[take_number];
          this.setState({ track_metadata: updatedTracks });
        }
      });
  }

  render() {
    const pathSuffix = this.props.location.pathname.split("/").pop();

    // show loading screen if have not retrieved data yet
    if (this.state.project_name === null && pathSuffix !== "project") {
      return <div>Loading...</div>;
    }

    return (
      this.state.project_hash &&
      pathSuffix !== "project" &&
      pathSuffix !== "" && (
        <div>
          <h2>{this.state.project_name}</h2>
          <div style={{ marginTop: "20px" }}>
            <DAW
              trackMetadata={this.state.track_metadata}
              retrieveProject={this.retrieveProject}
              createTrack={this.createTrack}
              deleteTrack={this.deleteTrack}
              renameTrack={this.renameTrack}
              createTake={this.createTake}
              deleteTake={this.deleteTake}
            />
          </div>
        </div>
      )
    );
  }
}

export default Project;
