import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user
from app.mock_sources.sources import ALL_SOURCES
from app.services.normalize import NORMALIZERS, SourceDataError
from app.services.best_pay import compute_best_way_to_pay
from app.services.price_history import get_price_drop

logger = logging.getLogger("search")
router = APIRouter(tags=["search"])


@router.get("/search", response_model=schemas.SearchResponse)
def search(
    q: str = Query(..., min_length=1, max_length=200),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = q.strip()
    if not query:
        raise HTTPException(status_code=422, detail="Search query cannot be empty.")

    deals: list[schemas.Deal] = []
    failed_sources: list[str] = []

    for source_name, fetch_fn in ALL_SOURCES.items():
        try:
            raw = fetch_fn(query)
            normalizer = NORMALIZERS[source_name]
            deal = normalizer(raw)
            deals.append(deal)
        except (ConnectionError, SourceDataError, TimeoutError) as exc:
            logger.warning("Source %s failed for query '%s': %s", source_name, query, exc)
            failed_sources.append(source_name)
        except Exception as exc:  # defensive: never let one bad source 500 the request
            logger.error("Unexpected error from source %s: %s", source_name, exc)
            failed_sources.append(source_name)

    if not deals:
        return schemas.SearchResponse(
            query=query,
            deals=[],
            cheapest=None,
            best_way_to_pay=None,
            price_drop=None,
            failed_sources=failed_sources,
        )

    deals.sort(key=lambda d: d.price)
    cheapest = min((d for d in deals if d.in_stock), key=lambda d: d.price, default=deals[0])

    cards = db.query(models.Card).filter(models.Card.is_active == True).all()  # noqa: E712
    best_pay = compute_best_way_to_pay(deals, cards)

    price_drop = get_price_drop(db, current_user.id, query, cheapest)

    return schemas.SearchResponse(
        query=query,
        deals=deals,
        cheapest=cheapest,
        best_way_to_pay=best_pay,
        price_drop=price_drop,
        failed_sources=failed_sources,
    )
