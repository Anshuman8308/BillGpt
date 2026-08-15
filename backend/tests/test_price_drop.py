from unittest.mock import patch

from tests.conftest import register, auth_headers


def _fixed_source(price):
    def fetch(q):
        return {
            "vendor": "Amazon", "listing_price": price, "mrp": price,
            "title": "Item", "link": "https://amazon.in", "available": True,
        }
    return fetch


def test_first_search_has_no_price_history(client):
    token = register(client)
    with patch("app.routers.search.ALL_SOURCES", {"Amazon": _fixed_source(100.0)}):
        res = client.get("/search?q=widget", headers=auth_headers(token))
    body = res.json()
    assert body["price_drop"]["status"] == "no_history"


def test_second_search_cheaper_shows_price_drop(client):
    token = register(client)
    with patch("app.routers.search.ALL_SOURCES", {"Amazon": _fixed_source(100.0)}):
        client.get("/search?q=widget", headers=auth_headers(token))

    with patch("app.routers.search.ALL_SOURCES", {"Amazon": _fixed_source(80.0)}):
        res = client.get("/search?q=widget", headers=auth_headers(token))
    body = res.json()
    assert body["price_drop"]["status"] == "cheaper"
    assert body["price_drop"]["difference"] == 20.0
    assert body["price_drop"]["previous_price"] == 100.0


def test_second_search_pricier_shows_increase(client):
    token = register(client)
    with patch("app.routers.search.ALL_SOURCES", {"Amazon": _fixed_source(100.0)}):
        client.get("/search?q=widget2", headers=auth_headers(token))

    with patch("app.routers.search.ALL_SOURCES", {"Amazon": _fixed_source(130.0)}):
        res = client.get("/search?q=widget2", headers=auth_headers(token))
    body = res.json()
    assert body["price_drop"]["status"] == "increased"
    assert body["price_drop"]["difference"] == 30.0


def test_second_search_same_price_shows_no_change(client):
    token = register(client)
    with patch("app.routers.search.ALL_SOURCES", {"Amazon": _fixed_source(100.0)}):
        client.get("/search?q=widget3", headers=auth_headers(token))
        res = client.get("/search?q=widget3", headers=auth_headers(token))
    body = res.json()
    assert body["price_drop"]["status"] == "same"


def test_price_history_is_scoped_per_user(client):
    """User A's price history must not leak into User B's price-drop check."""
    token_a = register(client, "pdA@test.com")
    token_b = register(client, "pdB@test.com")

    with patch("app.routers.search.ALL_SOURCES", {"Amazon": _fixed_source(100.0)}):
        client.get("/search?q=widget4", headers=auth_headers(token_a))
        res_b = client.get("/search?q=widget4", headers=auth_headers(token_b))

    
    assert res_b.json()["price_drop"]["status"] == "no_history"


def test_price_history_normalizes_query_casing_and_punctuation(client):
    token = register(client, "normcheck@test.com")
    with patch("app.routers.search.ALL_SOURCES", {"Amazon": _fixed_source(100.0)}):
        client.get("/search?q=Milk!", headers=auth_headers(token))
        res = client.get("/search?q=  milk", headers=auth_headers(token))
    
    assert res.json()["price_drop"]["status"] == "same"


def test_cards_endpoint_requires_auth(client):
    res = client.get("/cards")
    assert res.status_code == 401


def test_cards_endpoint_returns_seeded_cards(client):
    token = register(client)
    res = client.get("/cards", headers=auth_headers(token))
    assert res.status_code == 200
    cards = res.json()
    assert len(cards) == 5
    names = {c["name"] for c in cards}
    assert "HDFC Regalia" in names
    rates = {c["name"]: c["reward_rate"] for c in cards}
    assert rates["HDFC Regalia"] == 0.05
