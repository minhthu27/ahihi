from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from config.db import db, serialize_objectid
from bson.objectid import ObjectId
from werkzeug.utils import secure_filename
import os
import datetime
import time
from config.config import Config
import shutil
from backend.notification_handlers import handle_follow_notification


profile_bp = Blueprint("profile", __name__)

# Ensure upload directory exists
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)


def copy_external_image(file_path):
    """
    Copy an image from an external path to the upload folder
    """
    if not os.path.exists(file_path):
        return None
        
    # Get the filename from the path
    filename = os.path.basename(file_path)
    
    # Add timestamp to filename to make it unique
    timestamp = int(time.time())
    new_filename = f"{timestamp}_{filename}"
    
    # Create destination path
    destination = os.path.join(Config.UPLOAD_FOLDER, new_filename)
    
    # Copy the file
    shutil.copy2(file_path, destination)
    
    # Return the relative path for storage in the database
    return f"/static/uploads/{new_filename}"
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

@profile_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    current_user_id = get_jwt_identity()
    
    try:
        # Get current user
        user = db.users.find_one({"_id": ObjectId(current_user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get posts count
        posts_count = db.posts.count_documents({"author._id": ObjectId(current_user_id)})
        
        # Add posts count to user data
        user["postsCount"] = posts_count
        
        # Convert ObjectId to string
        user = serialize_objectid(user)
        
        return jsonify(user), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Keep this endpoint for backward compatibility
@profile_bp.route("/user/<username>", methods=["GET"])
@jwt_required()
def get_user_profile(username):
    current_user_id = get_jwt_identity()
    
    try:
        # Get user by username
        user = db.users.find_one({"username": username})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get posts count
        posts_count = db.posts.count_documents({"author.username": username})
        
        # Add posts count to user data
        user["postsCount"] = posts_count
        
        # Check if current user is following this user
        is_following = False
        if current_user_id:
            current_user = db.users.find_one({"_id": ObjectId(current_user_id)})
            if current_user and "following" in current_user:
                is_following = str(user["_id"]) in [str(id) for id in current_user.get("following", [])]
        
        user["isFollowing"] = is_following
        
        # Convert ObjectId to string
        user = serialize_objectid(user)
        
        return jsonify(user), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# New endpoint to get user profile by ID
@profile_bp.route("/user/id/<user_id>", methods=["GET"])
@jwt_required()
def get_user_profile_by_id(user_id):
    current_user_id = get_jwt_identity()
    
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(user_id):
            return jsonify({"error": "Invalid user ID"}), 400
            
        # Get user by ID
        user = db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get posts count
        posts_count = db.posts.count_documents({"author._id": ObjectId(user_id)})
        
        # Add posts count to user data
        user["postsCount"] = posts_count
        
        # Check if current user is following this user
        is_following = False
        if current_user_id:
            current_user = db.users.find_one({"_id": ObjectId(current_user_id)})
            if current_user and "following" in current_user:
                is_following = str(user_id) in [str(id) for id in current_user.get("following", [])]
        
        user["isFollowing"] = is_following
        
        # Convert ObjectId to string
        user = serialize_objectid(user)
        
        return jsonify(user), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Keep this endpoint for backward compatibility
@profile_bp.route("/followers/<username>", methods=["GET"])
@jwt_required()
def get_followers(username):
    current_user_id = get_jwt_identity()
    
    try:
        # Get user by username
        user = db.users.find_one({"username": username})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get followers
        follower_ids = user.get("followers", [])
        followers = []
        
        # Get current user's following list to check if they're following each follower
        current_user = db.users.find_one({"_id": ObjectId(current_user_id)})
        current_user_following = current_user.get("following", []) if current_user else []
        
        for follower_id in follower_ids:
            follower = db.users.find_one({"_id": follower_id})
            if follower:
                # Check if current user is following this follower
                is_following = str(follower["_id"]) in [str(id) for id in current_user_following]
                
                followers.append({
                    "_id": str(follower["_id"]),
                    "username": follower["username"],
                    "fullname": follower.get("fullname", follower["username"]),
                    "avatar": follower.get("avatar", "/static/uploads/default-avatar-1.jpg"),
                    "bio": follower.get("bio", ""),
                    "isFollowing": is_following
                })
        
        return jsonify(followers), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# New endpoint to get followers by user ID
@profile_bp.route("/followers/id/<user_id>", methods=["GET"])
@jwt_required()
def get_followers_by_id(user_id):
    current_user_id = get_jwt_identity()
    
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(user_id):
            return jsonify({"error": "Invalid user ID"}), 400
            
        # Get user by ID
        user = db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get followers
        follower_ids = user.get("followers", [])
        followers = []
        
        # Get current user's following list to check if they're following each follower
        current_user = db.users.find_one({"_id": ObjectId(current_user_id)})
        current_user_following = current_user.get("following", []) if current_user else []
        
        for follower_id in follower_ids:
            follower = db.users.find_one({"_id": follower_id})
            if follower:
                # Check if current user is following this follower
                is_following = str(follower["_id"]) in [str(id) for id in current_user_following]
                
                followers.append({
                    "_id": str(follower["_id"]),
                    "username": follower["username"],
                    "fullname": follower.get("fullname", follower["username"]),
                    "avatar": follower.get("avatar", "/static/uploads/default-avatar-1.jpg"),
                    "bio": follower.get("bio", ""),
                    "isFollowing": is_following
                })
        
        return jsonify(followers), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Keep this endpoint for backward compatibility
@profile_bp.route("/following/<username>", methods=["GET"])
@jwt_required()
def get_following(username):
    current_user_id = get_jwt_identity()
    
    try:
        # Get user by username
        user = db.users.find_one({"username": username})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get following
        following_ids = user.get("following", [])
        following = []
        
        # Get current user's following list to check if they're following each user
        current_user = db.users.find_one({"_id": ObjectId(current_user_id)})
        current_user_following = current_user.get("following", []) if current_user else []
        
        for following_id in following_ids:
            followed_user = db.users.find_one({"_id": following_id})
            if followed_user:
                # Check if current user is following this user
                is_following = str(followed_user["_id"]) in [str(id) for id in current_user_following]
                
                following.append({
                    "_id": str(followed_user["_id"]),
                    "username": followed_user["username"],
                    "fullname": followed_user.get("fullname", followed_user["username"]),
                    "avatar": followed_user.get("avatar", "/static/uploads/default-avatar-1.jpg"),
                    "bio": followed_user.get("bio", ""),
                    "isFollowing": is_following
                })
        
        return jsonify(following), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# New endpoint to get following by user ID
@profile_bp.route("/following/id/<user_id>", methods=["GET"])
@jwt_required()
def get_following_by_id(user_id):
    current_user_id = get_jwt_identity()
    
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(user_id):
            return jsonify({"error": "Invalid user ID"}), 400
            
        # Get user by ID
        user = db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get following
        following_ids = user.get("following", [])
        following = []
        
        # Get current user's following list to check if they're following each user
        current_user = db.users.find_one({"_id": ObjectId(current_user_id)})
        current_user_following = current_user.get("following", []) if current_user else []
        
        for following_id in following_ids:
            followed_user = db.users.find_one({"_id": following_id})
            if followed_user:
                # Check if current user is following this user
                is_following = str(followed_user["_id"]) in [str(id) for id in current_user_following]
                
                following.append({
                    "_id": str(followed_user["_id"]),
                    "username": followed_user["username"],
                    "fullname": followed_user.get("fullname", followed_user["username"]),
                    "avatar": followed_user.get("avatar", "/static/uploads/default-avatar-1.jpg"),
                    "bio": followed_user.get("bio", ""),
                    "isFollowing": is_following
                })
        
        return jsonify(following), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@profile_bp.route("/suggested", methods=["GET"])
@jwt_required()
def get_suggested_users():
    try:
        current_user_id = get_jwt_identity()
        current_user = db.users.find_one({"_id": ObjectId(current_user_id)})

        if not current_user:
            return jsonify({"error": "User not found"}), 404

        # Get users not in following list
        suggested_users = db.users.find({
            "_id": {"$nin": current_user.get("following", []) + [ObjectId(current_user_id)]}
        }).limit(5)

        result = []
        for user in suggested_users:
            result.append({
                "_id": str(user["_id"]),
                "username": user["username"],
                "fullname": user.get("fullname", user["username"]),
                "avatar": user.get("avatar", "/static/uploads/default-avatar-1.jpg")
            })

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Add a new endpoint to update user profile
@profile_bp.route("/update", methods=["POST"])
@jwt_required()
def update_profile():
    current_user_id = get_jwt_identity()
    
    try:
        # Get form data
        fullname = request.form.get("fullname", "")
        bio = request.form.get("bio", "")
        location = request.form.get("location", "")
        website = request.form.get("website", "")
        
        # Handle avatar upload
        avatar = None
        
        # Check for external avatar path first
        external_avatar_path = request.form.get("external_avatar_path")
        if external_avatar_path and Config.ALLOW_ABSOLUTE_PATHS:
            avatar = copy_external_image(external_avatar_path)
        
        # If no external avatar or it failed, check for uploaded file
        elif 'avatar' in request.files:
            file = request.files['avatar']
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                # Add timestamp to filename to avoid cache issues
                timestamp = int(time.time())
                filename = f"{timestamp}_{filename}"
                filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
                file.save(filepath)
                avatar = f"/static/uploads/{filename}"
        
        # Update user in database
        update_data = {
            "fullname": fullname,
            "bio": bio,
            "location": location,
            "website": website
        }
        
        # Only update avatar if a new one was uploaded
        if avatar:
            update_data["avatar"] = avatar
        
        # Update user
        db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$set": update_data}
        )
        
        # Get updated user
        user = db.users.find_one({"_id": ObjectId(current_user_id)})
        
        # Update user in posts
        if user:
            # Update author info in all posts by this user
            post_author_update = {
                "author.fullname": user.get("fullname", user["username"]),
                "author.avatar": user.get("avatar", "/static/uploads/default-avatar-1.jpg")
            }
            
            db.posts.update_many(
                {"author._id": ObjectId(current_user_id)},
                {"$set": post_author_update}
            )
        
        # Convert ObjectId to string
        user = serialize_objectid(user)
        
        return jsonify(user), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Add a new endpoint to follow a user
@profile_bp.route("/follow", methods=["POST"])
@jwt_required()
def follow_user():
    current_user_id = get_jwt_identity()
    
    try:
        # Get user ID to follow
        data = request.get_json()
        user_id = data.get("userId")
        
        if not user_id:
            return jsonify({"error": "User ID is required", "success": False}), 400
        
        # Validate ObjectId
        if not ObjectId.is_valid(user_id):
            return jsonify({"error": "Invalid user ID", "success": False}), 400
        
        # Check if user exists
        user_to_follow = db.users.find_one({"_id": ObjectId(user_id)})
        if not user_to_follow:
            return jsonify({"error": "User not found", "success": False}), 404
        
        # Check if already following
        current_user = db.users.find_one({"_id": ObjectId(current_user_id)})
        if current_user and "following" in current_user:
            following_ids = [str(id) for id in current_user["following"]]
            if str(user_id) in following_ids:
                return jsonify({
                    "error": "Already following this user", 
                    "success": False,
                    "isFollowing": True
                }), 400
        
        # Add to following list
        db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$addToSet": {"following": ObjectId(user_id)}}
        )
        
        # Add to followers list
        db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$addToSet": {"followers": ObjectId(current_user_id)}}
        )
        
        # Create follow notification
        handle_follow_notification(current_user_id, user_id)
        
        # Get updated follower count
        updated_user = db.users.find_one({"_id": ObjectId(user_id)})
        follower_count = len(updated_user.get("followers", []))
        
        # Get updated following count
        updated_current_user = db.users.find_one({"_id": ObjectId(current_user_id)})
        following_count = len(updated_current_user.get("following", []))
        
        return jsonify({
            "success": True, 
            "message": "Successfully followed user",
            "follower_count": follower_count,
            "following_count": following_count,
            "isFollowing": True
        }), 200
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500

# Add a new endpoint to unfollow a user
@profile_bp.route("/unfollow", methods=["POST"])
@jwt_required()
def unfollow_user():
    current_user_id = get_jwt_identity()
    
    try:
        # Get user ID to unfollow
        data = request.get_json()
        user_id = data.get("userId")
        
        if not user_id:
            return jsonify({"error": "User ID is required", "success": False}), 400
        
        # Validate ObjectId
        if not ObjectId.is_valid(user_id):
            return jsonify({"error": "Invalid user ID", "success": False}), 400
        
        # Check if user exists
        user_to_unfollow = db.users.find_one({"_id": ObjectId(user_id)})
        if not user_to_unfollow:
            return jsonify({"error": "User not found", "success": False}), 404
        
        # Check if not following
        current_user = db.users.find_one({"_id": ObjectId(current_user_id)})
        if current_user and "following" in current_user:
            following_ids = [str(id) for id in current_user["following"]]
            if str(user_id) not in following_ids:
                return jsonify({
                    "error": "Not following this user", 
                    "success": False,
                    "isFollowing": False
                }), 400
        
        # Remove from following list
        db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$pull": {"following": ObjectId(user_id)}}
        )
        
        # Remove from followers list
        db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$pull": {"followers": ObjectId(current_user_id)}}
        )
        
        # Get updated follower count
        updated_user = db.users.find_one({"_id": ObjectId(user_id)})
        follower_count = len(updated_user.get("followers", []))
        
        # Get updated following count
        updated_current_user = db.users.find_one({"_id": ObjectId(current_user_id)})
        following_count = len(updated_current_user.get("following", []))
        
        return jsonify({
            "success": True, 
            "message": "Successfully unfollowed user",
            "follower_count": follower_count,
            "following_count": following_count,
            "isFollowing": False
        }), 200
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500
