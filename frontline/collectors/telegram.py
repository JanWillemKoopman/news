"""
Scraper voor publieke Telegram-kanalen via https://t.me/s/CHANNEL
Geen API-key nodig — werkt op de publieke webpreview.
"""
import requests
from bs4 import BeautifulSoup
import time
import logging
from channels import CHANNELS
from storage.db import save_messages

logger = logging.getLogger(__name__)

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 '
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ),
    'Accept-Language': 'en-US,en;q=0.9',
}
REQUEST_DELAY = 2.5  # seconden tussen verzoeken (respectvol scrapen)


def scrape_channel(channel: dict, limit: int = 30) -> list[dict]:
    """Haal recente berichten op van één publiek Telegram-kanaal."""
    slug = channel['slug']
    url = f"https://t.me/s/{slug}"

    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code == 200 and 'tgme_widget_message' in resp.text:
            return _parse_posts(resp.text, channel, limit)
        elif resp.status_code == 404:
            logger.warning(f"Kanaal niet gevonden: {slug}")
        else:
            logger.warning(f"HTTP {resp.status_code} voor {slug}")
    except requests.RequestException as e:
        logger.error(f"Fout bij scrapen {slug}: {e}")

    return []


def _parse_posts(html: str, channel: dict, limit: int) -> list[dict]:
    soup = BeautifulSoup(html, 'html.parser')
    posts = soup.select('.tgme_widget_message')[-limit:]
    messages = []

    for post in posts:
        text_el = post.select_one('.tgme_widget_message_text')
        time_el = post.select_one('.tgme_widget_message_date time')
        url_el = post.select_one('a.tgme_widget_message_date')

        if not text_el:
            continue

        raw_text = text_el.get_text(separator=' ', strip=True)
        if len(raw_text) < 20:
            continue

        messages.append({
            'channel_slug': channel['slug'],
            'channel_side': channel['side'],
            'channel_reliability': channel['reliability'],
            'raw_text': raw_text,
            'lang': channel['lang'],
            'message_date': time_el.get('datetime', '') if time_el else '',
            'url': url_el['href'] if url_el else '',
        })

    return messages


def collect_all_channels(max_per_channel: int = 25) -> int:
    """Scrape alle kanalen en sla nieuwe berichten op. Geeft totaal opgeslagen terug."""
    total_saved = 0
    accessible = 0

    for channel in CHANNELS:
        logger.info(f"Scraping: {channel['name']} (@{channel['slug']})")
        messages = scrape_channel(channel, limit=max_per_channel)

        if messages:
            accessible += 1
            saved = save_messages(messages)
            total_saved += saved
            logger.info(f"  → {len(messages)} berichten gevonden, {saved} nieuw opgeslagen")
        else:
            logger.info(f"  → Niet toegankelijk of leeg")

        time.sleep(REQUEST_DELAY)

    logger.info(f"Collectie klaar: {accessible}/{len(CHANNELS)} kanalen bereikbaar, {total_saved} nieuwe berichten")
    return total_saved
