import boto3
import uuid
from app.config import AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_REGION,S3_BUCKET

# Initialize S3 client only if credentials are provided
s3_client = None
if AWS_ACCESS_KEY and AWS_SECRET_KEY and AWS_REGION:
    s3_client = boto3.client(
        "s3",
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        region_name=AWS_REGION,
    )

def upload_file_to_s3(file_bytes: bytes, filename: str) -> str:
    if not s3_client:
        raise ValueError("S3 client not configured. Please set AWS credentials in config.py")
    
    key = f"documents/{uuid.uuid4()}_{filename}"

    s3_client.put_object(
        Bucket=S3_BUCKET,
        Key=key,
        Body=file_bytes
    )

    return f"s3://{S3_BUCKET}/{key}"
