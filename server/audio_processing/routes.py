from flask import current_app as app
from flask import request, send_file, jsonify, Response, abort, redirect
from flask_login import current_user, login_required
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_

from http import HTTPStatus
import os
import shortuuid
import datetime
import pytz

from audio_processing.app import db
from audio_processing.aws import list_files, upload_file, download_file, upload_take, delete_take, delete_project
from audio_processing.models import User, RehearsalGroup, group_membership, Project, Track, Take

from pydub import AudioSegment

UPLOAD_FOLDER="audio_processing/s3_uploads"
AUDIO_EXTS = ("mp3", "ogg", "wav", "flac", "aac", "aiff", "m4a")
MEGABYTE = 1024 * 1024
NUM_MEGABYTES = 50
MAX_FILE_LENGTH = NUM_MEGABYTES * MEGABYTE

# https://stackoverflow.com/questions/32237379/python-flask-redirect-to-https-from-http
@app.before_request
def force_https():
    if app.env == "development":
        return
    if request.is_secure:
        return

    url = request.url.replace("http://", "https://", 1)
    code = 301
    return redirect(url, code=code)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.errorhandler(404)
def not_found(e):
    return app.send_static_file('index.html')

############################################################################
# API
############################################################################

####################################
# * Groups
####################################

@app.route('/api/groups', methods=['GET'])
@login_required
def get_all_groups():
    groups = current_user.groups
    return jsonify(groups)

@app.route('/api/group', methods=['POST'])
@login_required
def create_group():
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

@app.route('/api/group', methods=['GET', 'PUT', 'DELETE'])
@login_required
def get_update_delete_group():
    group_id = request.args.get('group_id') if request.method == 'GET' else request.form.get('group_id') 
    if not group_id:
        return abort(HTTPStatus.BAD_REQUEST)
    
    group = RehearsalGroup.query.get(group_id)
    if not group:
        return f"could not find group (id: {group_id})", HTTPStatus.NOT_FOUND
    
    if request.method == 'GET':
        return jsonify(group)
    
    if request.method == 'PUT':
        new_name = request.form.get('new_name')
        if not new_name:
            return abort(HTTPStatus.BAD_REQUEST)   
        old_name = group.group_name
        group.group_name = new_name
        return_message = f"changed group name from '{old_name}' -> '{new_name}'"
   
    elif request.method == 'DELETE': 
        for project in group.projects:
            if project.tracks:
                delete_project(project.project_hash)
        db.session.delete(group)
        return_message = f"deleted group: {group.group_name}"
    
    try:
        db.session.commit()
    except IntegrityError as e:
        print(f"Integrity Error: {e}")
        db.session.rollback()
        return abort(HTTPStatus.BAD_REQUEST)
    
    return jsonify({'message': return_message})    

####################################
# * Group Membership
####################################

@app.route('/api/group/check_membership', methods=['GET'])
@login_required
def check_group_membership():
    group_id = request.args.get('group_id')
    user_id = request.args.get('user_id')
    if not group_id or not user_id:
        return abort(HTTPStatus.BAD_REQUEST)
    
    group = RehearsalGroup.query.get(group_id)
    user = User.query.get(user_id)
    if not group or not user:
        return f"could not find group (id: {group_id}) or user (id: {user_id})", HTTPStatus.NOT_FOUND
    
    return "true" if user in group.users else "false"

@app.route('/api/group/members', methods=['GET'])
@login_required
def get_group_members():
    group_id = request.args.get('group_id')
    if not group_id:
        return abort(HTTPStatus.BAD_REQUEST)
    
    group = RehearsalGroup.query.get(group_id)
    if not group:
        return f"could not find group (id: {group_id}) or user (id: {user_id})", HTTPStatus.NOT_FOUND
    
    user_names_and_ids = group.users.with_entities(User.id, User.user_name).all()
    return jsonify(dict(user_names_and_ids)) # returns dict {id: user name}
    
@app.route('/api/group/members', methods=['POST', 'DELETE'])
@login_required
def add_delete_group_member():
    group_id = request.form.get('group_id')
    user_id = request.form.get('user_id')
    if not group_id or not user_id:
        return abort(HTTPStatus.BAD_REQUEST)
    
    group = RehearsalGroup.query.get(group_id)
    user = User.query.get(user_id)
    if not group or not user:
        return f"could not find group (id: {group_id}) or user (id: {user_id})", HTTPStatus.NOT_FOUND

    if request.method == 'POST':
        if user in group.users:
            return f"user '{user.user_name} is already in group '{group.group_name}'", HTTPStatus.CONFLICT    
        statement = group_membership.insert().values(user_id=user.id, group_id=group.id)
        db.session.execute(statement)
        return_message = f"inserted user '{user.user_name}' into group '{group.group_name}'"
    
    elif request.method == 'DELETE':
        if user not in group.users:  
            return f"user '{user.user_name} is not in group '{group.group_name}'", HTTPStatus.NOT_FOUND
        group.users.remove(user)
        return_message = f"deleted user '{user.user_name}' from group '{group.group_name}'"
        
    try:
        db.session.commit()
    except IntegrityError as e:
        print(f"Integrity Error: {e}")
        db.session.rollback()
        return abort(HTTPStatus.BAD_REQUEST)
    
    return jsonify({'message': return_message})

####################################
# * Project
####################################

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

@app.route('/api/project', methods=['GET', 'PUT', 'DELETE'])
@login_required 
def get_update_delete_project():
    if request.method == 'GET':
        project_id = None
        project_hash = request.args.get('project_hash') 
    else:
        project_id = request.form.get('project_id')
        project_hash = request.form.get('project_hash')
        
    if project_id and project_id.isdigit():
        project = Project.query.get(project_id)
    elif project_hash:
        project = Project.query.filter(Project.project_hash==project_hash).first()
    else:    
        return abort(HTTPStatus.BAD_REQUEST)
    
    if not project:
        return f"could not find project (id: {project_id})", HTTPStatus.NOT_FOUND  
    
    if request.method == 'GET':
        return jsonify({
            'group_id': project.group_id, 
            'id': project.id, 
            'project_hash': project.project_hash, 
            'project_name':project.project_name, 
            'tracks': project.tracks,
            'group': {'group_name': project.group.group_name},
        })
    
    if request.method == 'PUT':
        new_name = request.form.get('new_name')
        if not new_name:
            return "nothing to update"
        old_name = project.project_name
        project.project_name = new_name        
        return_message = f"changed project name from '{old_name}' -> '{new_name}'"
        
    elif request.method == 'DELETE':
        if project.tracks:
            delete_project(project.project_hash)                
        db.session.delete(project)
        return_message = f"deleted project: {project.project_name}"
    
    try:
        db.session.commit()
    except IntegrityError as e:
        print(f"Integrity Error: {e}")
        db.session.rollback()
        return abort(HTTPStatus.BAD_REQUEST)
    
    return jsonify({'message': return_message})

####################################
# * Track
####################################

@app.route('/api/track', methods=['POST'])
@login_required
def create_new_track():
    track_name = request.form.get('track_name')
    project_id = request.form.get('project_id')
    is_backing = True if request.form.get('is_backing') == "true" else False
    track = Track(
        track_name=track_name,
        project_id=project_id,
        is_backing=is_backing,
    )
    db.session.add(track)
    try:
        db.session.commit()
    except IntegrityError as e:
        print(f"Integrity Error: {e}")
        db.session.rollback()
        return abort(HTTPStatus.BAD_REQUEST)
    return jsonify({'message': f"created new track: {track_name}", 'track_id': f"{track.id}"}), HTTPStatus.CREATED

@app.route('/api/track', methods=['GET', 'PUT', 'DELETE'])
@login_required
def get_update_delete_track():
    track_id = request.args.get('track_id') if request.method == 'GET' else request.form.get('track_id')
    if not track_id or (track_id and not track_id.isdigit()):
        return abort(HTTPStatus.BAD_REQUEST)
    track = Track.query.get(track_id)
    if not track:
        return f"could not find track (id: {track_id})", HTTPStatus.NOT_FOUND
    
    if request.method == 'GET':
        return jsonify(track)
    
    if request.method == 'PUT':
        new_track_name = request.form.get('new_name')
        new_is_backing = True if request.form.get('is_backing') == "true" else False
        if not new_track_name and not new_is_backing:
            return "nothing to update"
        
        return_message = "updated track: "
        if new_track_name:
            old_name = track.track_name
            track.track_name = new_track_name
            return_message += f"name ({old_name} -> {new_track_name}) "
        if new_is_backing:
            track.is_backing = new_is_backing
            return_message += f"is backing ({not new_is_backing} -> {new_is_backing})"
    
    elif request.method == 'DELETE':
        if track.takes:
            for take in track.takes:
                url = take.s3_info
                take_filepath = url.split("/projects/")[1]
                delete_take(take_filepath)   
        db.session.delete(track)
        return_message = f"deleted track: {track.track_name}"
    
    try:
        db.session.commit()
    except IntegrityError as e:
        print(f"Integrity Error: {e}")
        db.session.rollback()
        return abort(HTTPStatus.BAD_REQUEST)
    
    return jsonify({'message': return_message}) 

####################################
# * Take
####################################

@app.route('/api/take', methods=['POST'])
@login_required
def create_take():
    track_id = request.form.get('track_id')
    buffer_duration = int(request.form.get('latency')) if request.form.get('latency') else 0
    print("buffer duration", buffer_duration)
    if not track_id or (track_id and not track_id.isdigit()) or ('file' not in request.files):
        return abort(HTTPStatus.BAD_REQUEST)
    track = Track.query.get(track_id)
    if not track:
        return f"could not find track (id: {track_id})", HTTPStatus.NOT_FOUND
    
    # file validation: verify file exists + is valid audio file
    f = request.files['file']
    if not f:
        return "no file to upload", HTTPStatus.BAD_REQUEST
    filename = f.filename
    if not filename.endswith(AUDIO_EXTS):
        return f"please upload a valid audio file of type {AUDIO_EXTS}", HTTPStatus.BAD_REQUEST
    
    # save file, verify audio file is appropriately sized (under 50 MB)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    f.save(os.path.join(UPLOAD_FOLDER, filename))
    file_length = os.stat(filepath).st_size
    if file_length > MAX_FILE_LENGTH:
        os.remove(filepath) # don't save file
        return f"file exceeds {NUM_MEGABYTES}B", HTTPStatus.REQUEST_ENTITY_TOO_LARGE

    # TODO: adds buffer to audio track if not a backing track
    song = AudioSegment.from_file(filepath)
    if buffer_duration == 0:
        buffered_song = AudioSegment.silent(duration=buffer_duration) + song
    else:
        # delta = buffer_duration
        delta = buffer_duration - 3000 # to account for 3 second count down
        if delta < 0:
            buffered_song = song[(-1 * delta):] # cut into the song (play earlier)
        else:
            buffered_song = AudioSegment.silent(duration=delta) + song # add silence (play later)
    buffered_song.export(filepath, format="mp3") 

    # upload to s3
    project_hash = track.project.project_hash
    track_name = track.track_name
    new_take_number = 1
    for take in track.takes:
        if int(take.take) >= new_take_number:
            new_take_number = int(take.take) + 1
    
    current_time = datetime.datetime.now(datetime.timezone.utc)
    s3_info = upload_take(filename, project_hash, track_id, new_take_number, current_time)
    if not s3_info:
        os.remove(filepath) # don't save file
        return f"no take URL found", HTTPStatus.BAD_REQUEST
    
    # add new take to database
    new_take = Take(
        track_id=track_id,
        take=new_take_number,
        s3_info=s3_info,
        date_uploaded=current_time,
        latency_ms=buffer_duration,
    )
    db.session.add(new_take)
    try:
        db.session.commit()
        os.remove(filepath) 
    except IntegrityError as e:
        print(f"Integrity Error: {e}")
        os.remove(filepath) # don't save file
        db.session.rollback()
        return abort(HTTPStatus.BAD_REQUEST)
    return jsonify({'message': f"created take #{new_take_number} for track id {track_id}", 'take_id': f"{new_take.id}", 'take': f"{new_take_number}", 's3_info': f"{s3_info}", 'timestamp': f"{current_time}"}), HTTPStatus.CREATED

@app.route('/api/take', methods=['GET', 'DELETE'])
@login_required
def get_and_delete_take():
    take_id = request.args.get('take_id') if request.method == 'GET' else request.form.get('take_id')
    if not take_id or (take_id and not take_id.isdigit()):
        return abort(HTTPStatus.BAD_REQUEST)
    take = Take.query.get(take_id)
    if not take:
        return f"could not find take (id: {take_id})", HTTPStatus.NOT_FOUND
    
    if request.method == 'GET':
        return jsonify(take)
    elif request.method == 'DELETE':
        url = take.s3_info
        take_filepath = url.split("/projects/")[1]
        db.session.delete(take)
        try:
            db.session.commit()
        except IntegrityError as e:
            print(f"Integrity Error: {e}")
            db.session.rollback()
            return abort(HTTPStatus.BAD_REQUEST)
        delete_take(take_filepath) # delete from S3
        return jsonify({'message': f"deleted take #{take.take} of track id {take.track_id}"})
    