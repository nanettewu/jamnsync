import React, { Component } from "react";
import { HashRouter, NavLink, Route } from "react-router-dom";
import { Redirect } from "react-router";
import { createHashHistory } from "history";

// import Footer from "./components/Footer";
import Login from "./components/Login";
import Logout from "./components/Logout";
import Project from "./routes/project/Project";
import Home from "./routes/home/Home";
import Projects from "./routes/projects/Projects";
import Groups from "./routes/groups/Groups";
import PrivateRoute from "./utils/components/PrivateRoute";

import io from "socket.io-client";
export const socket = io(process.env.ROOT_URL);

const history = createHashHistory();

class App extends Component {
  constructor() {
    super();
    this.state = {
      userDetails: {},
      isUserLoggedIn: false,
    };
  }

  componentDidMount() {
    if (history.location.pathname === "/") {
      history.replace("/home");
    }

    let userDetails = JSON.parse(localStorage.getItem("userDetails"));
    let isUserLoggedIn = localStorage.getItem("isUserLoggedIn") === "true";
    if (isUserLoggedIn && !this.state.isUserLoggedIn) {
      this.setState({
        userDetails: userDetails,
        isUserLoggedIn: isUserLoggedIn,
      });
    }
  }

  componentDidUpdate(prevState) {
    if (
      !this.state.isUserLoggedIn &&
      prevState.isUserLoggedIn &&
      history.location.pathname === "/"
    ) {
      history.replace("/home");
    }
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
        console.log(res.message);
        localStorage.setItem("userDetails", JSON.stringify(userDetails));
        localStorage.setItem("isUserLoggedIn", true);
        this.setState({ userDetails: userDetails, isUserLoggedIn: true });
      });
  };

  handleSuccessfulLogout = () => {
    fetch("/auth/logout", { method: "POST" })
      .then((resp) => resp.json())
      .then((res) => {
        if (res.status === 401) {
          console.log("server error: couldn't log out");
          localStorage.clear();
          this.setState({ userDetails: {}, isUserLoggedIn: false });
          history.replace("/home");
        }
        console.log(res.message);
        localStorage.clear();
        this.setState({ userDetails: {}, isUserLoggedIn: false });
      });
  };

  render() {
    // default to groups page if no history, otherwise go to last page before refresh
    let pathname = history.location.pathname;
    return (
      <HashRouter history={history}>
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
              <NavLink to="/home">Home</NavLink>
            </li>
            {this.state.isUserLoggedIn && (
              <li>
                <NavLink to="/groups">Groups</NavLink>
              </li>
            )}
            {this.state.isUserLoggedIn && (
              <li>
                <NavLink to="/projects">Projects</NavLink>
              </li>
            )}
          </ul>

          <div className="content">
            <Route exact path="/">
              {this.state.isUserLoggedIn && pathname !== "/" ? (
                <Redirect to={pathname} />
              ) : (
                <Home authed={this.state.isUserLoggedIn} />
              )}
            </Route>
            <Route path="/home">
              <Home authed={this.state.isUserLoggedIn} />
            </Route>
            <PrivateRoute
              path="/projects"
              component={Projects}
              authed={this.state.isUserLoggedIn}
            />
            <PrivateRoute
              path="/groups"
              component={Groups}
              authed={this.state.isUserLoggedIn}
            />
            <PrivateRoute
              path="/project/"
              component={Project}
              authed={this.state.isUserLoggedIn}
            />
          </div>
        </div>
      </HashRouter>
    );
  }
}

export default App;
