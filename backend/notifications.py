from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from config.db import db, serialize_objectid
from bson.objectid import ObjectId
import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Blueprint
notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    try:
        current_user_id = get_jwt_identity()
        limit = int(request.args.get('limit', 20))
        skip = int(request.args.get('skip', 0))
        unread_only = request.args.get('unread', 'false').lower() == 'true'
        notification_type = request.args.get('type', None)
        query = {"recipient_id": ObjectId(current_user_id)}
        if unread_only:
            query["read"] = False
        if notification_type:  # Thêm điều kiện lọc theo type
            query["type"] = notification_type
        notifications = list(db.notifications.find(query)
                            .sort("created_at", -1)
                            .skip(skip)
                            .limit(limit))
        
        unread_count = db.notifications.count_documents({"recipient_id": ObjectId(current_user_id), "read": False})
        likes_count = db.notifications.count_documents({
                "recipient_id": ObjectId(current_user_id),
                "read": False,
                "type": "like"
            })
        follows_count = db.notifications.count_documents({
                "recipient_id": ObjectId(current_user_id),
                "read": False,
                "type": "follow"
            })
        # mentions_count = db.notifications.count_documents({
        #         "recipient_id": ObjectId(current_user_id),
        #         "read": False,
        #         "type": "mention"
        #     })

        notifications = [serialize_objectid(notification) for notification in notifications]
        
        return jsonify({
            "notifications": notifications,
            "likes_count": likes_count,
            "follows_count": follows_count,
            # "mentions_count": mentions_count,
            "unread_count": unread_count,
            "total": len(notifications),
            "has_more": len(notifications) == limit
        }), 200
    except Exception as e:
        logger.error(f"Error getting notifications: {str(e)}")
        return jsonify({"error": "Failed to get notifications"}), 500

@notifications_bp.route('/mark-read', methods=['POST'])
@jwt_required()
def mark_notifications_read():
    """Mark notifications as read"""
    try:
        # Get current user ID from JWT
        current_user_id = get_jwt_identity()
        
        # Get request data
        data = request.json
        notification_ids = data.get('notification_ids', [])
        
        if not notification_ids and data.get('all', False):
            # Mark all notifications as read
            result = db.notifications.update_many(
                {"recipient_id": ObjectId(current_user_id), "read": False},
                {"$set": {"read": True, "read_at": datetime.datetime.utcnow()}}
            )
            
            return jsonify({
                "success": True,
                "message": f"Marked {result.modified_count} notifications as read"
            }), 200
        
        # Convert string IDs to ObjectId
        notification_ids = [ObjectId(id) for id in notification_ids if ObjectId.is_valid(id)]
        
        if not notification_ids:
            return jsonify({"error": "No valid notification IDs provided"}), 400
        
        # Mark specified notifications as read
        result = db.notifications.update_many(
            {
                "_id": {"$in": notification_ids},
                "recipient_id": ObjectId(current_user_id)
            },
            {"$set": {"read": True, "read_at": datetime.datetime.utcnow()}}
        )
        
        return jsonify({
            "success": True,
            "message": f"Marked {result.modified_count} notifications as read"
        }), 200
        
    except Exception as e:
        logger.error(f"Error marking notifications as read: {str(e)}")
        return jsonify({"error": "Failed to mark notifications as read"}), 500

@notifications_bp.route('/count', methods=['GET'])
@jwt_required()
def get_notification_count():
    """Get unread notification count"""
    try:
        # Get current user ID from JWT
        current_user_id = get_jwt_identity()
        
        # Get unread count
        unread_count = db.notifications.count_documents({
            "recipient_id": ObjectId(current_user_id),
            "read": False
        })
        
        # Get counts by type for activity stats
        likes_count = db.notifications.count_documents({
            "recipient_id": ObjectId(current_user_id),
            "read": False,
            "type": "like"
        })
        
        follows_count = db.notifications.count_documents({
            "recipient_id": ObjectId(current_user_id),
            "read": False,
            "type": "follow"
        })
        
        # mentions_count = db.notifications.count_documents({
        #     "recipient_id": ObjectId(current_user_id),
        #     "read": False,
        #     "type": "mention"
        # })
        
        return jsonify({
            "unread_count": unread_count,
            "likes_count": likes_count,
            "follows_count": follows_count,
            # "mentions_count": mentions_count
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting notification count: {str(e)}")
        return jsonify({"error": "Failed to get notification count"}), 500

@notifications_bp.route('/clear', methods=['DELETE'])
@jwt_required()
def clear_notifications():
    """Clear all notifications"""
    try:
        # Get current user ID from JWT
        current_user_id = get_jwt_identity()
        
        # Delete all notifications for the user
        result = db.notifications.delete_many({"recipient_id": ObjectId(current_user_id)})
        
        return jsonify({
            "success": True,
            "message": f"Cleared {result.deleted_count} notifications"
        }), 200
        
    except Exception as e:
        logger.error(f"Error clearing notifications: {str(e)}")
        return jsonify({"error": "Failed to clear notifications"}), 500

# Helper function to create a notification
def create_notification(recipient_id, type, actor_id=None, entity_id=None, entity_type=None, content=None):
    """
    Create a notification
    
    Args:
        recipient_id: ID of the user receiving the notification
        type: Type of notification (follow, like, comment, etc.)
        actor_id: ID of the user who triggered the notification
        entity_id: ID of the entity related to the notification (post, comment, etc.)
        entity_type: Type of entity (post, comment, etc.)
        content: Additional content for the notification
    
    Returns:
        The created notification document
    """
    try:
        # Get actor data if provided
        actor = None
        if actor_id:
            actor_data = db.users.find_one({"_id": ObjectId(actor_id)})
            if actor_data:
                actor = {
                    "_id": actor_data["_id"],
                    "username": actor_data["username"],
                    "fullname": actor_data.get("fullname", actor_data["username"]),
                    "avatar": actor_data.get("avatar", "/static/uploads/default-avatar-1.jpg")
                }
        
        # Create notification document
        notification = {
            "recipient_id": ObjectId(recipient_id),
            "type": type,
            "read": False,
            "created_at": datetime.datetime.utcnow(),
            "actor": actor,
            "entity_id": ObjectId(entity_id) if entity_id else None,
            "entity_type": entity_type,
            "content": content
        }
        
        # Insert notification into database
        result = db.notifications.insert_one(notification)
        
        # Get the created notification
        created_notification = db.notifications.find_one({"_id": result.inserted_id})
        
        return created_notification
        
    except Exception as e:
        logger.error(f"Error creating notification: {str(e)}")
        return None
