from dataclasses import dataclass
from datetime import datetime
from flask_login import UserMixin
from sqlalchemy.sql import expression

from audio_processing.app import db

# many-to-many 
group_membership = db.Table('group_membership',
  db.Column('user_id', db.Integer, db.ForeignKey('user.id')),
  db.Column('group_id', db.Integer, db.ForeignKey('rehearsal_group.id')),
)

@dataclass
class Take(db.Model):
  id: int
  track_id: int
  take: int
  s3_info: str
  date_uploaded: datetime
  
  id = db.Column(db.Integer, primary_key=True)
  track_id = db.Column(db.Integer, db.ForeignKey('track.id'))
  take = db.Column(db.Integer, nullable=False)
  s3_info = db.Column(db.String, unique=True, nullable=False)
  date_uploaded = db.Column(db.DateTime, nullable=False, default=datetime.now)

@dataclass
class Track(db.Model):
  id: int
  track_name: str
  project_id: int
  takes: Take
  is_backing: bool
  
  id = db.Column(db.Integer, primary_key=True)
  track_name = db.Column(db.String)
  project_id = db.Column(db.Integer, db.ForeignKey('project.id'))
  takes = db.relationship('Take', backref='track', cascade="all,delete", lazy=True) # one-to-many
  is_backing = db.Column(db.Boolean, server_default=expression.false(), nullable=False)

@dataclass
class Project(db.Model):
  id: int
  project_name: str
  group_id: int
  project_hash: str
  tracks: Track
  
  id = db.Column(db.Integer, primary_key=True)
  project_name = db.Column(db.String, unique=True, nullable=False)
  group_id = db.Column(db.Integer, db.ForeignKey('rehearsal_group.id'))
  tracks = db.relationship('Track', backref='project', cascade="all,delete", lazy=True) # one-to-many
  project_hash = db.Column(db.String, unique=True, nullable=False)
  
@dataclass
class RehearsalGroup(db.Model):
  id: int
  group_name: str
  projects: Project
  
  id = db.Column(db.Integer, primary_key=True)
  group_name = db.Column(db.String, unique=True, nullable=False)
  projects = db.relationship('Project', cascade="all,delete", backref='group') # one-to-many
  users = db.relationship('User', secondary=group_membership, lazy="dynamic")
  
@dataclass
class User(db.Model, UserMixin):
  id: int
  user_name: str
  google_email: str
  google_auth_id: str
  groups: RehearsalGroup
  
  id = db.Column(db.Integer, primary_key=True)
  user_name = db.Column(db.String, nullable=False)
  google_email = db.Column(db.String, unique=True, nullable=False)
  google_auth_id = db.Column(db.String, unique=True, nullable=False)
  groups = db.relationship('RehearsalGroup', secondary=group_membership)

  def __repr__(self):
    return f"User ID #{self.id}: {self.user_name} | {self.google_email}"

