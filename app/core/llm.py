import os
import json
from langchain_cerebras import ChatCerebras

from app.core.persona import PERSONA_PROMPT

if "OPENAI_API_KEY" in os.environ and "CEREBRAS_API_KEY" not in os.environ:
    os.environ["CEREBRAS_API_KEY"] = os.environ["OPENAI_API_KEY"]

llm = ChatCerebras(
    model="llama3.1-8b",
    api_key=os.getenv("OPENAI_API_KEY")
)



import re

async def generate_reply(history: list):
    system_prompt = f"{PERSONA_PROMPT}\n\nRespond with ONLY a JSON object exactly matching this format:\n{{\n  \"reply\": \"your reply to the user\",\n  \"is_scam\": true/false,\n  \"confidence\": 0.0 to 1.0,\n  \"extracted\": {{\n    \"upi\": [\"upi_id\"],\n    \"phones\": [\"phone_number\"],\n    \"emails\": [\"email\"],\n    \"links\": [\"link\"],\n    \"payment_requests\": [\"requests\"],\n    \"scam_type\": \"type of scam\"\n  }}\n}}"
    
    messages = [("system", system_prompt)]
    for msg in history:
        messages.append((msg["role"], msg["content"]))
        
    try:
        response = await llm.ainvoke(messages)
        content = response.content.strip()
        
        # Aggressive Regex Extraction to bypass corrupted JSON formatting
        reply_match = re.search(r'"reply"\s*:\s*"([^"]+)"', content, re.IGNORECASE)
        scam_match = re.search(r'"is_scam"\s*:\s*(true|false)', content, re.IGNORECASE)
        conf_match = re.search(r'"confidence"\s*:\s*([0-9.]+)', content, re.IGNORECASE)
        
        reply_text = reply_match.group(1) if reply_match else "one small doubt..."
        is_scam = True if (scam_match and scam_match.group(1).lower() == 'true') else False
        confidence = float(conf_match.group(1)) if conf_match else 0.0
        
        # Try to parse extracted dictionary if possible, else default to empty
        extracted = {}
        try:
            ext_match = re.search(r'"extracted"\s*:\s*(\{.*?\})', content, re.IGNORECASE | re.DOTALL)
            if ext_match:
                extracted = json.loads(ext_match.group(1).replace("'", '"'))
        except:
            extracted = {}
            
        final_data = {
            "reply": reply_text,
            "is_scam": is_scam,
            "confidence": confidence,
            "extracted": extracted
        }
        return json.dumps(final_data)
        
    except Exception as e:
        print(f"LLM Error: {e}")
        return json.dumps({
            "reply": "Wait, my phone is acting up...",
            "is_scam": False,
            "confidence": 0.0,
            "extracted": {}
        })
