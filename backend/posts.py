from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from config.db import db, serialize_objectid
from bson.objectid import ObjectId
from werkzeug.utils import secure_filename
import os
import datetime
from config.config import Config
import shutil
import logging
import re
from backend.notification_handlers import handle_like_post_notification, handle_comment_notification, handle_reply_notification, handle_new_post_notification
from collections import Counter
posts_bp = Blueprint("posts", __name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
# Ensure upload directory exists
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

CATEGORY_TAGS = {
    "technology": ["technology", "tech", "web", "ai", "coding", "programming"],
    "entertainment": ["entertainment", "movie", "music", "funny"],
    "sports": ["sports", "football", "basketball"],
    "news": ["news", "breaking", "politics"],
    "lifestyle": ["lifestyle", "health", "travel", "food"]
}
def map_hashtags_to_category(hashtags):
    # Chuyển hashtag về chữ thường và loại bỏ dấu #
    hashtags = [tag.lower().lstrip('#') for tag in hashtags]
    
    # Tìm danh mục khớp với hashtag
    for category, tags in CATEGORY_TAGS.items():
        if any(tag in tags for tag in hashtags):
            return category
    
    # Nếu không có hashtag nào khớp, trả về 'all'
    return 'all'

def extract_hashtags(content):
    return re.findall(r'#\w+', content)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

def extract_mentions(content):
    """Extract @username mentions from content"""
    return re.findall(r'@(\w+)', content)

def copy_external_image(file_path):
    """
    Copy an image from an external path to the upload folder
    """
    try:
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            return None
            
        # Get the filename from the path
        filename = os.path.basename(file_path)
        
        # Add timestamp to filename to make it unique
        timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
        new_filename = f"{timestamp}_{filename}"
        
        # Create destination path
        destination = os.path.join(Config.UPLOAD_FOLDER, new_filename)
        
        print(f"Copying from {file_path} to {destination}")
        
        # Copy the file
        shutil.copy2(file_path, destination)
        
        # Return the relative path for storage in the database
        return f"{Config.STATIC_URL_PREFIX}{new_filename}"
    except Exception as e:
        print(f"Error copying external image: {str(e)}")
        return None
@posts_bp.route("/feed", methods=["GET"])
@jwt_required()
def get_feed():
    current_user_id = get_jwt_identity()
    
    try:
        # Get current user
        user = db.users.find_one({"_id": ObjectId(current_user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get following list
        following_ids = user.get("following", [])
        
        # Include current user's posts in feed
        user_ids = following_ids + [ObjectId(current_user_id)]
        
        # Get posts from followed users and current user
        posts = list(db.posts.find(
            {"author._id": {"$in": user_ids}}
        ).sort("created_at", -1).limit(20))
        
        # Convert ObjectId to string
        posts = [serialize_objectid(post) for post in posts]
        
        return jsonify(posts), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Updated: Keep this endpoint for backward compatibility
@posts_bp.route("/user/<username>", methods=["GET"])
@jwt_required()
def get_user_posts(username):
    try:
        # Get user by username
        user = db.users.find_one({"username": username})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get user's posts
        posts = list(db.posts.find(
            {"author.username": username}
        ).sort("created_at", -1))
        
        # Convert ObjectId to string
        posts = [serialize_objectid(post) for post in posts]
        
        return jsonify(posts), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Added: New endpoint to get posts by user ID
@posts_bp.route("/user/id/<user_id>", methods=["GET"])
@jwt_required()
def get_user_posts_by_id(user_id):
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(user_id):
            return jsonify({"error": "Invalid user ID"}), 400
            
        # Get user by ID
        user = db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get user's posts
        posts = list(db.posts.find(
            {"author._id": ObjectId(user_id)}
        ).sort("created_at", -1))
        
        # Convert ObjectId to string
        posts = [serialize_objectid(post) for post in posts]
        
        return jsonify(posts), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Updated: Keep this endpoint for backward compatibility
@posts_bp.route("/liked/<username>", methods=["GET"])
@jwt_required()
def get_liked_posts(username):
    try:
        # Get user by username
        user = db.users.find_one({"username": username})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get posts liked by the user
        liked_posts = list(db.posts.find(
            {"likes": user["_id"]}
        ).sort("created_at", -1))
        
        # Convert ObjectId to string
        liked_posts = [serialize_objectid(post) for post in liked_posts]
        
        return jsonify(liked_posts), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Added: New endpoint to get liked posts by user ID
@posts_bp.route("/liked/id/<user_id>", methods=["GET"])
@jwt_required()
def get_liked_posts_by_id(user_id):
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(user_id):
            return jsonify({"error": "Invalid user ID"}), 400
            
        # Get user by ID
        user = db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get posts liked by the user
        liked_posts = list(db.posts.find(
            {"likes": ObjectId(user_id)}
        ).sort("created_at", -1))
        
        # Convert ObjectId to string
        liked_posts = [serialize_objectid(post) for post in liked_posts]
        
        return jsonify(liked_posts), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@posts_bp.route("/create", methods=["POST"])
@jwt_required()
def create_post():
    current_user_id = get_jwt_identity()
    
    try:
        # Get current user
        user = db.users.find_one({"_id": ObjectId(current_user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get post content
        content = request.form.get("content", "").strip()
        
        # Check if content is empty and no image
        if not content and 'image' not in request.files and not request.form.get("external_image_path"):
            return jsonify({"error": "Post must have content or image"}), 400
        
        # Trích xuất hashtag từ nội dung
        hashtags = extract_hashtags(content)
        
        # Gán danh mục dựa trên hashtag
        category = map_hashtags_to_category(hashtags)
        
        # Handle image upload
        image_url = None
        external_image_path = request.form.get("external_image_path")
        if external_image_path and Config.ALLOW_ABSOLUTE_PATHS:
            image_url = copy_external_image(external_image_path)
            if not image_url:
                return jsonify({"error": "External image not found or could not be copied"}), 400
        
        elif 'image' in request.files:
            file = request.files['image']
            if file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                filename = f"{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
                file_path = os.path.join(Config.UPLOAD_FOLDER, filename)
                file.save(file_path)
                image_url = f"{Config.STATIC_URL_PREFIX}{filename}"
        
        # Create author object
        author = {
            "_id": user["_id"],
            "username": user["username"],
            "fullname": user.get("fullname", user["username"]),
            "avatar": user.get("avatar", "/static/uploads/default-avatar-1.jpg")
        }
        
        # Create post
        post = {
            "content": content,
            "image": image_url,
            "author": author,
            "hashtags": hashtags,
            "category": category,  # Thêm trường category
            "likes": [],
            "comments": [],
            "shares": 0,
            "created_at": datetime.datetime.utcnow()
        }
        
        # Insert post
        result = db.posts.insert_one(post)
        
        # Get the created post
        created_post = db.posts.find_one({"_id": result.inserted_id})
        
        # Create notifications
        handle_new_post_notification(current_user_id, str(result.inserted_id), content)
        
        
        # Convert ObjectId to string
        created_post = serialize_objectid(created_post)
        
        return jsonify(created_post), 201
    except Exception as e:
        logger.error(f"Error creating post: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Thêm endpoint để lấy thông tin chi tiết của một bài post
@posts_bp.route("/<post_id>", methods=["GET"])
@jwt_required()
def get_post(post_id):
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(post_id):
            return jsonify({"error": "Invalid post ID"}), 400
            
        # Get post
        post = db.posts.find_one({"_id": ObjectId(post_id)})
        
        if not post:
            return jsonify({"error": "Post not found"}), 404
        
        # Convert ObjectId to string
        post = serialize_objectid(post)
        
        return jsonify(post), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@posts_bp.route("/<post_id>/update", methods=["PUT"])
@jwt_required()
def update_post(post_id):
    current_user_id = get_jwt_identity()
    
    try:
        # Get post
        post = db.posts.find_one({"_id": ObjectId(post_id)})
        
        if not post:
            return jsonify({"error": "Post not found"}), 404
        
        # Check if current user is the author
        if str(post["author"]["_id"]) != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Get updated content
        data = request.json
        content = data.get("content", "").strip()
        
        if not content:
            return jsonify({"error": "Content cannot be empty"}), 400
        
        # Update post
        db.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$set": {"content": content}}
        )
        
        # Get updated post
        updated_post = db.posts.find_one({"_id": ObjectId(post_id)})
        
        # Convert ObjectId to string
        updated_post = serialize_objectid(updated_post)
        
        return jsonify(updated_post), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@posts_bp.route("/<post_id>/delete", methods=["DELETE"])
@jwt_required()
def delete_post(post_id):
    current_user_id = get_jwt_identity()
    
    try:
        # Get post
        post = db.posts.find_one({"_id": ObjectId(post_id)})
        
        if not post:
            return jsonify({"error": "Post not found"}), 404
        
        # Check if current user is the author
        if str(post["author"]["_id"]) != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Delete post
        db.posts.delete_one({"_id": ObjectId(post_id)})
        
        return jsonify({"message": "Post deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@posts_bp.route("/<post_id>/like", methods=["POST"])
@jwt_required()
def toggle_like(post_id):
    current_user_id = get_jwt_identity()
    
    try:
        # Get post
        post = db.posts.find_one({"_id": ObjectId(post_id)})
        
        if not post:
            return jsonify({"error": "Post not found"}), 404
        
        # Check if user already liked the post
        user_id_obj = ObjectId(current_user_id)
        if user_id_obj in post.get("likes", []):
            # Unlike
            db.posts.update_one(
                {"_id": ObjectId(post_id)},
                {"$pull": {"likes": user_id_obj}}
            )
            liked = False
        else:
            # Like
            db.posts.update_one(
                {"_id": ObjectId(post_id)},
                {"$addToSet": {"likes": user_id_obj}}
            )
            liked = True
            
            # Create like notification
            if liked:
                handle_like_post_notification(current_user_id, post_id)
        
        # Get updated post
        updated_post = db.posts.find_one({"_id": ObjectId(post_id)})
        
        # Convert ObjectId to string
        updated_post = serialize_objectid(updated_post)
        
        return jsonify({"message": "Like toggled successfully", "post": updated_post}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@posts_bp.route("/<post_id>/comment", methods=["POST"])
@jwt_required()
def add_comment(post_id):
    current_user_id = get_jwt_identity()
    
    try:
        # Get current user
        user = db.users.find_one({"_id": ObjectId(current_user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get comment content
        data = request.json
        content = data.get("content", "").strip()
        
        if not content:
            return jsonify({"error": "Comment cannot be empty"}), 400
        
        # Create author object - Thêm timestamp vào avatar URL
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
        
        # Create comment
        comment = {
            "_id": ObjectId(),
            "content": content,
            "author": author,
            "likes": [],
            "created_at": datetime.datetime.utcnow()
        }
        
        # Add comment to post
        db.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$push": {"comments": comment}}
        )
        
        # Create comment notification
        handle_comment_notification(current_user_id, post_id, str(comment["_id"]), content)
        
        
        # Convert ObjectId to string
        comment = serialize_objectid(comment)
        
        return jsonify(comment), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@posts_bp.route("/<post_id>/comment/<comment_id>", methods=["DELETE"])
@jwt_required()
def delete_comment(post_id, comment_id):
    current_user_id = get_jwt_identity()
    
    try:
        # Get post
        post = db.posts.find_one({"_id": ObjectId(post_id)})
        
        if not post:
            return jsonify({"error": "Post not found"}), 404
        
        # Find comment
        comment = None
        for c in post.get("comments", []):
            if str(c["_id"]) == comment_id:
                comment = c
                break
        
        if not comment:
            return jsonify({"error": "Comment not found"}), 404
        
        # Check if current user is the author of the comment
        if str(comment["author"]["_id"]) != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Delete comment
        db.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$pull": {"comments": {"_id": ObjectId(comment_id)}}}
        )
        
        return jsonify({"message": "Comment deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@posts_bp.route("/update-user-comments-avatar", methods=["POST"])
@jwt_required()
def update_user_comments_avatar():
    current_user_id = get_jwt_identity()
    
    try:
        # Get current user
        user = db.users.find_one({"_id": ObjectId(current_user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get user's avatar
        avatar = user.get("avatar", "/static/uploads/default-avatar-1.jpg")
        
        # Add timestamp to avatar URL
        timestamp = datetime.datetime.now().timestamp()
        if "?" not in avatar:
            avatar = f"{avatar}?t={timestamp}"
        
        # Update avatar in all comments by this user
        result = db.posts.update_many(
            {"comments.author._id": ObjectId(current_user_id)},
            {"$set": {"comments.$[elem].author.avatar": avatar}},
            array_filters=[{"elem.author._id": ObjectId(current_user_id)}]
        )
        
        return jsonify({
            "success": True,
            "message": "Avatar updated in all comments",
            "modified_count": result.modified_count
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
# Get trending posts
@posts_bp.route('/trending', methods=['GET'])
@jwt_required()
def get_trending_posts():
    try:
        category = request.args.get('category', 'all').lower()
        logger.info(f"Fetching trending posts for category: {category}")
        
        query = {"author": {"$exists": True, "$ne": None}}
        if category and category != 'all':
            category_hashtags = [f"#{tag}" for tag in CATEGORY_TAGS.get(category, [])]
            if category_hashtags:
                query['hashtags'] = {"$in": category_hashtags}
                logger.info(f"Category hashtags: {category_hashtags}")
        
        pipeline = [
            {"$match": query},
            {"$addFields": {
                "engagement_score": {
                    "$add": [
                        {"$size": {"$ifNull": ["$likes", []]}},
                        {"$size": {"$ifNull": ["$comments", []]}},
                        {"$ifNull": ["$shares", 0]}
                    ]
                }
            }},
            {"$sort": {"engagement_score": -1, "created_at": -1}},
            {"$limit": 20}
        ]
        
        posts = list(db.posts.aggregate(pipeline))
        logger.info(f"Found {len(posts)} trending posts")
        
        posts = [serialize_objectid(post) for post in posts]
        
        current_user_id = get_jwt_identity()
        valid_posts = []
        for post in posts:
            post['isLiked'] = current_user_id and ObjectId(current_user_id) in [ObjectId(like_id) for like_id in post.get('likes', [])]
            post['category'] = map_hashtags_to_category(post.get('hashtags', []))
            post['likes_count'] = len(post.get('likes', []))
            post['comments_count'] = len(post.get('comments', []))
            logger.debug(f"Post {post.get('_id')}: content = {post.get('content')}, image = {post.get('image')}")
            if not post.get('author') or not post['author'].get('username'):
                logger.warning(f"Invalid post data (missing author): {post.get('_id')}")
                continue
            valid_posts.append(post)
        
        logger.info(f"Returning {len(valid_posts)} valid trending posts")
        
        return jsonify(valid_posts), 200
    except Exception as e:
        logger.error(f"Error getting trending posts: {str(e)}")
        return jsonify({'error': 'Failed to get trending posts'}), 500

# Get latest posts
@posts_bp.route('/latest', methods=['GET'])
@jwt_required()
def get_latest_posts():
    try:
        # Get posts sorted by creation date (newest first)
        posts = list(db.posts.find().sort("created_at", -1).limit(20))
        
        # Convert ObjectId to string for JSON serialization
        posts = [serialize_objectid(post) for post in posts]
        
        # Check if current user liked each post
        current_user_id = get_jwt_identity()
        for post in posts:
            post['isLiked'] = ObjectId(current_user_id) in [ObjectId(like_id) for like_id in post.get('likes', [])]
        
        return jsonify(posts)
    except Exception as e:
        logger.error(f"Error getting latest posts: {str(e)}")
        return jsonify({'error': 'Failed to get latest posts'}), 500

# Get popular posts
@posts_bp.route('/popular', methods=['GET'])
@jwt_required()
def get_popular_posts():
    try:
        # Get posts sorted by likes count (most liked first)
        pipeline = [
            {'$addFields': {
                'likes_count': {'$size': {'$ifNull': ['$likes', []]}}
            }},
            {'$sort': {'likes_count': -1, 'created_at': -1}},  # Sắp xếp phụ theo created_at
            {'$limit': 20}
        ]
        
        posts = list(db.posts.aggregate(pipeline))
        
        # Convert ObjectId to string for JSON serialization
        posts = [serialize_objectid(post) for post in posts]
        
        # Check if current user liked each post
        current_user_id = get_jwt_identity()
        for post in posts:
            post['isLiked'] = ObjectId(current_user_id) in [ObjectId(like_id) for like_id in post.get('likes', [])]
        
        return jsonify(posts)
    except Exception as e:
        logger.error(f"Error getting popular posts: {str(e)}")
        return jsonify({'error': 'Failed to get popular posts'}), 500
    
@posts_bp.route("/update-comment-count/<post_id>", methods=["POST"])
@jwt_required()
def update_comment_count(post_id):
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(post_id):
            return jsonify({"error": "Invalid post ID"}), 400
            
        # Get post
        post = db.posts.find_one({"_id": ObjectId(post_id)})
        
        if not post:
            return jsonify({"error": "Post not found"}), 404
        
        # Count all comments and replies
        comments = post.get("comments", [])
        total_count = len(comments)
        
        # Count replies
        for comment in comments:
            if "replies" in comment and comment["replies"]:
                total_count += len(comment["replies"])
        
        # Update post with new count
        db.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$set": {"comment_count": total_count}}
        )
        
        return jsonify({
            "success": True,
            "message": "Comment count updated",
            "count": total_count
        }), 200
    except Exception as e:
        logger.error(f"Error updating comment count: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
@posts_bp.route('/trending-topics', methods=['GET'])
@jwt_required()
def get_trending_topics():
    try:
        # Đếm hashtag từ tất cả bài viết
        hashtag_counts = Counter()
        posts = db.posts.find()

        for post in posts:
            hashtags = [tag.lower().lstrip('#') for tag in post.get('hashtags', [])]
            for hashtag in hashtags:
                hashtag_counts[hashtag] += 1

        # Lấy 3 hashtag phổ biến nhất
        top_hashtags = hashtag_counts.most_common(3)

        # Chuẩn bị dữ liệu trả về
        result = []
        for hashtag, count in top_hashtags:
            category = map_hashtags_to_category([f"#{hashtag}"])
            result.append({
                "hashtag": f"#{hashtag}",
                "category": category.capitalize(),
                "post_count": count
            })

        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error getting trending topics: {str(e)}")
        return jsonify({"error": str(e)}), 500
# @posts_bp.route("/migrate-hashtags", methods=["POST"])
# @jwt_required()
# def migrate_hashtags():
#     try:
#         # Lấy tất cả bài viết
#         posts = db.posts.find()
#         updated_count = 0

#         for post in posts:
#             post_id = post["_id"]
#             content = post.get("content", "")
            
#             # Nếu bài viết chưa có trường hashtags
#             if "hashtags" not in post:
#                 hashtags = extract_hashtags(content)
#                 db.posts.update_one(
#                     {"_id": post_id},
#                     {"$set": {"hashtags": hashtags}}
#                 )
#                 updated_count += 1
#                 print(f"Updated post {post_id} with hashtags: {hashtags}")

#         return jsonify({
#             "success": True,
#             "message": f"Updated {updated_count} posts with hashtags"
#         }), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500
@posts_bp.route("/search/posts", methods=["GET"])
@jwt_required()
def search_posts():
    try:
        query = request.args.get("q", "").lower().lstrip('#')  # Chuẩn hóa query
        sort = request.args.get("sort", "trending")
        category = request.args.get("category", "all").lower()
        
        logger.info(f"Search query: q={query}, sort={sort}, category={category}")
        
        search_query = {}
        if query:
            search_query["$or"] = [
                {"content": {"$regex": query, "$options": "i"}},
                {"hashtags": {"$regex": f"^{query}$", "$options": "i"}},  # Khớp hashtag không có #
                {"hashtags": {"$regex": f"^#{query}$", "$options": "i"}}  # Khớp hashtag có #
            ]
        
        if category and category != "all":
            category_hashtags = [f"#{tag}" for tag in CATEGORY_TAGS.get(category, [])]
            if category_hashtags:
                search_query["hashtags"] = {"$in": category_hashtags}
                logger.info(f"Category hashtags: {category_hashtags}")
        
        logger.info(f"Search query MongoDB: {search_query}")
        
        if sort == "trending":
            pipeline = [
                {"$match": search_query},
                {"$addFields": {
                    "engagement_score": {
                        "$add": [
                            {"$size": {"$ifNull": ["$likes", []]}},
                            {"$size": {"$ifNull": ["$comments", []]}},
                            {"$ifNull": ["$shares", 0]}
                        ]
                    }
                }},
                {"$sort": {"engagement_score": -1, "created_at": -1}},
                {"$limit": 10}
            ]
        elif sort == "latest":
            pipeline = [
                {"$match": search_query},
                {"$sort": {"created_at": -1}},
                {"$limit": 10}
            ]
        else:  # popular
            pipeline = [
                {"$match": search_query},
                {"$addFields": {
                    "likes_count": {"$size": {"$ifNull": ["$likes", []]}}
                }},
                {"$sort": {"likes_count": -1, "created_at": -1}},
                {"$limit": 10}
            ]
        
        posts = list(db.posts.aggregate(pipeline))
        posts = [serialize_objectid(post) for post in posts]
        
        current_user_id = get_jwt_identity()
        for post in posts:
            post['isLiked'] = ObjectId(current_user_id) in [ObjectId(like_id) for like_id in post.get('likes', [])]
            post['category'] = map_hashtags_to_category(post.get('hashtags', []))
        
        return jsonify({"posts": posts}), 200
    except Exception as e:
        logger.error(f"Error searching posts: {str(e)}")
        return jsonify({"error": "Failed to search posts"}), 500

@posts_bp.route("/<post_id>/comment/<comment_id>/reply", methods=["POST"])
@jwt_required()
def add_reply(post_id, comment_id):
    current_user_id = get_jwt_identity()
    
    try:
        # Get current user
        user = db.users.find_one({"_id": ObjectId(current_user_id)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get reply content
        data = request.json
        content = data.get("content", "").strip()
        
        if not content:
            return jsonify({"error": "Reply cannot be empty"}), 400
        
        # Get post
        post = db.posts.find_one({"_id": ObjectId(post_id)})
        
        if not post:
            return jsonify({"error": "Post not found"}), 404
        
        # Find comment
        comment = None
        for c in post.get("comments", []):
            if str(c["_id"]) == comment_id:
                comment = c
                break
        
        if not comment:
            return jsonify({"error": "Comment not found"}), 404
        
        # Create author object
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
        
        # Add reply to comment
        db.posts.update_one(
            {"_id": ObjectId(post_id), "comments._id": ObjectId(comment_id)},
            {"$push": {"comments.$.replies": reply}}
        )
        
        # Create notification for reply
        handle_reply_notification(current_user_id, comment_id, content, post_id)
        
        
        # Convert ObjectId to string
        reply = serialize_objectid(reply)
        
        return jsonify(reply), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@posts_bp.route("/<post_id>/report", methods=["POST"])
@jwt_required()
def report_post(post_id):
    current_user_id = get_jwt_identity()
    
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(post_id):
            return jsonify({"error": "Invalid post ID"}), 400
            
        # Get post
        post = db.posts.find_one({"_id": ObjectId(post_id)})
        
        if not post:
            return jsonify({"error": "Post not found"}), 404
        
        # Get report data
        data = request.json
        reason = data.get("reason", "").strip()
        
        if not reason:
            return jsonify({"error": "Report reason is required"}), 400
            
        # Validate reason
        valid_reasons = ["spam", "harmful", "misleading", "sensitive", "other"]
        if reason not in valid_reasons and reason != "other":
            return jsonify({"error": "Invalid report reason"}), 400
            
        # If reason is "other", ensure a description is provided
        if reason == "other":
            description = data.get("description", "").strip()
            if not description:
                return jsonify({"error": "Description is required for 'other' reason"}), 400
            reason = description  # Use description as the reason for "other"
        
        # Check if user already reported this post
        existing_report = db.reports.find_one({
            "post_id": ObjectId(post_id),
            "user_id": ObjectId(current_user_id)
        })
        
        if existing_report:
            return jsonify({"error": "You have already reported this post"}), 400
        
        # Create report
        report = {
            "post_id": ObjectId(post_id),
            "user_id": ObjectId(current_user_id),
            "reason": reason,
            "created_at": datetime.datetime.utcnow()
        }
        
        # Insert report
        db.reports.insert_one(report)
        
        return jsonify({"message": "Post reported successfully. We'll review it shortly."}), 200
    except Exception as e:
        logger.error(f"Error reporting post: {str(e)}")
        return jsonify({"error": str(e)}), 500