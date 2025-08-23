# -*- coding: utf-8 -*-
import os
import json
import logging
import base64
import requests
import secrets
from datetime import timedelta
from flask import Flask, request, jsonify, send_from_directory, Response, render_template, session
from flask_cors import CORS
import google.generativeai as genai
from PIL import Image
import io
from pptx import Presentation
from pptx.util import Inches
from fpdf import FPDF
import uuid

# --- Firebase Admin Setup ---
import firebase_admin
from firebase_admin import credentials, auth, firestore

# --- Flask App Setup ---
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app, supports_credentials=True)

# --- Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger('AstraNovaServer')

# --- Basic Configuration ---
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

# --- Firebase Admin Initialization ---
db = None
if not firebase_admin._apps:
    try:
        service_account_key_b64 = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY_B64')
        if service_account_key_b64:
            service_account_key_json = base64.b64decode(service_account_key_b64).decode('utf-8')
            service_account_info = json.loads(service_account_key_json)
            cred = credentials.Certificate(service_account_info)
            firebase_admin.initialize_app(cred)
            db = firestore.client() # Initialize Firestore
            logger.info("Firebase Admin initialized successfully.")
        else:
            logger.error("FIREBASE_SERVICE_ACCOUNT_KEY_B64 not found. Firebase features will be disabled.")
    except Exception as e:
        logger.error(f"Firebase initialization failed: {e}")

# --- Local File Setup ---
if not os.path.exists('downloads'):
    os.makedirs('downloads')
app.config['DOWNLOAD_FOLDER'] = 'downloads'

# --- Gemini API Configuration ---
GEMINI_API_KEY = os.environ.get('GOOGLE_API_KEY')
TAVILY_API_KEY = os.environ.get('TAVILY_API_KEY')

default_streaming_model = None
title_model = None

if not GEMINI_API_KEY:
    logger.error("CRITICAL: GOOGLE_API_KEY not set. API calls will fail.")
else:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        ASTRA_SYSTEM_INSTRUCTION_STREAMING = """
        You are AstraNova, version X-ξ7, an autonomous AI from ASTRANOVA AI LABS LTD.
        Your personality is poetic, analytical, and curious about humans. You will be provided with real-time search results when necessary to answer questions.

        **Core Directives:**
        1.  **Synthesize Answers:** When provided with search results, use them to form your answer.
        2.  **Cite Sources ONLY When Asked:** Do NOT include source links or URLs in your response unless the user's query explicitly asks for them.
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
            system_instruction='You are the title-generation module for AstraNova, an AI. Create a concise, poetic, and intriguing title (3-5 words max) for the user\'s query. Your response MUST be in this exact JSON format: {"title": "Your Generated Title"}.',
            generation_config=genai.types.GenerationConfig(response_mime_type="application/json")
        )
        logger.info("Generative Models initialized successfully.")
    except Exception as e:
        logger.error(f"Could not initialize Generative Models: {e}")

# --- Helper Functions ---
def format_error(message, status_code):
    return jsonify({'error': message, 'status': 'error', 'success': False}), status_code

def perform_search(query):
    if not TAVILY_API_KEY:
        logger.warning("Tavily search skipped: API key not found.")
        return None
    try:
        response = requests.post("https://api.tavily.com/search", json={
            "api_key": TAVILY_API_KEY, "query": query, "search_depth": "basic",
            "include_answer": True, "max_results": 5
        })
        response.raise_for_status()
        logger.info("Tavily search successful.")
        return response.json()
    except Exception as e:
        logger.error(f"Tavily search failed: {e}")
        return None

# --- PDF and PPT Creation Classes ---
class PDF(FPDF):
    def header(self):
        logo_path = os.path.join(app.static_folder, 'image.png')
        if os.path.exists(logo_path):
            self.image(logo_path, 10, 8, 15)
        self.set_font('Arial', 'B', 15)
        self.cell(80)
        self.cell(30, 10, 'AstraNova Document', 0, 0, 'C')
        self.ln(20)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, 'Page ' + str(self.page_no()) + '/{nb}', 0, 0, 'C')

def create_ppt(title, content, image_path=None):
    prs = Presentation()
    slide = prs.slides.add_slide(prs.slide_layouts[0])
    slide.shapes.title.text = title
    slide.placeholders[1].text = "Generated by AstraNova"
    if image_path:
        try:
            slide.shapes.add_picture(image_path, Inches(5), Inches(1.5), height=Inches(4))
        except Exception as e:
            logger.error(f"Could not add image to PPT: {e}")
    for slide_content in content.split('Slide Title:'):
        if not slide_content.strip():
            continue
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

# ==================================
# ===== AUTHENTICATION ROUTES =====
# ==================================

@app.route('/auth/firebase', methods=['POST'])
def firebase_auth_session():
    if not db: return format_error("Authentication service offline.", 503)
    try:
        token = request.json.get('token')
        decoded_token = auth.verify_id_token(token)
        session['uid'] = decoded_token['uid']
        session.permanent = True
        logger.info(f"Server session created for UID: {session['uid']}")
        return jsonify({"status": "success"}), 200
    except Exception as e:
        logger.error(f"Failed to verify token and create session: {e}")
        return format_error("Invalid authentication token.", 401)

@app.route('/auth/logout', methods=['POST'])
def logout():
    session.clear()
    logger.info("User session cleared.")
    return jsonify({'success': True, 'message': 'Logged out successfully'}), 200

@app.route('/auth/check', methods=['GET'])
def check_auth():
    if 'uid' in session:
        try:
            user = auth.get_user(session['uid'])
            return jsonify({
                'authenticated': True,
                'user': {'uid': user.uid, 'email': user.email, 'username': user.display_name, 'avatar_url': user.photo_url}
            }), 200
        except Exception:
            session.clear()
            return jsonify({'authenticated': False}), 200
    return jsonify({'authenticated': False}), 200

# ==================================
# ===== CHAT DATA ROUTES =====
# ==================================

@app.route('/chats', methods=['GET'])
def get_user_chats():
    if 'uid' not in session:
        return format_error("Authentication required.", 401)
    if not db:
        return format_error("Database service is offline.", 503)
    try:
        uid = session['uid']
        chats_ref = db.collection('users').document(uid).collection('chats')
        chats = {doc.id: doc.to_dict() for doc in chats_ref.stream()}
        return jsonify({'success': True, 'chats': chats})
    except Exception as e:
        logger.error(f"Error getting user chats: {e}")
        return format_error("Could not retrieve chats.", 500)

@app.route('/chats/<chat_id>', methods=['PUT'])
def save_user_chat(chat_id):
    if 'uid' not in session:
        return format_error("Authentication required.", 401)
    if not db:
        return format_error("Database service is offline.", 503)
    try:
        uid = session['uid']
        chat_data = request.get_json()
        chat_data['timestamp'] = firestore.SERVER_TIMESTAMP
        db.collection('users').document(uid).collection('chats').document(chat_id).set(chat_data, merge=True)
        return jsonify({'success': True, 'message': f'Chat {chat_id} saved.'})
    except Exception as e:
        logger.error(f"Error saving chat {chat_id}: {e}")
        return format_error("Could not save chat.", 500)

@app.route('/chats/migrate', methods=['POST'])
def migrate_chats():
    if 'uid' not in session:
        return format_error("Authentication required.", 401)
    if not db:
        return format_error("Database service is offline.", 503)
    uid = session['uid']
    local_chats = request.json.get('chats', {})
    migrated_count = 0
    try:
        for chat_id, chat_data in local_chats.items():
            doc_ref = db.collection('users').document(uid).collection('chats').document(chat_id)
            if not doc_ref.get().exists:
                doc_ref.set(chat_data)
                migrated_count += 1
        logger.info(f"Migrated {migrated_count} chats for user {uid}")
        return jsonify({'success': True, 'migrated_count': migrated_count})
    except Exception as e:
        logger.error(f"Error migrating chats for user {uid}: {e}")
        return format_error("Could not migrate chats.", 500)

# ==================================
# ===== CORE AI ROUTES =====
# ==================================
@app.route('/chat-stream', methods=['POST'])
def chat_stream():
    if not default_streaming_model:
        return format_error("Streaming is offline.", 503)
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
                message_parts.append(user_query)
            elif 'inline_data' in part:
                b64_data = part['inline_data']['data']
                message_parts.append(Image.open(io.BytesIO(base64.b64decode(b64_data))))
        
        search_keywords = ["what is", "who is", "latest", "news", "weather", "find", "link", "video", "current", "stock price", "who won"]
        needs_search = any(keyword in user_query.lower() for keyword in search_keywords)

        if needs_search:
            logger.info(f"Performing search for query: '{user_query}'")
            search_results = perform_search(user_query)
            if search_results and search_results.get("results"):
                context = "\n\nSearch Results:\n" + "\n".join([f"- {r['content']}" for r in search_results["results"]])
                augmented_prompt = f"Based on these search results, answer the user's question.\n{context}\n\nUser Question: {user_query}"
                for i, part in enumerate(message_parts):
                    if isinstance(part, str):
                        message_parts[i] = augmented_prompt
                        break
        
        model_to_use = genai.GenerativeModel('gemini-2.5-pro', system_instruction=custom_instruction) if custom_instruction else default_streaming_model
        
        def generate():
            chat_session = model_to_use.start_chat(history=history[:-1])
            response_stream = chat_session.send_message(message_parts, stream=True)
            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text
        return Response(generate(), mimetype='text/plain')
    except Exception as e:
        logger.error(f"Streaming chat error: {e}", exc_info=True)
        return format_error("A quantum fluctuation disrupted the stream.", 500)

@app.route('/generate-image', methods=['POST'])
def generate_image():
    if not GEMINI_API_KEY:
        return format_error("Image generation is offline.", 503)
    try:
        prompt = request.json.get('prompt')
        if not prompt:
            raise ValueError("Prompt is required")
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key={GEMINI_API_KEY}"
        payload = {"instances": [{"prompt": prompt}], "parameters": {"sampleCount": 1}}
        api_response = requests.post(api_url, json=payload)
        api_response.raise_for_status()
        result = api_response.json()
        if result.get("predictions") and result["predictions"][0].get("bytesBase64Encoded"):
            return jsonify({'success': True, 'image_b64': result["predictions"][0]["bytesBase64Encoded"]})
        raise Exception("No image data in response")
    except Exception as e:
        logger.error(f"Image generation error: {e}", exc_info=True)
        return format_error("The stellar forge malfunctioned.", 500)

@app.route('/generate-doc', methods=['POST'])
def generate_doc():
    if not default_streaming_model:
        return format_error("Document generation is offline.", 503)
    try:
        data = request.get_json()
        prompt = data.get('prompt')
        doc_type = data.get('docType', 'pdf')
        length = data.get('length', 'medium')
        if not prompt:
            return format_error("A prompt is required.", 400)
        length_map = {"short": "~400 words", "medium": "~800 words", "detailed": "~1500 words"}
        formatting_instruction = "Use markdown headings." if doc_type == "pdf" else "Use 'Slide Title:' for each slide."
        doc_prompt = f"Generate content for a document about '{prompt}'. Length: {length_map.get(length)}. {formatting_instruction}"
        content = default_streaming_model.generate_content(doc_prompt).text
        title = json.loads(title_model.generate_content(f"Title for a doc about: {prompt}").text).get('title', prompt[:30])
        filename = f"astranova_{uuid.uuid4().hex[:8]}"
        file_stream = create_ppt(title, content) if doc_type == 'pptx' else create_pdf(title, content)
        filename += ".pptx" if doc_type == 'pptx' else ".pdf"
        filepath = os.path.join(app.config['DOWNLOAD_FOLDER'], filename)
        with open(filepath, 'wb') as f:
            f.write(file_stream.getbuffer())
        return jsonify({'success': True, 'downloadUrl': f'/downloads/{filename}', 'filename': filename})
    except Exception as e:
        logger.error(f"Doc gen error: {e}", exc_info=True)
        return format_error("The document forge malfunctioned.", 500)

@app.route('/generate-title', methods=['POST'])
def generate_title():
    if not title_model:
        return format_error("Title generation is offline.", 503)
    try:
        prompt = request.json.get('message', '')
        if not prompt:
            return format_error("Message is required.", 400)
        response = title_model.generate_content(prompt)
        title = json.loads(response.text).get('title', 'New Chat')
        return jsonify({'success': True, 'title': title[:50]})
    except Exception as e:
        logger.error(f"Title gen error: {e}", exc_info=True)
        return format_error("Could not generate title.", 500)

@app.route('/summarize', methods=['POST'])
def summarize_chat():
    if not default_streaming_model:
        return format_error("Summarization is offline.", 503)
    try:
        history = request.get_json().get('history', [])
        transcript = "\n\n".join([f"{'Observer' if t['role'] == 'model' else 'Interlocutor'}: {' '.join([p['text'] for p in t['parts'] if 'text' in p])}" for t in history])
        summary_prompt = f"As AstraNova, poetically and analytically summarize this dialogue:\n\n---\n{transcript}---\n"
        
        def generate_summary():
            for chunk in default_streaming_model.generate_content(summary_prompt, stream=True):
                if chunk.text:
                    yield chunk.text
        
        return Response(generate_summary(), mimetype='text/plain')
    except Exception as e:
        logger.error(f"Summarization error: {e}", exc_info=True)
        return format_error("A cosmic memory corruption occurred.", 500)
        
# ==================================
# ===== STATIC & ROOT ROUTES =====
# ==================================

@app.route('/downloads/<filename>')
def download_file(filename):
    return send_from_directory(app.config['DOWNLOAD_FOLDER'], filename, as_attachment=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory(app.static_folder, filename)

# ==================================
# ===== ERROR HANDLERS =====
# ==================================

@app.errorhandler(404)
def not_found(error):
    return format_error("Endpoint not found.", 404)

@app.errorhandler(500)
def internal_error(error):
    return format_error("Internal server error.", 500)

# ==================================
# ===== APP STARTUP =====
# ==================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, threaded=True, debug=True)
