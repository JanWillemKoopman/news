"""
Gemini API via directe HTTP-aanroepen (geen google-generativeai dependency).
"""
import os
import json
import time
import logging
import re
import requests

logger = logging.getLogger(__name__)

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
MODEL_FAST = "gemini-2.0-flash"        # filter, vertalen, per-bericht analyse
MODEL_PRO  = "gemini-3.1-pro-preview"  # patroonherkenning + briefinggeneratie

_api_key: str = ""


def setup():
    global _api_key
    _api_key = os.environ.get('GEMINI_API_KEY', '')
    if not _api_key:
        raise EnvironmentError("GEMINI_API_KEY niet ingesteld in .env")
    logger.info(f"Gemini API geconfigureerd (snel: {MODEL_FAST} | pro: {MODEL_PRO})")


def _call(prompt: str, model: str = MODEL_FAST, max_tokens: int = 4096, retries: int = 3) -> str:
    if not _api_key:
        raise RuntimeError("Roep eerst gemini.setup() aan")

    url = f"{GEMINI_API_BASE}/{model}:generateContent?key={_api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": max_tokens,
        }
    }

    for attempt in range(retries):
        try:
            resp = requests.post(url, json=payload, timeout=120)
            if resp.status_code == 200:
                data = resp.json()
                parts = data.get('candidates', [{}])[0].get('content', {}).get('parts', [])
                if parts:
                    return parts[0].get('text', '').strip()
                finish = data.get('candidates', [{}])[0].get('finishReason', '?')
                logger.warning(f"Lege response van {model}, finishReason={finish}")
                return ""
            elif resp.status_code == 429:
                wait = 2 ** (attempt + 2)
                logger.warning(f"Rate limit (429) op {model}. Wacht {wait}s...")
                time.sleep(wait)
            else:
                logger.error(f"Gemini HTTP {resp.status_code} ({model}): {resp.text[:200]}")
                if attempt == retries - 1:
                    return ""
                time.sleep(2)
        except requests.RequestException as e:
            if attempt == retries - 1:
                logger.error(f"Gemini request mislukt ({model}): {e}")
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

        response = _call(prompt, model=MODEL_FAST)
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

        response = _call(prompt, model=MODEL_FAST, max_tokens=4096)
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

    response = _call(prompt, model=MODEL_FAST, max_tokens=512)
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
    """Detecteer terugkerende thema's in meerdere onafhankelijke bronnen (MODEL_PRO)."""
    if len(tactical_messages) < 5:
        return []

    summary = "\n".join(
        f"[{m['channel_slug']}|{m['channel_side']}] {m.get('key_facts', '')[:200]}"
        for m in tactical_messages[:60]
    )

    prompt = f"""Je bent een senior inlichtinganalist gespecialiseerd in patroonherkenning.

Analyseer onderstaande berichten van meerdere onafhankelijke bronnen. Zoek naar fenomenen
die door 3 of meer VERSCHILLENDE kanalen worden gerapporteerd — dat zijn signalen, geen ruis.

Focus op: munitietekorten, nieuwe drone/EW-tactieken, troepenrotaties, aanvalspatronen,
logistieke knelpunten, weersomstandigheden die operaties beïnvloeden.

Schrijf elk signaal als een complete Nederlandse zin die het fenomeen en de frequentie beschrijft.
Geef maximaal 5 patronen als JSON-array van strings.
Leeg array als er geen duidelijke patronen zijn.

Berichten:
{summary}

Patronen (JSON-array van Nederlandse strings):"""

    response = _call(prompt, model=MODEL_PRO, max_tokens=2048)
    result = _extract_json(response)
    if isinstance(result, list):
        return [str(p) for p in result[:5]]
    return []


def generate_bulletin(tactical_messages: list[dict], patterns: list[str], date: str) -> dict:
    """Genereer de volledige dagelijkse briefing via MODEL_PRO (gemini-3.1-pro-preview)."""
    messages_text = "\n\n".join(
        f"[{m['channel_slug']}|{m['channel_side']}|{m.get('event_type','?')}]\n"
        f"Locatie: {m.get('location', 'onbekend')}\n"
        f"Feiten: {m.get('key_facts', '')}\n"
        f"Propaganda: {m.get('propaganda_markers', 'geen')}"
        for m in tactical_messages[:60]
    )

    patterns_text = "\n".join(f"- {p}" for p in patterns) if patterns else "Geen."

    prompt = f"""Je bent een senior oorlogsverslaggever en inlichtingsofficier die een dagelijkse frontlijnbriefing schrijft.

Stijl: journalistiek scherp, analytisch, nuchter. Schrijf zoals de beste correspondenten van NRC of de Volkskrant.
Geen sensatiezucht. Geen politieke stellingname. Wees concreet over locaties, eenheden en feiten.
Schrijf VOLLEDIG IN HET NEDERLANDS.

Datum: {date}
Verwerkte bronberichten: {len(tactical_messages)}
Gedetecteerde patronen over meerdere bronnen:
{patterns_text}

Tactische brondata:
{messages_text}

Genereer UITSLUITEND het volgende JSON-object, niets anders:
{{
  "krantenkop": "Kernachtige journalistieke krantenkop, max 10 woorden, geen punt aan het einde",
  "subtitel": "Concretiserende ondertitel van max 20 woorden die de kop aanvult",
  "lede": "Openingsparagraaf van 3-4 zinnen in journalistieke stijl. Dit is het meest significante feit van de dag, met context en implicatie. Schrijf alsof dit de eerste alinea is van een NRC-artikel.",
  "sectoren": [
    {{
      "naam": "naam van frontsector of stad",
      "samenvatting": "1-2 zinnen die de essentie van de situatie in deze sector grijpen",
      "bevestigd": ["feit dat door meerdere onafhankelijke bronnen bevestigd is — concreet en locatiespecifiek"],
      "onzeker": ["claim van één partij die niet onafhankelijk bevestigd is — wees expliciet over de bron"],
      "ua_claim": "de Oekraïense claim over deze sector, of null",
      "ua_source": "kanaalslug van de UA-bron, of null",
      "ru_claim": "de Russische claim over deze sector, of null",
      "ru_source": "kanaalslug van de RU-bron, of null",
      "sources_used": ["kanaalslug1", "kanaalslug2"],
      "betrouwbaarheid": "hoog|middel|laag|tegenstrijdig"
    }}
  ],
  "strategische_context": "2-3 zinnen: wat betekenen de ontwikkelingen van vandaag voor het grotere strategische plaatje? Verbind de losse feiten tot een coherent beeld van de richting van het conflict.",
  "morgen_verwacht": ["Concrete verwachting of aandachtspunt voor de komende 24-48 uur — punt 1", "punt 2", "punt 3"],
  "technologie_ew": ["Beschrijving drone- of EW-ontwikkeling met bron tussen haakjes", "tweede ontwikkeling"],
  "menselijke_factor": "Een alinea van 3-4 zinnen over de sfeer, het moraal, de logistieke realiteit en de menselijke kant aan het front. Put uit soldatenverhalen en veldrapporten.",
  "signalen": ["patroon dat over meerdere bronnen zichtbaar is — schrijf als volledige zin"],
  "bronnenkritiek": ["Specifieke tegenstrijdigheid of propagandapoging met naam van bron"]
}}

REGELS:
- Stel "bevestigd" feiten alleen in als ze door 2+ onafhankelijke bronnen worden ondersteund
- Gebruik "onzeker" voor eenzijdige claims — benoem expliciet van welke kant
- "ua_source" en "ru_source": vul de exacte kanaalslug in uit de brondata
- Wees journalistiek precies: vermijd vage termen als "sommige bronnen" — noem de kanalen
- Maximaal 5 sectoren, kies de meest significante

JSON:"""

    response = _call(prompt, model=MODEL_PRO, max_tokens=8192)
    result = _extract_json(response)

    if isinstance(result, dict):
        # Zorg dat nieuwe velden bestaan voor backwards-compatibiliteit
        result.setdefault('krantenkop', 'Frontlijnrapport')
        result.setdefault('subtitel', '')
        result.setdefault('lede', result.pop('samenvatting', ''))
        result.setdefault('strategische_context', '')
        result.setdefault('morgen_verwacht', [])
        for sector in result.get('sectoren', []):
            sector.setdefault('bevestigd', sector.get('details', []))
            sector.setdefault('onzeker', [])
        return result

    return {
        "krantenkop": "Briefinggeneratie deels mislukt",
        "subtitel": "Ruwe data beschikbaar in de sectoren hieronder",
        "lede": response[:500] if response else "Geen data beschikbaar.",
        "sectoren": [],
        "strategische_context": "",
        "morgen_verwacht": [],
        "technologie_ew": [],
        "menselijke_factor": "Geen data.",
        "signalen": patterns,
        "bronnenkritiek": [],
    }


def generate_technology_deepdive(tactical_messages: list[dict], date: str) -> dict:
    """Genereer een uitputtende technologie-analyse via MODEL_PRO."""
    messages_text = "\n\n".join(
        f"[{m['channel_slug']}|{m['channel_side']}|datum:{m.get('message_date','?')}]\n"
        f"Type: {m.get('event_type','?')} | Locatie: {m.get('location','?')}\n"
        f"Feiten: {m.get('key_facts', '')}"
        for m in tactical_messages[:80]
    )

    prompt = f"""Je bent een defensie-technologie expert en onderzoeksjournalist gespecialiseerd in militaire innovatie.
Schrijf een UITPUTTENDE, DIEPGAANDE analyse van alle technologische ontwikkelingen in het conflict in Oekraïne.
Schrijf VOLLEDIG IN HET NEDERLANDS. Wees zeer gedetailleerd en technisch.

Datum: {date}
Brondata:
{messages_text}

Genereer UITSLUITEND dit JSON-object:
{{
  "tech_kop": "Journalistieke krantenkop over de technologische situatie, max 10 woorden",
  "tech_intro": "Openingsalinea van 4-5 zinnen over de technologische dimensie van het conflict vandaag. Beschrijf hoe technologie het slagveld vormt.",
  "categorieën": [
    {{
      "naam": "Categorie naam (bijv. FPV-drones & Zwermtactiek)",
      "icoon": "één relevant emoji",
      "introductie": "2-3 zinnen die de rol van deze technologie in het conflict beschrijven",
      "ontwikkelingen": [
        {{
          "titel": "Naam van het systeem of de tactiek",
          "beschrijving": "Uitgebreide technische beschrijving van 3-5 zinnen. Beschrijf het systeem, hoe het wordt ingezet, wat het effect is op het slagveld en wat er nieuw aan is.",
          "kant": "UA|RU|beide",
          "impact": "hoog|middel|laag",
          "bronnen": ["kanaalslug"],
          "gemeld_op": "datum uit de brondata of null"
        }}
      ]
    }}
  ],
  "innovatie_vergelijking": {{
    "ua_sterktepunten": ["specifiek technologisch voordeel of innovatie van Oekraïne 1", "punt 2", "punt 3"],
    "ru_sterktepunten": ["specifiek technologisch voordeel of innovatie van Rusland 1", "punt 2", "punt 3"],
    "technologische_balans": "Analytische conclusie in 3-4 zinnen: welke kant heeft technologisch de overhand en waarom? Waar liggen de kritieke asymmetrieën?"
  }},
  "tech_signalen": [
    "Een technologisch patroon of innovatietrend die over meerdere bronnen zichtbaar is — uitgeschreven als volledige Nederlandse zin met implicaties"
  ]
}}

VEREISTEN:
- Gebruik minimaal 4 categorieën: FPV-drones, Elektronische Oorlogsvoering, Loitering Munition, Maritieme Technologie
- Voeg extra categorieën toe als de data dit rechtvaardigt (bijv. AI-targeting, Luchtafweer, Pantservoertuigen, Communicatie)
- Elke categorie: minimaal 2 concrete ontwikkelingen met specifieke systeemnamen
- Noem specifieke wapensystemen bij naam (Lancet-3M, Shahed-136, FPV Mavic, Krasukha-4, etc.)
- Geef bij elke ontwikkeling aan wanneer het gemeld werd (datum uit de data)
- "kant": UA = Oekraïne, RU = Rusland, beide = beide partijen
- Schrijf alsof je een expert-lezer hebt die technische details waardeert

JSON:"""

    response = _call(prompt, model=MODEL_PRO, max_tokens=8192)
    result = _extract_json(response)

    if isinstance(result, dict):
        result.setdefault('tech_kop', 'Technologische Oorlogsvoering')
        result.setdefault('tech_intro', 'Technologische analyse niet volledig beschikbaar.')
        result.setdefault('categorieën', [])
        result.setdefault('innovatie_vergelijking', {
            'ua_sterktepunten': [], 'ru_sterktepunten': [], 'technologische_balans': ''
        })
        result.setdefault('tech_signalen', [])
        return result

    return {
        "tech_kop": "Technologie-analyse niet beschikbaar",
        "tech_intro": response[:400] if response else "Geen data.",
        "categorieën": [],
        "innovatie_vergelijking": {"ua_sterktepunten": [], "ru_sterktepunten": [], "technologische_balans": ""},
        "tech_signalen": [],
    }
