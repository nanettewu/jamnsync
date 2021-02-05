import React, { Component } from "react";
const audioType = "audio/wav";

class WebAudio extends Component {
  constructor() {
    super();
    this.state = {
      recording: false,
      recordings: [],
    };
  }

  componentDidMount() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      this.audio = stream;
      this.mediaRecorder = new MediaRecorder(stream);
      this.chunks = [];
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.chunks.push(e.data);
        }
      };
    });
    // this.setState({ audio });
    // this.audio.src = window.URL.createObjectURL(stream);
    // this.audio.play();
    // this.mediaRecorder = new MediaRecorder(stream);
    // this.chunks = [];
    // this.mediaRecorder.ondataavailable = (e) => {
    //   if (e.data && e.data.size > 0) {
    //     this.chunks.push(e.data);
    //   }
    // };
  }

  handleRecord = () => {
    console.log("recording now");
    // wipe old data chunks
    this.chunks = [];
    // start recorder with 10ms buffer
    this.mediaRecorder.start(10);
    this.setState({ recording: true });
  };

  handleStopRecord = () => {
    console.log("stopped now");
    // stop the recorder
    this.mediaRecorder.stop();
    this.setState({ recording: false });
    // save audio to memory
    this.saveAudio();
  };

  saveAudio() {
    // convert saved chunks to blob
    const blob = new Blob(this.chunks, { type: audioType });
    // generate video url from blob
    const blobURL = URL.createObjectURL(blob);
    // append videoURL to list of saved videos for rendering
    const recordings = this.state.recordings.concat([blobURL]);
    this.setState({ recordings });
  }

  deleteRecording(blobURL) {
    // filter out current videoURL from the list of saved videos
    const recordings = this.state.recordings.filter((a) => a !== blobURL);
    this.setState({ recordings });
  }

  render() {
    return (
      <div>
        <div>
          <p>test mic with web audio</p>
          <button disabled={this.state.recording} onClick={this.handleRecord}>
            record
          </button>
          <button
            disabled={!this.state.recording}
            onClick={this.handleStopRecord}
          >
            stop
          </button>
        </div>
        <div>
          <p>Recordings:</p>
          {this.state.recordings.map((blobURL, i) => (
            <div key={`recording_${i}`}>
              <audio controls style={{ width: 200 }} src={blobURL} />
              <div>
                <button onClick={() => this.deleteAudio(blobURL)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

export default WebAudio;
