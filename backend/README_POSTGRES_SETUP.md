# PostgreSQL Setup Guide

This application has been migrated from SQLite to PostgreSQL. Follow these steps to set up the database:

## Prerequisites

1. **Install PostgreSQL**
   - Download and install PostgreSQL from https://www.postgresql.org/download/
   - Make sure PostgreSQL service is running

2. **Install Python Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

## Database Setup

### 1. Create Database
Connect to PostgreSQL and create the database:

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database
CREATE DATABASE education_chatbot;

-- Create user (optional, for security)
CREATE USER chatbot_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE education_chatbot TO chatbot_user;

-- Exit psql
\q
```

### 2. Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` file with your database credentials:
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://chatbot_user:your_secure_password@localhost:5432/education_chatbot

   # Or use individual settings
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=education_chatbot
   DB_USER=chatbot_user
   DB_PASSWORD=your_secure_password

   # Google Gemini API Key
   GEMINI_API_KEY=your_gemini_api_key_here

   # Flask Secret Key
   SECRET_KEY=your_secure_secret_key_here
   ```

### 3. Initialize Database Tables

The application will automatically create the required tables when you first run it. The tables include:

- `users` - User authentication data
- `interactions` - Logged Q&A interactions
- `chat_history` - Saved chat conversations

### 4. Run the Application

```bash
python app.py
```

## Migration Notes

### Key Changes from SQLite:

1. **Connection Management**: Uses `psycopg2` instead of `sqlite3`
2. **SQL Syntax**: Updated to PostgreSQL syntax:
   - `SERIAL PRIMARY KEY` instead of `INTEGER PRIMARY KEY AUTOINCREMENT`
   - `%s` placeholders instead of `?`
   - `JSONB` for JSON data storage
   - `TIMESTAMP` with timezone support
3. **Error Handling**: Added PostgreSQL-specific error handling
4. **Environment Variables**: Database configuration via environment variables

### Benefits of PostgreSQL:

- Better performance for concurrent users
- JSONB support for efficient JSON storage
- Better data integrity and ACID compliance
- Scalability for production deployment
- Advanced indexing and query optimization

## Troubleshooting

### Common Issues:

1. **Connection Error**: Check if PostgreSQL service is running
2. **Authentication Failed**: Verify username/password in .env file
3. **Database Not Found**: Make sure you created the database
4. **Permission Denied**: Check user privileges on the database

### Useful Commands:

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Connect to database
psql -U chatbot_user -d education_chatbot

# List tables
\dt

# View table structure
\d table_name
```
