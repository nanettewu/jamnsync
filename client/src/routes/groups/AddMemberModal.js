import {
  useDialog,
  ModalContent,
  ModalFooter,
  ModalButton,
} from "react-st-modal";
import { useState } from "react";

import Dropdown from "react-dropdown";
import "react-dropdown/style.css";

export default function AddMemberModalContent(props) {
  const dialog = useDialog();

  const [newUserId, setNewUserId] = useState(null);
  const [newUserName, setNewUserName] = useState(null);

  const _onSelect = (option) => {
    console.log("Selected " + option.label);
    setNewUserId(option.value);
    setNewUserName(option.label);
  };

  const userDropdownOptions = Object.keys(props.users)
    .sort((a, b) => props.users[a] < props.users[b])
    .reduce((acc, userid) => {
      acc.push({
        value: userid,
        label: props.users[userid],
      });
      return acc;
    }, []);

  return (
    <div>
      <ModalContent>
        <p>The dropdown lists all members on JamNSync:</p>
        <div
          style={{
            height: 250,
            width: 300,
          }}
        >
          <Dropdown
            options={userDropdownOptions}
            onChange={_onSelect}
            placeholder="Select a name"
          />
        </div>
      </ModalContent>
      <ModalFooter>
        <ModalButton
          onClick={() => {
            // Сlose the dialog and return the value
            dialog.close([newUserId, newUserName]);
          }}
        >
          OK
        </ModalButton>
        <ModalButton
          onClick={() => {
            dialog.close([newUserId, newUserName]);
          }}
          type={"light"}
        >
          Cancel
        </ModalButton>
      </ModalFooter>
    </div>
  );
}
