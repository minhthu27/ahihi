from pymongo import MongoClient
from config.config import Config
from pymongo.errors import ConnectionFailure
from bson.objectid import ObjectId

try:
    client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=5000)
    # Kiểm tra kết nối
    client.admin.command('ping')
    db = client["connectify_db"]
    print("Kết nối MongoDB thành công!")
except ConnectionFailure as e:
    print("Lỗi kết nối MongoDB:", e)
    raise

# Helper function to convert ObjectId to string for JSON serialization
def serialize_objectid(obj):
    if isinstance(obj, dict):
        for key in obj:
            if isinstance(obj[key], ObjectId):
                obj[key] = str(obj[key])
            elif isinstance(obj[key], dict):
                obj[key] = serialize_objectid(obj[key])
            elif isinstance(obj[key], list):
                obj[key] = [serialize_objectid(item) if isinstance(item, dict) else str(item) if isinstance(item, ObjectId) else item for item in obj[key]]
    return obj
