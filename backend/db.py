import psycopg2
import psycopg2.extras
import os
from datetime import datetime
import json
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Get PostgreSQL database connection"""
    try:
        # Prioritize individual environment variables (better for passwords with special characters)
        if os.getenv('DB_HOST') and os.getenv('DB_USER') and os.getenv('DB_PASSWORD'):
            conn = psycopg2.connect(
                host=os.getenv('DB_HOST', 'localhost'),
                port=os.getenv('DB_PORT', '5432'),
                database=os.getenv('DB_NAME', 'education_chatbot'),
                user=os.getenv('DB_USER', 'postgres'),
                password=os.getenv('DB_PASSWORD')
            )
        else:
            # Fallback to DATABASE_URL (for production/Heroku)
            database_url = os.getenv('DATABASE_URL')
            if database_url:
                conn = psycopg2.connect(database_url)
            else:
                # Default connection
                conn = psycopg2.connect(
                    host='localhost',
                    port='5432',
                    database='education_chatbot',
                    user='postgres',
                    password='password'
                )
        return conn
    except psycopg2.Error as e:
        print(f"Error connecting to PostgreSQL database: {e}")
        print(f"Connection details: host={os.getenv('DB_HOST')}, user={os.getenv('DB_USER')}, database={os.getenv('DB_NAME')}")
        raise

def create_tables():
    """Create all necessary tables in PostgreSQL database"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Create users table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')

        # Create table for logging interactions
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS interactions (
            id SERIAL PRIMARY KEY,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            grade VARCHAR(50),
            subject VARCHAR(100),
            topic VARCHAR(100),
            question TEXT,
            answer TEXT,
            feedback TEXT
        )
        ''')

        # Create table for chat history
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_history (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            messages JSONB
        )
        ''')

        conn.commit()
        print("Database tables created successfully!")

    except psycopg2.Error as e:
        print(f"Error creating tables: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

def log_interaction(grade, subject, question, answer, feedback, topic=None):
    """Log user interaction to PostgreSQL database"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
        INSERT INTO interactions (grade, subject, topic, question, answer, feedback)
        VALUES (%s, %s, %s, %s, %s, %s)
        ''', (grade, subject, topic, question, answer, feedback))

        conn.commit()

    except psycopg2.Error as e:
        print(f"Error logging interaction: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

def save_chat_history(user_id, title, messages):
    """Save chat history to PostgreSQL database"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # PostgreSQL supports JSONB for better performance with JSON data
        cursor.execute('''
        INSERT INTO chat_history (user_id, title, messages)
        VALUES (%s, %s, %s) RETURNING id
        ''', (user_id, title, json.dumps(messages)))

        history_id = cursor.fetchone()[0]
        conn.commit()

        return history_id

    except psycopg2.Error as e:
        print(f"Error saving chat history: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

def get_user_chat_history(user_id):
    """Get all chat history for a specific user from PostgreSQL"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        cursor.execute('''
        SELECT id, title, timestamp, messages
        FROM chat_history
        WHERE user_id = %s
        ORDER BY timestamp DESC
        ''', (user_id,))

        history = [dict(row) for row in cursor.fetchall()]
        return history

    except psycopg2.Error as e:
        print(f"Error getting user chat history: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def get_chat_by_id(history_id):
    """Get specific chat by ID from PostgreSQL"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        cursor.execute('''
        SELECT id, user_id, title, timestamp, messages
        FROM chat_history
        WHERE id = %s
        ''', (history_id,))

        chat = cursor.fetchone()

        if chat:
            return dict(chat)
        return None

    except psycopg2.Error as e:
        print(f"Error getting chat by ID: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def delete_chat_history(history_id, user_id):
    """Delete specific chat history from PostgreSQL"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
        DELETE FROM chat_history
        WHERE id = %s AND user_id = %s
        ''', (history_id, user_id))

        deleted = cursor.rowcount > 0
        conn.commit()

        return deleted

    except psycopg2.Error as e:
        print(f"Error deleting chat history: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

def update_chat_history_messages(history_id, title, messages):
    """Update existing chat history with new messages (for continuous sessions)"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
        UPDATE chat_history
        SET title = %s, messages = %s, timestamp = CURRENT_TIMESTAMP
        WHERE id = %s
        ''', (title, json.dumps(messages), history_id))

        updated = cursor.rowcount > 0
        conn.commit()

        return updated

    except psycopg2.Error as e:
        print(f"Error updating chat history: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()
