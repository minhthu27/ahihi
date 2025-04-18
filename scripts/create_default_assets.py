import os
from PIL import Image, ImageDraw, ImageFont
import random
from config.config import Config

# Ensure upload directory exists
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

def create_default_avatar(filename, text, bg_color=None):
    """Create a default avatar with initials"""
    size = (200, 200)
    
    # Generate random background color if not provided
    if bg_color is None:
        bg_color = (
            random.randint(100, 200),
            random.randint(100, 200),
            random.randint(100, 200)
        )
    
    # Create image with background color
    img = Image.new('RGB', size, bg_color)
    draw = ImageDraw.Draw(img)
    
    # Try to load a font, use default if not available
    try:
        font = ImageFont.truetype("arial.ttf", 80)
    except IOError:
        font = ImageFont.load_default()
    
    # Calculate text size using textbbox
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    position = ((size[0] - text_width) / 2, (size[1] - text_height) / 2 - 10)
    
    # White text
    draw.text(position, text, (255, 255, 255), font=font)
    
    # Save the image
    img.save(os.path.join(Config.UPLOAD_FOLDER, filename))
    print(f"Created {filename}")

def create_default_cover(filename, color=None):
    """Create a default cover image"""
    size = (1200, 300)
    
    # Generate random color if not provided
    if color is None:
        color = (
            random.randint(50, 150),
            random.randint(50, 150),
            random.randint(50, 150)
        )
    
    # Create image with background color
    img = Image.new('RGB', size, color)
    
    # Add some simple pattern
    draw = ImageDraw.Draw(img)
    
    # Draw some random shapes
    for _ in range(20):
        x1 = random.randint(0, size[0])
        y1 = random.randint(0, size[1])
        x2 = random.randint(0, size[0])
        y2 = random.randint(0, size[1])
        
        # Slightly lighter color for shapes
        shape_color = tuple(min(c + 30, 255) for c in color)
        
        draw.line((x1, y1, x2, y2), fill=shape_color, width=5)
    
    # Save the image
    img.save(os.path.join(Config.UPLOAD_FOLDER, filename))
    print(f"Created {filename}")

def create_sample_post_image(filename, text, color=None):
    """Create a sample post image"""
    size = (800, 600)
    
    # Generate random color if not provided
    if color is None:
        color = (
            random.randint(50, 200),
            random.randint(50, 200),
            random.randint(50, 200)
        )
    
    # Create image with background color
    img = Image.new('RGB', size, color)
    draw = ImageDraw.Draw(img)
    
    # Try to load a font, use default if not available
    try:
        font = ImageFont.truetype("arial.ttf", 40)
        small_font = ImageFont.truetype("arial.ttf", 24)
    except IOError:
        font = ImageFont.load_default()
        small_font = ImageFont.load_default()
    
    # Draw text in the center
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    position = ((size[0] - text_width) / 2, (size[1] - text_height) / 2 - 20)
    
    # White text
    draw.text(position, text, (255, 255, 255), font=font)
    
    # Add a small note at the bottom
    note = "Sample Post Image"
    note_bbox = draw.textbbox((0, 0), note, font=small_font)
    note_width = note_bbox[2] - note_bbox[0]
    note_height = note_bbox[3] - note_bbox[1]
    note_position = ((size[0] - note_width) / 2, size[1] - note_height - 20)
    draw.text(note_position, note, (255, 255, 255), font=small_font)
    
    # Save the image
    img.save(os.path.join(Config.UPLOAD_FOLDER, filename))
    print(f"Created {filename}")

def create_default_assets():
    """Create all default assets"""
    # Create default avatars
    create_default_avatar("default-avatar-1.jpg", "JD", (41, 128, 185))  # Blue
    create_default_avatar("default-avatar-2.jpg", "JS", (155, 89, 182))  # Purple
    create_default_avatar("default-avatar-3.jpg", "MS", (46, 204, 113))  # Green
    
    # Create default cover
    create_default_cover("default-cover.jpg", (52, 73, 94))  # Dark blue-gray
    
    # Create sample post images
    create_sample_post_image("sample-post-1.jpg", "Website Launch", (41, 128, 185))
    create_sample_post_image("sample-post-2.jpg", "Digital Art", (155, 89, 182))
    create_sample_post_image("sample-post-3.jpg", "Mountain Sunset", (230, 126, 34))

if __name__ == "__main__":
    create_default_assets()
