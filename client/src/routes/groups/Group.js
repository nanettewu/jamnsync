import React, { Component } from "react";
import Member from "./Member";
import "./Group.css";

import { CustomDialog, Confirm } from "react-st-modal"; // https://github.com/Nodlik/react-st-modal
import AddMemberModalContent from "./AddMemberModal";

import IconButton from "@material-ui/core/IconButton";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";

const RENAME_GROUP_OPTION = "Rename Group";
const DELETE_GROUP_OPTION = "Delete Group";
const options = [RENAME_GROUP_OPTION, DELETE_GROUP_OPTION];

class Group extends Component {
  constructor(props) {
    super(props);
    this.state = {
      group_membership: {},
      threeDotsAnchorElement: null,
    };
    fetch("/api/group/members?group_id=" + this.props.id, { method: "GET" })
      .then((resp) =>
        resp.json().then((data) => ({ status: resp.status, body: data }))
      )
      .then((res) => {
        if (res.status !== 400) {
          this.setState({ group_membership: res.body });
        }
      });
    this.addMember = this.addMember.bind(this);
    this.removeMember = this.removeMember.bind(this);
    // this.getAllUsers = this.getAllUsers.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (this.props.refresh !== prevProps.refresh) {
      fetch("/api/group/members?group_id=" + this.props.id, { method: "GET" })
        .then((resp) =>
          resp.json().then((data) => ({ status: resp.status, body: data }))
        )
        .then((res) => {
          if (res.status !== 400) {
            this.setState({ group_membership: res.body });
          }
        });
    }
  }

  async addMember() {
    console.log("adding member");
    // find all users
    let all_users = await fetch("/api/users", { method: "GET" })
      .then((resp) =>
        resp.json().then((data) => ({ status: resp.status, body: data }))
      )
      .then((res) => {
        console.log(res);
        return res.body;
      });

    console.log(all_users);
    // perform get request to retrieve all available
    const [newUserId, newUsername] = await CustomDialog(
      <AddMemberModalContent users={all_users} />,
      {
        title: "Add Member to " + this.props.name,
        showCloseIcon: true,
      }
    );
    // perform post request to add user
    // console.log("newUserId:", newUserId, "newUsername:", newUsername);
    if (newUserId && newUsername) {
      const formData = new FormData();
      formData.append("group_id", this.props.id);
      formData.append("user_id", newUserId);
      const requestOptions = {
        method: "POST",
        body: formData,
      };
      fetch("/api/group/members", requestOptions)
        .then((resp) =>
          resp.json().then((data) => ({ status: resp.status, body: data }))
        )
        .then((obj) => {
          if (obj.status === 200) {
            const updatedMembership = Object.assign(
              {},
              this.state.group_membership
            );
            updatedMembership[newUserId] = newUsername;
            this.setState({
              group_membership: updatedMembership,
            });
          }
        });
    }
  }

  async removeMember(userid) {
    console.log("removing member id:", userid);
    const username = this.state.group_membership[userid];
    const result = await Confirm(
      `Are you sure you want to remove "${username}" from "${this.props.name}"?`,
      "Remove Member"
    );
    if (result) {
      const formData = new FormData();
      formData.append("group_id", this.props.id);
      formData.append("user_id", userid);
      const requestOptions = {
        method: "DELETE",
        body: formData,
      };
      fetch("/api/group/members", requestOptions)
        .then((resp) =>
          resp.json().then((data) => ({ status: resp.status, body: data }))
        )
        .then((obj) => {
          if (obj.status === 200) {
            const updatedMembership = Object.assign(
              {},
              this.state.group_membership
            );
            delete updatedMembership[userid];
            this.setState({
              group_membership: updatedMembership,
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
    return (
      <div style={{ marginBottom: "-10px" }}>
        <p style={{ marginTop: "20px", marginBottom: "-20px" }}>
          Group: {this.props.name}
          {"  "}
          <button onClick={this.addMember}>+ Member</button>
          <IconButton
            aria-label="more"
            aria-controls="group-menu"
            aria-haspopup="true"
            onClick={this.clickThreeDotsMenu}
            style={{ marginLeft: "5px" }}
          >
            <MoreHorizIcon />
          </IconButton>
          <Menu
            id="group-menu"
            anchorEl={this.state.threeDotsAnchorElement}
            keepMounted
            open={this.state.threeDotsAnchorElement !== null}
            onClose={this.closeThreeDotsMenu}
            PaperProps={{
              style: {
                maxHeight: 40 * 4.5,
                width: "20ch",
              },
            }}
          >
            {options.map((option) => (
              <MenuItem key={option} onClick={this.closeThreeDotsMenu}>
                {option}
              </MenuItem>
            ))}
          </Menu>
        </p>
        <ul>
          {Object.keys(this.state.group_membership).map((userid) => {
            const username = this.state.group_membership[userid];
            return (
              <div key={`member_${userid}`}>
                <div>
                  <Member
                    id={userid}
                    name={username}
                    removeMember={this.removeMember}
                    onlyMemberInGroup={
                      Object.keys(this.state.group_membership).length === 1
                    }
                  />
                </div>
              </div>
            );
          })}
        </ul>
      </div>
    );
  }
}

export default Group;
