import React, { Component } from "react";
import {
  Route,
  NavLink,
  HashRouter
} from "react-router-dom";

import Login from './components/Login';
import Logout from './components/Logout';

import Home from "./Home";
import Projects from "./Projects";
import AudioPlayer from "./AudioPlayer";
import Contact from "./Contact";

import nsync from "./nsync.jpg"

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
          <img src={nsync} alt="nsync" width="300" />

          {!this.state.isUserLoggedIn && (
            <Login onSuccessfulLogin={this.handleSuccessfulLogin} />
          )}
          {this.state.isUserLoggedIn && (
            <div>
              <div>
                Welcome {this.state.userDetails.givenName}{" "}
                {this.state.userDetails.familyName}!
              </div>
              <div>
                <Logout onSuccessfulLogout={this.handleSuccessfulLogout} />
              </div>
            </div>
          )}

          <ul className="header">
            <li><NavLink exact to="/">Home</NavLink></li>
            <li><NavLink to="/projects">Projects</NavLink></li>
            <li><NavLink to="/audioplayer">Audio Player</NavLink></li>
            <li><NavLink to="/contact">Contact</NavLink></li>
          </ul>

          <div className="content">
            <Route exact path="/" component={Home} />
            <Route path="/projects" component={Projects} />
            <Route path="/audioplayer" component={AudioPlayer} />
            <Route path="/contact" component={Contact} />
          </div>
        </div >
      </HashRouter>
    );
  }
}

export default App;