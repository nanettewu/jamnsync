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

export default function AlignRecordingModalContent(props) {
  const dialog = useDialog();

  const [isPlaying, setPlaying] = useState(false);
  const [playbackTimer, setPlaybackTimer] = useState(null);
  const [delayPlaybackTimer, setDelayPlaybackTimer] = useState(null);
  const [bgWaveSurfer, setBgWaveSurfer] = useState(null);
  const [recWaveSurfer, setRecWaveSurfer] = useState(null);
  const [loadedAudio, setLoadedAudio] = useState(false);
  const [mixedBackingTrackURL, setMixedBackingTrackURL] = useState(null);

  const [dragOffset, setDragOffset] = useState(0);
  const [latencyMagnitude, setLatencyMagnitude] = useState(0);

  const onStopDrag = useCallback((_, position) => {
    console.log("stopped:", position.x);
    const latency = 12.5053 * position.x + 7.3617;
    console.log(latency);
    setDragOffset(position.x);
    setLatencyMagnitude(latency);
  }, []);

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
      let nonRecordedTrackURLs = Object.keys(props.trackMetadata)
        .filter((trackId) => {
          // only include unmuted tracks that are: 1) not the recorded track and 2) have recordings
          return (
            trackId !== props.recordedTrackId &&
            !props.mutedTracks.includes(trackId) &&
            Object.keys(props.trackMetadata[trackId].takes).length > 0
          );
        })
        .map((trackId) => {
          // TODO: made executive decision to just pick latest track, but eventually need to fix how take state is stored so DAW Object can access it
          const takeId = Object.keys(props.trackMetadata[trackId].takes).pop();
          const audio_url =
            props.trackMetadata[trackId].takes[takeId].s3_info +
            "?cacheblock=true";
          console.log("audio url:" + audio_url);
          return audio_url;
        });
      console.log(
        "audio alignment tool: # tracks stacked together = " +
          nonRecordedTrackURLs.length
      );
      // only combine audio if necessary
      if (nonRecordedTrackURLs.length > 1) {
        console.log("using crunker to combine recordings");
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
            setMixedBackingTrackURL(output.url);
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
        setMixedBackingTrackURL(nonRecordedTrackURLs[0]);
        bgWaveSurfer.load(nonRecordedTrackURLs[0]);
        recWaveSurfer.load(props.recordedURL);

        bgWaveSurfer.setVolume(0.3); // TODO
        recWaveSurfer.setVolume(0.3);

        bgWaveSurfer.zoom(80);
        recWaveSurfer.zoom(80);
        setLoadedAudio(true);
      }
    }
  }, [bgWaveSurfer, recWaveSurfer, loadedAudio, props]); // TODO check

  return (
    <div className="outerDiv">
      <div>
        <Draggable axis="x" bounds={{ left: -285, right: 285 }}>
          <div className="cursor">
            <div className="point" />
            <div className="startLine" />
          </div>
        </Draggable>
        <ModalContent>
          {!loadedAudio ? (
            <LoadingGif text={"Preparing alignment tool..."} />
          ) : (
            <p>
              Drag your recording left/right to align it, and move the cursor
              like a ruler to align peaks!
            </p>
          )}
          <p>
            <b>Backing Tracks</b>
          </p>
          <div id="bg_waveform"></div>
          <p>
            <b>Recording</b>
          </p>
          <Draggable axis="x" onStop={onStopDrag}>
            <div id="rec_waveform" style={{ marginLeft: "-240px" }}></div>
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
                `Are you sure you want to scrap this recording?`,
                "Scrap Recording"
              );
              if (result) {
                console.log("scrapping recording");
                dialog.close("scrap");
              }
            }}
            type={"danger"}
          >
            Scrap Recording
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
                recWaveSurfer.seekAndCenter(3 / recWaveSurfer.getDuration());

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
                      recWaveSurfer.play(3, 10 - latencyMagnitude / 1000);
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
                  recWaveSurfer.play(3 + latency / 1000, 10 + latency / 1000);
                } else {
                  setPlaybackTimer(
                    setTimeout(() => {
                      setPlaying(false);
                    }, 7000)
                  );
                  bgWaveSurfer.play(null, 7);
                  recWaveSurfer.play(3, 10);
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
