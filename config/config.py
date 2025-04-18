import os
from dotenv import load_dotenv

# Tự động tải biến từ .env
load_dotenv()

class Config:
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))  # lấy đường dẫn gốc
    
    # Thay đổi: Cho phép cấu hình thư mục upload từ biến môi trường hoặc sử dụng đường dẫn tuyệt đối
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", os.path.join(BASE_DIR, '..', 'static', 'uploads'))
    
    # Đảm bảo đường dẫn là tuyệt đối
    if not os.path.isabs(UPLOAD_FOLDER):
        UPLOAD_FOLDER = os.path.abspath(os.path.join(BASE_DIR, '..', UPLOAD_FOLDER))
    
    # Thêm: Đảm bảo thư mục upload tồn tại
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    # Thêm: Cho phép sử dụng đường dẫn tuyệt đối cho ảnh
    ALLOW_ABSOLUTE_PATHS = os.getenv("ALLOW_ABSOLUTE_PATHS", "False").lower() == "true"
    
    # Thêm: URL prefix cho các file tĩnh
    STATIC_URL_PREFIX = "/static/uploads/"
    
    MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://social_app:12345@mintoonitc.momps.mongodb.net/connectify_db?retryWrites=true&w=majority&appName=mintooNITC")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your_very_strong_secret_key_here")
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}