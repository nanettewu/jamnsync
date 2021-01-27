from audio_processing.app import db

from datetime import datetime

'''
usage of sqlalchemy

db.session.add(User(user_name="temp"))
db.session.commit()

db.Model has helper methods to let you query database
ex: User.query.all(), then you can loop over them
ex: User.query.filter_by(id=3).first()

table name automatically set from db.Model
  --> converted from CamelCase to camel_case
  --> can use __tablename__ = "name" to override
'''

class User(db.Model):
  id = db.Column(db.Integer, primary_key=True)
  user_name = db.Column(db.String, nullable=False)
  google_email = db.Column(db.String, unique=True, nullable=False)
  google_auth_id = db.Column(db.String, unique=True, nullable=False)

class RehearsalGroup(db.Model):
  id = db.Column(db.Integer, primary_key=True)
  group_name = db.Column(db.String, unique=True, nullable=False)
  projects = db.relationship('Project', backref='rehearsal_group', lazy=True) # one-to-many

# many-to-many 
group_membership = db.Table('group_membership',
  db.Column('user_id', db.Integer, db.ForeignKey('user.id')),
  db.Column('group_id', db.Integer, db.ForeignKey('rehearsal_group.id')),
)

class Project(db.Model):
  id = db.Column(db.Integer, primary_key=True)
  project_name = db.Column(db.String, unique=True, nullable=False)
  group_id = db.Column(db.Integer, db.ForeignKey('rehearsal_group.id'))
  tracks = db.relationship('Track', backref='project', lazy=True) # one-to-many

class Track(db.Model):
  id = db.Column(db.Integer, primary_key=True)
  track_name = db.Column(db.String)
  project_id = db.Column(db.Integer, db.ForeignKey('project.id'))
  takes = db.relationship('Take', backref='track', lazy=True) # one-to-many

class Take(db.Model):
  id = db.Column(db.Integer, primary_key=True)
  track_id = db.Column(db.Integer, db.ForeignKey('track.id'))
  take = db.Column(db.Integer, nullable=False)
  s3_info = db.Column(db.String, unique=True, nullable=False)
  date_uploaded = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
