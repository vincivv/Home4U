"""
Seed script to populate initial data into the database.
Run this script after starting the database to add default styles and tags.
"""
from app.core.database import SessionLocal, init_db
from app.models.database import Style, Tag, StyleTag, User
from app.utils.auth import get_password_hash

# Default styles for the app
STYLES = [
    {
        "name": "Modern",
        "description": "Clean lines, minimal decor, neutral colors with bold accents",
        "tags": ["minimalist", "neutral", "geometric", "sleek", "contemporary"]
    },
    {
        "name": "Scandinavian",
        "description": "Light, airy spaces with natural materials and cozy textures",
        "tags": ["cozy", "natural", "light-wood", "hygge", "functional"]
    },
    {
        "name": "Industrial",
        "description": "Raw materials, exposed elements, urban aesthetic",
        "tags": ["metal", "exposed-brick", "raw", "urban", "rustic"]
    },
    {
        "name": "Bohemian",
        "description": "Eclectic, colorful, patterns and plants",
        "tags": ["colorful", "eclectic", "patterns", "plants", "vintage"]
    },
    {
        "name": "Traditional",
        "description": "Classic furniture, rich colors, elegant details",
        "tags": ["classic", "elegant", "rich-colors", "ornate", "coordinated"]
    },
    {
        "name": "Minimalist",
        "description": "Less is more, clean spaces, functionality",
        "tags": ["clean", "simple", "uncluttered", "functional", "monochrome"]
    },
    {
        "name": "Mid-Century Modern",
        "description": "1950s-60s style with organic curves and retro feel",
        "tags": ["retro", "organic", "walnut", "iconic", "vintage"]
    },
    {
        "name": "Farmhouse",
        "description": "Rustic charm with modern amenities",
        "tags": ["rustic", "shiplap", "vintage", "cozy", "white"]
    }
]

# Default test users
TEST_USERS = [
    {"email": "test@example.com", "password": "test123"},
    {"email": "demo@home4u.com", "password": "demo123"},
]

def seed_database():
    """Seed the database with initial data."""
    init_db()
    
    db = SessionLocal()
    
    try:
        # Create test users first
        for user_data in TEST_USERS:
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()
            if not existing_user:
                hashed_password = get_password_hash(user_data["password"])
                db_user = User(email=user_data["email"], password_hash=hashed_password)
                db.add(db_user)
        
        # Check if data already exists
        existing_styles = db.query(Style).count()
        if existing_styles > 0:
            print(f"Database already has {existing_styles} styles and {len(TEST_USERS)} users. Skipping seed.")
            db.commit()
            return
        
        # Create tags first
        tag_map = {}
        for style_data in STYLES:
            for tag_name in style_data["tags"]:
                if tag_name not in tag_map:
                    tag = Tag(name=tag_name)
                    db.add(tag)
                    db.flush()
                    tag_map[tag_name] = tag
        
        # Create styles with tags
        for style_data in STYLES:
            style = Style(
                name=style_data["name"],
                description=style_data["description"]
            )
            db.add(style)
            db.flush()
            
            # Create style-tag relationships
            for tag_name in style_data["tags"]:
                style_tag = StyleTag(
                    style_id=style.id,
                    tag_id=tag_map[tag_name].id,
                    weight=1.0
                )
                db.add(style_tag)
        
        db.commit()
        print(f"Successfully seeded {len(TEST_USERS)} users, {len(STYLES)} styles and {len(tag_map)} tags!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
