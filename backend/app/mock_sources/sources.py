"""Mock third-party price sources.

Each source simulates a different vendor's API with its own raw response
shape. The `normalize` service converts these into a common `Deal` schema.
A source can also randomly "fail" to exercise partial-failure handling.
"""
import random
from typing import Callable

# Deterministic-ish but varied base prices per category keyword.
BASE_PRICES = {
    "groceries": 1000,
    "milk": 60,
    "rice": 450,
    "electricity bill": 1800,
    "mobile bill": 599,
    "flight": 4500,
    "netflix": 649,
    "amazon prime": 1499,
    "gym": 1200,
}


def _base_price_for(query: str) -> float:
    q = query.lower().strip()
    for key, price in BASE_PRICES.items():
        if key in q:
            return price
    # Deterministic pseudo-random base price from the query so repeated
    # searches for the same term are stable within a session.
    seed = sum(ord(c) for c in q) or 1
    return 200 + (seed % 20) * 75


def _maybe_fail(failure_rate: float) -> bool:
    return random.random() < failure_rate


# ---------------------------------------------------------------------------
# Source 1: AmazonMock — raw shape uses "listing_price" / "mrp"
# ---------------------------------------------------------------------------
def fetch_amazon_mock(query: str) -> dict:
    if _maybe_fail(0.05):
        raise ConnectionError("AmazonMock timed out")

    base = _base_price_for(query)
    price = round(base * random.uniform(0.98, 1.08), 2)
    mrp = round(price * random.uniform(1.0, 1.15), 2)
    return {
        "vendor": "Amazon",
        "listing_price": price,
        "mrp": mrp,
        "title": f"{query.title()} - Amazon Choice",
        "link": f"https://amazon.in/s?k={query.replace(' ', '+')}",
        "available": True,
    }


# ---------------------------------------------------------------------------
# Source 2: FlipkartMock — raw shape uses "sale_price" / "list_price"
# ---------------------------------------------------------------------------
def fetch_flipkart_mock(query: str) -> dict:
    if _maybe_fail(0.05):
        raise ConnectionError("FlipkartMock unavailable")

    base = _base_price_for(query)
    price = round(base * random.uniform(0.93, 1.02), 2)
    list_price = round(price * random.uniform(1.02, 1.2), 2)
    return {
        "vendor": "Flipkart",
        "sale_price": price,
        "list_price": list_price,
        "product_title": f"{query.title()} (Flipkart Assured)",
        "product_url": f"https://flipkart.com/search?q={query.replace(' ', '%20')}",
        "stock_status": "IN_STOCK",
    }


# ---------------------------------------------------------------------------
# Source 3: BigBasketMock — raw shape uses "price" as string with currency
# ---------------------------------------------------------------------------
def fetch_bigbasket_mock(query: str) -> dict:
    if _maybe_fail(0.05):
        raise ConnectionError("BigBasketMock 503")

    base = _base_price_for(query)
    price = round(base * random.uniform(0.9, 1.0), 2)
    original = round(price * random.uniform(1.0, 1.1), 2)
    return {
        "vendor": "BigBasket",
        "price_str": f"INR {price}",
        "original_price_str": f"INR {original}",
        "name": f"{query.title()} Combo Pack",
        "deep_link": f"https://bigbasket.com/ps/?q={query.replace(' ', '+')}",
        "sellable": True,
    }


# ---------------------------------------------------------------------------
# Source 4: MyntraMock — occasionally returns malformed/partial data on
# purpose so the normalizer's error handling can be demonstrated.
# ---------------------------------------------------------------------------
def fetch_myntra_mock(query: str) -> dict:
    if _maybe_fail(0.15):
        raise ConnectionError("MyntraMock connection reset")

    base = _base_price_for(query)
    price = round(base * random.uniform(1.0, 1.12), 2)

    # ~10% chance of malformed data (missing price) to test resilience.
    if random.random() < 0.1:
        return {"vendor": "Myntra", "name": f"{query.title()}", "price": None}

    discount = round(random.uniform(5, 35), 0)
    return {
        "vendor": "Myntra",
        "price": price,
        "discount_percent": discount,
        "name": f"{query.title()} - Myntra Fashion",
        "url": f"https://myntra.com/search?q={query.replace(' ', '+')}",
    }


ALL_SOURCES: dict[str, Callable[[str], dict]] = {
    "Amazon": fetch_amazon_mock,
    "Flipkart": fetch_flipkart_mock,
    "BigBasket": fetch_bigbasket_mock,
    "Myntra": fetch_myntra_mock,
}
