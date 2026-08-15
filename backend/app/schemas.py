from datetime import datetime
from typing import Optional, List
import re

from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator




class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password(cls, password: str) -> str:
        if not re.search(r"[A-Z]", password) or not re.search(r"[a-z]", password):
            raise ValueError(
                "Password must contain at least one uppercase letter, "
                "lowercase letter, number, and special character."
            )

        if not re.search(r"\d", password):
            raise ValueError(
                "Password must contain at least one uppercase letter, "
                "lowercase letter, number, and special character."
            )

        if not re.search(r"[^A-Za-z0-9]", password):
            raise ValueError(
                "Password must contain at least one uppercase letter, "
                "lowercase letter, number, and special character."
            )

        return password


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: EmailStr
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut




class Deal(BaseModel):
    source: str
    item_name: str
    price: float
    currency: str = "INR"
    original_price: Optional[float] = None
    discount_percent: Optional[float] = None
    url: Optional[str] = None
    in_stock: bool = True
    metadata: dict = Field(default_factory=dict)


class CardApplication(BaseModel):
    card_name: str
    issuer: str
    reward_rate: float
    effective_price: float
    savings: float


class BestWayToPay(BaseModel):
    source: str
    item_name: str
    original_price: float
    card_name: Optional[str] = None
    effective_price: float
    reason: str


class PriceDrop(BaseModel):
    status: str  
    difference: Optional[float] = None
    previous_price: Optional[float] = None
    message: str


class SearchResponse(BaseModel):
    query: str
    deals: List[Deal]
    cheapest: Optional[Deal]
    best_way_to_pay: Optional[BestWayToPay]
    price_drop: Optional[PriceDrop] = None
    failed_sources: List[str] = Field(default_factory=list)




class SavedComparisonCreate(BaseModel):
    query: str
    deals: List[Deal]
    cheapest_deal: Deal
    best_way_to_pay: BestWayToPay


class SavedComparisonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    query: str
    created_at: datetime
    deals: List[Deal]
    cheapest_deal: Deal
    best_way_to_pay: BestWayToPay




class CardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    issuer: str
    reward_rate: float
