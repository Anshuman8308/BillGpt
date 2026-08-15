from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user

router = APIRouter(prefix="/cards", tags=["cards"])


@router.get("", response_model=list[schemas.CardOut])
def list_cards(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Card).filter(models.Card.is_active == True).all()  # noqa: E712
