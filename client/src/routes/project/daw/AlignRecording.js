import {
  useDialog,
  ModalContent,
  ModalFooter,
  ModalButton,
  Confirm,
} from "react-st-modal";
import { useState, useEffect, useCallback } from "react";
import "./AlignRecording.css";
import LoadingGif from "./LoadingGif";
import WaveSurfer from "wavesurfer.js";
import Draggable from "react-draggable";
import Crunker from "crunker"; // https://github.com/jackedgson/crunker

import VolumeMuteRoundedIcon from "@material-ui/icons/VolumeMuteRounded";
import VolumeDownRoundedIcon from "@material-ui/icons/VolumeUpRounded";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

export default function AlignRecordingModalContent(props) {
  const dialog = useDialog();

  const [isPlaying, setPlaying] = useState(false);
  const [playbackTimer, setPlaybackTimer] = useState(null);
  const [delayPlaybackTimer, setDelayPlaybackTimer] = useState(null);
  const [bgWaveSurfer, setBgWaveSurfer] = useState(null);
  const [recWaveSurfer, setRecWaveSurfer] = useState(null);
  const [loadedAudio, setLoadedAudio] = useState(false);
  // const [mixedBackingTrackURL, setMixedBackingTrackURL] = useState(null);

  const [dragOffset, setDragOffset] = useState(0);
  const [latencyMagnitude, setLatencyMagnitude] = useState(0);

  const onStopDrag = useCallback((_, position) => {
    console.log("stopped:", position.x);
    const latency = 12.5053 * position.x + 7.3617;
    console.log(latency);
    setDragOffset(position.x);
    setLatencyMagnitude(latency);
  }, []);

  const bgChangeVolume = (value) => {
    bgWaveSurfer.setVolume(value / 100);
  };

  const recChangeVolume = (value) => {
    recWaveSurfer.setVolume(value / 100);
  };

  useEffect(() => {
    setBgWaveSurfer(
      WaveSurfer.create({
        container: "#bg_waveform",
        waveColor: "#D9DCFF",
        progressColor: "#4353ff",
        cursorColor: "#4353ff",
        cursorWidth: 1,
        height: 200,
        width: 1000,
        interact: false,
        hideScrollbar: true,
      })
    );
    setRecWaveSurfer(
      WaveSurfer.create({
        container: "#rec_waveform",
        waveColor: "#D9DCFF",
        progressColor: "#4353ff",
        cursorColor: "#4353ff",
        cursorWidth: 1,
        height: 200,
        width: 1000,
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
    if (bgWaveSurfer && recWaveSurfer && !loadedAudio) {
      const crunker = new Crunker();
      let backingTrackURLs = props.backingTrackURLs;
      // only combine audio if necessary
      if (backingTrackURLs.length > 1) {
        console.log("using crunker to combine recordings");
        crunker
          .fetchAudio(...backingTrackURLs)
          .then((buffers) => {
            // => [AudioBuffer, AudioBuffer]
            console.log(buffers);
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
            recWaveSurfer.setVolume(0.3);

            bgWaveSurfer.zoom(80);
            recWaveSurfer.zoom(80);
            setLoadedAudio(true);
          });
      } else {
        console.log("using single track as backing track");
        bgWaveSurfer.load(backingTrackURLs[0]);
        recWaveSurfer.load(props.recordedURL);

        bgWaveSurfer.setVolume(0.3);
        recWaveSurfer.setVolume(0.4);

        bgWaveSurfer.zoom(80);
        recWaveSurfer.zoom(80);
        setLoadedAudio(true);
      }
    }
  }, [bgWaveSurfer, recWaveSurfer, loadedAudio, props]);

  return (
    <div className="outerDiv">
      <div>
        {loadedAudio && (
          <Draggable axis="x" bounds={{ left: -285, right: 285 }}>
            <div className="ruler"></div>
          </Draggable>
        )}
        <ModalContent>
          {!loadedAudio ? (
            <div style={{ marginBottom: "10px" }}>
              <LoadingGif text={"Preparing alignment tool..."} />
            </div>
          ) : (
            <p>
              Recordings in the browser are sometimes delayed. Click "play" to
              check for delays, and drag your recording left/right to align it
              with the backing tracks. Move the ruler to help you find and align
              peaks between tracks!
            </p>
          )}
          <div style={{ marginBottom: "5px" }}>
            <b>Backing Tracks</b>
            {loadedAudio && bgWaveSurfer && (
              <div style={{ display: "flex" }}>
                <VolumeMuteRoundedIcon
                  style={{
                    fontSize: 20,
                    marginLeft: "125px",
                    marginTop: "-18px",
                  }}
                  color="action"
                />
                <div
                  style={{
                    width: "55px",
                    marginLeft: "5px",
                    marginTop: "-15px",
                  }}
                >
                  <Slider
                    min={0}
                    max={100}
                    defaultValue={30}
                    onChange={bgChangeVolume}
                  />
                </div>
                <VolumeDownRoundedIcon
                  style={{
                    fontSize: 20,
                    marginLeft: "12px",
                    marginTop: "-18px",
                  }}
                  color="action"
                />
              </div>
            )}
          </div>
          <div id="bg_timeline"></div>
          <div className="backingTrack" id="bg_waveform"></div>
          <div style={{ marginBottom: "5px" }}>
            <b>Recording</b>
            {loadedAudio && recWaveSurfer && (
              <div style={{ display: "flex" }}>
                <VolumeMuteRoundedIcon
                  style={{
                    fontSize: 20,
                    marginLeft: "87px",
                    marginTop: "-18px",
                  }}
                  color="action"
                />
                <div style={{ width: "55px", marginTop: "-15px" }}>
                  <Slider
                    min={0}
                    max={100}
                    defaultValue={40}
                    onChange={recChangeVolume}
                  />
                </div>
                <VolumeDownRoundedIcon
                  style={{
                    fontSize: 20,
                    marginLeft: "10px",
                    marginTop: "-18px",
                  }}
                  color="action"
                />
              </div>
            )}
          </div>
          <Draggable axis="x" onStop={onStopDrag}>
            <div
              className="recordedTrack"
              id="rec_waveform"
              style={props.hasCountdownLatency ? { marginLeft: "-240px" } : {}}
            />
          </Draggable>
        </ModalContent>
        <ModalFooter>
          {/* <ModalButton
            onClick={async () => {
              console.log("downloading backing track");
              const link = document.createElement("a");
              link.href = mixedBackingTrackURL;
              const d = new Date();
              const datestring = `${d.getFullYear()}_${
                d.getMonth() + 1
              }_${d.getDate()}`;
              const timestring = `${d.getHours()}_${d.getMinutes()}_${d.getDate()}_${
                d.getHours() >= 12 ? "PM" : "AM"
              }`;
              const outputFilename = `backingtrackmix_${datestring}-${timestring}`;
              link.setAttribute("download", outputFilename);

              document.body.appendChild(link); // Append to html link element page
              link.click(); // Start download
              link.parentNode.removeChild(link); // Clean up and remove the link
            }}
            type={"light"}
          >
            Download Backing
          </ModalButton> */}
          <ModalButton
            onClick={async () => {
              // Сlose the dialog and return the value
              bgWaveSurfer.stop();
              recWaveSurfer.stop();
              clearTimeout(playbackTimer);
              const result = await Confirm(
                `Are you sure you want to scrap?`,
                props.hasCountdownLatency
                  ? `Scrap Recording`
                  : "Scrap Realignment"
              );
              if (result) {
                console.log("scrapping recording/realignment");
                dialog.close("scrap");
              }
            }}
            type={"danger"}
          >
            {props.hasCountdownLatency
              ? "Scrap Recording"
              : "Scrap Realignment"}
          </ModalButton>
          <ModalButton
            onClick={() => {
              if (isPlaying) {
                bgWaveSurfer.pause();
                recWaveSurfer.pause();
                clearTimeout(playbackTimer);
                clearTimeout(delayPlaybackTimer);
              } else {
                console.log("offset:", dragOffset);

                bgWaveSurfer.params.scrollParent = false;
                recWaveSurfer.params.scrollParent = false;

                bgWaveSurfer.seekTo(0);
                if (props.hasCountdownLatency) {
                  recWaveSurfer.seekAndCenter(3 / recWaveSurfer.getDuration());
                } else {
                  recWaveSurfer.seekTo(0);
                }

                if (dragOffset > 0) {
                  console.log("[recorded early]: user wants to playback later");
                  console.log(latencyMagnitude);
                  setPlaybackTimer(
                    setTimeout(() => {
                      setPlaying(false);
                    }, 7000)
                  );
                  bgWaveSurfer.play(null, 7);
                  setDelayPlaybackTimer(
                    setTimeout(() => {
                      if (props.hasCountdownLatency) {
                        recWaveSurfer.play(3, 10 - latencyMagnitude / 1000);
                      } else {
                        recWaveSurfer.play(0, 7 - latencyMagnitude / 1000);
                      }
                    }, latencyMagnitude)
                  );
                } else if (dragOffset < 0) {
                  console.log(
                    "[recorded late]: user wants to playback earlier"
                  );
                  const latency = -latencyMagnitude;
                  console.log(latency);
                  setPlaybackTimer(
                    setTimeout(() => {
                      setPlaying(false);
                    }, 7000)
                  );
                  bgWaveSurfer.play(null, 7);
                  if (props.hasCountdownLatency) {
                    recWaveSurfer.play(3 + latency / 1000, 10 + latency / 1000);
                  } else {
                    recWaveSurfer.play(latency / 1000, 7 + latency / 1000);
                  }
                } else {
                  setPlaybackTimer(
                    setTimeout(() => {
                      setPlaying(false);
                    }, 7000)
                  );
                  bgWaveSurfer.play(null, 7);
                  if (props.hasCountdownLatency) {
                    recWaveSurfer.play(3, 10);
                  } else {
                    recWaveSurfer.play(null, 7);
                  }
                }
              }
              setPlaying(!isPlaying);
            }}
          >
            {!isPlaying ? "Play" : "Stop"}
          </ModalButton>
          <ModalButton
            onClick={() => {
              // Сlose the dialog and return the value
              bgWaveSurfer.stop();
              recWaveSurfer.stop();
              clearTimeout(playbackTimer);
              console.log("returning value:", latencyMagnitude);
              dialog.close(Math.round(latencyMagnitude));
            }}
          >
            Submit
          </ModalButton>
        </ModalFooter>
      </div>
    </div>
  );
}
