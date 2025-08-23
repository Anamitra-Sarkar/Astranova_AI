AstraNova AI 🚀
A sophisticated, full-stack conversational AI web application featuring a dynamic, customizable user interface and a powerful Python backend powered by Google's Gemini and Imagen models.

✨ Features
Multi-Modal AI: Seamlessly switch between different AI models:

AstraNova Pro: For advanced conversational chat, vision capabilities, and real-time web search.

AstraNova Imaging: For high-quality text-to-image generation.

AstraNova Docs: For generating PDF and PPTX documents from a simple prompt.

Rich User Interface:

Full Theming: Light/dark modes, multiple font choices, and dynamic backgrounds (pre-set or AI-generated).

Glassmorphism Design: Modern, semi-transparent UI elements.

Responsive Layout: Excellent user experience on desktop and mobile devices.

Firebase Authentication: Secure user sign-up, sign-in (email/password & Google), and session management.

Cloud-Synced Chats: User conversations are saved to Firestore and synced across sessions.

Interactive Chat Experience:

Streaming Responses: AI responses are streamed in real-time.

Markdown & Code Highlighting: Beautifully rendered responses with support for various programming languages.

Voice Input & Output: Use your voice to interact with the AI and have responses spoken back to you.

Image Uploads: Analyze images in your conversations with the vision-enabled model.

🛠️ Tech Stack
Frontend:

HTML5, CSS3, JavaScript (ES6+)

Styling: Tailwind CSS

Icons: Lucide Icons

Firebase SDK (Client): For handling user authentication.

Backend:

Framework: Python 3.11+ with Flask

Package Manager: Poetry

AI Models: Google Generative AI (Gemini 1.5 Pro, Gemini 1.5 Flash, Imagen 4)

Database: Google Firestore (for user data and chat history)

Web Server: Gunicorn

Deployment:

Render (or any platform supporting Python web services)

⚙️ Setup and Installation
1. Clone the Repository
git clone [https://github.com/Anamitra-Sarkar/Astranova_AI.git](https://github.com/Anamitra-Sarkar/Astranova_AI.git)
cd Astranova_AI

2. Set Up the Backend
Install Poetry: If you don't have it, follow the official instructions at poetry.eustace.io.

Install Dependencies: Poetry will read the pyproject.toml file and install all necessary Python packages.

poetry install

3. Environment Variables
Create a file named .env in the root directory of the project. This file will store your secret keys and API credentials.

Important: Do not commit the .env file to your repository. The .gitignore file should already be configured to ignore it.

# A strong, random string for Flask session security
SECRET_KEY='your_super_secret_flask_key'

# Your Google AI Studio API Key for Gemini
GOOGLE_API_KEY='your_google_api_key'

# (Optional) Your Tavily API Key for the real-time search feature
TAVILY_API_KEY='your_tavily_api_key'

# Your Firebase Admin SDK credentials
# 1. Go to Firebase Console -> Project Settings -> Service Accounts
# 2. Click "Generate new private key"
# 3. Open the downloaded JSON file, copy its entire content.
# 4. Paste it into an online Base64 encoder and copy the resulting string.
# 5. Paste the Base64 string here.
FIREBASE_SERVICE_ACCOUNT_KEY_B64='your_base64_encoded_firebase_service_account_key'

4. Run the Application
Activate the virtual environment:

poetry shell

Run the Flask server:

flask run

The application should now be running on http://127.0.0.1:5000.

☁️ Deployment
This application is configured for deployment on platforms like Render.

Build Command: poetry install

Start Command: gunicorn main:app

Ensure you set the same environment variables in your hosting provider's "Secrets" or "Environment Variables" section.

📄 License
This project is licensed under the MIT License. See the LICENSE file for details.
