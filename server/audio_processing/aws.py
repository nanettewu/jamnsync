import os
import boto3 # aws sdk for python

UPLOAD_FOLDER="audio_processing/s3_uploads"
BUCKET = "jamnsync"

# source: https://stackabuse.com/file-management-with-aws-s3-python-and-flask/

def upload_take(filename, formatted_time, group, project, track):
    """
    Function to upload a take to an S3 bucket
    """
    parts = filename.rsplit('.', 1)
    modified_filename = f"{parts[0]}_{formatted_time}.{parts[1]}"

    filepath = f"{UPLOAD_FOLDER}/{filename}" #source
    key_name = f"{group}/{project}/{track}/{modified_filename}" #destination
    boto3.client('s3').upload_file(filepath, BUCKET, key_name)
    
    # return public URL location of object
    return f"https://{BUCKET}.s3.amazonaws.com/{key_name}"

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