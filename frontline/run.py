#!/usr/bin/env python3
"""
FRONTLIJN BRIEFING — Dagelijkse OSINT-bulletingenerator
"""
import argparse
import logging
import os
import sys
from datetime import datetime, date

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)


def fmt_date_nl(iso_date_str: str) -> str:
    """Zet ISO-datumstring om naar leesbaar Nederlands formaat."""
    if not iso_date_str:
        return ''
    try:
        dt = datetime.fromisoformat(iso_date_str.replace('Z', '+00:00'))
        maanden = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
                   'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
        return f"{dt.day} {maanden[dt.month - 1]} {dt.strftime('%H:%M')}"
    except Exception:
        return iso_date_str[:16]


def main():
    parser = argparse.ArgumentParser(description='FRONTLIJN BRIEFING generator')
    parser.add_argument('--collect-only', action='store_true')
    parser.add_argument('--generate-only', action='store_true')
    parser.add_argument('--hours', type=int, default=24)
    parser.add_argument('--test', action='store_true')
    args = parser.parse_args()

    today = str(date.today())
    now = datetime.now().strftime('%d-%m-%Y %H:%M')

    from storage.db import init_db
    init_db()
    logger.info("Database geïnitialiseerd")

    if not args.collect_only:
        from processors import gemini
        try:
            gemini.setup()
            logger.info("Gemini API verbonden")
        except EnvironmentError as e:
            logger.error(str(e))
            sys.exit(1)

    # === FASE 1: DATA VERZAMELEN ===
    if not args.generate_only:
        logger.info("=" * 50)
        logger.info("FASE 1: Telegram-kanalen scrapen")
        logger.info("=" * 50)

        from collectors.telegram import collect_all_channels, scrape_channel
        from storage.db import save_messages
        from channels import CHANNELS

        if args.test:
            test_channels = CHANNELS[:2]
            total = 0
            for ch in test_channels:
                msgs = scrape_channel(ch, limit=10)
                if msgs:
                    saved = save_messages(msgs)
                    total += saved
        else:
            total = collect_all_channels(max_per_channel=25)

        logger.info(f"Verzameling klaar: {total} nieuwe berichten opgeslagen")

    if args.collect_only:
        return

    # === FASE 2: AI VERWERKING ===
    logger.info("=" * 50)
    logger.info("FASE 2: AI-verwerking")
    logger.info("=" * 50)

    from processors.pipeline import run_pipeline
    tactical = run_pipeline(hours=args.hours)

    if not tactical:
        logger.warning("Geen tactische berichten gevonden.")
        return

    logger.info(f"{len(tactical)} tactische berichten klaar voor bulletingeneratie")

    # === FASE 3: NIEUWS BRIEFING ===
    logger.info("=" * 50)
    logger.info("FASE 3: Nieuws-briefing genereren (Gemini 3.1 Pro)")
    logger.info("=" * 50)

    from processors.gemini import detect_patterns, generate_bulletin, generate_technology_deepdive

    logger.info("Patroonherkenning...")
    patterns = detect_patterns(tactical)
    if patterns:
        logger.info(f"  → {len(patterns)} signalen gedetecteerd")

    logger.info("Nieuws-briefing genereren...")
    bulletin_data = generate_bulletin(tactical, patterns, today)

    # === FASE 4: TECHNOLOGIE DEEP-DIVE ===
    logger.info("=" * 50)
    logger.info("FASE 4: Technologie deep-dive genereren (Gemini 3.1 Pro)")
    logger.info("=" * 50)

    tech_data = generate_technology_deepdive(tactical, today)
    logger.info(f"  → {len(tech_data.get('categorieën', []))} technologie-categorieën gegenereerd")

    # === FASE 5: HTML OPSLAAN ===
    from jinja2 import Environment, FileSystemLoader
    from storage.db import save_bulletin
    from channels import CHANNELS, CHANNEL_LOOKUP

    template_dir = os.path.join(os.path.dirname(__file__), 'templates')
    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template('bulletin.html')

    unique_channels = len(set(m['channel_slug'] for m in tactical))

    # Tijdstempelstatistieken
    dates = [m.get('message_date') for m in tactical if m.get('message_date')]
    oldest = min(dates) if dates else None
    newest = max(dates) if dates else None

    # Bouw media-index: locatie (lowercase) → lijst van {url, type, channel, date, msg_url}
    from collections import defaultdict
    media_by_location = defaultdict(list)
    all_media = []
    for m in tactical:
        if not m.get('media_url'):
            continue
        entry = {
            'url': m['media_url'],
            'type': m.get('media_type', 'photo'),
            'channel': m.get('channel_slug', ''),
            'side': m.get('channel_side', ''),
            'date': fmt_date_nl(m.get('message_date', '')),
            'msg_url': m.get('message_url', ''),
        }
        all_media.append(entry)
        loc = (m.get('location') or '').strip().lower()
        if loc and loc != 'onbekend':
            media_by_location[loc].append(entry)
            # ook opslaan onder kortere varianten
            for part in loc.split():
                if len(part) > 4:
                    media_by_location[part].append(entry)

    logger.info(f"  Media gevonden: {len(all_media)} items in {len(media_by_location)} locaties")

    html = template.render(
        date=today,
        generated_at=now,
        message_count=len(tactical),
        channel_count=unique_channels,
        data=bulletin_data,
        tech_data=tech_data,
        channels_list=CHANNELS,
        channel_lookup=CHANNEL_LOOKUP,
        oldest_message=fmt_date_nl(oldest),
        newest_message=fmt_date_nl(newest),
        media_by_location=dict(media_by_location),
        all_media=all_media[:60],
    )

    output_dir = os.path.join(os.path.dirname(__file__), 'output')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f'briefing-{today}.html')

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    index_path = os.path.join(os.path.dirname(__file__), 'index.html')
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(html)

    if not args.test:
        save_bulletin(today, html, len(tactical), unique_channels)

    logger.info("=" * 50)
    logger.info(f"✓ BRIEFING GEGENEREERD: {output_path}")
    logger.info(f"  Ook opgeslagen als: {index_path}")
    logger.info(f"  Bronberichten: {len(tactical)} | Kanalen: {unique_channels}")
    logger.info(f"  Technologie-categorieën: {len(tech_data.get('categorieën', []))}")
    logger.info("=" * 50)


if __name__ == '__main__':
    main()
