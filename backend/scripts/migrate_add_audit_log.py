#!/usr/bin/env python3
"""
Database migration script to add audit_logs table.
Run this script to update the database schema.
"""

import sqlite3
import sys
import os

db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "krashaq.db")

def migrate():
    """Create audit_logs table in the database."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if audit_logs table already exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='audit_logs'
        """)
        
        if cursor.fetchone():
            print("audit_logs table already exists. Skipping migration.")
            return
        
        # Create audit_logs table
        cursor.execute("""
            CREATE TABLE audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_user_id INTEGER NOT NULL,
                action VARCHAR(100) NOT NULL,
                target_type VARCHAR(50) NOT NULL,
                target_id VARCHAR(100),
                details TEXT,
                ip_address VARCHAR(45),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admin_user_id) REFERENCES users (id)
            )
        """)
        
        # Create indexes
        cursor.execute("""
            CREATE INDEX idx_audit_logs_admin_user_id ON audit_logs(admin_user_id)
        """)
        
        cursor.execute("""
            CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at)
        """)
        
        conn.commit()
        print("Successfully created audit_logs table and indexes.")
        
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
