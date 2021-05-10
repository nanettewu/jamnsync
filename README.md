# JamNSync: User-Friendly Virtual Rehearsal Platform

This project is a web-based system that streamlines the virtual music-making experience for small music groups (i.e. 2 to 5 people).

Existing technologies that replicate in-person music rehearsals are complex and unintuitive. Network music performance platforms promise real-time interactions between physically separated musicians, but they demand hard-to-achieve network conditions, lack rehearsal-specific features, and require extensive knowledge of network jargon.

Designed with musicians in mind, JamNSync proposes a “middle ground” between synchronous network performance applications and general-use remote meeting software. This system in accessible, complete one-stop-shop that encapsulates the important aspects of an in-person rehearsal. Each musician simply needs a wired headset and a fundamental understanding of playback systems. By abstracting away underlying complexities of the system (e.g. audio mixing), JamNSync enables musicians to set up a recording session to rehearse in real-time without extensive technical understanding. By providing more opportunities for small group rehearsals, this project enables a larger population of musicians to remotely make music, which is especially valuable during times of social isolation.

## Subprojects

### client (JS)

React app providing user interface for rehearsal software.

### server (Python)

Flask backend that communicates with Postgres DB to create, edit, and store audio files.

## Set Up

Estimated time: 20-30 minutes

### 1. Prerequisites

* Clone the github repo locally.
* Make sure you have the [latest version of Python](https://www.python.org/downloads/). Mac users: if you have Homebrew, update Python with `brew upgrade python`.

### 2. Installation

* `cd` into the project (i.e. `jamnsync`)
* `cd` into `server`
* Create a Python [virtual environment](https://docs.python.org/3/tutorial/venv.html): `python3 -m venv venv`
* Activate virtual environment: `source venv/bin/activate`
* Install dependencies: `pip install -r requirements.txt`

### 3. AWS S3 for Audio File Storage

This application uses an AWS S3 bucket to store audio files. Configure your S3 credentials using the AWS CLI [here](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-mac.html).

### 4. GCP for Authentication

This application uses Google Sign-In to manage authentication (OAuth 2.0). Follow steps to set up an OAuth client ID [here](https://developers.google.com/identity/sign-in/web/sign-in) and **take note of the client ID** (ends with apps.googleusercontent.com).

### 5. Local PostgreSQL instance

Create a local database named `jamnsync` on `localhost`.

* Mac instructions [here](https://www.codementor.io/@engineerapart/getting-started-with-postgresql-on-mac-osx-are8jcopb).
* Windows instructions [here](https://www.microfocus.com/documentation/idol/IDOL_12_0/MediaServer/Guides/html/English/Content/Getting_Started/Configure/_TRN_Set_up_PostgreSQL.htm).

### 6. Environment Variables

In client:

* Create a `.env` file in the top level of the `client/` repo.
* Variables:
  * `REACT_APP_GOOGLE_CLIENT_ID = <client id from step 4>`
  * `ROOT_URL = "http://localhost:5000/"`

In server:

* Create a `.env` file in the top level of the `server/` repo:
* Variables:
  * `DATABASE_URL=postgresql+psycopg2://<user>:<password>@localhost/jamnsync`
  * `SECRET_KEY=<any string/hash of your choosing>`
  * `FLASK_ENV=development`

## Usage

* From one terminal window, `cd` into `client/`, then run `npm start`.
* From another terminal window, `cd` into `server/`. Make sure your Python virtual environment is activated, then run `flask run`.
