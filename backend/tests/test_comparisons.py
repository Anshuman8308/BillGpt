from tests.conftest import register, auth_headers


def _sample_payload(query="groceries"):
    deal = {
        "source": "Amazon",
        "item_name": "Groceries",
        "price": 980.0,
        "currency": "INR",
        "original_price": 1000.0,
        "discount_percent": 2.0,
        "url": "https://amazon.in",
        "in_stock": True,
        "metadata": {},
    }
    pay = {
        "source": "Amazon",
        "item_name": "Groceries",
        "original_price": 980.0,
        "card_name": None,
        "effective_price": 980.0,
        "reason": "Cheapest, no card needed.",
    }
    return {"query": query, "deals": [deal], "cheapest_deal": deal, "best_way_to_pay": pay}


def test_save_comparison_requires_auth(client):
    res = client.post("/comparisons", json=_sample_payload())
    assert res.status_code == 401


def test_save_and_list_comparison(client):
    token = register(client)
    res = client.post("/comparisons", json=_sample_payload(), headers=auth_headers(token))
    assert res.status_code == 201
    saved = res.json()
    assert saved["query"] == "groceries"

    res = client.get("/comparisons", headers=auth_headers(token))
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 1
    assert items[0]["id"] == saved["id"]


def test_list_comparisons_empty_for_new_user(client):
    token = register(client)
    res = client.get("/comparisons", headers=auth_headers(token))
    assert res.status_code == 200
    assert res.json() == []


def test_get_comparison_by_id(client):
    token = register(client)
    saved = client.post("/comparisons", json=_sample_payload(), headers=auth_headers(token)).json()

    res = client.get(f"/comparisons/{saved['id']}", headers=auth_headers(token))
    assert res.status_code == 200
    assert res.json()["id"] == saved["id"]


def test_get_nonexistent_comparison_404(client):
    token = register(client)
    res = client.get("/comparisons/does-not-exist", headers=auth_headers(token))
    assert res.status_code == 404


def test_delete_comparison(client):
    token = register(client)
    saved = client.post("/comparisons", json=_sample_payload(), headers=auth_headers(token)).json()

    res = client.delete(f"/comparisons/{saved['id']}", headers=auth_headers(token))
    assert res.status_code == 204

    res = client.get(f"/comparisons/{saved['id']}", headers=auth_headers(token))
    assert res.status_code == 404


def test_delete_nonexistent_comparison_404(client):
    token = register(client)
    res = client.delete("/comparisons/does-not-exist", headers=auth_headers(token))
    assert res.status_code == 404


# ---------- Ownership isolation (critical requirement) ----------

def test_user_cannot_list_another_users_comparisons(client):
    token_a = register(client, "ownerA@test.com")
    token_b = register(client, "ownerB@test.com")

    client.post("/comparisons", json=_sample_payload("A's search"), headers=auth_headers(token_a))

    res = client.get("/comparisons", headers=auth_headers(token_b))
    assert res.status_code == 200
    assert res.json() == []  # B sees nothing of A's


def test_user_cannot_get_another_users_comparison_by_id(client):
    token_a = register(client, "ownerA2@test.com")
    token_b = register(client, "ownerB2@test.com")

    saved = client.post("/comparisons", json=_sample_payload(), headers=auth_headers(token_a)).json()

    res = client.get(f"/comparisons/{saved['id']}", headers=auth_headers(token_b))
    assert res.status_code == 404  # not 403 — must not confirm existence


def test_user_cannot_delete_another_users_comparison(client):
    token_a = register(client, "ownerA3@test.com")
    token_b = register(client, "ownerB3@test.com")

    saved = client.post("/comparisons", json=_sample_payload(), headers=auth_headers(token_a)).json()

    res = client.delete(f"/comparisons/{saved['id']}", headers=auth_headers(token_b))
    assert res.status_code == 404

    # Confirm it still exists for the real owner
    res = client.get(f"/comparisons/{saved['id']}", headers=auth_headers(token_a))
    assert res.status_code == 200


def test_two_users_each_only_see_own_comparisons(client):
    token_a = register(client, "multiA@test.com")
    token_b = register(client, "multiB@test.com")

    client.post("/comparisons", json=_sample_payload("a1"), headers=auth_headers(token_a))
    client.post("/comparisons", json=_sample_payload("a2"), headers=auth_headers(token_a))
    client.post("/comparisons", json=_sample_payload("b1"), headers=auth_headers(token_b))

    a_items = client.get("/comparisons", headers=auth_headers(token_a)).json()
    b_items = client.get("/comparisons", headers=auth_headers(token_b)).json()

    assert len(a_items) == 2
    assert len(b_items) == 1
    assert {i["query"] for i in a_items} == {"a1", "a2"}
    assert b_items[0]["query"] == "b1"
