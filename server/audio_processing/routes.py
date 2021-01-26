import os
from flask import current_app as app
from flask import request, send_file, jsonify, Response

from audio_processing.app import db
from audio_processing.aws import list_files, upload_file, download_file
from audio_processing.models import User, RehearsalGroup, group_membership, Project, Track, Take

UPLOAD_FOLDER="audio_processing/s3_uploads"
BUCKET="jamnsync"

@app.route('/')
def entry_point():
    return 'Hello World!'

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

##################################################
# API
##################################################

# TODO
@app.route('/api/accounts', methods=['POST'])
def register_user():
    google_auth_id = request.args.get('google_auth_id')
    if not google_auth_id:
        return "need valid google account"
        
    user = User.query.filter_by(google_auth_id=google_auth_id).first()
    if user:
        output = {'message': 'User already registered'}
        return Response(
            mimetype="application/json",
            response=jsonify(output),
            status=409 # already exists
        )  
        
    user_name = request.args.get('user_name')
    google_email = request.args.get('google_email')
    if not user_name:
        return "need non-empty user name"
    if not google_email or not google_email.endswith("@gmail.com"):
        return "needs to be a valid gmail email"
    
    user = User(
        user_name=user_name,
        google_email=google_email,
        google_auth_id=google_auth_id,
    )
    db.session.add(user)
    db.session.commit()
    output = {'msg': 'posted'}
    response = Response(
        mimetype="application/json",
        response=jsonify(output),
        status=201
    )
    return response
        
# TODO
@app.route('/api/accounts/<user_name>', methods=['GET'])
def get_user(user_name):
    user = User.query.filter_by(user_name=user_name).first()
    if user:
        user_info = {
            'name': user.user_name,
            'email': user.google_email,
            'id': user.google_auth_id,
        }
        return jsonify(user_info)
    return f"could not find user: {user_name}"

@app.route('/api/groups', methods=['POST'])
def create_group():
    group_name = request.args.get('name')
    group = RehearsalGroup.query.filter_by(group_name=group_name).first()
    
    if group:
        output = {'message': 'Group with that name already exists'}
        return Response(
            mimetype="application/json",
            response=jsonify(output),
            status=409 # already exists
        )  
        
    group = RehearsalGroup(
        group_name=group_name
    )
    db.session.add(group)
    db.session.commit()
    output = {'msg': 'posted'}
    response = Response(
        mimetype="application/json",
        response=jsonify(output),
        status=201
    )
    return response