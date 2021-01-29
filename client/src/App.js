import React, { Component } from "react";
import { HashRouter, NavLink, Route } from "react-router-dom";
import Footer from "./components/Footer";
import Login from "./components/Login";
import Logout from "./components/Logout";
import DAW from "./routes/daw/DAW";
import Home from "./routes/home/Home";
import Projects from "./routes/projects/Projects";
import AudioPlayer from "./routes/temp-audioplayer/AudioPlayer"; // temp
import { EmbeddedJitsi } from "./routes/temp-jitsi/EmbeddedJitsi"; // temp
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
    this.setState({ userDetails: response.profileObj, isUserLoggedIn: true });
  };

  handleSuccessfulLogout = () => {
    this.setState({ isUserLoggedIn: false });
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
            <li>
              <NavLink exact to="/">
                Home
              </NavLink>
            </li>
            {this.state.isUserLoggedIn && (
              <li>
                <NavLink to="/projects">Projects</NavLink>
              </li>
            )}
            {this.state.isUserLoggedIn && (
              <li>
                <NavLink to="/audioplayer">Audio Player</NavLink>
              </li>
            )}
            {this.state.isUserLoggedIn && (
              <li>
                <NavLink to="/daw">DAW</NavLink>
              </li>
            )}
            {this.state.isUserLoggedIn && (
              <li>
                <NavLink to="/jitsi">Jitsi</NavLink>
              </li>
            )}
          </ul>

          <div className="content">
            <Route exact path="/" component={Home} />
            <PrivateRoute
              path="/projects"
              component={Projects}
              authed={this.state.isUserLoggedIn}
            />
            <PrivateRoute
              path="/audioplayer"
              component={AudioPlayer}
              authed={this.state.isUserLoggedIn}
            />
            <PrivateRoute
              path="/daw"
              component={DAW}
              authed={this.state.isUserLoggedIn}
            />
            <PrivateRoute
              path="/jitsi"
              component={EmbeddedJitsi}
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
