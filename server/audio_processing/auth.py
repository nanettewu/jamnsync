from flask import current_app as app
from flask import request, jsonify
from flask_login import login_user, logout_user, login_required, current_user

from sqlalchemy.exc import IntegrityError
from http import HTTPStatus

from audio_processing.models import User
from audio_processing.app import db, login_manager

@login_manager.user_loader
def load_user(id):
    return User.query.filter_by(id=id).first()

@app.route('/auth/login',  methods=['POST'])
def login():
  google_auth_id = request.form.get('google_auth_id')
  if not google_auth_id:
    return "need valid google account", HTTPStatus.BAD_REQUEST
  
  google_email = request.form.get('google_email')
  if not google_email:
    return "needs valid email", HTTPStatus.BAD_REQUEST

  user = User.query.filter_by(google_auth_id=google_auth_id, google_email=google_email).first()
  if user:
    print("logging in user:", user)
    login_user(user)
    return jsonify({'message': f"logging in existing user: {user.user_name}"}), HTTPStatus.OK

  user_name = request.form.get('user_name')
  if not user_name:
    return jsonify({'error': 'need non empty user name'}), HTTPStatus.BAD_REQUEST
  
  # otherwise, create this user
  user = User(
    user_name=user_name,
    google_email=google_email,
    google_auth_id=google_auth_id,
  )
  db.session.add(user)
  try:
    db.session.commit()
  except IntegrityError:
    db.session.rollback()
    return jsonify({'error': 'malicious attempt to create user - user already exists'}), HTTPStatus.BAD_REQUEST

  login_user(user)
  return jsonify({'message': 'created new user'}), HTTPStatus.CREATED

@app.route('/auth/logout',  methods=['POST'])
@login_required
def logout():
  logout_user()
  return jsonify({'message': 'user logged out'}), HTTPStatus.OK
