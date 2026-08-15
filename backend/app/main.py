import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.database import Base, engine
from app.routers import auth, search, comparisons, cards
from app.seed import seed

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("price_compare")


@asynccontextmanager
async def lifespan(app: FastAPI):
   
    Base.metadata.create_all(bind=engine)
    seed()
    yield


app = FastAPI(title="Price Comparison API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    
    errors = [{"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()]
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content={"detail": errors})


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(search.router)
app.include_router(comparisons.router)
app.include_router(cards.router)
