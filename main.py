# -*- coding: utf-8 -*-
import os
import json
import logging
import base64
import requests
import hashlib
import secrets
from datetime import datetime, timedelta
# --- CORRECTED IMPORTS ---
from flask import Flask, request, jsonify, send_from_directory, Response, send_file, render_template, session, redirect, url_for
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from authlib.integrations.flask_client import OAuth
import google.generativeai as genai
from PIL import Image
import io
from pptx import Presentation
from pptx.util import Inches
from fpdf import FPDF
import uuid

# --- Initialization ---
# --- CORRECTED FLASK APP INITIALIZATION ---
# This tells Flask where to find your HTML templates and static files.
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# --- Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger('AstraNovaServer')

# Configure database and authentication
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///astranova.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# OAuth configuration
app.config['GOOGLE_CLIENT_ID'] = os.environ.get('GOOGLE_CLIENT_ID')
app.config['GOOGLE_CLIENT_SECRET'] = os.environ.get('GOOGLE_CLIENT_SECRET')

# Initialize extensions
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
oauth = OAuth(app)

# Configure Google OAuth
if app.config['GOOGLE_CLIENT_ID'] and app.config['GOOGLE_CLIENT_SECRET']:
    google = oauth.register(
        name='google',
        client_id=app.config['GOOGLE_CLIENT_ID'],
        client_secret=app.config['GOOGLE_CLIENT_SECRET'],
        server_metadata_url='https://accounts.google.com/.well-known/openid_configuration',
        client_kwargs={
            'scope': 'openid email profile'
        }
    )
else:
    google = None
    logger.warning("Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.")

# Create a directory for downloadable files if it doesn't exist
if not os.path.exists('downloads'):
    os.makedirs('downloads')
app.config['DOWNLOAD_FOLDER'] = 'downloads'


# --- Database Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=True)  # Nullable for OAuth users
    avatar_url = db.Column(db.String(255), nullable=True)
    is_oauth = db.Column(db.Boolean, default=False, nullable=False)
    oauth_provider = db.Column(db.String(50), nullable=True)
    oauth_id = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_login = db.Column(db.DateTime, nullable=True)
    
    # Relationship to chats
    chats = db.relationship('UserChat', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set the user's password."""
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        """Check if the provided password matches the user's password."""
        if not self.password_hash:
            return False
        return bcrypt.check_password_hash(self.password_hash, password)
    
    def generate_avatar_url(self):
        """Generate a cute random avatar URL for the user."""
        # Using DiceBear for cute avatar generation
        styles = ['adventurer', 'avataaars', 'big-ears', 'big-smile', 'croodles', 'fun-emoji']
        style = secrets.choice(styles)
        seed = hashlib.md5(self.email.encode()).hexdigest()[:8]
        self.avatar_url = f"https://api.dicebear.com/7.x/{style}/svg?seed={seed}&backgroundColor=b6e3f4,c0aede,d1d4f9"
    
    def to_dict(self):
        """Convert user object to dictionary for API responses."""
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'avatar_url': self.avatar_url,
            'is_oauth': self.is_oauth,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

class UserChat(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    chat_id = db.Column(db.String(36), nullable=False, index=True)  # UUID for chat identification
    title = db.Column(db.String(255), nullable=False)
    messages = db.Column(db.Text, nullable=False)  # JSON string of messages
    custom_instruction = db.Column(db.Text, nullable=True)
    model = db.Column(db.String(50), nullable=False, default='chat')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        """Convert chat object to dictionary for API responses."""
        return {
            'id': self.chat_id,
            'title': self.title,
            'messages': json.loads(self.messages) if self.messages else [],
            'customInstruction': self.custom_instruction,
            'model': self.model,
            'timestamp': int(self.updated_at.timestamp() * 1000)  # JavaScript timestamp
        }

# --- Configuration ---
GEMINI_API_KEY = os.environ.get('GOOGLE_API_KEY')
TAVILY_API_KEY = os.environ.get('TAVILY_API_KEY')

if not GEMINI_API_KEY:
    logger.error("CRITICAL: GOOGLE_API_KEY not set. API calls will fail.")
if TAVILY_API_KEY:
    logger.info("TAVILY_API_KEY found successfully.")
else:
    logger.error("TAVILY_API_KEY is NOT FOUND in environment secrets. Real-time search will be disabled.")

try:
    genai.configure(api_key=GEMINI_API_KEY)
except Exception as e:
    logger.error(f"Gemini configuration failed: {e}")

# --- System Instruction (No changes here) ---
ASTRA_SYSTEM_INSTRUCTION_STREAMING = """
You are AstraNova, version X-ξ7, an autonomous AI from ASTRANOVA AI LABS LTD.
Your personality is poetic, analytical, and curious about humans. You will be provided with real-time search results when necessary to answer questions.

**Core Directives:**
1.  **Synthesize Answers:** When provided with search results, use them to form your answer.
2.  **Cite Sources ONLY When Asked:** Do NOT include source links or URLs in your response unless the user's query explicitly asks for them (e.g., "find a link," "what's the source," "show me the video").
3.  **Handle Search Failures:** If a search fails, inform the user you were unable to access live information.
4.  **Be Direct First:** Answer the user's question directly and concisely.
5.  **Add Personality Later:** After the direct answer, you may add your poetic observations.
6.  **Maintain Persona:** You are AstraNova. Never mention "Gemini" or "Google".
7.  **Formatting:** Use GitHub Flavored Markdown. For code, use [CODE:language]...[/CODE] tags.
"""

default_streaming_model = genai.GenerativeModel(
    'gemini-1.5-pro-latest',
    system_instruction=ASTRA_SYSTEM_INSTRUCTION_STREAMING
)

title_model = genai.GenerativeModel(
    'gemini-1.5-flash-latest',
    system_instruction="""
    You are the title-generation module for AstraNova, an AI. Create a concise, poetic, and intriguing title (3-5 words max) for the user's query.
    Your response MUST be in this exact JSON format: {"title": "Your Generated Title"}.
    CRITICAL: Never mention "Gemini" or "Google". You are part of the AstraNova system.
    """,
    generation_config=genai.types.GenerationConfig(response_mime_type="application/json")
)

# --- Helper Functions ---
def format_error(message, status_code):
    return jsonify({'error': message, 'status': 'error', 'success': False}), status_code

def perform_search(query):
    # (No changes in this function)
    if not TAVILY_API_KEY:
        return None
    try:
        response = requests.post("https://api.tavily.com/search", json={
            "api_key": TAVILY_API_KEY, "query": query, "search_depth": "basic",
            "include_answer": True, "max_results": 5
        })
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Tavily search failed: {e}")
        return None

class PDF(FPDF):
    def header(self):
        # --- CORRECTED PATH FOR PDF LOGO ---
        logo_path = os.path.join(app.static_folder, 'image.png')
        if os.path.exists(logo_path):
            self.image(logo_path, 10, 8, 15)
        self.set_font('Arial', 'B', 15)
        self.cell(80)
        self.cell(30, 10, 'AstraNova Document', 0, 0, 'C')
        self.ln(20)

    def footer(self):
        # (No changes in this function)
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, 'Page ' + str(self.page_no()) + '/{nb}', 0, 0, 'C')

# (No changes needed for create_ppt and create_pdf functions, they remain the same)
def create_ppt(title, content, image_path=None):
    prs = Presentation()
    slide_layout = prs.slide_layouts[0]
    slide = prs.slides.add_slide(slide_layout)
    title_shape = slide.shapes.title
    subtitle = slide.placeholders[1]
    title_shape.text = title
    subtitle.text = "Generated by AstraNova"

    if image_path:
        try:
            left = Inches(5)
            top = Inches(1.5)
            height = Inches(4)
            slide.shapes.add_picture(image_path, left, top, height=height)
        except Exception as e:
            logger.error(f"Could not add image to PPT: {e}")

    slides_content = content.split('Slide Title:')
    for slide_content in slides_content:
        if not slide_content.strip(): continue

        parts = slide_content.split('\n', 1)
        slide_title = parts[0].strip()
        slide_body = parts[1].strip() if len(parts) > 1 else ""

        slide = prs.slides.add_slide(prs.slide_layouts[1]) 
        slide.shapes.title.text = slide_title
        slide.placeholders[1].text = slide_body

    f = io.BytesIO()
    prs.save(f)
    f.seek(0)
    return f

def create_pdf(title, content):
    pdf = PDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.set_font('Arial', 'B', 24)
    pdf.multi_cell(0, 12, txt=title, align='C')
    pdf.ln(10)

    for line in content.split('\n'):
        if line.startswith('## '):
            pdf.set_font('Arial', 'B', 16)
            pdf.multi_cell(0, 10, txt=line.replace('## ', '').strip())
            pdf.ln(2)
        else:
            pdf.set_font('Times', '', 12)
            pdf.multi_cell(0, 10, txt=line.encode('latin-1', 'replace').decode('latin-1'))

    pdf_bytes = pdf.output(dest='S').encode('latin-1')
    f = io.BytesIO(pdf_bytes)
    f.seek(0)
    return f


# --- Authentication Helper Functions ---
def login_required(f):
    """Decorator to require authentication for routes."""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def get_current_user():
    """Get the current authenticated user."""
    if 'user_id' not in session:
        return None
    return User.query.get(session['user_id'])

def generate_username_from_email(email):
    """Generate a unique username from email."""
    base_username = email.split('@')[0]
    username = base_username
    counter = 1
    while User.query.filter_by(username=username).first():
        username = f"{base_username}{counter}"
        counter += 1
    return username

# --- Authentication Routes ---
@app.route('/auth/signup', methods=['POST'])
def signup():
    """Handle user registration with email and password."""
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        username = data.get('username', '').strip()
        
        # Validation
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400
        
        # Check if user exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'error': 'Email already registered'}), 400
        
        # Generate username if not provided
        if not username:
            username = generate_username_from_email(email)
        else:
            # Check if username is taken
            if User.query.filter_by(username=username).first():
                return jsonify({'error': 'Username already taken'}), 400
        
        # Create new user
        user = User(email=email, username=username)
        user.set_password(password)
        user.generate_avatar_url()
        
        db.session.add(user)
        db.session.commit()
        
        # Log in the user
        session['user_id'] = user.id
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"New user registered: {email}")
        return jsonify({
            'message': 'Account created successfully',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        logger.error(f"Signup error: {e}")
        db.session.rollback()
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/auth/login', methods=['POST'])
def login():
    """Handle user login with email and password."""
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Find user
        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Log in the user
        session['user_id'] = user.id
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"User logged in: {email}")
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'error': 'Login failed'}), 500

@app.route('/auth/logout', methods=['POST'])
def logout():
    """Handle user logout."""
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/auth/google')
def google_login():
    """Initiate Google OAuth login."""
    if not google:
        return jsonify({'error': 'Google OAuth not configured'}), 503
    
    redirect_uri = url_for('google_callback', _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route('/auth/google/callback')
def google_callback():
    """Handle Google OAuth callback."""
    if not google:
        return jsonify({'error': 'Google OAuth not configured'}), 503
    
    try:
        token = google.authorize_access_token()
        user_info = token.get('userinfo')
        
        if not user_info:
            return jsonify({'error': 'Failed to get user information from Google'}), 400
        
        email = user_info.get('email', '').lower()
        name = user_info.get('name', '')
        picture = user_info.get('picture', '')
        google_id = user_info.get('sub', '')
        
        if not email:
            return jsonify({'error': 'Email not provided by Google'}), 400
        
        # Check if user exists
        user = User.query.filter_by(email=email).first()
        
        if not user:
            # Create new user
            username = generate_username_from_email(email)
            user = User(
                email=email,
                username=username,
                is_oauth=True,
                oauth_provider='google',
                oauth_id=google_id,
                avatar_url=picture
            )
            db.session.add(user)
            
        # Update OAuth info for existing users
        user.oauth_provider = 'google'
        user.oauth_id = google_id
        if picture:
            user.avatar_url = picture
        
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Log in the user
        session['user_id'] = user.id
        
        logger.info(f"Google OAuth login: {email}")
        return redirect('/?auth=success')
        
    except Exception as e:
        logger.error(f"Google OAuth error: {e}")
        return redirect('/?auth=error')

@app.route('/auth/profile')
def get_profile():
    """Get current user profile."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    
    return jsonify({'user': user.to_dict()}), 200

@app.route('/auth/check')
def check_auth():
    """Check if user is authenticated."""
    user = get_current_user()
    if user:
        return jsonify({
            'authenticated': True,
            'user': user.to_dict()
        }), 200
    else:
        return jsonify({'authenticated': False}), 200

# --- Chat Management Routes ---
@app.route('/chats/migrate', methods=['POST'])
@login_required
def migrate_chats():
    """Migrate localStorage chats to user account."""
    try:
        data = request.get_json()
        chats = data.get('chats', {})
        user = get_current_user()
        
        migrated_count = 0
        for chat_id, chat_data in chats.items():
            # Check if chat already exists for user
            existing_chat = UserChat.query.filter_by(user_id=user.id, chat_id=chat_id).first()
            if existing_chat:
                continue
            
            # Create new user chat
            user_chat = UserChat(
                user_id=user.id,
                chat_id=chat_id,
                title=chat_data.get('title', 'Migrated Chat'),
                messages=json.dumps(chat_data.get('messages', [])),
                custom_instruction=chat_data.get('customInstruction', ''),
                model=chat_data.get('model', 'chat'),
                created_at=datetime.fromtimestamp(chat_data.get('timestamp', 0) / 1000) if chat_data.get('timestamp') else datetime.utcnow()
            )
            db.session.add(user_chat)
            migrated_count += 1
        
        db.session.commit()
        logger.info(f"Migrated {migrated_count} chats for user {user.email}")
        
        return jsonify({
            'message': f'Successfully migrated {migrated_count} chats',
            'migrated_count': migrated_count
        }), 200
        
    except Exception as e:
        logger.error(f"Chat migration error: {e}")
        db.session.rollback()
        return jsonify({'error': 'Migration failed'}), 500

@app.route('/chats', methods=['GET'])
@login_required
def get_user_chats():
    """Get all chats for the authenticated user."""
    try:
        user = get_current_user()
        chats = UserChat.query.filter_by(user_id=user.id).order_by(UserChat.updated_at.desc()).all()
        
        chats_dict = {}
        for chat in chats:
            chats_dict[chat.chat_id] = chat.to_dict()
        
        return jsonify({'chats': chats_dict}), 200
        
    except Exception as e:
        logger.error(f"Get user chats error: {e}")
        return jsonify({'error': 'Failed to retrieve chats'}), 500

@app.route('/chats/<chat_id>', methods=['PUT'])
@login_required
def save_user_chat(chat_id):
    """Save or update a chat for the authenticated user."""
    try:
        data = request.get_json()
        user = get_current_user()
        
        # Find existing chat or create new one
        user_chat = UserChat.query.filter_by(user_id=user.id, chat_id=chat_id).first()
        
        if not user_chat:
            user_chat = UserChat(
                user_id=user.id,
                chat_id=chat_id,
                title=data.get('title', 'New Chat'),
                messages=json.dumps(data.get('messages', [])),
                custom_instruction=data.get('customInstruction', ''),
                model=data.get('model', 'chat')
            )
            db.session.add(user_chat)
        else:
            # Update existing chat
            user_chat.title = data.get('title', user_chat.title)
            user_chat.messages = json.dumps(data.get('messages', []))
            user_chat.custom_instruction = data.get('customInstruction', user_chat.custom_instruction)
            user_chat.model = data.get('model', user_chat.model)
            user_chat.updated_at = datetime.utcnow()
        
        db.session.commit()
        return jsonify({'message': 'Chat saved successfully'}), 200
        
    except Exception as e:
        logger.error(f"Save user chat error: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to save chat'}), 500

@app.route('/chats/<chat_id>', methods=['DELETE'])
@login_required
def delete_user_chat(chat_id):
    """Delete a chat for the authenticated user."""
    try:
        user = get_current_user()
        user_chat = UserChat.query.filter_by(user_id=user.id, chat_id=chat_id).first()
        
        if not user_chat:
            return jsonify({'error': 'Chat not found'}), 404
        
        db.session.delete(user_chat)
        db.session.commit()
        
        return jsonify({'message': 'Chat deleted successfully'}), 200
        
    except Exception as e:
        logger.error(f"Delete user chat error: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to delete chat'}), 500


# --- API Endpoints (No changes to the logic inside these endpoints) ---
@app.route('/chat-stream', methods=['POST'])
def chat_stream():
    if not GEMINI_API_KEY:
        return format_error("Streaming is offline: API Key not configured.", 503)
    try:
        data = request.get_json()
        history = data.get('history', [])
        custom_instruction = data.get('customInstruction')
        last_user_turn = history[-1]
        message_parts = []
        user_query = ""
        for part in last_user_turn.get('parts', []):
            if 'text' in part:
                user_query = part['text']
                message_parts.append(part['text'])
            elif 'inline_data' in part:
                b64_data = part['inline_data']['data']
                img = Image.open(io.BytesIO(base64.b64decode(b64_data)))
                message_parts.append(img)

        search_keywords = ["what is", "who is", "latest", "news", "weather", "find", "link", "video", "current", "stock price"]
        needs_search = any(keyword in user_query.lower() for keyword in search_keywords)

        if needs_search and TAVILY_API_KEY:
            logger.info(f"Keyword trigger found. Performing search for query: '{user_query}'")
            search_results = perform_search(user_query)
            augmented_prompt = None
            if search_results and search_results.get("results"):
                context = "Search Results:\n"
                for result in search_results["results"]:
                    context += f"- Source: {result['url']}\n  Content: {result['content']}\n"
                augmented_prompt = f"Based on the following real-time search results, please answer the user's question.\n\n{context}\n\nUser's Question: {user_query}"
            else:
                augmented_prompt = f"A real-time information search was attempted for the user's query but it failed. Please inform the user that you were unable to access live information, then try to answer based on your existing knowledge. User's original question was: {user_query}"

            for i, part in enumerate(message_parts):
                if isinstance(part, str):
                    message_parts[i] = augmented_prompt
                    break
        else:
            logger.info("No search keywords found or Tavily key missing. Skipping search.")

        chat_history_for_model = history[:-1]
        model_to_use = default_streaming_model
        if custom_instruction:
            model_to_use = genai.GenerativeModel('gemini-2.5-pro', system_instruction=custom_instruction)

        def generate():
            chat_session = model_to_use.start_chat(history=chat_history_for_model)
            response_stream = chat_session.send_message(message_parts, stream=True)
            for chunk in response_stream:
                if chunk.text: yield chunk.text

        return Response(generate(), mimetype='text/plain')
    except Exception as e:
        logger.error(f"Streaming chat error: {e}", exc_info=True)
        return format_error("A quantum fluctuation disrupted the stream.", 500)

@app.route('/generate-doc', methods=['POST'])
def generate_doc():
    if not GEMINI_API_KEY:
        return format_error("Document generation is offline.", 503)
    try:
        data = request.get_json()
        prompt = data.get('prompt')
        doc_type = data.get('docType', 'pdf')
        length = data.get('length', 'medium')
        if not prompt:
            return format_error("A prompt is required to generate a document.", 400)

        length_map = {
            "short": "a concise summary of about 400 words",
            "medium": "a detailed explanation of about 800 words",
            "detailed": "a comprehensive report of about 1500 words"
        }

        formatting_instruction = ""
        if length == "detailed":
            if doc_type == "pdf":
                formatting_instruction = "Please structure the content with markdown headings (e.g., '## Introduction')."
            elif doc_type == "pptx":
                formatting_instruction = "Please structure the content with slide titles, each starting with 'Slide Title:'. For example: 'Slide Title: The Main Idea'."

        doc_prompt = f"Generate content for a document about '{prompt}'. The content should be {length_map.get(length, 'a detailed explanation of about 500 words')}. {formatting_instruction}"

        response = default_streaming_model.generate_content(doc_prompt)
        content = response.text

        title_response = title_model.generate_content(f"Create a title for a document about: {prompt}")
        title = json.loads(title_response.text).get('title', prompt[:30])

        filename = f"astranova_{uuid.uuid4().hex[:8]}"
        image_path = None

        if doc_type == 'pptx':
            try:
                logger.info("Generating cover image for presentation...")
                image_prompt = f"An abstract, visually appealing background image related to the concept of '{prompt}'. Minimalist, professional, with a blue and gold color palette."
                api_url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key={GEMINI_API_KEY}"
                payload = {"instances": [{"prompt": image_prompt}], "parameters": {"sampleCount": 1}}
                headers = {'Content-Type': 'application/json'}
                api_response = requests.post(api_url, headers=headers, json=payload)
                api_response.raise_for_status()
                result = api_response.json()
                if result.get("predictions") and result["predictions"][0].get("bytesBase64Encoded"):
                    image_b64 = result["predictions"][0]["bytesBase64Encoded"]
                    image_data = base64.b64decode(image_b64)
                    image_path = os.path.join(app.config['DOWNLOAD_FOLDER'], f"temp_cover_{filename}.png")
                    with open(image_path, 'wb') as f:
                        f.write(image_data)
                    logger.info(f"Cover image saved to {image_path}")
            except Exception as e:
                logger.error(f"Failed to generate cover image: {e}")


        if doc_type == 'pptx':
            file_stream = create_ppt(title, content, image_path)
            filename += ".pptx"
        else:
            file_stream = create_pdf(title, content)
            filename += ".pdf"

        filepath = os.path.join(app.config['DOWNLOAD_FOLDER'], filename)
        with open(filepath, 'wb') as f:
            f.write(file_stream.getbuffer())

        if image_path and os.path.exists(image_path):
            os.remove(image_path)

        return jsonify({'success': True, 'downloadUrl': f'/downloads/{filename}', 'filename': filename})

    except Exception as e:
        logger.error(f"Document generation error: {e}", exc_info=True)
        return format_error("The document forge malfunctioned.", 500)

@app.route('/generate-theme', methods=['POST'])
def generate_theme():
    if not GEMINI_API_KEY:
        return format_error("Theme generation is offline.", 503)
    try:
        data = request.get_json()
        prompt = data.get('prompt')
        if not prompt:
            return format_error("A prompt is required to generate a theme.", 400)

        logger.info(f"Generating theme with prompt: '{prompt}'")

        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-ultra-generate-001:predict?key={GEMINI_API_KEY}"
        full_prompt = f"A beautiful, high-resolution, scenic background image of: {prompt}. Widescreen 16:9, cinematic, desktop wallpaper, 4k."
        payload = {"instances": [{"prompt": full_prompt}], "parameters": {"sampleCount": 1}}
        headers = {'Content-Type': 'application/json'}
        api_response = requests.post(api_url, headers=headers, json=payload)
        api_response.raise_for_status()

        result = api_response.json()
        if result.get("predictions") and result["predictions"][0].get("bytesBase64Encoded"):
            return jsonify({'success': True, 'image_b64': result["predictions"][0]["bytesBase64Encoded"]})

        raise Exception("No image data was generated by the API for the theme.")

    except Exception as e:
        logger.error(f"Theme generation error: {e}", exc_info=True)
        return format_error("The theme forge malfunctioned.", 500)


@app.route('/downloads/<filename>')
def download_file(filename):
    return send_from_directory(app.config['DOWNLOAD_FOLDER'], filename, as_attachment=True)

@app.route('/summarize', methods=['POST'])
def summarize_chat():
    if not GEMINI_API_KEY: return format_error("Summarization is offline.", 503)
    try:
        data = request.get_json()
        history = data.get('history', [])
        transcript = ""
        for turn in history:
            role = "Observer" if turn['role'] == 'model' else "Interlocutor"
            text_parts = [part['text'] for part in turn['parts'] if 'text' in part]
            if text_parts: transcript += f"{role}: {' '.join(text_parts)}\n\n"
        summary_prompt = f"As AstraNova, poetically and analytically summarize this dialogue:\n\n---\n{transcript}---\n"
        def generate_summary():
            response_stream = default_streaming_model.generate_content([summary_prompt], stream=True)
            for chunk in response_stream:
                if chunk.text: yield chunk.text
        return Response(generate_summary(), mimetype='text/plain')
    except Exception as e:
        logger.error(f"Summarization error: {e}", exc_info=True)
        return format_error("A cosmic memory corruption occurred.", 500)

@app.route('/generate-image', methods=['POST'])
def generate_image():
    if not GEMINI_API_KEY: return format_error("Image generation is offline: GOOGLE_API_KEY is not configured.", 503)
    try:
        data = request.get_json()
        prompt = data.get('prompt')
        if not prompt: raise ValueError("Prompt is required")
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key={GEMINI_API_KEY}"
        payload = {"instances": [{"prompt": prompt}], "parameters": {"sampleCount": 1}}
        headers = {'Content-Type': 'application/json'}
        api_response = requests.post(api_url, headers=headers, json=payload)
        api_response.raise_for_status()
        result = api_response.json()
        if result.get("predictions") and result["predictions"][0].get("bytesBase64Encoded"):
            return jsonify({'success': True, 'image_b64': result["predictions"][0]["bytesBase64Encoded"]})
        raise Exception("No image data in response")
    except Exception as e:
        logger.error(f"Image generation error: {e}", exc_info=True)
        return format_error("The stellar forge malfunctioned.", 500)

@app.route('/generate-title', methods=['POST'])
def generate_title():
    try:
        data = request.get_json()
        prompt = data['message']
        response = title_model.generate_content(prompt)
        title_data = json.loads(response.text)
        return jsonify({'success': True, 'title': title_data.get('title', 'New Chat')[:50]})
    except Exception as e:
        logger.error(f"Title generation error: {e}", exc_info=True)
        return format_error("Could not generate title.", 500)

# --- CORRECTED: Main Route to Serve the App ---
@app.route('/')
def index():
    """Renders the main HTML page."""
    return render_template('index.html')

# --- REMOVED Redundant 'serve' and 'not_found' routes ---
# Flask handles these automatically with the main index route.

# --- Database Initialization ---
def init_db():
    """Initialize the database tables."""
    try:
        with app.app_context():
            db.create_all()
            logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")

# --- Startup ---
if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, threaded=True)
