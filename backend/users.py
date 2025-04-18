from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from config.db import db, serialize_objectid
from bson.objectid import ObjectId
import logging
users_bp = Blueprint("users", __name__)
logger = logging.getLogger(__name__)
@users_bp.route("/suggested", methods=["GET"])
@jwt_required()
def get_suggested_users():
    try:
        current_user_id = get_jwt_identity()
        current_user = db.users.find_one({"_id": ObjectId(current_user_id)})

        if not current_user:
            return jsonify({"error": "User not found"}), 404

        # Get users not in following list
        following_ids = current_user.get("following", [])
        following_ids.append(ObjectId(current_user_id))  # Add current user to exclude list
        
        suggested_users = db.users.find({
            "_id": {"$nin": following_ids}
        }).limit(5)

        result = []
        for user in suggested_users:
            # Check if current user is following this user
            is_following = ObjectId(user["_id"]) in current_user.get("following", [])
            
            result.append({
                "_id": str(user["_id"]),
                "username": user["username"],
                "fullname": user.get("fullname", user["username"]),
                "avatar": user.get("avatar", "/static/uploads/default-avatar-1.jpg"),
                "isFollowing": is_following
            })

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
# Get users to discover (for explore page)
@users_bp.route('/discover', methods=['GET'])
@jwt_required()
def discover_users():
    try:
        current_user_id = get_jwt_identity()
        
        # Get current user's following list
        current_user = db.users.find_one({"_id": ObjectId(current_user_id)})
        following = current_user.get("following", [])
        
        # Add current user to the list to exclude from suggestions
        users_to_exclude = [ObjectId(current_user_id)] + following
        
        # Find users not followed by current user, sorted by followers count
        pipeline = [
            {'$match': {'_id': {'$nin': users_to_exclude}}},
            {'$addFields': {
                'followers_count': {'$size': {'$ifNull': ['$followers', []]}}
            }},
            {'$sort': {'followers_count': -1}},
            {'$limit': 20},
            {'$lookup': {
                'from': 'posts',
                'localField': '_id',
                'foreignField': 'author._id',
                'as': 'posts'
            }},
            {'$addFields': {
                'posts_count': {'$size': '$posts'}
            }},
            {'$project': {
                '_id': 1,
                'username': 1,
                'fullname': 1,
                'avatar': 1,
                'bio': 1,
                'followers_count': 1,
                'posts_count': 1
            }}
        ]
        
        discover_users = list(db.users.aggregate(pipeline))
        
        # Convert ObjectId to string for JSON serialization
        result = []
        for user in discover_users:
            result.append({
                "_id": str(user["_id"]),
                "username": user["username"],
                "fullname": user.get("fullname", user["username"]),
                "avatar": user.get("avatar", "/static/uploads/default-avatar-1.jpg"),
                "bio": user.get("bio", ""),
                "followers_count": user.get("followers_count", 0),
                "posts_count": user.get("posts_count", 0),
                "isFollowing": False  # Not following by definition
            })
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error discovering users: {str(e)}")
        return jsonify({'error': 'Failed to discover users'}), 500