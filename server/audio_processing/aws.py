import os
import boto3 # aws sdk for python

UPLOAD_FOLDER="audio_processing/s3_uploads"
BUCKET = "jamnsync"

# source: https://stackabuse.com/file-management-with-aws-s3-python-and-flask/

def upload_take(filename, project_hash, track_id, take_num, current_time):
    """
    Function to upload a take to an S3 bucket
    """
    # ex time: 2021_02_24-07_22_13_PM
    formatted_timestamp = current_time.astimezone().strftime("%Y_%m_%d-%I_%M_%S_%p")
    parts = filename.rsplit('.', 1)
    modified_filename = f"track{track_id}_take{take_num}_{formatted_timestamp}.{parts[1]}"

    filepath = f"{UPLOAD_FOLDER}/{filename}" #source
    key_name = f"projects/{project_hash}/{modified_filename}" #destination
    boto3.client('s3').upload_file(filepath, BUCKET, key_name)
    print(f"Successfully uploaded take: {key_name}")

    
    # return public URL location of object
    return f"https://{BUCKET}.s3.amazonaws.com/{key_name}"

def delete_take(take_filepath):
    """
    Function to deletee a take from an S3 bucket
    """
    key_name = f"projects/{take_filepath}" #destination
    boto3.client('s3').delete_object(Bucket=BUCKET, Key=key_name)
    print(f"Successfully deleted take: {key_name}")
    
def delete_project(project_hash):
    """
    Function to deletee a take from an S3 bucket
    """
    project_path = f"projects/{project_hash}/" 
    bucket = boto3.resource('s3').Bucket(BUCKET)
    bucket.objects.filter(Prefix=project_path).delete()
    print(f"Successfully deleted project: {project_hash}")

############################################################################
# Testing
############################################################################

def upload_file(filename):
    """
    Test function to upload a file to an S3 bucket
    """
    filepath = f"{UPLOAD_FOLDER}/{filename}"
    key_name = f"testing/{filename}" 
    boto3.client('s3').upload_file(filepath, BUCKET, key_name)
    
def download_file(filename):
    """
    Test function to download a given file from an S3 bucket
    """
    output = f"s3_downloads/{filename}"
    # download destination relative to server dir
    s3 = boto3.resource('s3')
    s3.Bucket(BUCKET).download_file(filename, f"audio_processing/{output}")

    return output

def list_files():
    """
    Function to list files in a given S3 bucket
    """
    s3 = boto3.client('s3')
    contents = []
    for item in s3.list_objects(Bucket=BUCKET)['Contents']:
        contents.append(item)

    return contents