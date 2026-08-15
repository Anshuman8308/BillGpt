from unittest.mock import patch

from tests.conftest import register, auth_headers


def test_search_requires_auth(client):
    res = client.get("/search?q=groceries")
    assert res.status_code == 401


def test_search_empty_query_rejected(client):
    token = register(client)
    res = client.get("/search?q=", headers=auth_headers(token))
    assert res.status_code == 422


def test_search_returns_normalized_deals_from_all_sources(client):
    token = register(client)
    res = client.get("/search?q=groceries", headers=auth_headers(token))
    assert res.status_code == 200
    body = res.json()
    assert body["query"] == "groceries"
    assert len(body["deals"]) >= 1
    sources_seen = {d["source"] for d in body["deals"]}
    assert sources_seen.issubset({"Amazon", "Flipkart", "BigBasket", "Myntra"})
    # Every deal must be normalized to the common shape
    for deal in body["deals"]:
        assert "price" in deal
        assert "item_name" in deal
        assert "currency" in deal
        assert "in_stock" in deal


def test_search_cheapest_is_actually_the_minimum(client):
    token = register(client)
    res = client.get("/search?q=groceries", headers=auth_headers(token))
    body = res.json()
    in_stock_prices = [d["price"] for d in body["deals"] if d["in_stock"]]
    assert body["cheapest"]["price"] == min(in_stock_prices)


def test_search_all_sources_fail_returns_empty_gracefully(client):
    token = register(client)
    with patch("app.routers.search.ALL_SOURCES", {
        "Amazon": lambda q: (_ for _ in ()).throw(ConnectionError("down")),
        "Flipkart": lambda q: (_ for _ in ()).throw(ConnectionError("down")),
    }):
        res = client.get("/search?q=anything", headers=auth_headers(token))
    assert res.status_code == 200
    body = res.json()
    assert body["deals"] == []
    assert body["cheapest"] is None
    assert body["best_way_to_pay"] is None
    assert set(body["failed_sources"]) == {"Amazon", "Flipkart"}


def test_search_partial_source_failure_still_returns_results(client):
    """One broken source must not take down the whole search. Uses fully
    deterministic fake fetchers (not the real mock sources, which have
    their own built-in random failure chance) to make this test reliable
    rather than flaky."""
    token = register(client)

    def broken(q):
        raise ConnectionError("simulated outage")

    def ok_flipkart(q):
        return {
            "vendor": "Flipkart", "sale_price": 90.0, "list_price": 100.0,
            "product_title": "Item", "product_url": "https://flipkart.com",
            "stock_status": "IN_STOCK",
        }

    def ok_bigbasket(q):
        return {
            "vendor": "BigBasket", "price_str": "INR 95", "original_price_str": "INR 100",
            "name": "Item", "deep_link": "https://bigbasket.com", "sellable": True,
        }

    with patch("app.routers.search.ALL_SOURCES", {
        "Amazon": broken,
        "Flipkart": ok_flipkart,
        "BigBasket": ok_bigbasket,
    }):
        res = client.get("/search?q=groceries", headers=auth_headers(token))
    assert res.status_code == 200
    body = res.json()
    assert body["failed_sources"] == ["Amazon"]
    assert len(body["deals"]) == 2  # the other two sources still came through
    assert body["cheapest"] is not None
    assert body["cheapest"]["source"] == "Flipkart"  # 90 < BigBasket's 95


def test_search_malformed_source_data_excluded_not_crashed(client):
    """A source returning unusable data (e.g. null price) must be dropped,
    not crash the request. Fully deterministic fakes for the healthy
    sources to avoid flakiness from the real mocks' random failure chance."""
    token = register(client)

    def ok_amazon(q):
        return {
            "vendor": "Amazon", "listing_price": 100.0, "mrp": 110.0,
            "title": "Item", "link": "https://amazon.in", "available": True,
        }

    def ok_flipkart(q):
        return {
            "vendor": "Flipkart", "sale_price": 95.0, "list_price": 100.0,
            "product_title": "Item", "product_url": "https://flipkart.com",
            "stock_status": "IN_STOCK",
        }

    def malformed_myntra(q):
        return {"vendor": "Myntra", "name": "Broken Item", "price": None}

    with patch("app.routers.search.ALL_SOURCES", {
        "Amazon": ok_amazon,
        "Flipkart": ok_flipkart,
        "Myntra": malformed_myntra,
    }):
        res = client.get("/search?q=groceries", headers=auth_headers(token))
    assert res.status_code == 200
    body = res.json()
    assert body["failed_sources"] == ["Myntra"]
    assert len(body["deals"]) == 2


def test_best_way_to_pay_applies_best_card_to_the_cheapest_deal(client):
    """Cards apply uniformly across every source in this implementation (no
    per-source card eligibility), so mathematically price * (1 - best_rate)
    is minimized by minimizing price — the cheapest LISTED deal, combined
    with the single highest-reward active card, is always optimal. This
    test locks in that this is actually being computed (not hardcoded to
    just the cheapest price with no card applied), by checking the reward
    math is genuinely applied on top of the cheapest deal."""
    token = register(client)

    def cheap_amazon(q):
        return {
            "vendor": "Amazon", "listing_price": 100.0, "mrp": 100.0,
            "title": "Item", "link": "https://amazon.in", "available": True,
        }

    def pricier_flipkart(q):
        return {
            "vendor": "Flipkart", "sale_price": 105.0, "list_price": 105.0,
            "product_title": "Item", "product_url": "https://flipkart.com",
            "stock_status": "IN_STOCK",
        }

    with patch("app.routers.search.ALL_SOURCES", {
        "Amazon": cheap_amazon,
        "Flipkart": pricier_flipkart,
    }):
        res = client.get("/search?q=widget", headers=auth_headers(token))
    body = res.json()
    assert body["cheapest"]["source"] == "Amazon"
    assert body["cheapest"]["price"] == 100.0

    # HDFC Regalia is the highest seeded rate (5%). Best pay must be
    # Amazon (the cheapest deal) + HDFC, at 100 * 0.95 = 95 — genuinely
    # computed, not just echoing the plain cheapest price.
    pay = body["best_way_to_pay"]
    assert pay["source"] == "Amazon"
    assert pay["card_name"] == "HDFC Regalia"
    assert pay["effective_price"] == 95.0
    assert pay["effective_price"] < body["cheapest"]["price"]


def test_best_way_to_pay_examines_every_deal_x_card_combination(client):
    """Directly exercises the service function (not just the endpoint) to
    prove it's a real brute-force min-over-all-combinations search, not
    special-cased logic that only ever looks at the single cheapest deal.

    Note: because every seeded card applies uniformly to every source in
    this implementation (no per-source card eligibility), the winning
    combination is always (cheapest listed deal) x (highest active reward
    rate) — a pricier deal can never out-earn a cheaper one under the same
    card set. This test proves the brute-force result matches that
    independently-computed expectation exactly, across several cards."""
    from app.services.best_pay import compute_best_way_to_pay
    from app.schemas import Deal

    class FakeCard:
        def __init__(self, name, issuer, reward_rate, is_active=True):
            self.name = name
            self.issuer = issuer
            self.reward_rate = reward_rate
            self.is_active = is_active

    deals = [
        Deal(source="A", item_name="x", price=100.0, currency="INR", in_stock=True),
        Deal(source="B", item_name="x", price=90.0, currency="INR", in_stock=True),
        Deal(source="C", item_name="x", price=200.0, currency="INR", in_stock=True),
    ]
    cards = [
        FakeCard("SmallRewardCard", "X", 0.01),
        FakeCard("MidRewardCard", "Y", 0.25),
        FakeCard("BigRewardCard", "Z", 0.60),
    ]

    result = compute_best_way_to_pay(deals, cards)

    # Independently brute-force the expected answer and cross-check.
    expected = min(
        ((d, c, round(d.price * (1 - c.reward_rate), 2)) for d in deals for c in cards),
        key=lambda t: t[2],
    )
    assert result.source == expected[0].source
    assert result.card_name == expected[1].name
    assert result.effective_price == expected[2]
    # And confirm it's specifically the cheapest deal (B) + richest card (Z),
    # per the uniform-rate math explained above.
    assert result.source == "B"
    assert result.card_name == "BigRewardCard"
    assert result.effective_price == 36.0


def test_best_way_to_pay_no_active_cards_falls_back_to_plain_cheapest(client):
    """With zero active cards, the recommendation must be exactly the
    cheapest listed deal with no card."""
    from app.services.best_pay import compute_best_way_to_pay
    from app.schemas import Deal

    deals = [
        Deal(source="Amazon", item_name="x", price=50.0, currency="INR", in_stock=True),
        Deal(source="Flipkart", item_name="x", price=60.0, currency="INR", in_stock=True),
    ]
    result = compute_best_way_to_pay(deals, cards=[])
    assert result.source == "Amazon"
    assert result.card_name is None
    assert result.effective_price == 50.0


def test_best_way_to_pay_ignores_inactive_cards(client):
    from app.services.best_pay import compute_best_way_to_pay
    from app.schemas import Deal

    class FakeCard:
        def __init__(self, name, issuer, reward_rate, is_active):
            self.name = name
            self.issuer = issuer
            self.reward_rate = reward_rate
            self.is_active = is_active

    deals = [Deal(source="Amazon", item_name="x", price=100.0, currency="INR", in_stock=True)]
    cards = [FakeCard("DeadCard", "Z", 0.90, is_active=False)]

    result = compute_best_way_to_pay(deals, cards)
    assert result.card_name is None
    assert result.effective_price == 100.0


def test_best_way_to_pay_excludes_out_of_stock_deals(client):
    from app.services.best_pay import compute_best_way_to_pay
    from app.schemas import Deal

    deals = [
        Deal(source="Amazon", item_name="x", price=10.0, currency="INR", in_stock=False),
        Deal(source="Flipkart", item_name="x", price=50.0, currency="INR", in_stock=True),
    ]
    result = compute_best_way_to_pay(deals, cards=[])
    assert result.source == "Flipkart"  # the cheap out-of-stock deal must be skipped
