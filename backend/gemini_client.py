"""
Minimale Gemini REST-client zonder SDK-retry-overhead.
Gebruikt urllib zodat er geen externe dependencies nodig zijn.
"""
import json
import logging
import urllib.request
import urllib.error
from backend.config import GEMINI_API_KEY

logger = logging.getLogger(__name__)

_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


def generate(model: str, prompt: str, system: str = None, temperature: float = 0.5) -> str:
    url = f"{_BASE}/{model}:generateContent?key={GEMINI_API_KEY}"

    contents = [{"role": "user", "parts": [{"text": prompt}]}]
    payload = {"contents": contents, "generationConfig": {"temperature": temperature}}
    if system:
        payload["systemInstruction"] = {"parts": [{"text": system}]}

    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini API fout {e.code}: {error_body[:500]}") from e

    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"Onverwacht Gemini-antwoord: {data}") from e
