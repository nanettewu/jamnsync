import React, { Component } from "react";
import { HashRouter, NavLink, Route } from "react-router-dom";
import Footer from "./components/Footer";
import Login from "./components/Login";
import Logout from "./components/Logout";
import Project from "./routes/project/Project";
import ProjectSearch from "./routes/project/ProjectSearch";
import Home from "./routes/home/Home";
import Groups from "./routes/groups/Groups";
import AudioPlayer from "./routes/temp-audioplayer/AudioPlayer"; // temp
import { EmbeddedJitsi } from "./routes/temp-jitsi/EmbeddedJitsi"; // temp
import WebAudio from "./routes/temp-webaudio/WebAudio"; // temp

import PrivateRoute from "./utils/components/PrivateRoute";

class App extends Component {
  constructor() {
    super();
    this.state = {
      userDetails: {},
      isUserLoggedIn: false,
    };
  }

  handleSuccessfulLogin = (response) => {
    const userDetails = response.profileObj;
    const formData = new FormData();
    formData.append("google_auth_id", userDetails.googleId);
    formData.append("google_email", userDetails.email);
    formData.append("user_name", userDetails.name);
    const requestOptions = {
      method: "POST",
      body: formData,
    };

    fetch("/auth/login", requestOptions)
      .then((resp) => resp.json())
      .then((res) => {
        console.log(res);
      });

    this.setState({ userDetails: userDetails, isUserLoggedIn: true });
  };

  handleSuccessfulLogout = () => {
    fetch("/auth/logout", { method: "POST" })
      .then((resp) => resp.json())
      .then((res) => {
        console.log(res);
      });

    this.setState({ userDetails: {}, isUserLoggedIn: false });
  };

  render() {
    return (
      <HashRouter>
        <div>
          <h1>JamNSync</h1>
          <div style={{ position: "absolute", right: 20, top: 35 }}>
            {!this.state.isUserLoggedIn && (
              <Login onSuccessfulLogin={this.handleSuccessfulLogin} />
            )}
            {this.state.isUserLoggedIn && (
              <div style={{ display: "flex" }}>
                <div>
                  <p>Welcome, {this.state.userDetails.givenName}!</p>
                </div>
                <div style={{ marginLeft: "5px" }}>
                  <Logout onSuccessfulLogout={this.handleSuccessfulLogout} />
                </div>
              </div>
            )}
          </div>

          <ul className="header">
            {!this.state.isUserLoggedIn && (
              <li>
                <NavLink exact to="/">
                  Home
                </NavLink>
              </li>
            )}
            {this.state.isUserLoggedIn && (
              <div>
                <li>
                  <NavLink exact to="/">
                    Home
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/groups">Groups</NavLink>
                </li>
                <li>
                  <NavLink to="/audioplayer">Audio Player (temp)</NavLink>
                </li>
                <li>
                  <NavLink to="/jitsi">Jitsi (temp)</NavLink>
                </li>
                <li>
                  <NavLink to="/webaudio">Web Audio (temp)</NavLink>
                </li>
              </div>
            )}
          </ul>

          <div className="content">
            <Route exact path="/" component={Home} />
            <PrivateRoute
              path="/groups"
              component={Groups}
              authed={this.state.isUserLoggedIn}
            />
            <PrivateRoute
              path="/audioplayer"
              component={AudioPlayer}
              authed={this.state.isUserLoggedIn}
            />
            <PrivateRoute
              exact
              path={["/project", "/project/"]}
              component={ProjectSearch}
              authed={this.state.isUserLoggedIn}
            />
            <PrivateRoute
              path="/project"
              component={Project}
              authed={this.state.isUserLoggedIn}
            />
            <PrivateRoute
              path="/jitsi"
              component={EmbeddedJitsi}
              authed={this.state.isUserLoggedIn}
            />
            <PrivateRoute
              path="/webaudio"
              component={WebAudio}
              authed={this.state.isUserLoggedIn}
            />
          </div>

          <Footer />
        </div>
      </HashRouter>
    );
  }
}

export default App;
