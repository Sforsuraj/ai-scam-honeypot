import os
import json
from langchain_cerebras import ChatCerebras
from backend.core.persona import PERSONA_PROMPT

if "OPENAI_API_KEY" in os.environ and "CEREBRAS_API_KEY" not in os.environ:
    os.environ["CEREBRAS_API_KEY"] = os.environ["OPENAI_API_KEY"]

llm = ChatCerebras(
    model="llama3.1-8b",
    api_key=os.getenv("OPENAI_API_KEY")
)

async def generate_reply(history: list):
    system_prompt = f"{PERSONA_PROMPT}\n\nRespond with ONLY a JSON object exactly matching this format:\n{{\n  \"reply\": \"your reply to the user\",\n  \"is_scam\": true/false,\n  \"confidence\": 0.0 to 1.0,\n  \"extracted\": {{\n    \"upi\": [\"upi_id\"],\n    \"phones\": [\"phone_number\"],\n    \"emails\": [\"email\"],\n    \"links\": [\"link\"],\n    \"payment_requests\": [\"requests\"],\n    \"scam_type\": \"type of scam\"\n  }}\n}}"
    
    messages = [("system", system_prompt)]
    for msg in history:
        messages.append((msg["role"], msg["content"]))
        
    try:
        response = await llm.ainvoke(messages)
        content = response.content.replace("```json", "").replace("```", "").strip()
        return content
    except Exception as e:
        print(f"LLM Error: {e}")
        return json.dumps({
            "reply": "Wait, my computer is acting up...",
            "is_scam": False,
            "confidence": 0.0,
            "extracted": {}
        })
