from fastapi import FastAPI
from backend.api.honeypot import router
from backend.db.base import engine, Base
from backend.db import models  # IMPORTANT: register tables

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Scam Honeypot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

app.include_router(router)
