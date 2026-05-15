"""
Scraper voor publieke Telegram-kanalen via https://t.me/s/CHANNEL
Geen API-key nodig — werkt op de publieke webpreview.
"""
import re
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
REQUEST_DELAY = 2.5


def _extract_media(post) -> tuple[str | None, str | None]:
    """Extraheer de eerste media-URL en het type uit een Telegram-post."""
    # Foto: background-image in photo_wrap
    photo_wrap = post.select_one('a.tgme_widget_message_photo_wrap')
    if photo_wrap:
        style = photo_wrap.get('style', '')
        m = re.search(r"url\('(.+?)'\)", style)
        if m:
            return m.group(1), 'photo'

    # Video thumbnail: background-image in video_wrap
    video_wrap = post.select_one('a.tgme_widget_message_video_wrap')
    if video_wrap:
        style = video_wrap.get('style', '')
        m = re.search(r"url\('(.+?)'\)", style)
        if m:
            return m.group(1), 'video'

    # Video src als fallback
    video_el = post.select_one('video.tgme_widget_message_video')
    if video_el and video_el.get('src'):
        return video_el['src'], 'video'

    # Sticker / animatie (voor volledigheid)
    sticker = post.select_one('.tgme_widget_message_sticker_wrap img')
    if sticker and sticker.get('src'):
        return sticker['src'], 'photo'

    return None, None


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

        media_url, media_type = _extract_media(post)
        has_media = media_url is not None

        raw_text = text_el.get_text(separator=' ', strip=True) if text_el else ''

        # Sla berichten over zonder tekst EN zonder media
        if not raw_text and not has_media:
            continue

        # Minimale tekstlengte: 5 tekens met media, 20 zonder
        min_len = 5 if has_media else 20
        if len(raw_text) < min_len:
            # Gebruik mediatype als tekst-placeholder als er geen tekst is
            if has_media:
                raw_text = raw_text or f'[{media_type}]'
            else:
                continue

        messages.append({
            'channel_slug': channel['slug'],
            'channel_side': channel['side'],
            'channel_reliability': channel['reliability'],
            'raw_text': raw_text,
            'lang': channel['lang'],
            'message_date': time_el.get('datetime', '') if time_el else '',
            'url': url_el['href'] if url_el else '',
            'media_url': media_url,
            'media_type': media_type,
        })

    return messages


def collect_all_channels(max_per_channel: int = 25) -> int:
    """Scrape alle kanalen en sla nieuwe berichten op."""
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
