import os
import boto3 # aws sdk for python

UPLOAD_FOLDER="audio_processing/s3_uploads"

# source: https://stackabuse.com/file-management-with-aws-s3-python-and-flask/

def upload_file(filename, bucket):
    """
    Function to upload a file to an S3 bucket
    """
    filepath = f"{UPLOAD_FOLDER}/{filename}"
    key_name = f"uploads/{filename}"
    # upload source relative to server dir
    s3_client = boto3.client('s3')
    response = s3_client.upload_file(filepath, bucket, key_name)


def download_file(filename, bucket):
    """
    Function to download a given file from an S3 bucket
    """
    output = f"s3_downloads/{filename}"
    # download destination relative to server dir
    s3 = boto3.resource('s3')
    s3.Bucket(bucket).download_file(filename, f"audio_processing/{output}")

    return output


def list_files(bucket):
    """
    Function to list files in a given S3 bucket
    """
    s3 = boto3.client('s3')
    contents = []
    for item in s3.list_objects(Bucket=bucket)['Contents']:
        contents.append(item)

    return contents