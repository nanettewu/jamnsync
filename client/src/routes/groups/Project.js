import React, { useState } from "react";
import { useHistory } from "react-router-dom";

import IconButton from "@material-ui/core/IconButton";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";

const RENAME_PROJECT_OPTION = "Rename Project";
const DELETE_PROJECT_OPTION = "Delete Project";
const options = [RENAME_PROJECT_OPTION, DELETE_PROJECT_OPTION];

function Project(props) {
  const history = useHistory();
  const [threeDotsAnchorElement, setThreeDotsAnchorElement] = useState(null);

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

  const clickThreeDotsMenu = (e) => {
    setThreeDotsAnchorElement(e.currentTarget);
  };

  const closeThreeDotsMenu = (e) => {
    const option = e.target.innerText;
    if (option === RENAME_PROJECT_OPTION) {
      this.props.renameProject(props.project.id, props.project.project_name);
    } else if (option === DELETE_PROJECT_OPTION) {
      this.props.deleteProject(props.project.id, props.project.project_name);
    }
    setThreeDotsAnchorElement(null);
  };

  return (
    <li>
      Project: {props.project.project_name}{" "}
      <button onClick={rehearse}>Rehearse!</button>
      <IconButton
        aria-label="more"
        aria-controls="project-menu"
        aria-haspopup="true"
        onClick={clickThreeDotsMenu}
        style={{ marginLeft: "5px" }}
      >
        <MoreHorizIcon />
      </IconButton>
      <Menu
        id="project-menu"
        anchorEl={threeDotsAnchorElement}
        keepMounted
        open={threeDotsAnchorElement !== null}
        onClose={closeThreeDotsMenu}
        PaperProps={{
          style: {
            maxHeight: 40 * 4.5,
            width: "20ch",
          },
        }}
      >
        {options.map((option) => (
          <MenuItem key={option} onClick={closeThreeDotsMenu}>
            {option}
          </MenuItem>
        ))}
      </Menu>
    </li>
  );
}

export default Project;
