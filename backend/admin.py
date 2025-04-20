from flask import Blueprint, render_template, jsonify, request, redirect, url_for, abort
from bson import ObjectId
from config.db import db, serialize_objectid
from flask_jwt_extended import jwt_required, get_jwt_identity

admin_bp = Blueprint('admin', __name__, template_folder='../templates/admin')

@admin_bp.route('/admin/posts', methods=['GET'])
def admin_posts():
    return render_template('admin/posts.html')

@admin_bp.route('/api/admin/posts', methods=['GET'])
@jwt_required()
def get_posts():
    current_user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(current_user_id)})
    if not user or user.get("role") != "admin":
        return jsonify({"error": "Unauthorized access"}), 403
    
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')
    search = request.args.get('search', '')
    
    query = {}
    if search:
        query['$or'] = [
            {'content': {'$regex': search, '$options': 'i'}},
            {'title': {'$regex': search, '$options': 'i'}}
        ]
    
    try:
        # Fetch posts, sort by created_at if that's the sort_by field
        if sort_by == 'created_at':
            posts = list(db.posts.find(query).sort(sort_by, -1 if sort_order == 'desc' else 1))
        else:
            posts = list(db.posts.find(query))
        
        # Get all author IDs, ensuring they are ObjectId
        author_ids = []
        for post in posts:
            author = post.get('author')
            if author:
                try:
                    if isinstance(author, str):
                        author = ObjectId(author)
                    author_ids.append(author)
                except Exception as e:
                    print(f"Invalid author ID in post {post['_id']}: {author}, error: {e}")
                    post['author'] = {'username': 'Invalid Author ID'}
            else:
                post['author'] = {'username': 'No Author'}

        # Fetch authors
        authors = {str(u["_id"]): u for u in db.users.find({"_id": {"$in": author_ids}})}

        # Assign report_count and author info to posts
        for post in posts:
            post['report_count'] = db.reports.count_documents({'post_id': post['_id']})
            post['hidden'] = post.get('hidden', False)
            
            if 'author' in post and isinstance(post['author'], dict):
                continue

            author_id = post.get('author')
            if author_id:
                author = authors.get(str(author_id))
                if author:
                    post['author'] = {
                        '_id': str(author['_id']),
                        'username': author.get('username', 'Unknown')
                    }
                else:
                    post['author'] = {'username': 'Not Found'}
            else:
                post['author'] = {'username': 'No Author'}

        # If sorting by report_count, sort in Python
        if sort_by == 'report_count':
            posts.sort(key=lambda x: x['report_count'], reverse=(sort_order == 'desc'))

        return jsonify([serialize_objectid(post) for post in posts]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/admin/posts/<post_id>/hide', methods=['PUT'])
@jwt_required()
def hide_post(post_id):
    current_user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(current_user_id)})
    if not user or user.get("role") != "admin":
        return jsonify({"error": "Unauthorized access"}), 403
    
    if not ObjectId.is_valid(post_id):
        return jsonify({'error': 'Invalid post ID'}), 400
    
    post = db.posts.find_one({'_id': ObjectId(post_id)})
    if not post:
        return jsonify({'error': 'Post not found'}), 404
        
    current_hidden = post.get('hidden', False)
    new_hidden = not current_hidden
    
    result = db.posts.update_one(
        {'_id': ObjectId(post_id)},
        {'$set': {'hidden': new_hidden}}
    )
    
    if result.modified_count == 0:
        return jsonify({'error': 'Failed to update post'}), 500
    
    return jsonify({'message': f'Post {"hidden" if new_hidden else "unhidden"} successfully'}), 200

@admin_bp.route('/api/admin/posts/<post_id>', methods=['DELETE'])
@jwt_required()
def delete_post(post_id):
    current_user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(current_user_id)})
    if not user or user.get("role") != "admin":
        return jsonify({"error": "Unauthorized access"}), 403
    
    if not ObjectId.is_valid(post_id):
        return jsonify({'error': 'Invalid post ID'}), 400
    
    result = db.posts.delete_one({'_id': ObjectId(post_id)})
    if result.deleted_count == 0:
        return jsonify({'error': 'Post not found'}), 404
    
    db.reports.delete_many({'post_id': ObjectId(post_id)})
    
    return jsonify({'message': 'Post deleted successfully'}), 200

@admin_bp.route('/api/admin/posts/<post_id>/reports', methods=['GET'])
@jwt_required()
def get_post_reports(post_id):
    current_user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(current_user_id)})
    if not user or user.get("role") != "admin":
        return jsonify({"error": "Unauthorized access"}), 403
    
    if not ObjectId.is_valid(post_id):
        return jsonify({'error': 'Invalid post ID'}), 400
    
    reports = list(db.reports.find({'post_id': ObjectId(post_id)}))
    if not reports:
        return jsonify({'message': 'No reports found for this post'}), 200
    
    return jsonify([serialize_objectid(report) for report in reports]), 200

@admin_bp.route('/api/user/me', methods=['GET'])
@jwt_required()
def get_user_info():
    try:
        uid = get_jwt_identity()
        user = db.users.find_one({"_id": ObjectId(uid)}, {"username": 1, "role": 1})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(serialize_objectid(user)), 200
    except Exception as e:
        return jsonify({'error': 'Invalid token'}), 401