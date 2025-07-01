from flask import Flask, request, jsonify, Response, stream_template, send_from_directory, session
from flask_cors import CORS
from gemini import generate_question, evaluate_answer, answer_direct_question, generate_question_stream, evaluate_answer_stream, answer_direct_question_stream
import jwt
import datetime
from functools import wraps
import os
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg2
import psycopg2.extras
from werkzeug.utils import secure_filename
from db import create_tables, log_interaction, save_chat_history, get_user_chat_history, get_chat_by_id, delete_chat_history, get_db_connection, update_chat_history_messages
import json
from dotenv import load_dotenv
import time

load_dotenv()

app = Flask(__name__)

# Allow your Vercel frontend to make requests to this backend
cors_origins = [
    "https://ai-conversational-math-evaluation-c.vercel.app",
    "http://localhost:3000" # Also allow local development
]

CORS(app, resources={r"/*": {"origins": cors_origins}}, supports_credentials=True)

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', '33086545ed2fa90350b6e7ebc1470ed3d117175c03396d0c25c05b613abaa847')


# Initialize database tables
create_tables()

# JWT token required decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(' ')[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cursor.execute('SELECT * FROM users WHERE id = %s', (data['user_id'],))
            current_user = cursor.fetchone()
            cursor.close()
            conn.close()

            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except Exception as e:
            print(f"Token validation error: {e}")
            return jsonify({'message': 'Token is invalid!'}), 401
            
        return f(current_user, *args, **kwargs)
    
    return decorated

@app.route('/register', methods=['POST'])
def register():
    data = request.json

    try:
        # Check if user already exists
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute('SELECT * FROM users WHERE email = %s', (data['email'],))
        user = cursor.fetchone()

        if user:
            cursor.close()
            conn.close()
            return jsonify({'message': 'User already exists!'}), 409

        # Create new user
        hashed_password = generate_password_hash(data['password'])

        cursor.execute('INSERT INTO users (name, email, password) VALUES (%s, %s, %s)',
                      (data['name'], data['email'], hashed_password))
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'message': 'User created successfully!'}), 201

    except psycopg2.Error as e:
        print(f"Database error during registration: {e}")
        return jsonify({'message': 'Registration failed!'}), 500

@app.route('/login', methods=['POST'])
def login():
    data = request.json

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Could not verify!'}), 401

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute('SELECT * FROM users WHERE email = %s', (data['email'],))
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if not user:
            return jsonify({'message': 'User not found!'}), 401

        if check_password_hash(user['password'], data['password']):
            # Generate token
            token = jwt.encode({
                'user_id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)
            }, app.config['SECRET_KEY'], algorithm="HS256")

            return jsonify({'token': token})

        return jsonify({'message': 'Invalid credentials!'}), 401

    except psycopg2.Error as e:
        print(f"Database error during login: {e}")
        return jsonify({'message': 'Login failed!'}), 500

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"message": "Logout successful"})

@app.route("/generate", methods=["POST"])
@token_required
def ask_question(current_user):
    data = request.json
    grade = data.get("grade")
    subject = data.get("subject", "Math")
    topic = data.get("topic", None)  # Optional topic parameter
    difficulty = data.get("difficultyLevel", 1)
    
    # Generate question using Gemini API
    question = generate_question(grade, subject, topic, difficulty)
    
    # Log the interaction
    try:
        log_interaction(
            grade=grade,
            subject=subject,
            topic=topic,
            question=question,
            answer="",
            feedback=""
        )
    except Exception as e:
        print(f"Error logging interaction: {e}")
    
    return jsonify({"question": question})

@app.route("/answer", methods=["POST"])
@token_required
def answer_question(current_user):
    data = request.json
    question = data.get("question")
    user_answer = data.get("answer")
    grade = data.get("grade")
    subject = data.get("subject", "Math")
    topic = data.get("topic", None)  # Optional topic parameter

    # Evaluate answer using Gemini API
    feedback = evaluate_answer(question, user_answer)
    
    # Log the interaction
    try:
        log_interaction(
            grade=grade,
            subject=subject,
            topic=topic,
            question=question,
            answer=user_answer,
            feedback=feedback
        )
    except Exception as e:
        print(f"Error logging interaction: {e}")
    
    return jsonify({"feedback": feedback})

@app.route("/direct_question", methods=["POST"])
@token_required
def direct_question(current_user):
    data = request.json
    question = data.get("question")
    grade = data.get("grade")
    subject = data.get("subject", "Math")
    topic = data.get("topic", None)  # Optional topic parameter
    
    # Answer direct question using Gemini API
    answer = answer_direct_question(question, grade, subject, topic)
    
    # Log the interaction
    try:
        log_interaction(
            grade=grade,
            subject=subject,
            topic=topic,
            question=question,
            answer="",
            feedback=answer
        )
    except Exception as e:
        print(f"Error logging interaction: {e}")
    
    return jsonify({"answer": answer})

# Add these constants at the top of your file
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf', 'txt'}

# Make sure the upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Helper function to check allowed file extensions
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Add this new route to handle file uploads
@app.route("/upload_question", methods=["POST"])
@token_required
def upload_question(current_user):
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        
        # Get additional data
        grade = request.form.get("grade", "Class 10")
        subject = request.form.get("subject", "Math")
        
        question_text = f"Uploaded file: {filename}"
        answer = "Could not process the file."

        file_extension = filename.rsplit('.', 1)[1].lower()

        if file_extension == 'txt':
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    question_text = f.read()
                # Get answer from Gemini
                answer = answer_direct_question(question_text, grade, subject)
            except Exception as e:
                print(f"Error reading txt file: {e}")
                answer = "There was an error reading the text file."
        else:
            # Placeholder for image/PDF processing
            answer = "File received. Support for image and PDF questions is coming soon!"

        # Log the interaction
        try:
            log_interaction(
                grade=grade,
                subject=subject,
                topic=None,
                question=question_text,
                answer="",
                feedback=answer
            )
        except Exception as e:
            print(f"Error logging interaction: {e}")
        
        return jsonify({"answer": answer})
    
    return jsonify({"error": "File type not allowed"}), 400

# Add these new endpoints for chat history
@app.route("/chat_history", methods=["GET", "POST"])
@token_required
def chat_history(current_user):
    if request.method == "GET":
        # Get all chat history for the user
        history = get_user_chat_history(current_user['id'])
        return jsonify(history)
    
    elif request.method == "POST":
        # Save new chat history
        data = request.json
        title = data.get("title", "Untitled Chat")
        messages = data.get("messages", [])
        
        history_id = save_chat_history(current_user['id'], title, messages)
        return jsonify({"id": history_id, "message": "Chat history saved successfully"})

@app.route("/chat_history/<int:chat_id>", methods=["GET", "PUT", "DELETE", "POST"])
@token_required
def manage_chat_history(current_user, chat_id):
    if request.method == "GET":
        # Get a specific chat history
        chat = get_chat_by_id(chat_id)
        
        if not chat or chat['user_id'] != current_user['id']:
            return jsonify({"message": "Chat history not found"}), 404
        
        return jsonify(chat)
    
    elif request.method == "PUT" or request.method == "POST": # Handle update and sendBeacon
        # Update chat history
        data = request.json
        title = data.get("title")
        messages = data.get("messages")
        
        if not title or not messages:
            return jsonify({"message": "Missing title or messages"}), 400

        # Ensure the user owns this chat before updating
        chat = get_chat_by_id(chat_id)
        if not chat or chat['user_id'] != current_user['id']:
            return jsonify({"message": "Chat not found or not authorized"}), 404

        update_chat_history_messages(chat_id, title, messages)
        return jsonify({"message": "Chat history updated successfully"})

    elif request.method == "DELETE":
        # Delete chat history
        # Ensure the user owns this chat before deleting
        chat = get_chat_by_id(chat_id)
        if not chat or chat['user_id'] != current_user['id']:
            return jsonify({"message": "Chat history not found or not authorized"}), 404

        delete_chat_history(chat_id, current_user['id'])
        return jsonify({"message": "Chat history deleted successfully"})

# Streaming endpoints for real-time responses
@app.route("/generate_stream", methods=["POST"])
@token_required
def ask_question_stream(current_user):
    data = request.json
    grade = data.get("grade")
    subject = data.get("subject", "Math")
    topic = data.get("topic", None)
    difficulty = data.get("difficultyLevel", 1)

    def generate():
        try:
            full_response = ""
            for chunk in generate_question_stream(grade, subject, topic, difficulty):
                full_response += chunk
                # Send each chunk as Server-Sent Events
                yield f"data: {{\"chunk\": {json.dumps(chunk)}, \"done\": false}}\n\n"
                time.sleep(0.05)  # Small delay for typing effect

            # Send completion signal
            yield f"data: {{\"chunk\": \"\", \"done\": true}}\n\n"

            # Log the interaction after completion
            try:
                log_interaction(
                    grade=grade,
                    subject=subject,
                    topic=topic,
                    question=full_response,
                    answer="",
                    feedback=""
                )
            except Exception as e:
                print(f"Error logging interaction: {e}")

        except Exception as e:
            yield f"data: {{\"error\": {json.dumps(str(e))}}}\n\n"

    return Response(generate(), mimetype='text/plain')

@app.route("/answer_stream", methods=["POST"])
@token_required
def answer_question_stream(current_user):
    data = request.json
    question = data.get("question")
    user_answer = data.get("answer")
    grade = data.get("grade")
    subject = data.get("subject", "Math")
    topic = data.get("topic", None)

    def generate():
        try:
            full_response = ""
            for chunk in evaluate_answer_stream(question, user_answer):
                full_response += chunk
                # Send each chunk as Server-Sent Events
                yield f"data: {json.dumps({'chunk': chunk, 'done': False})}\n\n"
                time.sleep(0.05)  # Small delay for typing effect

            # Send completion signal
            yield f"data: {json.dumps({'chunk': '', 'done': True})}\n\n"

            # Log the interaction after completion
            try:
                log_interaction(
                    grade=grade,
                    subject=subject,
                    topic=topic,
                    question=question,
                    answer=user_answer,
                    feedback=full_response
                )
            except Exception as e:
                print(f"Error logging interaction: {e}")

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(generate(), mimetype='text/plain')

@app.route("/direct_question_stream", methods=["POST"])
@token_required
def direct_question_stream(current_user):
    data = request.json
    question = data.get("question")
    grade = data.get("grade")
    subject = data.get("subject", "Math")
    topic = data.get("topic", None)

    def generate():
        try:
            full_response = ""
            for chunk in answer_direct_question_stream(question, grade, subject, topic):
                full_response += chunk
                # Send each chunk as Server-Sent Events
                yield f"data: {json.dumps({'chunk': chunk, 'done': False})}\n\n"
                time.sleep(0.05)  # Small delay for typing effect

            # Send completion signal
            yield f"data: {json.dumps({'chunk': '', 'done': True})}\n\n"

            # Log the interaction after completion
            try:
                log_interaction(
                    grade=grade,
                    subject=subject,
                    topic=topic,
                    question=question,
                    answer="",
                    feedback=full_response
                )
            except Exception as e:
                print(f"Error logging interaction: {e}")

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(generate(), mimetype='text/plain')

# Admin endpoints
@app.route('/admin/tables', methods=['POST'])
def admin_tables():
    data = request.json
    password = data.get('password')
    admin_password = os.getenv('ADMIN_PASSWORD', 'admin123')
    if password != admin_password:
        return jsonify({'error': 'Unauthorized'}), 401
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        tables = [row[0] for row in cursor.fetchall()]
        cursor.close()
        conn.close()
        return jsonify({'tables': tables})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/admin/table_data', methods=['POST'])
def admin_table_data():
    data = request.json
    password = data.get('password')
    table = data.get('table')
    admin_password = os.getenv('ADMIN_PASSWORD', 'admin123')
    if password != admin_password:
        return jsonify({'error': 'Unauthorized'}), 401
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f'SELECT * FROM "{table}" LIMIT 100')
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify({'columns': columns, 'rows': rows})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
