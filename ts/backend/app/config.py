import os
SECRET_KEY = os.getenv("SECRET_KEY", "mysecretkey123")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./chain_docs.db")
# AWS Configuration - Use environment variables
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY", "")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY", "")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")  # Asia Pacific (Mumbai)
S3_BUCKET = os.getenv("S3_BUCKET", "tradefinance-s3")
