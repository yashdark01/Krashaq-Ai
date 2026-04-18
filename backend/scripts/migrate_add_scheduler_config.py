#!/usr/bin/env python3
"""
Database migration script to add scheduler_configs table.
Run this script to update the database schema.
"""

import sqlite3
import sys
import os

db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "krashaq.db")

def migrate():
    """Create scheduler_configs table in the database."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if scheduler_configs table already exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='scheduler_configs'
        """)
        
        if cursor.fetchone():
            print("scheduler_configs table already exists. Skipping migration.")
            return
        
        # Create scheduler_configs table
        cursor.execute("""
            CREATE TABLE scheduler_configs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_name VARCHAR(100) UNIQUE NOT NULL,
                schedule_type VARCHAR(20) NOT NULL,
                interval_hours INTEGER,
                hour INTEGER,
                minute INTEGER,
                enabled BOOLEAN DEFAULT 1,
                last_run DATETIME,
                next_run DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes
        cursor.execute("""
            CREATE INDEX idx_scheduler_configs_job_name ON scheduler_configs(job_name)
        """)
        
        # Insert default configuration for daily irrigation alerts
        cursor.execute("""
            INSERT INTO scheduler_configs (job_name, schedule_type, hour, minute, enabled)
            VALUES ('daily_irrigation_alerts', 'daily', 5, 0, 1)
        """)
        
        conn.commit()
        print("Successfully created scheduler_configs table and indexes.")
        print("Inserted default configuration for daily_irrigation_alerts at 5:00 AM.")
        
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
