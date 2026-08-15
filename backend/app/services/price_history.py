
import re
from typing import Optional

from sqlalchemy.orm import Session

from app import models
from app.schemas import Deal, PriceDrop


def normalize_query(query: str) -> str:
    q = query.lower().strip()
    q = re.sub(r"[^a-z0-9\s]", "", q)
    q = re.sub(r"\s+", " ", q)
    return q


def get_price_drop(db: Session, user_id: str, query: str, cheapest: Deal) -> PriceDrop:
    norm_q = normalize_query(query)

    previous = (
        db.query(models.SearchHistory)
        .filter(
            models.SearchHistory.user_id == user_id,
            models.SearchHistory.normalized_query == norm_q,
        )
        .order_by(models.SearchHistory.checked_at.desc())
        .first()
    )

    result: PriceDrop
    if previous is None:
        result = PriceDrop(status="no_history", message="First time checking this — no previous price to compare.")
    else:
        diff = round(previous.lowest_price - cheapest.price, 2)
        if diff > 0.5:
            result = PriceDrop(
                status="cheaper",
                difference=diff,
                previous_price=previous.lowest_price,
                message=f"₹{diff} cheaper than your previous check.",
            )
        elif diff < -0.5:
            result = PriceDrop(
                status="increased",
                difference=abs(diff),
                previous_price=previous.lowest_price,
                message=f"Price increased by ₹{abs(diff)} since your last check.",
            )
        else:
            result = PriceDrop(
                status="same",
                difference=0,
                previous_price=previous.lowest_price,
                message="No price change since your last check.",
            )

  
    entry = models.SearchHistory(
        user_id=user_id,
        normalized_query=norm_q,
        lowest_price=cheapest.price,
        source=cheapest.source,
    )
    db.add(entry)
    db.commit()

    return result
