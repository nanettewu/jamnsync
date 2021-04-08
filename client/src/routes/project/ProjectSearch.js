import React, { useState } from "react";

// mimics Zoom's search functionality (i.e. if you enter mit.zoom.us/j/ without any ID)
function ProjectSearch(props) {
  const [projectId, setProjectId] = useState("");

  const searchProject = (e) => {
    console.log("projectId", projectId);
    e.preventDefault();
    fetch("/api/project?" + new URLSearchParams({ project_hash: projectId }))
      .then((resp) =>
        resp.json().then((data) => ({ status: resp.status, body: data }))
      )
      .then((obj) => {
        console.log(obj);
        if (obj.status === 200) {
          props.history.push(`/project/${projectId}`);
        }
      })
      .catch(function (err) {
        alert("Cannot find project ID or URL: " + projectId, err);
      });
  };

  const handleChange = (e) => {
    e.preventDefault();
    // parse project id out of url
    if (e.target.value.startsWith("http")) {
      setProjectId(e.target.value.split("/").pop());
    } else {
      setProjectId(e.target.value);
    }
  };

  return (
    <div>
      <h2>Find a Project</h2>
      <br></br>
      <form style={{ marginLeft: 10 }}>
        <input
          style={{ width: 250 }}
          type="text"
          value={projectId}
          onChange={handleChange}
          placeholder="Enter Project ID or URL"
        ></input>
        <input type="submit" hidden></input>
        <button onClick={searchProject}>Go!</button>
      </form>
    </div>
  );
}

export default ProjectSearch;
