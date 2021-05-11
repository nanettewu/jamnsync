import React, { Component } from "react";

class Member extends Component {
  removeMember = () => {
    this.props.removeMember(this.props.id);
  };

  render() {
    const hideRemoveButton = !this.props.onlyMemberInGroup;
    return (
      <div style={{ marginTop: "10px" }}>
        <li>
          Member: {this.props.name}{" "}
          {hideRemoveButton && (
            <button
              onClick={this.removeMember}
              style={{ marginLeft: "5px", cursor: "pointer" }}
            >
              Remove
            </button>
          )}
        </li>
      </div>
    );
  }
}

export default Member;
