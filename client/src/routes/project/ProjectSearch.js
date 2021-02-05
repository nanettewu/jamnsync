import React, { Component } from "react";

// mimics Zoom's search functionality (i.e. if you enter mit.zoom.us/j/ without any ID)
class ProjectSearch extends Component {
  // TODO: implement search functionality
  render() {
    return (
      <div>
        <h2>Join a Project</h2>
        <br></br>
        <form>
          <input type="text" placeholder="Enter Project ID"></input>
          <input type="submit" value="Submit"></input>
        </form>
        <p>TODO: should redirect to parameterized route</p>
      </div>
    );
  }
}

export default ProjectSearch;
