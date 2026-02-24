from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional
import json

from app.db.session import get_db
from app.db.models import ChatSession, ScamIntel
from app.core.llm import generate_reply

router = APIRouter()


class HoneypotRequest(BaseModel):
    session_id: Optional[str] = None
    message: str


# Phrases that must NEVER appear (legal + safety)
BLOCKED_PHRASES = [
    "sent money",
    "payment done",
    "paid successfully",
    "transaction successful",
    "upi pin",
    "otp is",
    "i have paid",
    "i sent"
]


@router.post("/honeypot/message")
async def honeypot_message(
    payload: HoneypotRequest,
    db: AsyncSession = Depends(get_db)
):
    # -----------------------------
    # Load or create session
    # -----------------------------
    chat = None
    if payload.session_id:
        result = await db.execute(
            select(ChatSession).where(ChatSession.id == payload.session_id)
        )
        chat = result.scalar_one_or_none()

    if not chat:
        chat = ChatSession(history=[])
        db.add(chat)
        await db.commit()
        await db.refresh(chat)

    # -----------------------------
    # Append scammer message
    # -----------------------------
    chat.history.append({
        "role": "user",
        "content": payload.message
    })

    # -----------------------------
    # Generate AI reply
    # -----------------------------
    try:
        llm_output = await generate_reply(chat.history)
        data = json.loads(llm_output)
    except Exception:
        data = {
            "reply": "hmm sorry… can you explain again?",
            "is_scam": False,
            "confidence": 0.0,
            "extracted": {
                "upi": [],
                "phones": [],
                "emails": [],
                "links": [],
                "payment_requests": [],
                "scam_type": ""
            }
        }

    # -----------------------------
    # SAFETY: Never allow payment claims
    # -----------------------------
    reply_lower = data.get("reply", "").lower()
    if any(p in reply_lower for p in BLOCKED_PHRASES):
        data["reply"] = "i am trying but something not working on my phone 😕"

    # -----------------------------
    # Append AI reply
    # -----------------------------
    chat.history.append({
        "role": "assistant",
        "content": data["reply"]
    })

    # -----------------------------
    # Update scam status
    # -----------------------------
    chat.is_scam = bool(data.get("is_scam", False))
    chat.confidence = float(data.get("confidence", 0.0))

    # -----------------------------
    # Store scam intelligence
    # -----------------------------
    if chat.is_scam:
        intel = ScamIntel(
            session_id=chat.id,
            extracted=data.get("extracted", {}),
            scam_type=data.get("extracted", {}).get("scam_type", "")
        )
        db.add(intel)

    await db.commit()

    # -----------------------------
    # API response
    # -----------------------------
    return {
        "session_id": chat.id,
        "reply": data["reply"],
        "scam_status": "SCAM_CONFIRMED" if chat.is_scam else "ONGOING",
        "confidence": chat.confidence,
        "extracted": data.get("extracted", {})
    }


@router.get("/honeypot/sessions")
async def get_sessions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ChatSession))
    sessions = result.scalars().all()
    
    # Format the sessions for the sidebar list
    session_list = []
    for s in sessions:
        # Get the first user message as the title, or a default
        title = "New Chat"
        if s.history and len(s.history) > 0:
            for msg in s.history:
                if msg["role"] == "user":
                    title = msg["content"][:30] + ("..." if len(msg["content"]) > 30 else "")
                    break
                    
        session_list.append({
            "id": s.id,
            "title": title,
            "is_scam": s.is_scam,
            "confidence": s.confidence
        })
    
    return session_list


@router.get("/honeypot/session/{session_id}")
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    chat = result.scalar_one_or_none()
    
    if not chat:
        return {"error": "Session not found"}
        
    # Get the latest extracted intel for this session
    intel_result = await db.execute(
        select(ScamIntel)
        .where(ScamIntel.session_id == session_id)
        .order_by(ScamIntel.id.desc())
    )
    intel = intel_result.scalars().first()
    
    extracted_data = intel.extracted if intel else {}
    if intel and intel.scam_type:
        extracted_data["scam_type"] = intel.scam_type
        
    return {
        "id": chat.id,
        "history": chat.history,
        "is_scam": chat.is_scam,
        "confidence": chat.confidence,
        "extracted": extracted_data
    }


@router.delete("/honeypot/session/{session_id}")
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    # First find the session
    result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    chat = result.scalar_one_or_none()
    
    if not chat:
        return {"error": "Session not found"}
        
    # Delete associated intel
    await db.execute(
        ScamIntel.__table__.delete().where(ScamIntel.session_id == session_id)
    )
    
    # Delete the session
    await db.delete(chat)
    await db.commit()
    
    return {"status": "success", "message": "Session deleted"}
