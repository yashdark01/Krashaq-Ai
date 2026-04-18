#!/usr/bin/env python3
"""
Database seed script to create an initial admin user.
Usage: python scripts/seed_admin.py <email> <name> <password>
"""

import sys
import os
import sqlite3
from passlib.context import CryptContext

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "krashaq.db")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_admin_user(email: str, name: str, password: str):
    """Create an admin user in the database."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        existing_user = cursor.fetchone()
        
        if existing_user:
            print(f"User with email {email} already exists. Skipping creation.")
            return
        
        # Hash password
        password_hash = pwd_context.hash(password)
        
        # Insert admin user
        cursor.execute("""
            INSERT INTO users (email, name, password_hash, role, is_active, created_at, updated_at)
            VALUES (?, ?, ?, 'admin', 1, datetime('now'), datetime('now'))
        """, (email, name, password_hash))
        
        conn.commit()
        print(f"Successfully created admin user: {email}")
        
    except Exception as e:
        conn.rollback()
        print(f"Failed to create admin user: {e}")
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python scripts/seed_admin.py <email> <name> <password>")
        sys.exit(1)
    
    email = sys.argv[1]
    name = sys.argv[2]
    password = sys.argv[3]
    
    create_admin_user(email, name, password)
