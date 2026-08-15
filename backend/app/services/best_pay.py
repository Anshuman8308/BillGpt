
from typing import List, Optional

from app.models import Card
from app.schemas import Deal, BestWayToPay


def compute_best_way_to_pay(deals: List[Deal], cards: List[Card]) -> Optional[BestWayToPay]:
    in_stock_deals = [d for d in deals if d.in_stock]
    if not in_stock_deals:
        return None

    cheapest = min(in_stock_deals, key=lambda d: d.price)

    best_price = cheapest.price
    best = BestWayToPay(
        source=cheapest.source,
        item_name=cheapest.item_name,
        original_price=cheapest.price,
        card_name=None,
        effective_price=cheapest.price,
        reason=f"{cheapest.source} has the lowest listed price at no extra step.",
    )

    for deal in in_stock_deals:
        for card in cards:
            if not card.is_active:
                continue
            effective = round(deal.price * (1 - card.reward_rate), 2)
            if effective < best_price:
                best_price = effective
                savings = round(deal.price - effective, 2)
                best = BestWayToPay(
                    source=deal.source,
                    item_name=deal.item_name,
                    original_price=deal.price,
                    card_name=card.name,
                    effective_price=effective,
                    reason=(
                        f"Pay {deal.price} at {deal.source} with your {card.name} "
                        f"({int(card.reward_rate * 100)}% back) for an effective "
                        f"cost of {effective} — {savings} cheaper than the plain "
                        f"cheapest option ({cheapest.source} at {cheapest.price})."
                    ),
                )

    return best
