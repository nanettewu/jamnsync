import React, { useState } from "react";
import { Redirect } from "react-router";

// mimics Zoom's search functionality (i.e. if you enter mit.zoom.us/j/ without any ID)
function ProjectSearch() {
  const [projectId, setProjectId] = useState(null);
  const [redirect, setRedirect] = useState(false);

  const searchProject = () => {
    console.log("projectId", projectId);
    fetch("/api/project?" + new URLSearchParams({ project_hash: projectId }))
      .then((resp) =>
        resp.json().then((data) => ({ status: resp.status, body: data }))
      )
      .then((obj) => {
        console.log(obj);
        if (obj.status === 200) {
          setRedirect(true);
        }
      })
      .catch(function (err) {
        alert("Cannot find project ID or URL: " + projectId, err);
      });
  };

  const handleChange = (e) => {
    // url
    if (e.target.value.startsWith("http")) {
      setProjectId(e.target.value.split("/").pop());
    } else {
      setProjectId(e.target.value);
    }
  };

  if (redirect) {
    return <Redirect to={`/project/${projectId}`} />;
  }

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
