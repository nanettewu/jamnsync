import React from "react";
import { useHistory } from "react-router-dom";

function Project(props) {
  const history = useHistory();

  const rehearse = () => {
    history.push({
      pathname: `/project/${props.project_hash}`,
      state: {
        project_name: props.project_name,
        project_id: props.project_id,
        group_name: props.group_name,
        gorup_id: props.group_id,
      },
    });
  };

  return (
    <li>
      Project: {props.project_name}{" "}
      <button onClick={rehearse}>Rehearse!</button>
    </li>
  );
}

export default Project;
