from app.db.base import SessionLocal

async def get_db():
    async with SessionLocal() as db:
        yield db
