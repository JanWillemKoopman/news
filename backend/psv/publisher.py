"""
Publisher — rendert de nieuwsbrief (intro + secties) naar markdown en slaat op.
Geen LLM-call.
"""
import json
import logging
import os
from datetime import datetime, timedelta

from backend.psv import dedup, image_finder
from backend.storage import save_summary

logger = logging.getLogger(__name__)

_SECTIE_LABELS = {
    "terugblik":   "Terugblik",
    "vooruitblik": "Vooruitblik",
    "ziekenboeg":  "Ziekenboeg & Schorsingen",
    "transfers":   "Transfers & Geruchten",
    "achtergrond": "Achtergrond & Analyse",
}


def run(
    writer_result: dict,
    deep_per_sectie: dict,
    scout_profile: dict,
    run_dir: str,
    dry_run: bool = False,
) -> dict:
    titel = writer_result.get("titel", "PSV Nieuwsbrief")
    intro = writer_result.get("intro", "")
    inleiding = writer_result.get("inleiding", "")
    secties = writer_result.get("secties", [])

    # Beste afbeelding per sectie (eerste PSV-relevant artikel met image_url)
    images = {}
    for s_id, items in deep_per_sectie.items():
        for itm in items:
            if itm.get("image_url"):
                images[s_id] = itm["image_url"]
                break

    # Fallback: secties zonder afbeelding via Gemini Google Search invullen
    secties_zonder_image = [s for s in deep_per_sectie if s not in images]
    if secties_zonder_image:
        logger.info(f"Publisher: image fallback voor {secties_zonder_image}")
        for s_id in secties_zonder_image:
            img = image_finder.find_section_image(s_id, scout_profile)
            if img:
                images[s_id] = img
                logger.info(f"  → Fallback image [{s_id}]: {img[:80]}")

    # Render naar markdown — intro bovenaan als grotere inleidingstekst
    markdown_delen = []
    if intro:
        markdown_delen.append(f":::intro\n{intro.strip()}\n:::")
    if inleiding:
        markdown_delen.append(inleiding.strip())
    for sectie in secties:
        sectie_id = sectie.get("sectie_id", "")
        kop = sectie.get("kop") or _SECTIE_LABELS.get(sectie_id, sectie_id.title())
        body = sectie.get("body", "")
        image_block = f":::image\n{images[sectie_id]}\n:::\n\n" if images.get(sectie_id) else ""
        markdown_delen.append(f"## {kop}\n\n{image_block}{body.strip()}")

    summary_markdown = "\n\n".join(markdown_delen)

    # Week-bereik
    today = datetime.now()
    week_start = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")
    week_end = today.strftime("%Y-%m-%d")

    # Verzamel alle bron-URLs
    alle_items = []
    for items in deep_per_sectie.values():
        alle_items.extend(items)

    sources = list({
        item.get("bron_url") or item.get("bron_naam", "")
        for item in alle_items
        if item.get("bron_url") or item.get("bron_naam")
    })

    if dry_run:
        logger.info(
            f"DRY RUN — Publisher zou opslaan: '{titel}' met {len(secties)} secties"
        )
        entry = {
            "dry_run":    True,
            "titel":      titel,
            "n_secties":  len(secties),
            "week_start": week_start,
            "week_end":   week_end,
        }
    else:
        entry = save_summary(
            title=titel,
            summary=summary_markdown,
            week_start=week_start,
            week_end=week_end,
            sources=sources,
            images=images,
        )
        dedup.mark_seen(alle_items)
        logger.info(f"Publisher: opgeslagen als ID {entry.get('id')}")

    _save(run_dir, {"entry": entry, "dry_run": dry_run})
    return entry


def _save(run_dir: str, data: dict) -> None:
    with open(os.path.join(run_dir, "publisher.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)
