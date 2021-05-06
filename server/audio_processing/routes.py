from flask import current_app as app
from flask import request, send_file, jsonify, Response, abort, redirect
from flask_login import current_user, login_required
from flask_socketio import join_room, leave_room
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_

from http import HTTPStatus
import os
import shortuuid
import datetime
import pytz

from audio_processing.app import db, socketio
from audio_processing.aws import upload_take, delete_take, delete_project
from audio_processing.models import User, RehearsalGroup, group_membership, Project, Track, Take

from pydub import AudioSegment

UPLOAD_FOLDER="s3_uploads"
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
# Socket.IO
############################################################################

prepared_play_by_room = {}
prepared_record_by_room = {}
all_clients_by_room = {}
client_names = {}
    
@socketio.on('connect')
def connected():
    print('[SOCKET.IO] client connected', request.sid)
        
@socketio.on('disconnect')
def disconnected():
    print('[SOCKET.IO] client disconnected', request.sid)
    if request.sid in client_names:
        del client_names[request.sid]
        
    for room in list(prepared_play_by_room):
        if request.sid in prepared_play_by_room[room]:
            print("[SOCKET.IO] > removing client from prepared play | room", room)
            prepared_play_by_room[room].remove(request.sid)
        if len(prepared_play_by_room[room]) == 0:
            del prepared_play_by_room[room]
    
    for room in list(prepared_record_by_room):
        if request.sid in prepared_record_by_room[room]:
            print("[SOCKET.IO] > removing client from prepared record | room", room)
            prepared_record_by_room[room].remove(request.sid)
        if len(prepared_record_by_room[room]) == 0:
            del prepared_record_by_room[room]
        
    for room in list(all_clients_by_room):
        if request.sid in all_clients_by_room[room]:
            print("[SOCKET.IO] > removing client from all | room", room)
            all_clients_by_room[room].remove(request.sid)
        # reset memoizing of room if no more clients left
        if len(all_clients_by_room[room]) == 0:
            del all_clients_by_room[room]
    print('[SOCKET.IO] all clients left:' + str(all_clients_by_room))
    
@socketio.on('join project')
def join_project(data):
    username = data['user']
    room = data['channel']
    client_names[request.sid] = username
    print('###############################')
    print(f"[SOCKET.IO] JOIN: {username} has joined the project")
    if not room in all_clients_by_room:
        all_clients_by_room[room] = set()
    all_clients_by_room[room].add(request.sid)
    print('[SOCKET.IO] updated all clients by room:' + str(all_clients_by_room))
    print('###############################')
    join_room(room)
    if len(all_clients_by_room[room]) > 1:
        user_list = []
        for user_id in all_clients_by_room[room]:
            if user_id in client_names:
                user_list.append(client_names[user_id])
        print("[SOCKET.IO] emit online users: " + str(user_list))
        user_list.sort()
        socketio.emit('updateOnlineUsers', {'user_list': user_list}, to=room)

@socketio.on('leave project')
def leave_project(data):
    username = data['user']
    room = data['channel']
    if room in all_clients_by_room and request.sid in all_clients_by_room[room]:
        print('###############################')
        print(f"[SOCKET.IO] LEAVE: {username} has left the project")
        all_clients_by_room[room].remove(request.sid)
        leave_room(room)
        user_list = []
        for user_id in all_clients_by_room[room]:
            user_list.append(client_names[user_id])
        print("[SOCKET.IO] emit online users: " + str(user_list))
        user_list.sort()
        socketio.emit('updateOnlineUsers', {'user_list': user_list}, to=room)
        
        # clean up
        if len(all_clients_by_room[room]) == 0:
            del all_clients_by_room[room]
        
    print('[SOCKET.IO] updated all clients by room: ' + str(all_clients_by_room))
    print('###############################')

@socketio.on('prepare group play')
def prepare_group_play(data):
    print('[SOCKET.IO] received request to group play: ' + str(data))
    room = data['channel']
    if room not in prepared_play_by_room:  
        prepared_play_by_room[room] = set()
    prepared_play_by_room[room].add(request.sid)
    # if all clients are ready to play
    print('[SOCKET.IO] prepared clients: ' + str(prepared_play_by_room[room]))
    print('[SOCKET.IO] all clients: ' + str(all_clients_by_room[room]))
    if prepared_play_by_room[room] == all_clients_by_room[room]: 
        del prepared_play_by_room[room]
        print("[SOCKET.IO] emit group play")
        socketio.emit('beginGroupPlay', to=room)
        return True
    
    print("[SOCKET.IO] not ready to play yet")
    socketio.emit('updateNumPrepared', {'num_prepared':len(prepared_play_by_room[room]), 'num_total':len(all_clients_by_room[room])}, to=room )
    return False

@socketio.on('immediate group stop')
def immediate_group_stop(data):
    user = data["user"]
    room = data["channel"]
    print(f"[SOCKET.IO] received request to immediately stop from {user} to {room}")
    print("[SOCKET.IO] emit group stop")
    socketio.emit('beginGroupStop', {'stopped_by': user}, to=room)
    
@socketio.on('cancel request')
def cancel_request(data):
    room = data["channel"]
    if room in prepared_play_by_room and request.sid in prepared_play_by_room[room]:
        prepared_play_by_room[room].remove(request.sid)
        socketio.emit('updateNumPrepared', {'num_prepared':len(prepared_play_by_room[room]), 'num_total':len(all_clients_by_room[room])}, to=room )
    elif room in prepared_play_by_room and request.sid in prepared_play_by_room[room]:
        prepared_record_by_room[room].remove(request.sid)
        socketio.emit('updateNumPrepared', {'num_prepared':len(prepared_record_by_room[room]), 'num_total':len(all_clients_by_room[room])}, to=room )
    print(f"[SOCKET.IO] cancelling request for {request.sid} in project {room}")
    return True

@socketio.on('prepare group record')
def prepare_group_record(data):
    print('[SOCKET.IO] received request to group record: ' + str(data))
    room = data['channel']
    if room not in prepared_record_by_room:  
        prepared_record_by_room[room] = set()
    prepared_record_by_room[room].add(request.sid)
    # if all clients are ready to record
    print('[SOCKET.IO] prepared clients: ' + str(prepared_record_by_room[room]))
    print('[SOCKET.IO] all clients: ' + str(all_clients_by_room[room]))
    if prepared_record_by_room[room] == all_clients_by_room[room]: 
        del prepared_record_by_room[room]
        print("[SOCKET.IO] emit group record")
        socketio.emit('beginGroupRecord', room=room)
        return True
    
    print("[SOCKET.IO] not ready to record yet")
    socketio.emit('updateNumPrepared', {'num_prepared':len(prepared_record_by_room[room]), 'num_total':len(all_clients_by_room[room])}, to=room )
    return False

@socketio.on('broadcast update groups')
def broadcast_update_groups():
    print('[SOCKET.IO] received broadcast update groups')
    print("[SOCKET.IO] emit updateGroups for Groups page")
    socketio.emit('updateGroups', {'data': ''})
    
@socketio.on('broadcast update projects')
def broadcast_update_projects():
    print('[SOCKET.IO] received broadcast update projects')
    print("[SOCKET.IO] emit updateProjects for Projects page")
    socketio.emit('updateProjects', {'data': ''})
    
@socketio.on('broadcast update project')
def broadcast_update_project(data):
    room = data["channel"]
    print(f"[SOCKET.IO] received broadcast update project for {room}")
    print("[SOCKET.IO] emit updateProject for DAW page")
    socketio.emit('updateProject', {'data': ''}, room=room)

############################################################################
# API
############################################################################

####################################
# * Users
####################################

@app.route('/api/users', methods=['GET'])
@login_required
def get_all_users():
    user_id_to_names = {}
    users = User.query.all()
    for user in users:
        user_id_to_names[user.id] = user.user_name
    return jsonify(user_id_to_names)

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
    
    user_name_and_ids = {}
    for user in group.users:
        user_name_and_ids[user.id] = user.user_name
    return jsonify(user_name_and_ids) # returns dict {id: user name}
    
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
    user_timezone_offset = -1 * int(request.form.get('tz_offset')) if request.form.get('tz_offset') else 0
    is_manual_upload = True if request.form.get('is_manual_upload') and request.form.get('is_manual_upload') == 'true' else False
    
    print("is manual upload req val:",request.form.get('is_manual_upload'),", actual:", is_manual_upload)
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
    base_dir = os.path.dirname(os.path.realpath(__file__))
    filepath = os.path.join(base_dir, UPLOAD_FOLDER, filename)
    f.save(filepath)
    file_length = os.stat(filepath).st_size
    if file_length > MAX_FILE_LENGTH:
        os.remove(filepath) # don't save file
        return f"file exceeds {NUM_MEGABYTES}B", HTTPStatus.REQUEST_ENTITY_TOO_LARGE

    # TODO: adds buffer to audio track if not a backing track
    extension = filepath.rsplit('.')[1]
    print(f"fixing audio trimming for path: {filepath} with extension '{extension}'")
    song = AudioSegment.from_file(filepath, extension)
    # don't trim audio if track is already aligned
    if is_manual_upload:
        delta = 0
    else:
        delta = buffer_duration - 3000 # to account for 3 second count down
    
    # determine how much latency to add or subtract
    if delta < 0:
        buffered_song = song[(-1 * delta):] # cut into the song (play earlier)
    else:
        buffered_song = AudioSegment.silent(duration=delta) + song # add silence (play later)
    
    buffered_song.export(filepath, format="mp3", bitrate="320k") 

    # upload to s3
    project_hash = track.project.project_hash
    track_name = track.track_name
    new_take_number = 1
    for take in track.takes:
        if int(take.take) >= new_take_number:
            new_take_number = int(take.take) + 1
    
    current_time_utc = datetime.datetime.now(datetime.timezone.utc)
    tzinfo = datetime.timezone(datetime.timedelta(hours=user_timezone_offset))
    current_time_user_timezone = datetime.datetime.now(tzinfo)
    s3_info = upload_take(filename, project_hash, track_id, new_take_number, current_time_user_timezone)
    if not s3_info:
        os.remove(filepath) # don't save file
        return f"no take URL found", HTTPStatus.BAD_REQUEST
    
    # add new take to database
    new_take = Take(
        track_id=track_id,
        take=new_take_number,
        s3_info=s3_info,
        date_uploaded=current_time_utc,
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
    return jsonify({'message': f"created take #{new_take_number} for track id {track_id}", 'take_id': f"{new_take.id}", 'take': f"{new_take_number}", 's3_info': f"{s3_info}", 'timestamp': f"{current_time_utc}"}), HTTPStatus.CREATED

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
    