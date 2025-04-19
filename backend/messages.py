import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from config.db import db
from bson.objectid import ObjectId
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create blueprint
messages_bp = Blueprint('messages', __name__, url_prefix='/api/messages')

@messages_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    try:
        query = request.args.get('q', '').lower()
        logger.debug(f"Fetching users with query: {query}")

        # Fetch all users (temporary for testing)
        query_filter = {}
        if query:
            query_filter["$or"] = [
                {"username": {"$regex": query, "$options": "i"}},
                {"fullname": {"$regex": query, "$options": "i"}}
            ]

        users = db.users.find(query_filter)
        users_list = [
            {
                "_id": str(user["_id"]),
                "username": user.get("username", ""),
                "fullname": user.get("fullname", user.get("username", "")),
                "avatar": user.get("avatar", "/static/images/default-avatar.png")
            }
            for user in users
        ]

        logger.debug(f"Found {len(users_list)} users")
        return jsonify({"users": users_list}), 200

    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        return jsonify({"error": "Failed to fetch users"}), 500

@messages_bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    try:
        current_user_id = get_jwt_identity()
        logger.debug(f"Fetching conversations for user ID: {current_user_id}")

        # Fetch conversations where the user is a participant
        conversations = db.conversations.find({
            "participants": ObjectId(current_user_id)
        })
        conversations_list = []

        for conv in conversations:
            # Fetch participant details
            participants = []
            for participant_id in conv["participants"]:
                user = db.users.find_one({"_id": participant_id})
                if user:
                    participants.append({
                        "_id": str(user["_id"]),
                        "username": user.get("username", ""),
                        "fullname": user.get("fullname", user.get("username", "")),
                        "avatar": user.get("avatar", "/static/images/default-avatar.png")
                    })
            # Tìm người còn lại trong cuộc hội thoại
            other_participant = next(
                (p for p in participants if p["_id"] != current_user_id), None
            )

            # Nếu không có người khác ngoài chính mình (VD: self chat), thì bỏ qua
            if not other_participant:
                continue

            # Format lại lastMessage
            last_message = conv.get("lastMessage")
            if last_message:
                sender = db.users.find_one({"_id": last_message["sender"]})
                last_message = {
                    "_id": str(last_message["_id"]),
                    "content": last_message["content"],
                    "sender": {
                        "_id": str(sender["_id"]) if sender else "",
                    },
                    "createdAt": last_message["createdAt"].isoformat()
                }

            # Trả về người còn lại thay vì toàn bộ participants
            conversations_list.append({
                "_id": str(conv["_id"]),
                "participant": other_participant,  # 👈 Thay vì 'participants'
                "lastMessage": last_message,
                "unreadCount": conv.get("unreadCount", 0)
            })
            if all(participant["_id"] == current_user_id for participant in participants):
                continue
            # Format lastMessage
            last_message = conv.get("lastMessage")
            if last_message:
                sender = db.users.find_one({"_id": last_message["sender"]})
                last_message = {
                    "_id": str(last_message["_id"]),
                    "content": last_message["content"],
                    "sender": {
                        "_id": str(sender["_id"]) if sender else "",
                    },
                    "createdAt": last_message["createdAt"].isoformat()
                }

            conversations_list.append({
                "_id": str(conv["_id"]),
                "participants": participants,
                "lastMessage": last_message,
                "unreadCount": conv.get("unreadCount", 0)
            })

        logger.debug(f"Found {len(conversations_list)} conversations")
        return jsonify({"conversations": conversations_list}), 200

    except Exception as e:
        logger.error(f"Error fetching conversations: {str(e)}")
        return jsonify({"error": "Failed to fetch conversations"}), 500

@messages_bp.route('/conversations', methods=['POST'])
@jwt_required()
def create_conversation():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        receiver_id = data.get('receiverId')

        if not receiver_id:
            return jsonify({"error": "Receiver ID is required"}), 400

        # Check if a conversation already exists between these users
        existing_conversation = db.conversations.find_one({
            "participants": {
                "$all": [ObjectId(current_user_id), ObjectId(receiver_id)],
                "$size": 2
            }
        })

        if existing_conversation:
            return jsonify({
                "conversation": {
                    "_id": str(existing_conversation["_id"]),
                    "participants": [
                        {"_id": str(p)} for p in existing_conversation["participants"]
                    ]
                }
            }), 200

        # Create new conversation
        conversation = {
            "_id": ObjectId(),
            "participants": [ObjectId(current_user_id), ObjectId(receiver_id)],
            "createdAt": datetime.datetime.now(),
            "updatedAt": datetime.datetime.now(),
            "unreadCount": 0
        }
        db.conversations.insert_one(conversation)

        # Fetch participant details for response
        participants = []
        for participant_id in conversation["participants"]:
            user = db.users.find_one({"_id": participant_id})
            if user:
                participants.append({
                    "_id": str(user["_id"]),
                    "username": user.get("username", ""),
                    "fullname": user.get("fullname", user.get("username", "")),
                    "avatar": user.get("avatar", "/static/images/default-avatar.png")
                })

        response = {
            "_id": str(conversation["_id"]),
            "participants": participants,
            "createdAt": conversation["createdAt"].isoformat(),
            "updatedAt": conversation["updatedAt"].isoformat(),
            "unreadCount": conversation["unreadCount"]
        }

        logger.debug(f"Created new conversation: {response['_id']}")
        return jsonify({"conversation": response}), 201

    except Exception as e:
        logger.error(f"Error creating conversation: {str(e)}")
        return jsonify({"error": "Failed to create conversation"}), 500

@messages_bp.route('/conversations/<conversation_id>/messages', methods=['GET'])
@jwt_required()
def get_conversation_messages(conversation_id):
    try:
        current_user_id = get_jwt_identity()
        logger.debug(f"Fetching messages for conversation ID: {conversation_id}, user: {current_user_id}")

        # Validate conversation_id format
        try:
            conversation_object_id = ObjectId(conversation_id)
        except Exception as e:
            logger.error(f"Invalid conversation ID format: {conversation_id}, error: {str(e)}")
            return jsonify({"error": "Invalid conversation ID"}), 400

        # Validate conversation exists and user is a participant
        conversation = db.conversations.find_one({
            "_id": conversation_object_id,
            "participants": ObjectId(current_user_id)
        })
        if not conversation:
            logger.error(f"Conversation {conversation_id} not found or user not authorized")
            return jsonify({"error": "Conversation not found or unauthorized"}), 404

        # Fetch messages for the conversation (considering both senderId and receiverId)
        messages = db.messages.find({"conversationId": conversation_object_id}).sort("createdAt", 1)
        messages_list = []

        for message in messages:
            # Fetch sender details
            sender = db.users.find_one({"_id": message["senderId"]})
            if not sender:
                continue  # Skip messages with invalid sender

            # Fetch receiver details
            receiver = db.users.find_one({"_id": message["receiverId"]})
            if not receiver:
                continue  # Skip messages with invalid receiver

            messages_list.append({
                "_id": str(message["_id"]),
                "conversationId": str(message["conversationId"]),
                "sender": {
                    "_id": str(sender["_id"]),
                    "username": sender.get("username", ""),
                    "fullname": sender.get("fullname", sender.get("username", "")),
                    "avatar": sender.get("avatar", "/static/images/default-avatar.png")
                },
                "receiver": {
                    "_id": str(receiver["_id"]),
                    "username": receiver.get("username", ""),
                    "fullname": receiver.get("fullname", receiver.get("username", "")),
                    "avatar": receiver.get("avatar", "/static/images/default-avatar.png")
                },
                "content": message.get("content", ""),
                "createdAt": message["createdAt"].isoformat(),
                "isRead": message.get("isRead", False),
                "isDelivered": message.get("isDelivered", True)
            })

        logger.debug(f"Found {len(messages_list)} messages")
        return jsonify({"messages": messages_list}), 200

    except Exception as e:
        logger.error(f"Error fetching messages: {str(e)}")
        return jsonify({"error": "Failed to fetch messages"}), 500

@messages_bp.route('/conversations/<conversation_id>/messages', methods=['POST'])
@jwt_required()
def send_message(conversation_id):
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        content = data.get('content', '').strip()

        if not content:
            return jsonify({"error": "Message content is required"}), 400

        # Validate conversation_id format
        try:
            conversation_object_id = ObjectId(conversation_id)
        except Exception as e:
            logger.error(f"Invalid conversation ID format: {conversation_id}, error: {str(e)}")
            return jsonify({"error": "Invalid conversation ID"}), 400

        # Validate conversation
        conversation = db.conversations.find_one({
            "_id": conversation_object_id,
            "participants": ObjectId(current_user_id)
        })
        if not conversation:
            return jsonify({"error": "Conversation not found or unauthorized"}), 404

        # Determine receiverId (the other participant in the conversation)
        participants = conversation["participants"]
        receiver_id = [p for p in participants if str(p) != current_user_id][0]

        # Create new message with receiverId
        message = {
            "_id": ObjectId(),
            "conversationId": conversation_object_id,
            "senderId": ObjectId(current_user_id),
            "receiverId": ObjectId(receiver_id),
            "content": content,
            "createdAt": datetime.datetime.now(),
            "isRead": False,
            "isDelivered": True
        }
        db.messages.insert_one(message)

        # Update conversation's lastMessage
        sender = db.users.find_one({"_id": ObjectId(current_user_id)})
        db.conversations.update_one(
            {"_id": conversation_object_id},
            {
                "$set": {
                    "lastMessage": {
                        "_id": message["_id"],
                        "content": content,
                        "sender": ObjectId(current_user_id),
                        "createdAt": message["createdAt"]
                    },
                    "updatedAt": datetime.datetime.now()
                }
            }
        )

        # Fetch receiver details for response
        receiver = db.users.find_one({"_id": ObjectId(receiver_id)})

        # Format response
        response_message = {
            "_id": str(message["_id"]),
            "conversationId": str(message["conversationId"]),
            "sender": {
                "_id": str(sender["_id"]),
                "username": sender.get("username", ""),
                "fullname": sender.get("fullname", sender.get("username", "")),
                "avatar": sender.get("avatar", "/static/images/default-avatar.png")
            },
            "receiver": {
                "_id": str(receiver["_id"]),
                "username": receiver.get("username", ""),
                "fullname": receiver.get("fullname", receiver.get("username", "")),
                "avatar": receiver.get("avatar", "/static/images/default-avatar.png")
            },
            "content": message["content"],
            "createdAt": message["createdAt"].isoformat(),
            "isRead": message["isRead"],
            "isDelivered": message["isDelivered"]
        }

        logger.debug(f"Message sent: {response_message['_id']}")
        return jsonify({"message": response_message}), 201

    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        return jsonify({"error": "Failed to send message"}), 500