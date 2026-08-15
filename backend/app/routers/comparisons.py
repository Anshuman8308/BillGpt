from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user

router = APIRouter(prefix="/comparisons", tags=["comparisons"])


@router.post("", response_model=schemas.SavedComparisonOut, status_code=status.HTTP_201_CREATED)
def save_comparison(
    payload: schemas.SavedComparisonCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    record = models.SavedComparison(
        user_id=current_user.id,
        query=payload.query,
        deals=[d.model_dump() for d in payload.deals],
        cheapest_deal=payload.cheapest_deal.model_dump(),
        best_way_to_pay=payload.best_way_to_pay.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("", response_model=list[schemas.SavedComparisonOut])
def list_comparisons(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Ownership enforced at the query level: only this user's rows are ever
    # fetched from the database, regardless of what the frontend sends.
    return (
        db.query(models.SavedComparison)
        .filter(models.SavedComparison.user_id == current_user.id)
        .order_by(models.SavedComparison.created_at.desc())
        .all()
    )


@router.get("/{comparison_id}", response_model=schemas.SavedComparisonOut)
def get_comparison(
    comparison_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    record = (
        db.query(models.SavedComparison)
        .filter(
            models.SavedComparison.id == comparison_id,
            models.SavedComparison.user_id == current_user.id,
        )
        .first()
    )
    if record is None:
        # 404, not 403 — never reveal whether the ID exists for another user.
        raise HTTPException(status_code=404, detail="Comparison not found.")
    return record


@router.delete("/{comparison_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comparison(
    comparison_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    record = (
        db.query(models.SavedComparison)
        .filter(
            models.SavedComparison.id == comparison_id,
            models.SavedComparison.user_id == current_user.id,
        )
        .first()
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Comparison not found.")

    db.delete(record)
    db.commit()
    return None
