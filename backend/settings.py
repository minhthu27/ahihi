from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from config.db import db
from bson.objectid import ObjectId
import logging
import os
from werkzeug.security import generate_password_hash, check_password_hash
from config.config import Config

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create Blueprint
settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile_settings():
    """Get user profile settings"""
    try:
        # Get current user ID from JWT
        current_user_id = get_jwt_identity()
        
        # Find user in database
        user = db.users.find_one({"_id": ObjectId(current_user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Return user settings data
        return jsonify({
            "fullname": user.get("fullname", ""),
            "username": user.get("username", ""),
            "email": user.get("email", ""),
            "bio": user.get("bio", ""),
            "avatar": user.get("avatar", ""),
            "cover": user.get("cover", ""),
            "theme": user.get("theme", "light"),
            "notification_settings": user.get("notification_settings", {
                "email_notifications": True,
                "push_notifications": True,
                "new_follower": True,
                "post_likes": True,
                "post_comments": True,
                "mentions": True
            }),
            "privacy_settings": user.get("privacy_settings", {
                "profile_visibility": "public",
                "post_visibility": "public",
                "show_online_status": True
            })
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting profile settings: {str(e)}")
        return jsonify({"error": "Failed to get profile settings"}), 500

@settings_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile_settings():
    """Update user profile settings"""
    try:
        # Get current user ID from JWT
        current_user_id = get_jwt_identity()
        
        # Get request data
        data = request.json
        
        # Validate data
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Find user in database
        user = db.users.find_one({"_id": ObjectId(current_user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Check if username is being changed and if it's already taken
        if "username" in data and data["username"] != user["username"]:
            existing_user = db.users.find_one({"username": data["username"]})
            if existing_user:
                return jsonify({"error": "Username already taken"}), 400
        
        # Check if email is being changed and if it's already taken
        if "email" in data and data["email"] != user["email"]:
            existing_user = db.users.find_one({"email": data["email"]})
            if existing_user:
                return jsonify({"error": "Email already taken"}), 400
        
        # Update user data
        update_data = {}
        allowed_fields = ["fullname", "username", "email", "bio"]
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        # Update user in database
        db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$set": update_data}
        )
        
        return jsonify({"success": True, "message": "Profile settings updated successfully"}), 200
        
    except Exception as e:
        logger.error(f"Error updating profile settings: {str(e)}")
        return jsonify({"error": "Failed to update profile settings"}), 500

@settings_bp.route('/password', methods=['PUT'])
@jwt_required()
def update_password():
    """Update user password"""
    try:
        # Get current user ID from JWT
        current_user_id = get_jwt_identity()
        
        # Get request data
        data = request.json
        
        # Validate data
        if not data or "current_password" not in data or "new_password" not in data:
            return jsonify({"error": "Current password and new password are required"}), 400
        
        # Find user in database
        user = db.users.find_one({"_id": ObjectId(current_user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Verify current password
        if not check_password_hash(user["password"], data["current_password"]):
            return jsonify({"error": "Current password is incorrect"}), 400
        
        # Hash new password
        hashed_password = generate_password_hash(data["new_password"])
        
        # Update password in database
        db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$set": {"password": hashed_password}}
        )
        
        return jsonify({"success": True, "message": "Password updated successfully"}), 200
        
    except Exception as e:
        logger.error(f"Error updating password: {str(e)}")
        return jsonify({"error": "Failed to update password"}), 500

@settings_bp.route('/theme', methods=['PUT'])
@jwt_required()
def update_theme():
    """Update user theme preference"""
    try:
        # Get current user ID from JWT
        current_user_id = get_jwt_identity()
        
        # Get request data
        data = request.json
        
        # Validate data
        if not data or "theme" not in data:
            return jsonify({"error": "Theme preference is required"}), 400
        
        if data["theme"] not in ["light", "dark"]:
            return jsonify({"error": "Invalid theme preference"}), 400
        
        # Update theme in database
        db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$set": {"theme": data["theme"]}}
        )
        
        return jsonify({"success": True, "message": "Theme updated successfully"}), 200
        
    except Exception as e:
        logger.error(f"Error updating theme: {str(e)}")
        return jsonify({"error": "Failed to update theme"}), 500

@settings_bp.route('/notifications', methods=['PUT'])
@jwt_required()
def update_notification_settings():
    """Update user notification settings"""
    try:
        # Get current user ID from JWT
        current_user_id = get_jwt_identity()
        
        # Get request data
        data = request.json
        
        # Validate data
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Update notification settings in database
        db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$set": {"notification_settings": data}}
        )
        
        return jsonify({"success": True, "message": "Notification settings updated successfully"}), 200
        
    except Exception as e:
        logger.error(f"Error updating notification settings: {str(e)}")
        return jsonify({"error": "Failed to update notification settings"}), 500

@settings_bp.route('/privacy', methods=['PUT'])
@jwt_required()
def update_privacy_settings():
    """Update user privacy settings"""
    try:
        # Get current user ID from JWT
        current_user_id = get_jwt_identity()
        
        # Get request data
        data = request.json
        
        # Validate data
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Update privacy settings in database
        db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$set": {"privacy_settings": data}}
        )
        
        return jsonify({"success": True, "message": "Privacy settings updated successfully"}), 200
        
    except Exception as e:
        logger.error(f"Error updating privacy settings: {str(e)}")
        return jsonify({"error": "Failed to update privacy settings"}), 500

@settings_bp.route('/avatar', methods=['POST'])
@jwt_required()
def update_avatar():
    """Update user avatar"""
    try:
        # Get current user ID from JWT
        current_user_id = get_jwt_identity()
        
        # Check if file is in request
        if 'avatar' not in request.files:
            return jsonify({"error": "No avatar file provided"}), 400
        
        avatar_file = request.files['avatar']
        
        # Check if file is empty
        if avatar_file.filename == '':
            return jsonify({"error": "No avatar file selected"}), 400
        
        # Save file
        filename = f"avatar_{current_user_id}_{os.path.basename(avatar_file.filename)}"
        filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
        avatar_file.save(filepath)
        
        # Update avatar path in database
        avatar_url = f"/static/uploads/{filename}"
        db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$set": {"avatar": avatar_url}}
        )
        
        return jsonify({
            "success": True, 
            "message": "Avatar updated successfully",
            "avatar": avatar_url
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating avatar: {str(e)}")
        return jsonify({"error": "Failed to update avatar"}), 500

@settings_bp.route('/cover', methods=['POST'])
@jwt_required()
def update_cover():
    """Update user cover image"""
    try:
        # Get current user ID from JWT
        current_user_id = get_jwt_identity()
        
        # Check if file is in request
        if 'cover' not in request.files:
            return jsonify({"error": "No cover file provided"}), 400
        
        cover_file = request.files['cover']
        
        # Check if file is empty
        if cover_file.filename == '':
            return jsonify({"error": "No cover file selected"}), 400
        
        # Save file
        filename = f"cover_{current_user_id}_{os.path.basename(cover_file.filename)}"
        filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
        cover_file.save(filepath)
        
        # Update cover path in database
        cover_url = f"/static/uploads/{filename}"
        db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$set": {"cover": cover_url}}
        )
        
        return jsonify({
            "success": True, 
            "message": "Cover image updated successfully",
            "cover": cover_url
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating cover image: {str(e)}")
        return jsonify({"error": "Failed to update cover image"}), 500
