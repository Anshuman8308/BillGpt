"""Normalizes heterogeneous raw source payloads into the common Deal shape.

Each source has its own raw structure (see mock_sources/sources.py). This
module is the single place that knows how to interpret each one, so the
rest of the backend only ever deals with the normalized `Deal` schema.
"""
import re
from typing import Optional

from app.schemas import Deal


class SourceDataError(Exception):
    """Raised when a source returns malformed/unusable data."""


def _parse_price_str(value: str) -> float:
    match = re.search(r"[\d.]+", value)
    if not match:
        raise SourceDataError(f"Could not parse price from '{value}'")
    return float(match.group())


def normalize_amazon(raw: dict) -> Deal:
    price = raw.get("listing_price")
    if price is None:
        raise SourceDataError("Amazon: missing listing_price")
    mrp = raw.get("mrp")
    discount = None
    if mrp and mrp > price:
        discount = round((1 - price / mrp) * 100, 1)
    return Deal(
        source="Amazon",
        item_name=raw.get("title", "Amazon Item"),
        price=float(price),
        original_price=float(mrp) if mrp else None,
        discount_percent=discount,
        url=raw.get("link"),
        in_stock=bool(raw.get("available", True)),
        metadata={"raw_source": "amazon"},
    )


def normalize_flipkart(raw: dict) -> Deal:
    price = raw.get("sale_price")
    if price is None:
        raise SourceDataError("Flipkart: missing sale_price")
    list_price = raw.get("list_price")
    discount = None
    if list_price and list_price > price:
        discount = round((1 - price / list_price) * 100, 1)
    return Deal(
        source="Flipkart",
        item_name=raw.get("product_title", "Flipkart Item"),
        price=float(price),
        original_price=float(list_price) if list_price else None,
        discount_percent=discount,
        url=raw.get("product_url"),
        in_stock=raw.get("stock_status") == "IN_STOCK",
        metadata={"raw_source": "flipkart"},
    )


def normalize_bigbasket(raw: dict) -> Deal:
    price_str = raw.get("price_str")
    if not price_str:
        raise SourceDataError("BigBasket: missing price_str")
    price = _parse_price_str(price_str)

    original = None
    if raw.get("original_price_str"):
        try:
            original = _parse_price_str(raw["original_price_str"])
        except SourceDataError:
            original = None

    discount = None
    if original and original > price:
        discount = round((1 - price / original) * 100, 1)

    return Deal(
        source="BigBasket",
        item_name=raw.get("name", "BigBasket Item"),
        price=price,
        original_price=original,
        discount_percent=discount,
        url=raw.get("deep_link"),
        in_stock=bool(raw.get("sellable", True)),
        metadata={"raw_source": "bigbasket"},
    )


def normalize_myntra(raw: dict) -> Deal:
    price = raw.get("price")
    if price is None:
        raise SourceDataError("Myntra: missing/null price")
    return Deal(
        source="Myntra",
        item_name=raw.get("name", "Myntra Item"),
        price=float(price),
        discount_percent=raw.get("discount_percent"),
        url=raw.get("url"),
        in_stock=True,
        metadata={"raw_source": "myntra"},
    )


NORMALIZERS = {
    "Amazon": normalize_amazon,
    "Flipkart": normalize_flipkart,
    "BigBasket": normalize_bigbasket,
    "Myntra": normalize_myntra,
}
