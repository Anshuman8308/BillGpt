"""Seeds the cards table with reward rates. Safe to run multiple times."""
from app.database import SessionLocal, engine, Base
from app import models

SEED_CARDS = [
    {"name": "HDFC Regalia", "issuer": "HDFC", "reward_rate": 0.05},
    {"name": "SBI SimplyCLICK", "issuer": "SBI", "reward_rate": 0.03},
    {"name": "ICICI Amazon Pay", "issuer": "ICICI", "reward_rate": 0.01},
    {"name": "Axis Ace", "issuer": "Axis", "reward_rate": 0.04},
    {"name": "Amex SmartEarn", "issuer": "American Express", "reward_rate": 0.02},
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for card in SEED_CARDS:
            existing = db.query(models.Card).filter(models.Card.name == card["name"]).first()
            if existing:
                existing.reward_rate = card["reward_rate"]
                existing.issuer = card["issuer"]
                existing.is_active = True
            else:
                db.add(models.Card(**card, is_active=True))
        db.commit()
        print(f"Seeded {len(SEED_CARDS)} cards.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
