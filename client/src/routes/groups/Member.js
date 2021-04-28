import React, { Component } from "react";

class Member extends Component {
  removeMember = () => {
    this.props.removeMember(this.props.id);
  };

  render() {
    const hideRemoveButton = !this.props.onlyMemberInGroup;
    return (
      <div>
        <li>
          Member: {this.props.name}{" "}
          {hideRemoveButton && (
            <button onClick={this.removeMember}>Remove</button>
          )}
        </li>
      </div>
    );
  }
}

export default Member;
