"""SQLite opslag voor ruwe berichten en geanalyseerde output."""
import sqlite3
import os
import hashlib

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'frontline.db')


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_slug TEXT NOT NULL,
                channel_side TEXT,
                channel_reliability TEXT,
                message_url TEXT UNIQUE,
                content_hash TEXT UNIQUE,
                raw_text TEXT NOT NULL,
                lang TEXT,
                message_date TEXT,
                media_url TEXT,
                media_type TEXT,
                collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS analyzed_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER REFERENCES messages(id),
                translated_text TEXT,
                is_tactical INTEGER DEFAULT 0,
                location TEXT,
                event_type TEXT,
                reliability TEXT,
                propaganda_markers TEXT,
                key_facts TEXT,
                analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS bulletins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT UNIQUE,
                html_content TEXT,
                message_count INTEGER,
                channel_count INTEGER,
                generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(message_date);
            CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_slug);
        """)
        # Migration-safe: voeg kolommen toe als ze nog niet bestaan
        for col, typedef in [('media_url', 'TEXT'), ('media_type', 'TEXT')]:
            try:
                conn.execute(f"ALTER TABLE messages ADD COLUMN {col} {typedef}")
            except Exception:
                pass  # kolom bestaat al


def save_messages(messages: list[dict]) -> int:
    """Sla berichten op, sla duplicaten over. Geeft aantal nieuwe berichten terug."""
    saved = 0
    with get_conn() as conn:
        for msg in messages:
            content_hash = hashlib.sha256(msg['raw_text'].encode()).hexdigest()[:16]
            try:
                conn.execute(
                    """INSERT INTO messages
                       (channel_slug, channel_side, channel_reliability, message_url,
                        content_hash, raw_text, lang, message_date, media_url, media_type)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        msg['channel_slug'],
                        msg.get('channel_side'),
                        msg.get('channel_reliability'),
                        msg.get('url'),
                        content_hash,
                        msg['raw_text'],
                        msg.get('lang'),
                        msg.get('message_date'),
                        msg.get('media_url'),
                        msg.get('media_type'),
                    )
                )
                saved += 1
            except sqlite3.IntegrityError:
                pass  # duplicaat
    return saved


def get_recent_messages(hours: int = 24) -> list[dict]:
    """Haal berichten op van de afgelopen N uur."""
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT m.id, m.channel_slug, m.channel_side, m.channel_reliability,
                      m.raw_text, m.lang, m.message_date, m.message_url,
                      m.media_url, m.media_type
               FROM messages m
               WHERE m.collected_at >= datetime('now', ?)
               ORDER BY m.message_date DESC""",
            (f'-{hours} hours',)
        ).fetchall()
    return [dict(r) for r in rows]


def _to_str(v) -> str | None:
    if v is None:
        return None
    if isinstance(v, (list, dict)):
        import json as _json
        return _json.dumps(v, ensure_ascii=False)
    return str(v)


def save_analyzed(message_id: int, data: dict):
    with get_conn() as conn:
        conn.execute(
            """INSERT OR REPLACE INTO analyzed_messages
               (message_id, translated_text, is_tactical, location, event_type,
                reliability, propaganda_markers, key_facts)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                message_id,
                _to_str(data.get('translated_text')),
                1 if data.get('is_tactical') else 0,
                _to_str(data.get('location')),
                _to_str(data.get('event_type')),
                _to_str(data.get('reliability')),
                _to_str(data.get('propaganda_markers')),
                _to_str(data.get('key_facts')),
            )
        )


def get_tactical_messages(hours: int = 24) -> list[dict]:
    """Haal geanalyseerde tactische berichten op inclusief media."""
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT m.channel_slug, m.channel_side, m.channel_reliability,
                      m.message_date, m.message_url, m.media_url, m.media_type,
                      a.translated_text, a.location, a.event_type,
                      a.reliability, a.propaganda_markers, a.key_facts
               FROM analyzed_messages a
               JOIN messages m ON a.message_id = m.id
               WHERE a.is_tactical = 1
                 AND m.collected_at >= datetime('now', ?)
               ORDER BY m.message_date DESC""",
            (f'-{hours} hours',)
        ).fetchall()
    return [dict(r) for r in rows]


def save_bulletin(date: str, html: str, message_count: int, channel_count: int):
    with get_conn() as conn:
        conn.execute(
            """INSERT OR REPLACE INTO bulletins
               (date, html_content, message_count, channel_count)
               VALUES (?, ?, ?, ?)""",
            (date, html, message_count, channel_count)
        )
