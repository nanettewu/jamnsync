import React from 'react';
import { GoogleLogout } from 'react-google-login';

const CLIENT_ID = '248637884136-0bql8665umlks4j2t0nhvajgnb7lgfdh.apps.googleusercontent.com';

function Logout(props) {
  const onSuccess = () => {
    console.log('Logged out successfully');
    alert('Logged out successfully ✌');
    props.onSuccessfulLogout();
  };

  return (
    <div>
      <GoogleLogout
        clientId={CLIENT_ID}
        buttonText="Logout"
        onLogoutSuccess={onSuccess}
      ></GoogleLogout>
    </div>
  );
}

export default Logout;