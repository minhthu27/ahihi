from flask import Blueprint, Flask, render_template, jsonify, request, redirect, url_for, abort
from bson import ObjectId
from config.db import db, serialize_objectid
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import CORS


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
    print("Authorization Header:", request.headers.get("Authorization"))
    try:
        uid = get_jwt_identity()
        user = db.users.find_one({"_id": ObjectId(uid)}, {"username": 1, "role": 1})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(serialize_objectid(user)), 200
    except Exception as e:
        return jsonify({'error': 'Invalid token'}), 401

@admin_bp.route('/admin/dashboard', methods=['GET'])
def admin_dashboard():
    return render_template('admin/dashboard_ad.html')

@admin_bp.route('/api/admin/stats', methods=['GET'])
@jwt_required()
def get_stats():
    current_user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(current_user_id)})
    if not user or user.get("role") != "admin":
        return jsonify({"error": "Unauthorized access"}), 403
    
    try:
        # Total number of users
        total_users = db.users.count_documents({})

        # Total number of posts
        total_posts = db.posts.count_documents({})

        # Most reported post
        pipeline = [
            {"$group": {
                "_id": "$post_id",
                "report_count": {"$sum": 1}
            }},
            {"$sort": {"report_count": -1}},
            {"$limit": 1}
        ]
        most_reported = list(db.reports.aggregate(pipeline))
        most_reported_post = None
        if most_reported:
            post_id = most_reported[0]["_id"]
            report_count = most_reported[0]["report_count"]
            post = db.posts.find_one({"_id": post_id})
            if post:
                most_reported_post = {
                    "content": post.get("content", "N/A"),
                    "report_count": report_count
                }

        # User role breakdown
        role_breakdown = {
            "user": db.users.count_documents({"role": "user"}),
            "admin": db.users.count_documents({"role": "admin"})
        }

        return jsonify({
            "total_users": total_users,
            "total_posts": total_posts,
            "most_reported_post": most_reported_post,
            "role_breakdown": role_breakdown
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/admin/users', methods=['GET'])
def admin_users():
    return render_template('admin/users.html')

@admin_bp.route('/admin/settings', methods=['GET'])
def admin_settings():
    return render_template('admin/settings.html')

@admin_bp.route('/api/admin/users', methods=['GET'])
@jwt_required()
def get_users():
    current_user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(current_user_id)})
    if not user or user.get("role") != "admin":
        return jsonify({"error": "Unauthorized access"}), 403

    sort_by = request.args.get('sort_by', 'username')
    sort_order = request.args.get('sort_order', 'asc')
    search = request.args.get('search', '')

    query = {}
    if search:
        query['$or'] = [
            {'username': {'$regex': search, '$options': 'i'}},
            {'email': {'$regex': search, '$options': 'i'}}
        ]

    try:
        if sort_by in ['username', 'email']:
            users = list(db.users.find(query).sort(sort_by, 1 if sort_order == 'asc' else -1))
        else:
            users = list(db.users.find(query))

        for user in users:
            user['report_count'] = db.reports.count_documents({'user_id': user['_id']})

        if sort_by == 'report_count':
            users.sort(key=lambda x: x['report_count'], reverse=(sort_order == 'desc'))

        return jsonify([serialize_objectid(user) for user in users]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/admin/users/<user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    current_user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(current_user_id)})
    if not user or user.get("role") != "admin":
        return jsonify({"error": "Unauthorized access"}), 403

    if not ObjectId.is_valid(user_id):
        return jsonify({'error': 'Invalid user ID'}), 400

    target_user = db.users.find_one({'_id': ObjectId(user_id)})
    if not target_user:
        return jsonify({'error': 'User not found'}), 404

    if str(target_user['_id']) == current_user_id:
        return jsonify({'error': 'You cannot modify your own account'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    username = data.get('username')
    email = data.get('email')

    if not username or not email:
        return jsonify({'error': 'Username and email are required'}), 400

    result = db.users.update_one(
        {'_id': ObjectId(user_id)},
        {'$set': {'username': username, 'email': email}}
    )

    if result.modified_count == 0:
        return jsonify({'error': 'Failed to update user or no changes made'}), 500

    return jsonify({'message': 'User updated successfully'}), 200

@admin_bp.route('/api/admin/users/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(current_user_id)})
    if not user or user.get("role") != "admin":
        return jsonify({"error": "Unauthorized access"}), 403

    if not ObjectId.is_valid(user_id):
        return jsonify({'error': 'Invalid user ID'}), 400

    target_user = db.users.find_one({'_id': ObjectId(user_id)})
    if not target_user:
        return jsonify({'error': 'User not found'}), 404

    if str(target_user['_id']) == current_user_id:
        return jsonify({'error': 'You cannot delete your own account'}), 403

    result = db.users.delete_one({'_id': ObjectId(user_id)})
    if result.deleted_count == 0:
        return jsonify({'error': 'User not found'}), 404

    db.posts.delete_many({'author': ObjectId(user_id)})
    db.reports.delete_many({'user_id': ObjectId(user_id)})

    return jsonify({'message': 'User deleted successfully'}), 200

@admin_bp.route('/api/admin/settings/system', methods=['GET', 'PUT'])
@jwt_required()
def system_settings():
    current_user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(current_user_id)})
    if not user or user.get("role") != "admin":
        return jsonify({"error": "Unauthorized access"}), 403

    if request.method == 'GET':
        settings = db.settings.find_one({"type": "system"}) or {
            "maintenance_mode": False,
            "results_per_page": 10,
            "features": {
                "comments": True,
                "messaging": True
            }
        }
        return jsonify(serialize_objectid(settings)), 200

    if request.method == 'PUT':
        data = request.get_json()
        update_data = {
            "type": "system",
            "maintenance_mode": data.get("maintenance_mode", False),
            "results_per_page": data.get("results_per_page", 10),
            "features": {
                "comments": data.get("features", {}).get("comments", True),
                "messaging": data.get("features", {}).get("messaging", True)
            }
        }
        result = db.settings.update_one(
            {"type": "system"},
            {"$set": update_data},
            upsert=True
        )
        return jsonify({"message": "System settings updated successfully"}), 200

@admin_bp.route('/api/admin/settings/branding', methods=['GET', 'POST'])
@jwt_required()
def branding_settings():
    current_user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(current_user_id)})
    if not user or user.get("role") != "admin":
        return jsonify({"error": "Unauthorized access"}), 403

    if request.method == 'GET':
        branding = db.settings.find_one({"type": "branding"}) or {
            "logo_url": "/static/images/default-logo.png",
            "platform_description": "Welcome to our platform"
        }
        return jsonify(serialize_objectid(branding)), 200

    if request.method == 'POST':
        description = request.form.get('description')
        logo_file = request.files.get('logo')
        
        logo_url = None
        if logo_file:
            filename = secure_filename(logo_file.filename)
            upload_path = os.path.join('static/uploads', filename)
            logo_file.save(upload_path)
            logo_url = f"/static/uploads/{filename}"

        update_data = {
            "type": "branding",
            "platform_description": description
        }
        if logo_url:
            update_data["logo_url"] = logo_url

        result = db.settings.update_one(
            {"type": "branding"},
            {"$set": update_data},
            upsert=True
        )
        return jsonify({"message": "Branding updated successfully"}), 200

@admin_bp.route('/api/admin/admins', methods=['GET', 'POST'])
@jwt_required()
def manage_admins():
    current_user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(current_user_id)})
    if not user or user.get("role") != "admin":
        return jsonify({"error": "Unauthorized access"}), 403

    if request.method == 'GET':
        sort_by = request.args.get('sort_by', 'username')
        sort_order = request.args.get('sort_order', 'asc')
        search = request.args.get('search', '')

        query = {"role": "admin"}
        if search:
            query['username'] = {'$regex': search, '$options': 'i'}

        admins = list(db.users.find(query).sort(sort_by, 1 if sort_order == 'asc' else -1))
        return jsonify([serialize_objectid(admin) for admin in admins]), 200

    if request.method == 'POST':
        data = request.get_json()
        user_id = data.get('user_id')
        action = data.get('action')  # 'promote', 'demote', 'lock', 'unlock', 'delete'

        if not ObjectId.is_valid(user_id):
            return jsonify({'error': 'Invalid user ID'}), 400

        target_user = db.users.find_one({"_id": ObjectId(user_id)})
        if not target_user:
            return jsonify({'error': 'User not found'}), 404

        if action == 'promote':
            db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": "admin"}})
        elif action == 'demote':
            db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": "user"}})
        elif action == 'lock':
            db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"is_locked": True}})
        elif action == 'unlock':
            db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"is_locked": False}})
        elif action == 'delete':
            db.users.delete_one({"_id": ObjectId(user_id)})
        else:
            return jsonify({'error': 'Invalid action'}), 400

        return jsonify({"message": f"Admin {action} successful"}), 200