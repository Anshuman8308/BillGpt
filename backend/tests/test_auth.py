from tests.conftest import register, auth_headers


def test_register_success(client):
    res = client.post("/auth/register", json={"email": "a@test.com", "password": "password123"})
    assert res.status_code == 201
    body = res.json()
    assert body["user"]["email"] == "a@test.com"
    assert "access_token" in body


def test_register_weak_password_rejected(client):
    res = client.post("/auth/register", json={"email": "a@test.com", "password": "short"})
    assert res.status_code == 422


def test_register_invalid_email_rejected(client):
    res = client.post("/auth/register", json={"email": "not-an-email", "password": "password123"})
    assert res.status_code == 422


def test_register_duplicate_email_rejected(client):
    register(client, "dup@test.com")
    res = client.post("/auth/register", json={"email": "dup@test.com", "password": "password123"})
    assert res.status_code == 400


def test_password_is_hashed_not_plaintext(client):
    from app import models

    register(client, "hashcheck@test.com", "password123")
    db_gen = client.app.dependency_overrides
    # Pull a session the same way the app does, via the overridden get_db
    from app.database import get_db

    db = next(db_gen[get_db]())
    user = db.query(models.User).filter(models.User.email == "hashcheck@test.com").first()
    assert user.hashed_password != "password123"
    assert user.hashed_password.startswith("$2b$")  # bcrypt prefix


def test_login_success(client):
    register(client, "login@test.com", "password123")
    res = client.post("/auth/login", json={"email": "login@test.com", "password": "password123"})
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_wrong_password_rejected(client):
    register(client, "login2@test.com", "password123")
    res = client.post("/auth/login", json={"email": "login2@test.com", "password": "wrongpass"})
    assert res.status_code == 401


def test_login_nonexistent_user_rejected(client):
    res = client.post("/auth/login", json={"email": "ghost@test.com", "password": "password123"})
    assert res.status_code == 401


def test_me_requires_auth(client):
    res = client.get("/auth/me")
    assert res.status_code == 401


def test_me_with_valid_token(client):
    token = register(client, "me@test.com")
    res = client.get("/auth/me", headers=auth_headers(token))
    assert res.status_code == 200
    assert res.json()["email"] == "me@test.com"


def test_me_with_garbage_token_rejected(client):
    res = client.get("/auth/me", headers=auth_headers("this.is.garbage"))
    assert res.status_code == 401


def test_protected_endpoint_with_no_token(client):
    res = client.get("/comparisons")
    assert res.status_code == 401


def test_logout_requires_auth_and_succeeds(client):
    token = register(client, "logout@test.com")
    res = client.post("/auth/logout", headers=auth_headers(token))
    assert res.status_code == 200
