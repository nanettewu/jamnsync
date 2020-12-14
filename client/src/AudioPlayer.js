import React, { Component } from "react";
import { Howl } from 'howler';

class AudioPlayer extends Component {
  constructor() {
    super();
    this.sound = new Howl({
      src: ["./gersh.mp3"]
    })
    this.state = {
      playing: false,
      muted: false,
    }
  }

  componentWillUnmount() {
    this.handleStop()
  }

  handlePlayPause = () => {
    if (this.state.playing) {
      console.log("pause")
      this.sound.pause()
      this.setState({ playing: false })
    } else {
      console.log("play")
      this.sound.play()
      this.setState({ playing: true })
    }
  }

  handleStop = () => {
    this.sound.stop()
    this.setState({ playing: false })
  }

  handleMute = () => {
    if (this.state.muted) {
      console.log("unmute")
      this.sound.mute(false)
      this.setState({ muted: false })
    } else {
      console.log("mute")
      this.sound.mute(true)
      this.setState({ muted: true })
    }
  }

  render() {
    return (
      <div>
        <h2>AUDIO PLAYER</h2>
        <p>testing audio playing</p>
        {this.state.playing
          ? <button onClick={this.handlePlayPause}>pause</button>
          : <button onClick={this.handlePlayPause}>play</button>
        }
        <button onClick={this.handleStop}>stop</button>
        {this.state.muted
          ? <button onClick={this.handleMute}>unmute</button>
          : <button onClick={this.handleMute}>mute</button>
        }
      </div>
    );
  }
}

export default AudioPlayer;