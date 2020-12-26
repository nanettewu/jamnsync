import React, { Component } from "react";
import {
  Route,
  NavLink,
  HashRouter
} from "react-router-dom";

import Footer from "./components/Footer"

import Login from './components/Login';
import Logout from './components/Logout';

import Home from "./components/Home";
import Projects from "./components/Projects";
import AudioPlayer from "./components/AudioPlayer";

import PrivateRoute from "./utils/PrivateRoute";

class App extends Component {
  constructor() {
    super();
    this.state = {
      userDetails: {},
      isUserLoggedIn: false
    };
  }

  handleSuccessfulLogin = response => {
    console.log("[STATE] setting user login state to true!")
    this.setState({ userDetails: response.profileObj, isUserLoggedIn: true });
  };

  handleSuccessfulLogout = () => {
    console.log("[STATE] setting user login state to false!")
    this.setState({ isUserLoggedIn: false })
  };

  render() {
    return (
      <HashRouter>
        < div >
          <h1>JamNSync</h1>
          <div style={{ position: 'absolute', right: 20, top: 35 }} >
            {!this.state.isUserLoggedIn && (
              <Login onSuccessfulLogin={this.handleSuccessfulLogin} />
            )}
            {this.state.isUserLoggedIn && (
              <div style={{ display: "flex" }} >
                <div>
                  <p>
                    Welcome, {this.state.userDetails.givenName}!
                  </p>
                </div>
                <div style={{ marginLeft: "5px" }}>
                  <Logout onSuccessfulLogout={this.handleSuccessfulLogout} />
                </div>
              </div>
            )}
          </div>

          <ul className="header">
            <li><NavLink exact to="/">Home</NavLink></li>
            {this.state.isUserLoggedIn && <li><NavLink to="/projects">Projects</NavLink></li>}
            {this.state.isUserLoggedIn && <li><NavLink to="/audioplayer">Audio Player</NavLink></li>}
          </ul>

          <div className="content">
            <Route exact path="/" component={Home} />
            <PrivateRoute path="/projects" component={Projects} authed={this.state.isUserLoggedIn} />
            <PrivateRoute path="/audioplayer" component={AudioPlayer} authed={this.state.isUserLoggedIn} />
          </div>

          <Footer />

        </div >
      </HashRouter >
    );
  }
}

export default App;