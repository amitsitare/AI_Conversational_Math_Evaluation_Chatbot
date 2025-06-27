# AI-Powered Math Education Chatbot

## Overview
This is a full-stack web application that provides an AI-powered math learning assistant for students. Users can interact with a chatbot to solve math problems, receive step-by-step explanations, upload questions (images and text files), and track their learning progress. An admin interface allows secure viewing of database tables and their contents.

---

## Project Structure
```
.
├── backend/         # Flask backend (API, AI, DB)
│   ├── app.py
│   ├── db.py
│   ├── gemini.py
│   ├── requirements.txt
│   └── ...
├── frontend/        # React frontend (UI)
│   ├── src/
│   ├── package.json
│   └── ...
└── README.md        # Project-level documentation (this file)
```

---

## Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
# Set up your .env file (see below)
python app.py  # Starts the Flask server
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start  # Runs the React app on http://localhost:3000
```

---

## .env Configuration (Backend)
Create a file called `.env` in the `backend/` directory. Example:
```
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_NAME=education_chatbot
SECRET_KEY=your_secret_key
ADMIN_PASSWORD=your_admin_password
```

- **Never commit your .env file to GitHub!**
- The `.gitignore` file already excludes `.env` and other sensitive files.

---

## Deployment & GitHub Codespaces/Gitpod
If using Codespaces, Gitpod, or similar, add a `.gitpod.yml` or `.devcontainer` as needed. For a simple cloud dev setup, you can use this `.gitcorn` file:

```
# .gitcorn (example)
cd backend && pip install -r requirements.txt && cd ../frontend && npm install
```

**To run both servers:**
- Start the backend: `cd backend && python app.py`
- Start the frontend: `cd frontend && npm start`

---

## Features
- User authentication (JWT)
- Math chatbot (AI-powered, step-by-step feedback)
- File upload (images, PDFs, .txt)
- Persistent chat history
- Admin database viewer (password protected)
- Responsive, modern UI (dark/light mode)

---

## License
[MIT](LICENSE) 