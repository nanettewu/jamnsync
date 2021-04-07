import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy 
from flask_migrate import Migrate
from flask_login import LoginManager
import configparser
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env'))

app = Flask(__name__, static_folder="../build", static_url_path='/')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get("SECRET_KEY")

db = SQLAlchemy(app)
migrate = Migrate(app, db)
login_manager = LoginManager()
login_manager.init_app(app)

from audio_processing.models import User, RehearsalGroup, group_membership, Project, Track, Take

with app.app_context():
  from . import routes, auth

