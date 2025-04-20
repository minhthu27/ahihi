from flask import Flask, render_template, redirect, url_for, send_from_directory, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity, verify_jwt_in_request
from backend.auth import auth_bp
from backend.profile import profile_bp
from backend.posts import posts_bp
from backend.users import users_bp
import os
from dotenv import load_dotenv
from config.config import Config
from scripts.seed_data import seed_database
from scripts.create_default_assets import create_default_assets
from config.db import db
from bson.objectid import ObjectId
import logging
from backend.comments import comments_bp
load_dotenv()
from backend.search import search_bp
# Add this line to register the settings blueprint
from backend.settings import settings_bp
from backend.notifications import notifications_bp
from backend.messages import messages_bp
from backend.admin import admin_bp
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Configure JWT
app.config['JWT_SECRET_KEY'] = Config.JWT_SECRET_KEY

jwt = JWTManager(app)
# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Add this after loading Config
logger.debug(f"Upload folder path: {Config.UPLOAD_FOLDER}")
logger.debug(f"Allow absolute paths: {Config.ALLOW_ABSOLUTE_PATHS}")

# Ensure upload directory exists
try:
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    logger.debug(f"Created upload directory: {Config.UPLOAD_FOLDER}")
except Exception as e:
    logger.error(f"Failed to create upload directory: {str(e)}")
# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(profile_bp, url_prefix='/api/profile')
app.register_blueprint(posts_bp, url_prefix='/api/posts')
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(comments_bp, url_prefix='/api/comments')
app.register_blueprint(search_bp, url_prefix='/api/search')
# Add this to the blueprint registrations
app.register_blueprint(settings_bp, url_prefix='/api/settings')
app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
app.register_blueprint(messages_bp, url_prefix='/api/messages')
app.register_blueprint(admin_bp)

# Ensure upload directory exists
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

# Create default assets and seed database
create_default_assets()
seed_database()

# Home/index route (includes login form)
@app.route('/')
@app.route('/index')
def index():
    return render_template('index.html')

# Register route
@app.route('/register')
def register():
    return render_template('register.html')

# Dashboard route
@app.route('/dashboard')
def dashboard():
    users = list(db.users.find().limit(5))
    user = None
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            user = db.users.find_one({"_id": ObjectId(identity)})
    except Exception as e:
        print("No valid JWT:", e)

    return render_template('dashboard.html', users=users, user=user)



# Profile route without user ID (current user's profile)
@app.route('/profile')
def profile():
    try:
        verify_jwt_in_request()
        identity = get_jwt_identity()
        if identity:
            return redirect(url_for('profile_with_id', user_id=identity))
        else:
            return redirect(url_for('index'))
    except Exception as e:
        print("JWT verification failed:", e)
        return redirect(url_for('index'))

# Profile route with user ID
@app.route('/profile/<user_id>')
def profile_with_id(user_id):
    current_user = None
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            current_user = db.users.find_one({"_id": ObjectId(identity)})
    except Exception as e:
        print("No valid JWT:", e)

    user = db.users.find_one({"_id": ObjectId(user_id)})

    if not user:
        return render_template("404.html"), 404

    return render_template("profile.html", user=user, current_user=current_user)



# Post detail route
@app.route('/post/<post_id>')
def post_detail(post_id):
    return render_template('post.html', post_id=post_id)

# Serve uploaded files
@app.route('/static/uploads/<filename>')
def uploaded_file(filename):
    logger.debug(f"Requested file: {filename}")
    logger.debug(f"Looking in: {Config.UPLOAD_FOLDER}")
    
    if os.path.exists(os.path.join(Config.UPLOAD_FOLDER, filename)):
        logger.debug(f"File exists: {filename}")
    else:
        logger.debug(f"File not found: {filename}")
    
    return send_from_directory(Config.UPLOAD_FOLDER, filename)

@app.route('/explore')
def explore():
    user = None
    try:
        verify_jwt_in_request(optional=True)  # Sử dụng optional=True để không bắt buộc đăng nhập
        identity = get_jwt_identity()
        if identity:
            user = db.users.find_one({"_id": ObjectId(identity)})
    except Exception as e:
        print("JWT verification optional:", e)

    return render_template('explore.html', user=user)

# Add this route for the settings page
@app.route('/settings')
def settings():
    return render_template('settings.html')

# Modify the notifications route to properly handle JWT authentication
@app.route('/notifications')
# @jwt_required()
def notifications():
    """Notifications page"""
    return render_template('notifications.html')
@app.route('/messages')
def messages():
    return render_template('messages.html')
if __name__ == '__main__':
    app.run(debug=True)
