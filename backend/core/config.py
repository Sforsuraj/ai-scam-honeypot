import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/honeypot")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

print(f"OPENAI_API_KEY LOADED: {OPENAI_API_KEY is not None}")
