import sys
sys.path.insert(0, '/workspaces/python_Blockchain_fs/ts/backend')

from app.database.connection import SessionLocal
from app.database.models import User

# Create a database session
db = SessionLocal()

try:
    # Query all users
    users = db.query(User).all()
    
    if not users:
        print("No users found in the database.")
    else:
        print(f"\n{'='*80}")
        print(f"Total Users: {len(users)}")
        print(f"{'='*80}\n")
        
        for user in users:
            print(f"ID:         {user.id}")
            print(f"Name:       {user.name}")
            print(f"Email:      {user.email}")
            print(f"Role:       {user.role}")
            print(f"Org Name:   {user.org_name}")
            print(f"Created At: {user.created_at}")
            print(f"{'-'*80}")
            
finally:
    db.close()
