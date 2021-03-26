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

// const backing = "audio/kq/KillerQueen_bg.wav";
// const recording = "audio/kq/KillerQueen_solo.wav";
const backing = "audio/click.mp3";
const recording = "audio/off_kovacs.mp3";

export default function AlignRecordingModalContent() {
  const dialog = useDialog();

  const [dialogValue] = useState();
  const [isPlaying, setPlaying] = useState(false);
  const [bgWaveSurfer, setBgWaveSurfer] = useState(null);
  const [recWaveSurfer, setRecWaveSurfer] = useState(null);
  const [loadedAudio, setLoadedAudio] = useState(false);

  const [dragOffset, setDragOffset] = useState(0);

  const onStopDrag = useCallback((_, position) => {
    console.log("stopped:", position.x);
    setDragOffset(position.x);
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
    if (bgWaveSurfer && recWaveSurfer && !loadedAudio) {
      bgWaveSurfer.load(backing);
      recWaveSurfer.load(recording);
      bgWaveSurfer.zoom(80);
      recWaveSurfer.zoom(80);
      setLoadedAudio(true);
    }
    if (bgWaveSurfer && recWaveSurfer && dialog && !dialog.isOpen) {
      bgWaveSurfer.stop();
      recWaveSurfer.stop();
    }
  }, [bgWaveSurfer, recWaveSurfer, loadedAudio, dialog]);

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
          recording!
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
            recWaveSurfer.seekTo(0);

            if (dragOffset > 0) {
              console.log("[recorded early]: user wants to playback later");
              const latency = 12.5053 * dragOffset + 7.3617;
              console.log(latency);
              bgWaveSurfer.play(null, 7);
              setTimeout(() => {
                recWaveSurfer.play(null, 7 - latency / 1000);
              }, latency);
            } else if (dragOffset < 0) {
              console.log("[recorded late]: user wants to playback earlier");
              const latency = -(12.5053 * dragOffset + 7.3617);
              console.log(latency);
              // recWaveSurfer.seekTo(latency / 1000);
              bgWaveSurfer.play(null, 7);
              recWaveSurfer.play(latency / 1000, 7 + latency / 1000);
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
            dialog.close(dialogValue);
          }}
        >
          Submit
        </ModalButton>
      </ModalFooter>
    </div>
  );
}
