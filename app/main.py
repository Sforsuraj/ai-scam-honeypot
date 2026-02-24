from fastapi import FastAPI
from backend.api.honeypot import router
from backend.db.base import engine, Base
from backend.db import models  # IMPORTANT: register tables

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Scam Honeypot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://ai-scam-honeypot.vercel.app",
        "*" # Can't use wildcard with allow_credentials=True, so explicitly define origins, but since this is public test, we will allow all with allow_credentials=False for simplicity or define regex
    ],
    allow_credentials=False, # Set to False to allow wildcard origins, or keep True and specify origins
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

app.include_router(router)
