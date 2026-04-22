"""
Deduplicatie via URL-hash (primair) en keyword Jaccard (secundair).
seen_items.json roteert automatisch na 60 dagen.
"""
import hashlib
import json
import logging
import re
from datetime import datetime, timedelta

from backend.psv.config import SEEN_ITEMS_FILE

logger = logging.getLogger(__name__)

_STOPWORDS = {
    "het", "een", "van", "de", "en", "in", "is", "op", "dat", "met",
    "zijn", "voor", "niet", "maar", "ook", "als", "was", "aan", "bij",
    "meer", "dit", "uit", "over", "naar", "wel", "bij", "kan", "nog",
    "dan", "die", "der", "het", "ter", "psv",
}


def _normalize_keywords(text: str) -> set:
    tokens = re.findall(r"[a-záéíóúàèìòùäëïöü]{3,}", text.lower())
    return {t for t in tokens if t not in _STOPWORDS}


def _jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _url_hash(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()


def _load() -> dict:
    if not SEEN_ITEMS_FILE.exists():
        return {"items": []}
    with open(SEEN_ITEMS_FILE, encoding="utf-8") as f:
        return json.load(f)


def _save(data: dict) -> None:
    SEEN_ITEMS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SEEN_ITEMS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def is_seen(item: dict) -> bool:
    data = _load()
    url_hash = _url_hash(item.get("bron_url", ""))
    item_kw = _normalize_keywords(
        item.get("titel", "") + " " + item.get("samenvatting", "")
    )

    for seen in data["items"]:
        if seen["url_hash"] == url_hash:
            return True
        if _jaccard(item_kw, set(seen.get("keywords", []))) >= 0.6:
            return True
    return False


def mark_seen(items: list) -> None:
    data = _load()
    cutoff = (datetime.now() - timedelta(days=60)).strftime("%Y-%m-%d")

    # Roteer oude entries
    data["items"] = [i for i in data["items"] if i.get("seen_at", "9999") >= cutoff]

    today = datetime.now().strftime("%Y-%m-%d")
    for item in items:
        url = item.get("bron_url", "")
        kw = list(
            _normalize_keywords(
                item.get("titel", "") + " " + item.get("samenvatting", "")
            )
        )
        data["items"].append({
            "url_hash": _url_hash(url),
            "keywords": kw,
            "seen_at": today,
        })

    _save(data)
    logger.info(f"Dedup bijgewerkt: {len(items)} items gemarkeerd als gezien")
