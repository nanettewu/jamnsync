from flask import current_app as app
from flask import request, send_file, jsonify, Response, abort
from flask_login import current_user, login_required
from sqlalchemy.exc import IntegrityError

from http import HTTPStatus
import os
import shortuuid

from audio_processing.app import db
from audio_processing.aws import list_files, upload_file, download_file
from audio_processing.models import User, RehearsalGroup, group_membership, Project, Track, Take

UPLOAD_FOLDER="audio_processing/s3_uploads"
BUCKET="jamnsync"

# helpful: https://opensource.com/article/18/4/flask

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

@app.route('/api/current_user', methods=['GET'])
@login_required
def get_user_info():
    return jsonify({"user_name": current_user.user_name}), HTTPStatus.OK

@app.route('/api/groups', methods=['GET'])
@login_required
def get_all_groups():
    groups = current_user.groups
    return jsonify(groups)

@app.route('/api/group', methods=['POST'])
@login_required
def create_new_group():
    group_name = request.form.get('group_name')
    if not group_name:
        group_name = f"{current_user}'s Group"
        
    group = RehearsalGroup(
        group_name=group_name,
    )
    db.session.add(group)
    db.session.flush()
    statement = group_membership.insert().values(user_id=current_user.id, group_id=group.id)
    db.session.execute(statement)
    try:
        db.session.commit()
    except IntegrityError as e:
        print(f"Integrity Error: {e}")
        db.session.rollback()
        return abort(HTTPStatus.BAD_REQUEST)

    return jsonify({'message': f"created new group: {group_name}", 'group_id': f"{group.id}"}), HTTPStatus.CREATED

@app.route('/api/project', methods=['POST'])
@login_required
def create_new_project():
    project_name = request.form.get('project_name')
    group_id = request.form.get('group_id')
    project = Project(
        project_name=project_name,
        group_id=group_id,
        project_hash=shortuuid.uuid(),
    )
    db.session.add(project)
    try:
        db.session.commit()
    except IntegrityError as e:
        print(f"Integrity Error: {e}")
        db.session.rollback()
        return abort(HTTPStatus.BAD_REQUEST)
    return jsonify({'message': f"created new project: {project_name}", 'project_id': f"{project.id}", 'project_hash': f"{project.project_hash}"}), HTTPStatus.CREATED
