from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from config.db import db, serialize_objectid
from bson.objectid import ObjectId
import logging
import datetime

search_bp = Blueprint('search', __name__)
logger = logging.getLogger(__name__)

# Search posts
@search_bp.route('/posts', methods=['GET'])
@jwt_required()
def search_posts():
    try:
        query = request.args.get('q', '').lower().lstrip('#')  # Chuẩn hóa query
        category = request.args.get('category', '')
        sort = request.args.get('sort', 'latest')
        limit = int(request.args.get('limit', 20))

        if not query:
            return jsonify({'error': 'Search query is required'}), 400

        search_query = {
            '$or': [
                {'content': {'$regex': query, '$options': 'i'}},
                {'hashtags': {'$regex': f'^{query}$', '$options': 'i'}},  # Khớp hashtag không có #
                {'hashtags': {'$regex': f'^#{query}$', '$options': 'i'}},  # Khớp hashtag có #
                {'category': {'$regex': query, '$options': 'i'}},
                {'author.username': {'$regex': query, '$options': 'i'}},
                {'author.fullname': {'$regex': query, '$options': 'i'}}
            ]
        }

        if category:
            category_hashtags = [f"#{tag}" for tag in CATEGORY_TAGS.get(category.lower(), [])]
            if category_hashtags:
                search_query['hashtags'] = {'$in': category_hashtags}

        if sort == 'latest':
            pipeline = [
                {"$match": search_query},
                {"$sort": {"created_at": -1}},
                {"$limit": limit}
            ]
        elif sort == 'popular':
            pipeline = [
                {"$match": search_query},
                {"$addFields": {
                    "likes_count": {"$size": {"$ifNull": ["$likes", []]}}
                }},
                {"$sort": {"likes_count": -1, "created_at": -1}},
                {"$limit": limit}
            ]
        elif sort == 'trending':
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
                {"$limit": limit}
            ]
        else:
            pipeline = [
                {"$match": search_query},
                {"$sort": {"created_at": -1}},
                {"$limit": limit}
            ]

        posts = list(db.posts.aggregate(pipeline))
        posts = [serialize_objectid(post) for post in posts]

        current_user_id = get_jwt_identity()
        for post in posts:
            post['isLiked'] = ObjectId(current_user_id) in [ObjectId(like_id) for like_id in post.get('likes', [])]

        response_data = {
            'posts': posts,
            'timestamp': datetime.datetime.now().isoformat(),
            'query': query,
            'sort': sort,
            'category': category
        }

        return jsonify(response_data), 200
    except Exception as e:
        logger.error(f"Error searching posts: {str(e)}")
        return jsonify({'error': 'Failed to search posts'}), 500


# Search users
@search_bp.route('/users', methods=['GET'])
@jwt_required()
def search_users():
    try:
        query = request.args.get('q', '').lower().strip()
        limit = int(request.args.get('limit', 20))

        if not query:
            return jsonify({'error': 'Search query is required'}), 400

        pipeline = [
            {
                '$match': {
                    '$or': [
                        {'username': {'$regex': query, '$options': 'i'}},
                        {'fullname': {'$regex': query, '$options': 'i'}}
                    ]
                }
            },
            {
                '$project': {
                    '_id': {'$toString': '$_id'},
                    'username': 1,
                    'fullname': 1,
                    'profile_picture': {'$ifNull': ['$avatar', '/static/uploads/default-avatar-1.jpg']},
                    'bio': {'$ifNull': ['$bio', 'No bio available']}
                }
            },
            {
                '$sort': {'username': 1}
            },
            {'$limit': limit}
        ]

        users = list(db.users.aggregate(pipeline))
        current_user_id = get_jwt_identity()
        current_user = db.users.find_one({"_id": ObjectId(current_user_id)})
        following = current_user.get("following", [])

        for user in users:
            user['isFollowing'] = ObjectId(user['_id']) in following

        response_data = {
            'users': users,
            'timestamp': datetime.datetime.now().isoformat(),
            'query': query
        }

        return jsonify(response_data), 200
    except Exception as e:
        logger.error(f"Error searching users: {str(e)}")
        return jsonify({'error': 'Failed to search users'}), 500