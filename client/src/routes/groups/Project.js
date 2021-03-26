import React from "react";
import { useHistory } from "react-router-dom";

function Project(props) {
  const history = useHistory();

  const rehearse = () => {
    history.push({
      pathname: `/project/${props.project.project_hash}`,
      state: {
        project: props.project,
        group_name: props.group_name,
        group_id: props.group_id,
      },
    });
  };

  return (
    <li>
      Project: {props.project.project_name}{" "}
      <button onClick={rehearse}>Rehearse!</button>
    </li>
  );
}

export default Project;
