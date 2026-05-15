#!/usr/bin/env python3
"""
FRONTLIJN BRIEFING — Dagelijkse OSINT-bulletingenerator
"The Dirt and the Steel"

Gebruik:
  python run.py                    # volledig run: verzamel + verwerk + genereer
  python run.py --collect-only     # alleen Telegram scrapen
  python run.py --generate-only    # alleen briefing genereren (gebruikt bestaande data)
  python run.py --hours 48         # kijk 48 uur terug i.p.v. 24
  python run.py --test             # test met 2 kanalen, sla niet op
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


def main():
    parser = argparse.ArgumentParser(description='FRONTLIJN BRIEFING generator')
    parser.add_argument('--collect-only', action='store_true', help='Alleen data verzamelen')
    parser.add_argument('--generate-only', action='store_true', help='Alleen briefing genereren')
    parser.add_argument('--hours', type=int, default=24, help='Uren terug kijken (standaard: 24)')
    parser.add_argument('--test', action='store_true', help='Testrun met beperkte data')
    args = parser.parse_args()

    today = str(date.today())
    now = datetime.now().strftime('%d-%m-%Y %H:%M')

    # Database initialiseren
    from storage.db import init_db
    init_db()
    logger.info("Database geïnitialiseerd")

    # Gemini setup
    if not args.collect_only:
        from processors import gemini
        try:
            gemini.setup()
            logger.info("Gemini API verbonden")
        except EnvironmentError as e:
            logger.error(str(e))
            logger.error("Maak een .env bestand aan op basis van .env.example")
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
            # Testmodus: alleen eerste 2 kanalen
            test_channels = CHANNELS[:2]
            logger.info(f"TESTMODUS: verwerk {len(test_channels)} kanalen")
            total = 0
            for ch in test_channels:
                msgs = scrape_channel(ch, limit=10)
                if msgs:
                    saved = save_messages(msgs)
                    total += saved
                    logger.info(f"  {ch['name']}: {saved} berichten opgeslagen")
        else:
            total = collect_all_channels(max_per_channel=25)

        logger.info(f"Verzameling klaar: {total} nieuwe berichten opgeslagen")

    if args.collect_only:
        logger.info("--collect-only: gestopt na verzameling")
        return

    # === FASE 2: AI VERWERKING ===
    logger.info("=" * 50)
    logger.info("FASE 2: AI-verwerking")
    logger.info("=" * 50)

    from processors.pipeline import run_pipeline
    tactical = run_pipeline(hours=args.hours)

    if not tactical:
        logger.warning("Geen tactische berichten gevonden. Bulletin wordt niet gegenereerd.")
        logger.info("Tip: controleer of de kanalen bereikbaar zijn en run opnieuw.")
        return

    logger.info(f"{len(tactical)} tactische berichten klaar voor bulletingeneratie")

    # === FASE 3: BULLETINGENERATIE ===
    logger.info("=" * 50)
    logger.info("FASE 3: Briefing genereren")
    logger.info("=" * 50)

    from processors.gemini import detect_patterns, generate_bulletin

    logger.info("Patroonherkenning...")
    patterns = detect_patterns(tactical)
    if patterns:
        logger.info(f"  → {len(patterns)} signalen gedetecteerd")
        for p in patterns:
            logger.info(f"    ⬥ {p}")

    logger.info("Briefing genereren...")
    bulletin_data = generate_bulletin(tactical, patterns, today)

    # === FASE 4: HTML OPSLAAN ===
    from jinja2 import Environment, FileSystemLoader
    from storage.db import save_bulletin

    template_dir = os.path.join(os.path.dirname(__file__), 'templates')
    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template('bulletin.html')

    unique_channels = len(set(m['channel_slug'] for m in tactical))
    html = template.render(
        date=today,
        generated_at=now,
        message_count=len(tactical),
        channel_count=unique_channels,
        data=bulletin_data,
    )

    # Sla op als bestand
    output_dir = os.path.join(os.path.dirname(__file__), 'output')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f'briefing-{today}.html')

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    # Sla ook op in database
    if not args.test:
        save_bulletin(today, html, len(tactical), unique_channels)

    logger.info("=" * 50)
    logger.info(f"✓ BRIEFING GEGENEREERD: {output_path}")
    logger.info(f"  Bronberichten: {len(tactical)}")
    logger.info(f"  Kanalen: {unique_channels}")
    logger.info(f"  Signalen: {len(patterns)}")
    logger.info("=" * 50)
    logger.info(f"Open het bestand in je browser om de briefing te lezen.")


if __name__ == '__main__':
    main()
