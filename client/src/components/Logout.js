import React from "react";
import { GoogleLogout } from "react-google-login";

function Logout(props) {
  const onSuccess = () => {
    // console.log('Logged out successfully');
    // alert("Logged out successfully ✌");
    props.onSuccessfulLogout();
  };

  return (
    <div>
      <GoogleLogout
        clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}
        buttonText="Logout"
        onLogoutSuccess={onSuccess}
      ></GoogleLogout>
    </div>
  );
}

export default Logout;
