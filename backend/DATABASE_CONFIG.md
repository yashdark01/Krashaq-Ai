# Database Configuration & Data Reference

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    default_location VARCHAR(100),
    location_details TEXT,
    state VARCHAR(100),
    district VARCHAR(100),
    tehsil VARCHAR(100),
    locality VARCHAR(100),
    pincode VARCHAR(10),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    phone_verified BOOLEAN DEFAULT FALSE,
    role VARCHAR(20) DEFAULT 'farmer',  -- admin, farmer, pestisides-supplier
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);
```

### Farmers Table
```sql
CREATE TABLE farmers (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    location VARCHAR(100),
    soil_moisture INTEGER,  -- Soil moisture percentage (0-100)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Scheduler Configs Table
```sql
CREATE TABLE scheduler_configs (
    id INTEGER PRIMARY KEY,
    job_name VARCHAR(100) UNIQUE NOT NULL,
    schedule_type VARCHAR(20) NOT NULL,  -- hourly, daily, interval
    interval_hours INTEGER,
    interval_minutes INTEGER,
    hour INTEGER,  -- For daily schedules (0-23)
    minute INTEGER,  -- For daily schedules (0-59)
    enabled BOOLEAN DEFAULT TRUE,
    last_run DATETIME,
    next_run DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Messages Table
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    farmer_id INTEGER,
    phone VARCHAR(20),
    session_id VARCHAR(50),
    message TEXT NOT NULL,
    response TEXT,
    language VARCHAR(10),  -- en, hi, hinglish
    tools_used TEXT,  -- JSON array of tool names
    llm_provider VARCHAR(20),  -- ollama, gemini, openai, claude, grok
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Audit Logs Table
```sql
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY,
    admin_user_id INTEGER NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_user_id) REFERENCES users(id)
);
```

## Seeded Data

### Users

#### Admin User
- **Email**: admin@krashaq.ai
- **Password**: admin123
- **Phone**: 7987386670
- **Role**: admin
- **Location**: Kothrud, Pune, Maharashtra (411038)

#### Farmer User
- **Email**: farmer@krashaq.ai
- **Password**: farmer123
- **Phone**: 7987386670
- **Role**: farmer
- **Location**: Kothrud, Pune, Maharashtra (411038)

### Farmers

| ID | Name | Phone | Location | Soil Moisture |
|----|------|-------|----------|---------------|
| 1 | Test Farmer | 7987386670 | Kothrud, Pune, Maharashtra | 45% |
| 2 | Ramesh Patil | 912345678901 | Nashik, Maharashtra | 30% |
| 3 | Suresh Kumar | 912345678902 | Nagpur, Maharashtra | 55% |
| 4 | Anita Desai | 912345678903 | Aurangabad, Maharashtra | 40% |

### Scheduler Configurations

| Job Name | Schedule Type | Interval | Enabled |
|----------|---------------|----------|---------|
| daily_irrigation_alerts | interval | 1 minute | true |

## How to Seed Database

```bash
cd backend
python scripts/seed_database.py
```

## How to Clear Database

```bash
cd backend
rm krashaq.db
```

## Environment Variables

The database is configured in `.env` file:

```
DATABASE_URL=sqlite:///./krashaq.db
```

## Important Notes

- The test phone number **7987386670** is used for both admin and farmer user for testing purposes
- The scheduler is configured to run every 1 minute for testing
- All passwords are hashed using SHA-256 in the seed script
- The database file is `krashaq.db` in the backend directory
