from fastapi import FastAPI
from app.api.honeypot import router
from app.db.base import engine, Base
from app.db import models  # IMPORTANT: register tables

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Scam Honeypot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

app.include_router(router)
