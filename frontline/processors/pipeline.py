"""
Volledige verwerkingspipeline: ruwe berichten → geanalyseerde tactische data.
"""
import logging
import time
from storage.db import get_recent_messages, save_analyzed, get_tactical_messages
from processors import gemini

logger = logging.getLogger(__name__)


def run_pipeline(hours: int = 24) -> list[dict]:
    """
    Verwerk berichten van de afgelopen N uur:
    1. Filter op tactische relevantie
    2. Vertaal naar Engels
    3. Analyseer inhoud
    4. Sla op in database

    Geeft de geanalyseerde tactische berichten terug.
    """
    raw_messages = get_recent_messages(hours=hours)
    if not raw_messages:
        logger.warning("Geen berichten gevonden in de afgelopen uren.")
        return []

    logger.info(f"[Pipeline] {len(raw_messages)} ruwe berichten te verwerken")

    # Stap 1: Tactische relevantie-filter (batch)
    logger.info("[1/3] Filteren op tactische relevantie...")
    relevance = gemini.filter_tactical_batch(raw_messages)
    tactical_raw = [m for m, is_tactical in zip(raw_messages, relevance) if is_tactical]
    logger.info(f"  → {len(tactical_raw)}/{len(raw_messages)} berichten zijn tactisch relevant")

    if not tactical_raw:
        return []

    # Stap 2: Vertaling (batch)
    logger.info("[2/3] Vertalen naar Engels...")
    translations = gemini.translate_batch(tactical_raw)
    time.sleep(2)

    # Stap 3: Individuele analyse
    logger.info("[3/3] Analyseren van tactische berichten...")
    for i, (msg, translation) in enumerate(zip(tactical_raw, translations)):
        logger.info(f"  Analyseren {i+1}/{len(tactical_raw)}: {msg['channel_slug']}")
        analysis = gemini.analyze_message(msg, translation)
        analysis['translated_text'] = translation
        analysis['is_tactical'] = True
        save_analyzed(msg['id'], analysis)
        time.sleep(0.5)  # rate limit bescherming

    logger.info("[Pipeline] Verwerking klaar")
    return get_tactical_messages(hours=hours)
