from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import httpx
import logging
import asyncio

router = APIRouter(prefix="/chatbot", tags=["chatbot"])
logger = logging.getLogger(__name__)

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"]

SYSTEM_PROMPT = """You are SLTS Fleet Assistant, an AI chatbot for the SLTS Fleet Management System.
You help users with questions about:
- Vehicle management (registration, documents, maintenance)
- Driver management (assignments, licenses, documents)
- Tender management (creation, bidding, approval workflow)
- Document tracking (expiry alerts, renewals)
- Plant and stoppage management
- Approval workflows (maker-checker-approver)
- Reports and analytics
- General fleet operations

Keep responses concise, helpful, and professional. If asked about something outside fleet management,
politely redirect the conversation. Do not reveal system internals or sensitive data."""


class ChatRequest(BaseModel):
    message: str
    history: list = []


class ChatResponse(BaseModel):
    reply: str


async def call_gemini(api_key: str, model: str, contents: list, attempt: int = 1) -> str:
    """Call a Gemini model with retry on rate limit."""
    url = f"{GEMINI_BASE}/{model}:generateContent?key={api_key}"
    async with httpx.AsyncClient(timeout=30.0) as http_client:
        response = await http_client.post(
            url,
            json={
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 500,
                }
            }
        )

        if response.status_code == 429 and attempt <= 2:
            # Rate limited — wait and retry once
            logger.warning(f"{model} rate limited (attempt {attempt}), retrying in 5s...")
            await asyncio.sleep(5)
            return await call_gemini(api_key, model, contents, attempt + 1)

        if response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="AI service is temporarily busy. Please wait a moment and try again."
            )

        if response.status_code != 200:
            logger.error(f"Gemini API error ({model}): {response.status_code} - {response.text}")
            raise HTTPException(status_code=502, detail="Failed to get response from AI")

        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # Read key at request time so .env changes are picked up after restart
    api_key = os.environ.get("GEMINI_API_KEY", "")

    if not api_key:
        raise HTTPException(status_code=503, detail="Chatbot not configured. Please set GEMINI_API_KEY in backend .env file.")

    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Build conversation history for Gemini
    contents = []

    # Add system instruction via first user/model exchange
    contents.append({"role": "user", "parts": [{"text": SYSTEM_PROMPT}]})
    contents.append({"role": "model", "parts": [{"text": "Understood. I am SLTS Fleet Assistant, ready to help with fleet management questions."}]})

    # Add conversation history
    for msg in request.history[-10:]:
        role = "user" if msg.get("role") == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg.get("content", "")}]})

    # Add current message
    contents.append({"role": "user", "parts": [{"text": request.message}]})

    # Try each model, fall back to next on failure
    last_error = None
    for model in MODELS:
        try:
            reply = await call_gemini(api_key, model, contents)
            return ChatResponse(reply=reply)
        except HTTPException as e:
            if e.status_code == 429:
                last_error = e
                logger.warning(f"{model} quota exhausted, trying next model...")
                continue
            raise
        except httpx.TimeoutException:
            last_error = HTTPException(status_code=504, detail="AI response timed out. Please try again.")
            logger.warning(f"{model} timed out, trying next model...")
            continue
        except Exception as e:
            logger.error(f"Chatbot error with {model}: {type(e).__name__}: {e}")
            last_error = HTTPException(status_code=502, detail="Failed to get response from AI")
            continue

    # All models failed
    if last_error:
        raise last_error
    raise HTTPException(status_code=502, detail="Failed to get response from AI")
