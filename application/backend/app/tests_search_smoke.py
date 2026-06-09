import json
from fastapi.testclient import TestClient

from app.core.database import SessionLocal, init_db
from app.main import app
from app.models.database import Style

client = TestClient(app)


def test_search_modern():
    init_db()
    db = SessionLocal()
    try:
        if db.query(Style).filter(Style.name == "Modern").first() is None:
            db.add(
                Style(
                    name="Modern",
                    description="Clean lines, minimal decor, neutral colors with bold accents",
                )
            )
            db.commit()
    finally:
        db.close()

    resp = client.get('/search?q=modern')
    assert resp.status_code == 200
    data = resp.json()
    print('results', json.dumps(data, indent=2)[:500])
    assert len(data["results"]) >= 1
    assert any(result["title"] == "Modern" for result in data["results"])


if __name__ == '__main__':
    test_search_modern()
    print('ok')
