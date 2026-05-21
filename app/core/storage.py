import boto3
import os
from botocore.exceptions import ClientError
from app.config import S3_ENDPOINT_URL, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET_NAME, S3_REGION, STORAGE_MODE

class CloudStorage:
    def __init__(self):
        self.enabled = STORAGE_MODE == "cloud"
        if self.enabled:
            missing = [
                name for name, value in {
                    "S3_ENDPOINT_URL": S3_ENDPOINT_URL,
                    "S3_ACCESS_KEY": S3_ACCESS_KEY,
                    "S3_SECRET_KEY": S3_SECRET_KEY,
                    "S3_BUCKET_NAME": S3_BUCKET_NAME,
                }.items()
                if not value
            ]
            if missing:
                raise RuntimeError(f"Cloud storage is enabled but missing: {', '.join(missing)}")
            self.s3 = boto3.client(
                's3',
                endpoint_url=S3_ENDPOINT_URL,
                aws_access_key_id=S3_ACCESS_KEY,
                aws_secret_access_key=S3_SECRET_KEY,
                region_name=S3_REGION
            )
            self.bucket = S3_BUCKET_NAME

    def upload_file(self, local_path, cloud_path):
        """Upload a file to the cloud storage"""
        if not self.enabled:
            return False
        try:
            self.s3.upload_file(local_path, self.bucket, cloud_path)
            return True
        except ClientError as e:
            print(f"Error uploading to S3: {e}")
            return False

    def download_file(self, cloud_path, local_path):
        """Download a file from the cloud storage"""
        if not self.enabled:
            return False
        try:
            self.s3.download_file(self.bucket, cloud_path, local_path)
            return True
        except ClientError as e:
            print(f"Error downloading from S3: {e}")
            return False

    def generate_signed_url(self, cloud_path, expires_in=3600):
        """Generate a pre-signed URL for a file"""
        if not self.enabled:
            return None
        try:
            url = self.s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': cloud_path},
                ExpiresIn=expires_in
            )
            return url
        except ClientError as e:
            print(f"Error generating signed URL: {e}")
            return None

    def delete_file(self, cloud_path):
        """Delete a file from cloud storage"""
        if not self.enabled:
            return False
        try:
            self.s3.delete_object(Bucket=self.bucket, Key=cloud_path)
            return True
        except ClientError as e:
            print(f"Error deleting from S3: {e}")
            return False

# Global instance
storage = CloudStorage()
