import json
import uuid
from datetime import datetime
from backend.config import SUMMARIES_FILE, PAGE_SIZE


def _load() -> dict:
    if not SUMMARIES_FILE.exists():
        SUMMARIES_FILE.parent.mkdir(parents=True, exist_ok=True)
        return {"summaries": []}
    with open(SUMMARIES_FILE, encoding="utf-8") as f:
        return json.load(f)


def _save(data: dict) -> None:
    SUMMARIES_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SUMMARIES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)


def save_summary(
    title: str,
    summary: str,
    week_start: str,
    week_end: str,
    sources: list,
) -> dict:
    data = _load()
    entry = {
        "id": str(uuid.uuid4()),
        "title": title,
        "summary": summary,
        "week_start": week_start,
        "week_end": week_end,
        "published_at": datetime.now().isoformat(),
        "sources": sources,
    }
    data["summaries"].insert(0, entry)
    _save(data)
    return entry


def get_summaries(offset: int = 0, limit: int = PAGE_SIZE) -> dict:
    data = _load()
    summaries = data["summaries"]
    total = len(summaries)
    page = summaries[offset : offset + limit]
    return {
        "summaries": page,
        "total": total,
        "offset": offset,
        "limit": limit,
        "has_more": offset + limit < total,
    }
