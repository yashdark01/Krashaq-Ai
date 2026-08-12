# Database Configuration & Data Reference

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  name: String (required),
  password_hash: String,
  google_id: String (unique),
  phone: String,
  role: String (default: 'farmer'),  // admin, farmer, pestisides-supplier
  language: String (default: 'hi'),  // en, hi, hinglish
  location: {
    state: String,
    district: String,
    tehsil: String,
    locality: String,
    pincode: String
  },
  is_active: Boolean (default: true),
  two_factor_enabled: Boolean (default: false),
  two_factor_secret: String,
  phone_verified: Boolean (default: false),
  soil_moisture: Integer,  // Farmer-specific field (0-100)
  crop: String,  // Farmer-specific field
  created_at: DateTime,
  updated_at: DateTime,
  last_login: DateTime
}
```

**Indexes:**
- Unique index on `email`
- Unique index on `google_id`
- Index on `phone`
- Index on `role`

### Farmers Collection

Farmers are stored in the `users` collection with role 'farmer'. Farmer-specific fields are embedded in the user document:
- `soil_moisture`: Soil moisture percentage (0-100)
- `crop`: Current crop being cultivated

No separate farmers collection is maintained. All farmer data is part of the users collection.

### Scheduler Configs Collection
```javascript
{
  _id: ObjectId,
  job_name: String (unique, required),
  schedule_type: String (required),  // hourly, daily, interval
  interval_hours: Integer,
  interval_minutes: Integer,
  hour: Integer,  // For daily schedules (0-23)
  minute: Integer,  // For daily schedules (0-59)
  enabled: Boolean (default: true),
  last_run: DateTime,
  next_run: DateTime,
  created_at: DateTime,
  updated_at: DateTime
}
```

### Messages Collection
```javascript
{
  _id: ObjectId,
  farmer_id: ObjectId,
  phone: String,
  session_id: String,
  message: String (required),
  response: String,
  language: String (default: 'hi'),  // en, hi, hinglish
  tools_used: String,  // JSON string of tool names
  llm_provider: String,  // ollama, gemini, openai, claude, grok
  created_at: DateTime
}
```

**Indexes:**
- Index on `farmer_id`
- Index on `phone`
- Index on `session_id`
- Index on `created_at` (for time-based queries)

### Refresh Tokens Collection
```javascript
{
  _id: ObjectId,
  user_id: ObjectId (required),
  token: String (unique, required),
  expires_at: DateTime (required),
  created_at: DateTime,
  revoked: Boolean (default: false)
}
```

### Audit Logs Collection
```javascript
{
  _id: ObjectId,
  admin_user_id: ObjectId (required),
  action: String (required),  // e.g., "user_role_changed", "user_deactivated", "config_updated"
  target_type: String (required),  // e.g., "user", "config"
  target_id: String,
  details: String,  // JSON string with additional details
  ip_address: String,
  created_at: DateTime
}
```

**Indexes:**
- Index on `admin_user_id`
- Index on `action`
- Index on `target_type`
- Index on `created_at` (for time-based queries)

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
# Connect to MongoDB and drop the database
mongosh
use krashaq
db.dropDatabase()
exit
```

## Environment Variables

The database is configured in `.env` file:

```
MONGODB_URL=mongodb://localhost:27017/krashaq
```

For production, use MongoDB Atlas or a replica set:

```
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/krashaq
```

## Important Notes

- The test phone number **7987386670** is used for both admin and farmer user for testing purposes
- The scheduler is configured to run every 1 minute for testing
- All passwords are hashed using bcrypt in the seed script
- The database name is `krashaq`
- MongoDB is used for all environments (development and production)
- Motor (async MongoDB driver) is used for async database operations
- Connection pooling is enabled via Motor
- Automatic reconnection is configured
- Farmers are stored in the `users` collection with role 'farmer'
- Farmer-specific fields (soil_moisture, crop) are embedded in user documents
- Default language is 'hi' (Hindi) for all users
- Role options: admin, farmer, pestisides-supplier
