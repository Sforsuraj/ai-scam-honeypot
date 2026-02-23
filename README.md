1. Create PostgreSQL database
2. Copy .env.example to .env and update values
3. Install dependencies:
   pip install -r requirements.txt
4. Create tables:
   from app.db.base import Base, engine
   Base.metadata.create_all(bind=engine)
5. Run:
   python run.py
6. POST messages to:
   POST /honeypot/message
