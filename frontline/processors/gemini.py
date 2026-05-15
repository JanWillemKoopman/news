"""
Gemini API via directe HTTP-aanroepen (geen google-generativeai dependency).
Werkt met elke Python-omgeving die `requests` heeft.
"""
import os
import json
import time
import logging
import re
import requests

logger = logging.getLogger(__name__)

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
MODEL = "gemini-2.0-flash"

_api_key: str = ""


def setup():
    global _api_key
    _api_key = os.environ.get('GEMINI_API_KEY', '')
    if not _api_key:
        raise EnvironmentError("GEMINI_API_KEY niet ingesteld in .env")
    logger.info(f"Gemini API geconfigureerd (model: {MODEL})")


def _call(prompt: str, retries: int = 3) -> str:
    if not _api_key:
        raise RuntimeError("Roep eerst gemini.setup() aan")

    url = f"{GEMINI_API_BASE}/{MODEL}:generateContent?key={_api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 4096,
        }
    }

    for attempt in range(retries):
        try:
            resp = requests.post(url, json=payload, timeout=60)
            if resp.status_code == 200:
                data = resp.json()
                return data['candidates'][0]['content']['parts'][0]['text'].strip()
            elif resp.status_code == 429:
                wait = 2 ** (attempt + 2)
                logger.warning(f"Rate limit (429). Wacht {wait}s...")
                time.sleep(wait)
            else:
                logger.error(f"Gemini HTTP {resp.status_code}: {resp.text[:200]}")
                if attempt == retries - 1:
                    return ""
                time.sleep(2)
        except requests.RequestException as e:
            if attempt == retries - 1:
                logger.error(f"Gemini request mislukt: {e}")
                return ""
            time.sleep(2 ** attempt)

    return ""


def _extract_json(text: str) -> dict | list | None:
    match = re.search(r'```(?:json)?\s*([\s\S]+?)```', text)
    if match:
        text = match.group(1)
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        # Probeer ook ruwe JSON zonder backticks
        try:
            start = text.find('[') if text.find('[') != -1 and (text.find('{') == -1 or text.find('[') < text.find('{')) else text.find('{')
            if start != -1:
                end = text.rfind(']') if text.find('[') == start else text.rfind('}')
                return json.loads(text[start:end+1])
        except Exception:
            pass
        return None


def filter_tactical_batch(messages: list[dict]) -> list[bool]:
    """Filter berichten op tactische relevantie. Batchgrootte: 20."""
    results = []
    batch_size = 20

    for i in range(0, len(messages), batch_size):
        batch = messages[i:i + batch_size]
        numbered = "\n---\n".join(
            f"[{j}] {m['raw_text'][:400]}"
            for j, m in enumerate(batch)
        )

        prompt = f"""Je bent een militaire OSINT-analist voor het conflict in Oekraïne.

Beoordeel elk bericht: is het TACTISCH RELEVANT?

TACTISCH RELEVANT = concrete info over:
- Troepenposities/bewegingen (specifieke locaties, dorpen, loopgraaflijnen)
- Drone-aanvallen, -tactieken, elektronische oorlogsvoering (EW)
- Artillerie, luchtaanvallen, infanteriecontact
- Munitietekorten, logistiek, voorraden aan het front
- Moraal of fysieke toestand van frontlijnsolde
- Specifieke wapensystemen in gebruik
- Tactische kaartwijzigingen

NIET RELEVANT = politieke statements, diplomatiek, internationale hulp algemeen,
economisch nieuws, humanitaire zaken zonder tactisch belang.

Geef ALLEEN een JSON-array van 0 (niet relevant) of 1 (tactisch relevant), exact {len(batch)} elementen.
Voorbeeld voor 3 berichten: [1, 0, 1]

Berichten:
{numbered}

JSON-array:"""

        response = _call(prompt)
        parsed = _extract_json(response)

        if isinstance(parsed, list) and len(parsed) == len(batch):
            results.extend([bool(v) for v in parsed])
        else:
            logger.warning(f"Filter parse-fout batch {i//batch_size}: '{response[:80]}'")
            results.extend([True] * len(batch))

        time.sleep(1.5)

    return results


def translate_batch(messages: list[dict]) -> list[str]:
    """Vertaal niet-Engelstalige berichten naar Engels (batches van 12)."""
    results = [''] * len(messages)
    to_translate = [(i, m) for i, m in enumerate(messages) if m.get('lang') != 'en']

    for i, m in enumerate(messages):
        if m.get('lang') == 'en':
            results[i] = m['raw_text']

    batch_size = 12
    for b in range(0, len(to_translate), batch_size):
        batch = to_translate[b:b + batch_size]
        numbered = "\n===BERICHT===\n".join(
            f"[{j}] {item[1]['raw_text'][:500]}"
            for j, item in enumerate(batch)
        )

        prompt = f"""Vertaal de volgende berichten naar Engels.
Bewaar militaire terminologie, plaatsnamen en eenheidsnummers exact.
Geef ALLEEN de vertalingen, elk op een nieuwe blok gescheiden door ===VERTALING===
Gebruik dezelfde nummering [0], [1], etc.

{numbered}

Vertalingen:"""

        response = _call(prompt)
        parts = re.split(r'===VERTALING===', response)

        for j, (orig_idx, msg) in enumerate(batch):
            if j < len(parts):
                text = parts[j].strip()
                text = re.sub(r'^\[\d+\]\s*', '', text)
                results[orig_idx] = text or msg['raw_text']
            else:
                results[orig_idx] = msg['raw_text']

        time.sleep(1.5)

    return results


def analyze_message(msg: dict, translated_text: str) -> dict:
    """Analyseer één tactisch bericht en extraheer gestructureerde data."""
    side_context = {
        'UA': 'Oekraïense bron — kan Russische verliezen overdrijven',
        'RU': 'Russische bron — minimaliseert eigen verliezen, overdrijft successen',
        'neutral': 'Westerse/neutrale OSINT-bron',
    }.get(msg.get('channel_side', 'neutral'), 'Onbekende bron')

    prompt = f"""Analyseer dit OSINT-bericht als inlichtingenanalist.
Bron: {msg['channel_slug']} ({side_context}, betrouwbaarheid: {msg.get('channel_reliability', '?')})

Bericht: {translated_text[:700]}

Geef een JSON-object:
{{
  "location": "plaatsnaam of sector, of null",
  "event_type": "aanval|verdediging|drone|EW|artillerie|logistiek|moraal|positioneel|anders",
  "reliability": "hoog|middel|laag",
  "propaganda_markers": "beschrijving propagandakenmerken, of null",
  "key_facts": "maximaal 2 zinnen, neutraal gesteld"
}}

JSON:"""

    response = _call(prompt)
    result = _extract_json(response)

    if isinstance(result, dict):
        return result
    return {
        "location": None,
        "event_type": "onbekend",
        "reliability": "laag",
        "propaganda_markers": None,
        "key_facts": translated_text[:200],
    }


def detect_patterns(tactical_messages: list[dict]) -> list[str]:
    """Detecteer terugkerende thema's in meerdere onafhankelijke bronnen."""
    if len(tactical_messages) < 5:
        return []

    summary = "\n".join(
        f"[{m['channel_slug']}|{m['channel_side']}] {m.get('key_facts', '')[:180]}"
        for m in tactical_messages[:55]
    )

    prompt = f"""Je bent een patroonherkenner bij een inlichtingsdienst.

Zoek in onderstaande berichten van MEERDERE ONAFHANKELIJKE bronnen naar fenomenen
die door 3+ VERSCHILLENDE kanalen worden gemeld — dat zijn signalen, geen ruis.

Focus op: munitietekorten, nieuwe drone/EW-tactieken, troepenrotaties, weersomstandigheden,
aanvalspatronen die zich herhalen.

Geef maximaal 5 patronen als JSON-array van Nederlandse strings.
Leeg array als er geen duidelijke patronen zijn.

Berichten:
{summary}

Patronen (JSON-array van strings):"""

    response = _call(prompt)
    result = _extract_json(response)
    if isinstance(result, list):
        return [str(p) for p in result[:5]]
    return []


def generate_bulletin(tactical_messages: list[dict], patterns: list[str], date: str) -> dict:
    """Genereer de volledige dagelijkse briefing als gestructureerde JSON."""
    messages_text = "\n\n".join(
        f"[{m['channel_slug']}|{m['channel_side']}|{m.get('event_type','?')}]\n"
        f"Locatie: {m.get('location', 'onbekend')}\n"
        f"Feiten: {m.get('key_facts', '')}\n"
        f"Propaganda: {m.get('propaganda_markers', 'geen')}"
        for m in tactical_messages[:50]
    )

    patterns_text = "\n".join(f"- {p}" for p in patterns) if patterns else "Geen."

    prompt = f"""Je bent een inlichtingenofficier die een frontlijnbriefing schrijft.
Stijl: technisch, nuchter, dicht bij de realiteit. Geen sensatiezucht. Geen politieke duiding.
Schrijf VOLLEDIG IN HET NEDERLANDS.

Datum: {date}
Bronberichten verwerkt: {len(tactical_messages)}
Gedetecteerde patronen:
{patterns_text}

Tactische data:
{messages_text}

Genereer ALLEEN dit JSON-object (geen uitleg eromheen):
{{
  "samenvatting": "3 zinnen over de meest kritische ontwikkelingen van vandaag",
  "sectoren": [
    {{
      "naam": "naam van frontsector",
      "samenvatting": "1-2 zinnen wat er bewoog",
      "details": ["concreet feit 1", "concreet feit 2"],
      "ua_claim": "Oekraïense claim of null",
      "ru_claim": "Russische claim of null",
      "betrouwbaarheid": "hoog|middel|laag|tegenstrijdig"
    }}
  ],
  "technologie_ew": ["drone/EW-ontwikkeling 1", "drone/EW-ontwikkeling 2"],
  "menselijke_factor": "sfeer, moraal, logistiek, weer — de atmosfeer aan het front",
  "signalen": ["patroon 1", "patroon 2"],
  "bronnenkritiek": ["tegenstrijdigheid of propagandapunt 1"]
}}

JSON:"""

    response = _call(prompt)
    result = _extract_json(response)

    if isinstance(result, dict):
        return result

    return {
        "samenvatting": "Bulletingeneratie deels mislukt. Ruwe data beschikbaar.",
        "sectoren": [],
        "technologie_ew": [],
        "menselijke_factor": response[:500] if response else "Geen data.",
        "signalen": patterns,
        "bronnenkritiek": [],
    }
