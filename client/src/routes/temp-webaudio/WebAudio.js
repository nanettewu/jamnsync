import React, { Component } from "react";
import MicRecorder from "./MicRecorder";

const audioType = "audio/mp3";
const Mp3Recorder = new MicRecorder({ bitRate: 128 });

class WebAudio extends Component {
  constructor() {
    super();
    this.state = {
      recording: false,
      recordings: [],
    };
    // this.clearBuffer();
  }

  // componentDidMount() {
  //   navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
  //     this.mediaRecorder = new MediaRecorder(stream);
  //     this.chunks = [];
  //     this.mediaRecorder.ondataavailable = (e) => {
  //       if (e.data && e.data.size > 0) {
  //         this.chunks.push(e.data);
  //       }
  //     };
  //   });
  // }

  // /**
  //  * Clear active buffer
  //  */
  // clearBuffer = () => {
  //   this.chunks = [];
  // };

  handleRecord = () => {
    console.log("recording now");
    // wipe old data chunks
    // this.chunks = [];
    // start recorder with 10ms buffer
    // this.mediaRecorder.start(10);
    Mp3Recorder.start();
    this.setState({ recording: true });
  };

  handleStopRecord = () => {
    console.log("stopped now");
    // stop the recorder
    // this.mediaRecorder.stop();
    Mp3Recorder.stop()
      .getMp3()
      .then(([buffer, blob]) => {
        // const file = new File(
        //   [blob],
        //   `recording_track_${this.state.selectedTrackId}.mp3`
        // );
        // const latency = 220; // in ms
        // this.createTake(this.state.selectedTrackId, file, latency);
        const blobURL = URL.createObjectURL(blob);
        console.log(blobURL);
        // append videoURL to list of saved videos for rendering
        const recordings = this.state.recordings.concat([blobURL]);
        // this.setState({ recordings });
        this.setState({ recording: false, recordings });
      })
      .catch((e) => console.log(e));
    // save audio to memory
    // this.saveAudio();
  };

  convertBuffer = () => {
    // const data = new Float32Array(this.chunks);
    // const out = new Int16Array(this.chunks.length);
    // // float to 16 bits PCM
    // for (let i = 0; i < data.length; i++) {
    //   const s = Math.max(-1, Math.min(1, data[i]));
    //   out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    // }
    // return out;
  };

  saveAudio() {
    // this.samplesMono = this.convertBuffer();
    // console.log(this.chunks.length);
    // console.log(this.samplesMono.length);
    // // encode to mp3
    // let mp3Data = [];
    // for (var i = 0; i < this.chunks.length; i += sampleBlockSize) {
    //   let sampleChunk = this.chunks.subarray(i, i + sampleBlockSize);
    //   let mp3buf = this.mp3encoder.encodeBuffer(sampleChunk);
    //   if (mp3buf.length > 0) {
    //     mp3Data.push(mp3buf);
    //   }
    // }
    // let mp3buf = this.mp3encoder.flush();

    // if (mp3buf.length > 0) {
    //   mp3Data.push(new Int8Array(mp3buf));
    // }

    // convert saved chunks to blob
    const blob = new Blob(this.chunks, { type: audioType });
    console.log(blob);
    // generate video url from blob
    const blobURL = URL.createObjectURL(blob);
    console.log(blobURL);
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
              <audio controls style={{ width: 300 }} src={blobURL} />
              <div>
                <button onClick={() => this.deleteRecording(blobURL)}>
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
