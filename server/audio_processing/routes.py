import os
from flask import current_app as app
from flask import request, send_file

from audio_processing.aws import list_files, upload_file, download_file

UPLOAD_FOLDER="audio_processing/s3_uploads"
BUCKET="jamnsync"

@app.route('/')
def entry_point():
    return 'Hello World!'

@app.route('/test')
def test():
  return {"test": "/test successful!"}

# lists all files in s3 bucket
@app.route("/storage")
def storage():
  contents = list_files(BUCKET)
  return str(contents)

# uploads file to upload/ directory in s3 bucket
@app.route('/upload',methods=['post'])
def upload():
    if request.method == 'POST':
      f = request.files['file']
      filename = f.filename
      f.save(os.path.join(UPLOAD_FOLDER, filename))
      upload_file(filename, BUCKET)
      return f"Uploaded file: {filename}"

# downloads file from s3 bucket
@app.route('/download/<filename>',methods=['get'])
def download(filename):
    if request.method == 'GET':
      output = download_file(filename, BUCKET)
      # send file destination relative to audio_processing dir
      return send_file(output, as_attachment=True)
