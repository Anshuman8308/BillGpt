import pytest
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, get_db
from app.seed import SEED_CARDS
from app import models


@pytest.fixture()
def client():
    """Fresh in-memory SQLite DB per test, fully isolated from local dev data."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

   
    db = TestingSessionLocal()
    for card in SEED_CARDS:
        db.add(models.Card(**card, is_active=True))
    db.commit()
    db.close()

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db


    test_client = TestClient(app)
    yield test_client

    app.dependency_overrides.clear()


def register(client, email="user@test.com", password="password123"):
    res = client.post("/auth/register", json={"email": email, "password": password})
    assert res.status_code == 201, res.text
    return res.json()["access_token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}
