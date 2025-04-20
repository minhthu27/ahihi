from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from config.db import db

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        print("Received data:", data)  # Debug log
        
        required_fields = ["fullname", "username", "email", "password"]
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400
        
        # Kiểm tra email tồn tại
        if db.users.find_one({"email": data["email"]}):
            return jsonify({"error": "Email already exists"}), 400
        
        # Tạo user mới
        user_data = {
            "fullname": data["fullname"],
            "username": data["username"],
            "email": data["email"],
            "password": generate_password_hash(data["password"]),
            "role": "user"
        }
        
        result = db.users.insert_one(user_data)
        print("User created with id:", result.inserted_id)  # Debug log
        
        return jsonify({
            "message": "User registered successfully",
            "user_id": str(result.inserted_id)
        }), 201
        
    except Exception as e:
        print("Error in registration:", str(e))  # Debug log
        return jsonify({"error": "Internal server error"}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        # Tìm user trong database
        user = db.users.find_one({"email": email})
        
        if not user:
            return jsonify({
                "error": "Account not found",
                "redirect": "/register"  # Thêm thông tin redirect
            }), 404
#     if not user or not check_password_hash(user["password"], data["password"]):
#         return jsonify({"error": "Invalid username or password"}), 401
        # Kiểm tra password
        if not check_password_hash(user["password"], password):
            return jsonify({"error": "Invalid password"}), 401

        # Tạo JWT token nếu thành công
        access_token = create_access_token(identity=str(user["_id"]))
        
        return jsonify({
            "message": "Login successful",
            "access_token": access_token,
            "redirect": "/dashboard"  # Redirect đến dashboard khi thành công
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    current_user_id = get_jwt_identity()
    user = db.users.find_one({"_id": current_user_id})
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "fullname": user["fullname"]
    }), 200

@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    # Với JWT, logout thường được xử lý ở phía client bằng cách xóa token
    return jsonify({"message": "Logout successful"}), 200
# from flask import Blueprint, request, jsonify
# from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
# from werkzeug.security import generate_password_hash, check_password_hash
# from config.db import db, serialize_objectid
# from bson.objectid import ObjectId
# import datetime

# auth_bp = Blueprint("auth", __name__)

# @auth_bp.route("/register", methods=["POST"])
# def register():
#     data = request.json
    
#     # Validate required fields
#     required_fields = ["username", "email", "password", "fullname"]
#     for field in required_fields:
#         if field not in data or not data[field]:
#             return jsonify({"error": f"{field} is required"}), 400
    
#     # Check if username already exists
#     if db.users.find_one({"username": data["username"]}):
#         return jsonify({"error": "Username already exists"}), 400
    
#     # Check if email already exists
#     if db.users.find_one({"email": data["email"]}):
#         return jsonify({"error": "Email already exists"}), 400
    
#     # Create new user
#     new_user = {
#         "_id": ObjectId(),
#         "username": data["username"],
#         "email": data["email"],
#         "password": generate_password_hash(data["password"]),
#         "fullname": data["fullname"],
#         "bio": "",
#         "location": "",
#         "website": "",
#         "avatar": "/static/uploads/default-avatar-1.jpg",
#         "joinedDate": datetime.datetime.now(),
#         "following": [],
#         "followers": []
#     }
    
#     db.users.insert_one(new_user)
    
#     # Create access token
#     access_token = create_access_token(identity=str(new_user["_id"]))
    
#     # Remove password from response
#     new_user.pop("password", None)
    
#     # Convert ObjectId to string
#     new_user = serialize_objectid(new_user)
    
#     return jsonify({
#         "message": "User registered successfully",
#         "token": access_token,
#         "user": new_user
#     }), 201

# @auth_bp.route("/login", methods=["POST"])
# def login():
#     data = request.json
    
#     # Validate required fields
#     if "username" not in data or "password" not in data:
#         return jsonify({"error": "Username and password are required"}), 400
    
#     # Find user by username
#     user = db.users.find_one({"username": data["username"]})
    
#     # Check if user exists and password is correct
#     if not user or not check_password_hash(user["password"], data["password"]):
#         return jsonify({"error": "Invalid username or password"}), 401
    
#     # Create access token
#     access_token = create_access_token(identity=str(user["_id"]))
    
#     # Remove password from response
#     user.pop("password", None)
    
#     # Convert ObjectId to string
#     user = serialize_objectid(user)
    
#     return jsonify({
#         "message": "Login successful",
#         "token": access_token,
#         "user": user
#     }), 200

# @auth_bp.route("/logout", methods=["POST"])
# @jwt_required()
# def logout():
#     # JWT tokens are stateless, so we don't need to do anything server-side
#     # The client will remove the token from local storage
#     return jsonify({"message": "Logout successful"}), 200
