// source: https://github.com/Sivanesh-S/react-google-authentication/blob/master/src/components/Login.js

import React from "react";

import { GoogleLogin } from "react-google-login";
import { refreshTokenSetup } from "../utils/refreshToken";

function Login(props) {
  const onSuccess = (res) => {
    // console.log("Login Success: currentUser:", res.profileObj);
    refreshTokenSetup(res);
    props.onSuccessfulLogin(res);
  };

  const onFailure = (res) => {
    console.log("Attempt to login failed. Error:", res);
    alert("Error: " + res.error + ". " + res.details);
  };

  return (
    <div>
      <GoogleLogin
        clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}
        buttonText="Login"
        onSuccess={onSuccess}
        onFailure={onFailure}
        cookiePolicy={"single_host_origin"}
        style={{ marginTop: "100px" }}
        isSignedIn={true}
      />
    </div>
  );
}

export default Login;
