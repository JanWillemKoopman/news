"""
Gemini REST-client met ondersteuning voor Google Search tool en JSON-parsing.
"""
import json
import logging
import re
import time
import urllib.request
import urllib.error
from backend.psv.config import GEMINI_API_KEY

logger = logging.getLogger(__name__)

_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

GOOGLE_SEARCH_TOOL = [{"google_search": {}}]


def generate(
    model: str,
    prompt: str,
    system: str = None,
    temperature: float = 0.5,
    tools: list = None,
    retries: int = 3,
) -> str:
    url = f"{_BASE}/{model}:generateContent?key={GEMINI_API_KEY}"

    contents = [{"role": "user", "parts": [{"text": prompt}]}]
    payload: dict = {
        "contents": contents,
        "generationConfig": {"temperature": temperature},
    }
    if system:
        payload["systemInstruction"] = {"parts": [{"text": system}]}
    if tools:
        payload["tools"] = tools

    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    last_err = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                data = json.loads(resp.read())
            break
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="replace")
            last_err = RuntimeError(f"Gemini API fout {e.code}: {error_body[:500]}")
            if e.code in (429, 500, 503) and attempt < retries - 1:
                wait = 2 ** attempt
                logger.warning(f"Gemini {e.code}, retry in {wait}s...")
                time.sleep(wait)
            else:
                raise last_err from e
        except Exception as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
            else:
                raise
    else:
        raise last_err

    try:
        candidate = data["candidates"][0]
        # Grounding kan een lege content teruggeven (geen parts) — behandel als lege string
        parts = candidate.get("content", {}).get("parts", [])
        texts = [p["text"] for p in parts if "text" in p]
        return "\n".join(texts)
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"Onverwacht Gemini-antwoord: {str(data)[:500]}") from e


def parse_json(text: str):
    """Parse JSON uit LLM-output, strip markdown code-fences indien aanwezig."""
    text = text.strip()
    # Strip code fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Regex fallback: eerste { ... } of [ ... ] blok
    for pattern in (r"\{[\s\S]+\}", r"\[[\s\S]+\]"):
        m = re.search(pattern, text)
        if m:
            try:
                return json.loads(m.group())
            except json.JSONDecodeError:
                continue

    raise ValueError(f"Geen geldige JSON in LLM-output: {text[:300]}")
