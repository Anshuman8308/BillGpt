import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    String,
    Float,
    DateTime,
    ForeignKey,
    JSON,
    Boolean,
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    comparisons = relationship(
        "SavedComparison", back_populates="user", cascade="all, delete-orphan"
    )


class Card(Base):
    """Seeded credit card reward rates used for 'best way to pay' calculations."""

    __tablename__ = "cards"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, unique=True, nullable=False)
    issuer = Column(String, nullable=False)
    reward_rate = Column(Float, nullable=False)  # e.g. 0.05 = 5% back
    is_active = Column(Boolean, default=True)


class SavedComparison(Base):
    __tablename__ = "saved_comparisons"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    query = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Full normalized deal list at time of save
    deals = Column(JSON, nullable=False)
    # The cheapest deal (denormalized snapshot for fast display)
    cheapest_deal = Column(JSON, nullable=False)
    # The computed best-way-to-pay recommendation
    best_way_to_pay = Column(JSON, nullable=False)

    user = relationship("User", back_populates="comparisons")


class SearchHistory(Base):
    """Tracks the min price seen per user per normalized query, to power the
    price-drop indicator bonus feature."""

    __tablename__ = "search_history"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    normalized_query = Column(String, nullable=False, index=True)
    lowest_price = Column(Float, nullable=False)
    source = Column(String, nullable=False)
    checked_at = Column(DateTime, default=datetime.utcnow)
