from flask import Blueprint, request, jsonify
from bson import ObjectId
from config.db import db
from config.db import serialize_objectid
from backend.auth import jwt_required, get_jwt_identity
import datetime
comments_bp = Blueprint('comments', __name__)
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
# Like/unlike a comment
@comments_bp.route('/<comment_id>/like', methods=['POST'])
@jwt_required()
def toggle_comment_like(comment_id):
    try:
        user_id = get_jwt_identity()
        
        # Find the post containing the comment
        post = db.posts.find_one({"comments._id": ObjectId(comment_id)})
        
        if not post:
            return jsonify({"success": False, "error": "Comment not found"}), 404
        
        # Find the comment in the post
        comment = None
        for c in post.get('comments', []):
            if str(c.get('_id')) == comment_id:
                comment = c
                break
                
        if not comment:
            return jsonify({"success": False, "error": "Comment not found"}), 404
            
        # Check if user already liked the comment
        likes = comment.get('likes', [])
        user_id_obj = ObjectId(user_id)
        
        if any(str(like_id) == user_id for like_id in likes):
            # Unlike
            db.posts.update_one(
                {"comments._id": ObjectId(comment_id)},
                {"$pull": {"comments.$.likes": user_id_obj}}
            )
        else:
            # Like
            db.posts.update_one(
                {"comments._id": ObjectId(comment_id)},
                {"$addToSet": {"comments.$.likes": user_id_obj}}
            )
            
        return jsonify({"success": True}), 200
    except Exception as e:
        print(f"Error toggling comment like: {str(e)}")
        return jsonify({"success": False, "error": "Server error"}), 500

# Get replies for a comment
@comments_bp.route('/<comment_id>/replies', methods=['GET'])
@jwt_required()
def get_replies(comment_id):
    try:
        user_id = get_jwt_identity()
        
        # Find the post containing the comment
        post = db.posts.find_one({"comments._id": ObjectId(comment_id)})
        
        if not post:
            return jsonify({"success": False, "error": "Comment not found"}), 404
            
        # Find the comment in the post
        comment = None
        for c in post.get('comments', []):
            if str(c.get('_id')) == comment_id:
                comment = c
                break
                
        if not comment:
            return jsonify({"success": False, "error": "Comment not found"}), 404
            
        # Get replies
        replies = comment.get('replies', [])
        
        # Convert ObjectId to string for JSON response
        formatted_replies = []
        for reply in replies:
            formatted_reply = {
                "_id": str(reply["_id"]),
                "content": reply["content"],
                "author": {
                    "_id": str(reply["author"]["_id"]),
                    "username": reply["author"]["username"],
                    "fullname": reply["author"]["fullname"],
                    "avatar": reply["author"]["avatar"]
                },
                "likes": [str(like_id) for like_id in reply.get("likes", [])],
                "created_at": reply["created_at"]
            }
            formatted_reply['isLiked'] = user_id in formatted_reply['likes']
            formatted_replies.append(formatted_reply)
            
        return jsonify(formatted_replies), 200
    except Exception as e:
        print(f"Error getting replies: {str(e)}")
        return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500
    

# Add a reply to a comment
@comments_bp.route("/<comment_id>/reply", methods=["POST"])
@jwt_required()
def add_reply(comment_id):
    current_user_id = get_jwt_identity()
    
    try:
        # Get current user
        user = db.users.find_one({"_id": ObjectId(current_user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get reply content and post ID
        data = request.json
        content = data.get("content", "").strip()
        post_id = data.get("postId")  # Get the post ID from the request
        
        if not content:
            return jsonify({"error": "Reply cannot be empty"}), 400
            
        if not post_id or not ObjectId.is_valid(post_id):
            return jsonify({"error": "Valid post ID is required"}), 400
        
        # Create author object with timestamp in avatar URL
        timestamp = datetime.datetime.now().timestamp()
        avatar_url = user.get("avatar", "/static/uploads/default-avatar-1.jpg")
        if "?" not in avatar_url:
            avatar_url = f"{avatar_url}?t={timestamp}"
            
        author = {
            "_id": user["_id"],
            "username": user["username"],
            "fullname": user.get("fullname", user["username"]),
            "avatar": avatar_url
        }
        
        # Create reply
        reply = {
            "_id": ObjectId(),
            "content": content,
            "author": author,
            "likes": [],
            "created_at": datetime.datetime.utcnow()
        }
        
        # Find the post and comment
        post = db.posts.find_one({"_id": ObjectId(post_id)})
        if not post:
            return jsonify({"error": "Post not found"}), 404
            
        # Find the comment in the post
        comment_found = False
        for comment in post.get("comments", []):
            if str(comment["_id"]) == comment_id:
                comment_found = True
                break
                
        if not comment_found:
            return jsonify({"error": "Comment not found in post"}), 404
        
        # Add reply to comment
        db.posts.update_one(
            {"_id": ObjectId(post_id), "comments._id": ObjectId(comment_id)},
            {"$push": {"comments.$.replies": reply}}
        )
        
        # Update the post's comment count to include replies
        comments = post.get("comments", [])
        total_count = len(comments)
        
        # Count all replies
        for comment in comments:
            replies = comment.get("replies", [])
            if comment_id == str(comment["_id"]):
                # Add 1 for the new reply we just added
                total_count += len(replies) + 1
            else:
                total_count += len(replies)
        
        # Update post with new count
        db.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$set": {"comment_count": total_count}}
        )
        
        # Convert ObjectId to string
        reply = serialize_objectid(reply)
        
        return jsonify(reply), 201
    except Exception as e:
        logger.error(f"Error adding reply: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
# Like/unlike a reply
@comments_bp.route('/replies/<reply_id>/like', methods=['POST'])
@jwt_required()
def toggle_reply_like(reply_id):
    try:
        user_id = get_jwt_identity()
        
        # Find the post containing the reply
        post = db.posts.find_one({"comments.replies._id": ObjectId(reply_id)})
        
        if not post:
            return jsonify({"success": False, "error": "Reply not found"}), 404
            
        # Find the comment containing the reply
        comment_index = -1
        reply_index = -1
        
        for i, comment in enumerate(post.get('comments', [])):
            for j, reply in enumerate(comment.get('replies', [])):
                if str(reply.get('_id')) == reply_id:
                    comment_index = i
                    reply_index = j
                    break
            if comment_index != -1:
                break
                
        if comment_index == -1 or reply_index == -1:
            return jsonify({"success": False, "error": "Reply not found"}), 404
            
        # Check if user already liked the reply
        user_id_obj = ObjectId(user_id)
        reply = post['comments'][comment_index]['replies'][reply_index]
        likes = reply.get('likes', [])
        
        if any(str(like_id) == user_id for like_id in likes):
            # Unlike
            db.posts.update_one(
                {"comments.replies._id": ObjectId(reply_id)},
                {"$pull": {f"comments.{comment_index}.replies.{reply_index}.likes": user_id_obj}}
            )
        else:
            # Like
            db.posts.update_one(
                {"comments.replies._id": ObjectId(reply_id)},
                {"$addToSet": {f"comments.{comment_index}.replies.{reply_index}.likes": user_id_obj}}
            )
            
        return jsonify({"success": True}), 200
    except Exception as e:
        print(f"Error toggling reply like: {str(e)}")
        return jsonify({"success": False, "error": "Server error"}), 500
