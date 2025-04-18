from flask import Blueprint
from config.db import db
from bson.objectid import ObjectId
from backend.notifications import create_notification
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Blueprint
notification_handlers_bp = Blueprint('notification_handlers', __name__)

def handle_follow_notification(follower_id, followed_id):
    """Handle notification when a user follows another user"""
    try:
        # Don't create notification if user follows themselves
        if follower_id == followed_id:
            return None
        
        # Create notification
        notification = create_notification(
            recipient_id=followed_id,
            type="follow",
            actor_id=follower_id,
            entity_id=followed_id,
            entity_type="user"
        )
        
        return notification
    except Exception as e:
        logger.error(f"Error handling follow notification: {str(e)}")
        return None

def handle_like_post_notification(user_id, post_id):
    """Handle notification when a user likes a post"""
    try:
        # Get post data
        post = db.posts.find_one({"_id": ObjectId(post_id)})
        if not post:
            return None
        
        # Get post author ID
        author_id = str(post["author"]["_id"])
        
        # Don't create notification if user likes their own post
        if user_id == author_id:
            return None
        
        # Create notification
        notification = create_notification(
            recipient_id=author_id,
            type="like",
            actor_id=user_id,
            entity_id=post_id,
            entity_type="post",
            content=post.get("content", "")[:100]  # Truncate content to 100 chars
        )
        
        return notification
    except Exception as e:
        logger.error(f"Error handling like post notification: {str(e)}")
        return None

def handle_comment_notification(user_id, post_id, comment_id, comment_content):
    """Handle notification when a user comments on a post"""
    try:
        # Get post data
        post = db.posts.find_one({"_id": ObjectId(post_id)})
        if not post:
            return None
        
        # Get post author ID
        author_id = str(post["author"]["_id"])
        
        # Don't create notification if user comments on their own post
        if user_id == author_id:
            return None
        
        # Create notification
        notification = create_notification(
            recipient_id=author_id,
            type="comment",
            actor_id=user_id,
            entity_id=post_id,
            entity_type="post",
            content=comment_content[:100]  # Truncate content to 100 chars
        )
        
        return notification
    except Exception as e:
        logger.error(f"Error handling comment notification: {str(e)}")
        return None

def handle_reply_notification(user_id, comment_id, reply_content, post_id=None):
    """Handle notification when a user replies to a comment"""
    try:
        # Find the post containing the comment
        if not post_id:
            post = db.posts.find_one({"comments._id": ObjectId(comment_id)})
            if not post:
                return None
            post_id = str(post["_id"])
        else:
            post = db.posts.find_one({"_id": ObjectId(post_id)})
            if not post:
                return None
        
        # Find the comment
        comment = None
        for c in post.get("comments", []):
            if str(c["_id"]) == comment_id:
                comment = c
                break
        
        if not comment:
            return None
        
        # Get comment author ID
        comment_author_id = str(comment["author"]["_id"])
        
        # Don't create notification if user replies to their own comment
        if user_id == comment_author_id:
            return None
        
        # Create notification
        notification = create_notification(
            recipient_id=comment_author_id,
            type="reply",
            actor_id=user_id,
            entity_id=post_id,
            entity_type="comment",
            content=reply_content[:100]  # Truncate content to 100 chars
        )
        
        return notification
    except Exception as e:
        logger.error(f"Error handling reply notification: {str(e)}")
        return None

# def handle_mention_notification(user_id, mentioned_username, content, entity_id, entity_type):
#     """Handle notification when a user mentions another user"""
#     try:
#         # Find mentioned user
#         mentioned_user = db.users.find_one({"username": mentioned_username})
#         if not mentioned_user:
#             return None
        
#         mentioned_user_id = str(mentioned_user["_id"])
        
#         # Don't create notification if user mentions themselves
#         if user_id == mentioned_user_id:
#             return None
        
#         # Create notification
#         notification = create_notification(
#             recipient_id=mentioned_user_id,
#             type="mention",
#             actor_id=user_id,
#             entity_id=entity_id,
#             entity_type=entity_type,
#             content=content[:100]  # Truncate content to 100 chars
#         )
        
#         return notification
#     except Exception as e:
#         logger.error(f"Error handling mention notification: {str(e)}")
#         return None

def handle_new_post_notification(user_id, post_id, post_content):
    """Handle notification when a user you follow creates a new post"""
    try:
        # Get user's followers
        followers = db.users.find({"following": ObjectId(user_id)})
        
        # Create notifications for each follower
        notifications = []
        for follower in followers:
            notification = create_notification(
                recipient_id=str(follower["_id"]),
                type="post",
                actor_id=user_id,
                entity_id=post_id,
                entity_type="post",
                content=post_content[:100]  # Truncate content to 100 chars
            )
            if notification:
                notifications.append(notification)
        
        return notifications
    except Exception as e:
        logger.error(f"Error handling new post notification: {str(e)}")
        return None
