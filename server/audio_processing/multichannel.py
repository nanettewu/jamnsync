import os

from pydub import AudioSegment
from pydub.playback import play

AUDIO_EXTS = ("mp3", "ogg", "wav", "flac", "aac", "aif", "m4a")

'''
Creates a multichannel AudioSegment from a list of audiofiles.

IN: list of audiofile names (str) relative to server/audio_processing directory
OUT: multichannel AudioSegment
'''
def create_multichannel(*args):
  # find audio file with longest length and set each file to mono
  longest_length = 0
  processed_monos = []
  for audiofile_name in args:
    audiofile = AudioSegment.from_file(audiofile_name, format="aiff")
    audio_length = len(audiofile)
    if audio_length > longest_length:
      longest_length = audio_length
    processed_monos.append(audiofile.set_channels(1))

  # match audio file lengths to longest length by adding silence 
  for idx, audiofile in enumerate(processed_monos):
    silence_buffer = max(0, longest_length - len(audiofile))
    processed_monos[idx] = (audiofile + AudioSegment.silent(duration=silence_buffer))[:longest_length]
  
  # return multichannel file
  return AudioSegment.from_mono_audiosegments(*processed_monos)

'''
Exports a multichannel AudioSegment file.
'''
def export_multichannel(audioseg, target_filepath):
  audioseg.export(target_filepath, format="wav") 

if __name__ == "__main__":
  path = "media/kq"
  print(f"reading files from {path}...")
  audiofile_names = [os.path.join(path, f) for f in os.listdir(path) if f.endswith(AUDIO_EXTS)]
  print(f"> found files: {audiofile_names}")
  # audiofile_names = ["media/kq/KillerQueen_bg.wav", "media/kq/KillerQueen_solo.wav"]
  # audiofile_names = ["media/Piano.mf.C4.aiff", "media/Piano.mf.E4.aiff", "media/Piano.mf.G4.aiff", "media/Piano.mf.Bb4.aiff"]
  
  if not audiofile_names:
    print(f"'{path}' does not contain valid audio files", AUDIO_EXTS)
  else:
    print(f"creating multichannel file with {len(audiofile_names)} channels...")
    multichannel = create_multichannel(*audiofile_names)
    print(f"> done!")
    print(f"exporting file to exported_media directory...")
    export_multichannel(multichannel, "exported_media/killerqueen.wav") #TODO: toggle
    print(f"> done!\n")
    play(multichannel)
