// source: https://github.com/Sivanesh-S/react-google-authentication/blob/master/src/components/Login.js

import React from 'react';

import { GoogleLogin } from 'react-google-login';
// refresh token
import { refreshTokenSetup } from '../utils/refreshToken';

const CLIENT_ID = '248637884136-0bql8665umlks4j2t0nhvajgnb7lgfdh.apps.googleusercontent.com';

function Login(props) {
  const onSuccess = (res) => {
    console.log('Login Success: currentUser:', res.profileObj);
    // alert(
    //   `Logged in successfully!`
    // );
    refreshTokenSetup(res);
    props.onSuccessfulLogin(res);
  };

  const onFailure = (res) => {
    console.log('Login failed: res:', res);
    // alert(
    //   `Failed to login 😢`
    // );
  };

  return (
    <div>
      <GoogleLogin
        clientId={CLIENT_ID}
        buttonText="Login"
        onSuccess={onSuccess}
        onFailure={onFailure}
        cookiePolicy={'single_host_origin'}
        style={{ marginTop: '100px' }}
        isSignedIn={true}
      />
    </div>
  );
}

export default Login;
