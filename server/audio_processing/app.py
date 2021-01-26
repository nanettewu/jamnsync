import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy 
from flask_migrate import Migrate
import configparser


config = configparser.ConfigParser()
config.read('database.ini')

DATABASE_URI = 'postgresql+psycopg2://{dbuser}:{dbpass}@{dbhost}/{dbname}'.format(
    dbuser=config['postgres']['user'],
    dbpass=config['postgres']['password'],
    dbhost=config['postgres']['host'],
    dbname=config['postgres']['database']
)

app = Flask(__name__)
app.config.update(
    SQLALCHEMY_DATABASE_URI=DATABASE_URI,
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
)

db = SQLAlchemy(app)
migrate = Migrate(app, db)

from audio_processing.models import User, RehearsalGroup, group_membership, Project, Track, Take

with app.app_context():
  from . import routes

# @app.route('/')
# def entry_point():
#     return 'Hello World!'

# @app.route('/test')
# def test():
#   return {"test": "/test successful!"}

# # lists all files in s3 bucket
# @app.route("/storage")
# def storage():
#   contents = list_files(BUCKET)
#   return str(contents)

# # uploads file to upload/ directory in s3 bucket
# @app.route('/upload',methods=['post'])
# def upload():
#     if request.method == 'POST':
#       f = request.files['file']
#       filename = f.filename
#       f.save(os.path.join(UPLOAD_FOLDER, filename))
#       upload_file(filename, BUCKET)
#       return f"Uploaded file: {filename}"

# # downloads file from s3 bucket
# @app.route('/download/<filename>',methods=['get'])
# def download(filename):
#     if request.method == 'GET':
#       output = download_file(filename, BUCKET)
#       # send file destination relative to audio_processing dir
#       return send_file(output, as_attachment=True)
