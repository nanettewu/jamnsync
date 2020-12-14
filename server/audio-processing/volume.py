from pydub import AudioSegment
from pydub.playback import play

import argparse

'''
using pydub: simple audio processing
- load + save different types of audio files
- easy interface to split/append audio
- easy layering/mixing
- change audio leveels
- simple filters (e.g. lowpass filter)
- generate tones

downside: not very efficient, pure python implementation
- instead, PySoX: python wrapper around sox (Sound eXchange)
- https://github.com/rabitt/pysox
'''

def main():
  parser = argparse.ArgumentParser()
  parser.add_argument("--duration", "-d", default=5, help="duration in seconds")
  parser.add_argument("--volume", "-v", default=0, help="volume in dB")
  parser.add_argument("--speed", "-s", default=1, help="speed as a multiplier")
  parser.add_argument("--mixed", "-m", default="false", help="mixing tracks")
  args = parser.parse_args()

  snippet_duration = int(args.duration) * 1000
  volume = float(args.volume)
  mixed = True if args.mixed.lower() == "true" else False
  speed = float(args.speed)

  song = AudioSegment.from_file("gersh.wav")
  snippet = song[:snippet_duration].fade_out(1000) + volume
  
  if speed != 1:
    print(f"changing speed by {speed}x")
    snippet = speed_change(snippet, speed)
  if mixed:
    print("layering mixed track")
    snippet = snippet.overlay(song[1000:snippet_duration+1000].fade_out(1000) + volume)

  play(snippet)

# example: https://stackoverflow.com/questions/51434897/how-to-change-audio-playback-speed-using-pydub
def speed_change(sound, speed=1.0):
    # Manually override the frame_rate. This tells the computer how many
    # samples to play per second
    sound_with_altered_frame_rate = sound._spawn(sound.raw_data, overrides={
         "frame_rate": int(sound.frame_rate * speed)
      })
     # convert the sound with altered frame rate to a standard frame rate
     # so that regular playback programs will work right. They often only
     # know how to play audio at standard frame rate (like 44.1k)
    return sound_with_altered_frame_rate.set_frame_rate(sound.frame_rate)

if __name__ == "__main__":
  main()