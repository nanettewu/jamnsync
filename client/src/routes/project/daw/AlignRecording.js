import {
  useDialog,
  ModalContent,
  ModalFooter,
  ModalButton,
} from "react-st-modal";
import { useState, useEffect, useCallback } from "react";
import "./AlignRecording.css";
import WaveSurfer from "wavesurfer.js";
import Draggable from "react-draggable";
import Crunker from "crunker"; // https://github.com/jackedgson/crunker

// const backing = "audio/kq/KillerQueen_bg.wav";
// const recording = "audio/kq/KillerQueen_solo.wav";
// const backing = "audio/click.mp3";
// const recording = "audio/off_kovacs.mp3";

export default function AlignRecordingModalContent(props) {
  const crunker = new Crunker();
  const dialog = useDialog();

  const [isPlaying, setPlaying] = useState(false);
  const [bgWaveSurfer, setBgWaveSurfer] = useState(null);
  const [recWaveSurfer, setRecWaveSurfer] = useState(null);
  const [loadedAudio, setLoadedAudio] = useState(false);

  const [dragOffset, setDragOffset] = useState(0);
  const [latencyMagnitude, setLatencyMagnitude] = useState(0);

  const onStopDrag = useCallback((_, position) => {
    console.log("stopped:", position.x);
    const latency = 12.5053 * position.x + 7.3617;
    setDragOffset(position.x);
    setLatencyMagnitude(latency);
  }, []);

  useEffect(() => {
    setBgWaveSurfer(
      WaveSurfer.create({
        container: "#bg_waveform",
        waveColor: "#D9DCFF",
        progressColor: "#4353FF",
        cursorColor: "#4353FF",
        // barWidth: 3,
        // barRadius: 3,
        cursorWidth: 1,
        height: 200,
        width: 1000,
        // barGap: 3,
        interact: false,
        hideScrollbar: true,
      })
    );
    setRecWaveSurfer(
      WaveSurfer.create({
        container: "#rec_waveform",
        waveColor: "#D9DCFF",
        progressColor: "#4353FF",
        cursorColor: "#4353FF",
        // barWidth: 3,
        // barRadius: 3,
        cursorWidth: 1,
        height: 200,
        width: 1000,
        // barGap: 3,
        interact: false,
        hideScrollbar: true,
      })
    );
  }, []);

  useEffect(() => {
    if (bgWaveSurfer && recWaveSurfer && dialog && !dialog.isOpen) {
      bgWaveSurfer.stop();
      recWaveSurfer.stop();
    }
  }, [bgWaveSurfer, recWaveSurfer, loadedAudio, dialog]);

  useEffect(() => {
    console.log("loading recordings");
    console.log(props.recordedURL, props.recordedTrackId, props.trackMetadata);
    if (bgWaveSurfer && recWaveSurfer && !loadedAudio) {
      let nonRecordedTrackURLs = Object.keys(props.trackMetadata)
        .filter((trackId) => {
          return trackId !== props.recordedTrackId;
        })
        .map((trackId) => {
          // TODO: made executive decision to just pick latest track, but eventually need to fix how take state is stored so DAW Object can access it
          const takeId = Object.keys(props.trackMetadata[trackId].takes).pop();
          const audio_url = props.trackMetadata[trackId].takes[takeId].s3_info;
          return audio_url;
        });
      console.log(nonRecordedTrackURLs);
      crunker
        .fetchAudio(...nonRecordedTrackURLs)
        .then((buffers) => {
          // => [AudioBuffer, AudioBuffer]
          return crunker.mergeAudio(buffers);
        })
        .then((merged) => {
          // => AudioBuffer
          return crunker.export(merged, "audio/mp3");
        })
        .then((output) => {
          // => {blob, element, url}
          bgWaveSurfer.load(output.url);
          recWaveSurfer.load(props.recordedURL);

          bgWaveSurfer.setVolume(0.3);
          recWaveSurfer.setVolume(0.2);

          bgWaveSurfer.zoom(80);
          recWaveSurfer.zoom(80);
          setLoadedAudio(true);
        });
    }
  }, [bgWaveSurfer, recWaveSurfer, loadedAudio, crunker, props]); // TODO check

  return (
    <div className="outerDiv">
      <Draggable axis="x" bounds={{ left: -285, right: 285 }}>
        <div className="cursor">
          <div className="point" />
          <div className="startLine" />
        </div>
      </Draggable>
      <ModalContent>
        <p>
          Drag your recording left and right to align the start of your
          recording! <br />
          (Move the red cursor as a "ruler" to guide alignment)
        </p>
        <p>
          <b>Backing</b>
        </p>
        <div id="bg_waveform"></div>
        <p>
          <b>Recording</b>
        </p>
        <Draggable axis="x" onStop={onStopDrag}>
          <div id="rec_waveform"></div>
        </Draggable>
      </ModalContent>
      <ModalFooter>
        <ModalButton
          onClick={() => {
            console.log("offset:", dragOffset);

            bgWaveSurfer.params.scrollParent = false;
            recWaveSurfer.params.scrollParent = false;

            bgWaveSurfer.seekTo(0);
            console.log(recWaveSurfer.getDuration());
            recWaveSurfer.seekAndCenter(3 / recWaveSurfer.getDuration());

            if (dragOffset > 0) {
              console.log("[recorded early]: user wants to playback later");
              console.log(latencyMagnitude);
              bgWaveSurfer.play(null, 7);
              setTimeout(() => {
                recWaveSurfer.play(null, 10 - latencyMagnitude / 1000);
              }, latencyMagnitude);
            } else if (dragOffset < 0) {
              console.log("[recorded late]: user wants to playback earlier");
              const latency = -latencyMagnitude;
              console.log(latency);
              // recWaveSurfer.seekTo(latency / 1000);
              bgWaveSurfer.play(null, 7);
              recWaveSurfer.play(
                latencyMagnitude / 1000,
                7 + latencyMagnitude / 1000
              );
              // setLatencyMagnitude(latency);
            } else {
              bgWaveSurfer.play(null, 7);
              recWaveSurfer.play(null, 7);
            }
          }}
        >
          Play
        </ModalButton>
        <ModalButton
          onClick={() => {
            bgWaveSurfer.pause();
            recWaveSurfer.pause();
            setPlaying(!isPlaying);
          }}
        >
          Stop
        </ModalButton>
        <ModalButton
          onClick={() => {
            // Сlose the dialog and return the value
            bgWaveSurfer.stop();
            recWaveSurfer.stop();
            console.log("returning value:", latencyMagnitude);
            dialog.close(Math.round(latencyMagnitude));
          }}
        >
          Submit
        </ModalButton>
      </ModalFooter>
    </div>
  );
}
