# backend/admin.py
from flask import Blueprint, render_template

admin_bp = Blueprint('admin', __name__, template_folder='../templates/admin')

@admin_bp.route('/admin/dashboard')
def admin_dashboard():
    return render_template('admin/dashboard.html')

@admin_bp.route('/admin/users')
def admin_users():
    return render_template('admin/users.html')

@admin_bp.route('/admin/posts')
def admin_posts():
    return render_template('admin/posts.html')

@admin_bp.route('/admin/settings')
def admin_settings():
    return render_template('admin/settings.html')
