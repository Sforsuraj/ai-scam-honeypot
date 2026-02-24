from sqlalchemy import Column, String, Boolean, Float, JSON
from sqlalchemy.ext.mutable import MutableList
from app.db.base import Base
import uuid


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    history = Column(MutableList.as_mutable(JSON), default=list)
    is_scam = Column(Boolean, default=False)
    confidence = Column(Float, default=0.0)


class ScamIntel(Base):
    __tablename__ = "scam_intel"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String)
    extracted = Column(JSON)
    scam_type = Column(String)
