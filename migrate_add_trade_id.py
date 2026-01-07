"""
Migration script to add trade_id column to documents table
"""
import sqlite3

def migrate():
    conn = sqlite3.connect('chain_docs.db')
    cursor = conn.cursor()
    
    # Check if documents table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='documents';")
    table_exists = cursor.fetchone()
    
    if not table_exists:
        print("❌ Documents table doesn't exist. Need to create all tables first.")
        conn.close()
        return False
    
    # Check current columns
    cursor.execute("PRAGMA table_info(documents);")
    columns = cursor.fetchall()
    print("Current columns in documents table:")
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")
    
    # Check if trade_id already exists
    column_names = [col[1] for col in columns]
    if 'trade_id' in column_names:
        print("✅ trade_id column already exists!")
        conn.close()
        return True
    
    # Add trade_id column
    print("\n🔨 Adding trade_id column...")
    try:
        cursor.execute("""
            ALTER TABLE documents 
            ADD COLUMN trade_id INTEGER 
            REFERENCES trades(id);
        """)
        conn.commit()
        print("✅ Successfully added trade_id column to documents table!")
        
        # Verify
        cursor.execute("PRAGMA table_info(documents);")
        columns = cursor.fetchall()
        print("\nUpdated columns:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
        
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 50)
    print("Migration: Add trade_id to documents table")
    print("=" * 50)
    migrate()
