from config.db import db
from bson.objectid import ObjectId
import datetime
import os
from werkzeug.security import generate_password_hash
from config.config import Config

# Ensure upload directory exists
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

def seed_database():
    # Check if users collection is empty or if default users don't exist
    if db.users.count_documents({"username": {"$in": ["janedoe", "mikesmith", "johndoe"]}}) < 3:
        print("Seeding database with default users...")
        
        # Create users
        users = [
            {
                "_id": ObjectId(),
                "username": "johndoe",
                "email": "john@example.com",
                "password": generate_password_hash("password123"),
                "fullname": "John Doe",
                "bio": "Web developer and tech enthusiast",
                "location": "New York, USA",
                "website": "https://johndoe.com",
                "avatar": "/static/uploads/default-avatar-1.jpg",
                "cover_image": "/static/uploads/default-cover.jpg",
                "followers": [],
                "following": [],
                "created_at": datetime.datetime.utcnow(),
                "updated_at": datetime.datetime.utcnow()
            },
            {
                "_id": ObjectId(),
                "username": "janedoe",
                "email": "jane@example.com",
                "password": generate_password_hash("password123"),
                "fullname": "Jane Doe",
                "bio": "Digital artist and designer",
                "location": "San Francisco, USA",
                "website": "https://janedoe.com",
                "avatar": "/static/uploads/default-avatar-2.jpg",
                "cover_image": "/static/uploads/default-cover.jpg",
                "followers": [],
                "following": [],
                "created_at": datetime.datetime.utcnow(),
                "updated_at": datetime.datetime.utcnow()
            },
            {
                "_id": ObjectId(),
                "username": "mikesmith",
                "email": "mike@example.com",
                "password": generate_password_hash("password123"),
                "fullname": "Mike Smith",
                "bio": "Photographer and traveler",
                "location": "London, UK",
                "website": "https://mikesmith.com",
                "avatar": "/static/uploads/default-avatar-3.jpg",
                "cover_image": "/static/uploads/default-cover.jpg",
                "followers": [],
                "following": [],
                "created_at": datetime.datetime.utcnow(),
                "updated_at": datetime.datetime.utcnow()
            }
        ]
        
        # Insert users
        user_ids = {}
        for user in users:
            # Check if user already exists
            existing_user = db.users.find_one({"username": user["username"]})
            if existing_user:
                user_ids[user["username"]] = existing_user["_id"]
            else:
                user_id = user["_id"]
                db.users.insert_one(user)
                user_ids[user["username"]] = user_id
        
        # Set up following relationships
        # John follows Jane and Mike
        db.users.update_one(
            {"username": "johndoe"},
            {"$set": {"following": [user_ids["janedoe"], user_ids["mikesmith"]]}}
        )
        
        # Jane follows John
        db.users.update_one(
            {"username": "janedoe"},
            {"$set": {"following": [user_ids["johndoe"]]}}
        )
        
        # Mike follows John and Jane
        db.users.update_one(
            {"username": "mikesmith"},
            {"$set": {"following": [user_ids["johndoe"], user_ids["janedoe"]]}}
        )
        
        # Update followers
        # John has followers: Jane and Mike
        db.users.update_one(
            {"username": "johndoe"},
            {"$set": {"followers": [user_ids["janedoe"], user_ids["mikesmith"]]}}
        )
        
        # Jane has followers: John and Mike
        db.users.update_one(
            {"username": "janedoe"},
            {"$set": {"followers": [user_ids["johndoe"], user_ids["mikesmith"]]}}
        )
        
        # Mike has followers: John
        db.users.update_one(
            {"username": "mikesmith"},
            {"$set": {"followers": [user_ids["johndoe"]]}}
        )
        
        print("Default users created successfully!")
    else:
        print("Default users already exist.")
        # Get user IDs for existing users
        user_ids = {}
        for username in ["johndoe", "janedoe", "mikesmith"]:
            user = db.users.find_one({"username": username})
            if user:
                user_ids[username] = user["_id"]
    
    # Check if posts collection is empty or if default posts don't exist
    if db.posts.count_documents({"author.username": {"$in": ["janedoe", "mikesmith", "johndoe"]}}) < 3:
        print("Seeding database with default posts...")
        
        # Create posts
        posts = [
            {
                "_id": ObjectId(),
                "content": "Just launched my new website! Check it out and let me know what you think.",
                "image": "/static/uploads/sample-post-1.jpg",
                "author": {
                    "_id": user_ids["johndoe"],
                    "username": "johndoe",
                    "fullname": "John Doe",
                    "avatar": "/static/uploads/default-avatar-1.jpg"
                },
                "likes": [user_ids["janedoe"], user_ids["mikesmith"]],
                "comments": [
                    {
                        "_id": ObjectId(),
                        "content": "Looks great! Love the design.",
                        "author": {
                            "_id": user_ids["janedoe"],
                            "username": "janedoe",
                            "fullname": "Jane Doe",
                            "avatar": "/static/uploads/default-avatar-2.jpg"
                        },
                        "likes": [user_ids["johndoe"]],
                        "created_at": datetime.datetime.utcnow() - datetime.timedelta(hours=5)
                    }
                ],
                "shares": 2,
                "created_at": datetime.datetime.utcnow() - datetime.timedelta(days=2)
            },
            {
                "_id": ObjectId(),
                "content": "Just finished my latest digital art piece. What do you think?",
                "image": "/static/uploads/sample-post-2.jpg",
                "author": {
                    "_id": user_ids["janedoe"],
                    "username": "janedoe",
                    "fullname": "Jane Doe",
                    "avatar": "/static/uploads/default-avatar-2.jpg"
                },
                "likes": [user_ids["johndoe"]],
                "comments": [
                    {
                        "_id": ObjectId(),
                        "content": "This is amazing! Love the colors.",
                        "author": {
                            "_id": user_ids["johndoe"],
                            "username": "johndoe",
                            "fullname": "John Doe",
                            "avatar": "/static/uploads/default-avatar-1.jpg"
                        },
                        "likes": [],
                        "created_at": datetime.datetime.utcnow() - datetime.timedelta(hours=10)
                    }
                ],
                "shares": 5,
                "created_at": datetime.datetime.utcnow() - datetime.timedelta(days=1)
            },
            {
                "_id": ObjectId(),
                "content": "Captured this amazing sunset during my trip to the mountains.",
                "image": "/static/uploads/sample-post-3.jpg",
                "author": {
                    "_id": user_ids["mikesmith"],
                    "username": "mikesmith",
                    "fullname": "Mike Smith",
                    "avatar": "/static/uploads/default-avatar-3.jpg"
                },
                "likes": [user_ids["johndoe"], user_ids["janedoe"]],
                "comments": [],
                "shares": 3,
                "created_at": datetime.datetime.utcnow() - datetime.timedelta(hours=12)
            },
            {
                "_id": ObjectId(),
                "content": "Working on a new project. Can't wait to share it with everyone!",
                "image": None,
                "author": {
                    "_id": user_ids["johndoe"],
                    "username": "johndoe",
                    "fullname": "John Doe",
                    "avatar": "/static/uploads/default-avatar-1.jpg"
                },
                "likes": [],
                "comments": [],
                "shares": 0,
                "created_at": datetime.datetime.utcnow() - datetime.timedelta(hours=3)
            }
        ]
        
        # Insert posts
        for post in posts:
            # Check if post already exists
            existing_post = db.posts.find_one({
                "content": post["content"],
                "author.username": post["author"]["username"]
            })
            if not existing_post:
                db.posts.insert_one(post)
        
        print("Default posts created successfully!")
    else:
        print("Default posts already exist.")

if __name__ == "__main__":
    seed_database()
