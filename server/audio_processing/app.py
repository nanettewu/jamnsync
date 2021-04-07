import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy 
from flask_migrate import Migrate
from flask_login import LoginManager
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
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get("SECRET_KEY")

db = SQLAlchemy(app)
migrate = Migrate(app, db)
login_manager = LoginManager()
login_manager.init_app(app)

from audio_processing.models import User, RehearsalGroup, group_membership, Project, Track, Take

with app.app_context():
  from . import routes, auth

