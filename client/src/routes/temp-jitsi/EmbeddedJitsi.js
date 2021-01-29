import React, { useState } from "react";
import { Jutsu } from "react-jutsu";

// https://github.com/this-fifo/jutsu
export const EmbeddedJitsi = () => {
  const [displayName, setDisplayName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [password, setPassword] = useState("");
  const [onCall, setOnCall] = useState(false);

  const handleClick = (event) => {
    event.preventDefault();
    if (roomName && displayName) setOnCall(true);
  };

  return (
    <div>
      <h2>Jitsi</h2>
      <br />
      {onCall ? (
        <Jutsu
          containerStyles={{ width: "800px", height: "400px" }}
          roomName={roomName}
          displayName={displayName}
          password={password}
          onMeetingEnd={() => console.log("Meeting has ended")}
          loadingComponent={<p>Loading ...</p>}
          errorComponent={<p>Oops, something went wrong</p>}
        />
      ) : (
        <form>
          <p>Create a Room</p>
          <input
            id="room"
            type="text"
            placeholder="Room Name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <input
            id="name"
            type="text"
            placeholder="Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <input
            id="password"
            type="text"
            placeholder="Password (optional)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={handleClick} type="submit">
            Start / Join
          </button>
        </form>
      )}
    </div>
  );
};
