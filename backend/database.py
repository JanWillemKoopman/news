import hashlib
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone

from backend.config import DB_PATH


def init_db():
    with _connect() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS seen_wonders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                wonder_title TEXT NOT NULL,
                seen_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, wonder_title)
            );

            CREATE TABLE IF NOT EXISTS quiz_completions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                score INTEGER NOT NULL,
                completed_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        """)


@contextmanager
def _connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def _hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 260_000
    ).hex()


def create_user(username: str, password: str) -> dict | None:
    salt = secrets.token_hex(32)
    password_hash = _hash_password(password, salt)
    now = datetime.now(timezone.utc).isoformat()
    try:
        with _connect() as conn:
            cursor = conn.execute(
                "INSERT INTO users (username, password_hash, salt, created_at) VALUES (?, ?, ?, ?)",
                (username, password_hash, salt, now),
            )
            return {"id": cursor.lastrowid, "username": username}
    except sqlite3.IntegrityError:
        return None


def verify_user(username: str, password: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            "SELECT id, username, password_hash, salt FROM users WHERE username = ?",
            (username,),
        ).fetchone()
    if not row:
        return None
    expected = _hash_password(password, row["salt"])
    if not secrets.compare_digest(expected, row["password_hash"]):
        return None
    return {"id": row["id"], "username": row["username"]}


def get_user_by_id(user_id: int) -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            "SELECT id, username FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    if not row:
        return None
    return {"id": row["id"], "username": row["username"]}


def mark_wonder_seen(user_id: int, wonder_title: str):
    now = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO seen_wonders (user_id, wonder_title, seen_at) VALUES (?, ?, ?)",
            (user_id, wonder_title, now),
        )


def get_seen_wonders(user_id: int) -> list[str]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT wonder_title FROM seen_wonders WHERE user_id = ?", (user_id,)
        ).fetchall()
    return [r["wonder_title"] for r in rows]


def reset_seen_wonders(user_id: int):
    with _connect() as conn:
        conn.execute("DELETE FROM seen_wonders WHERE user_id = ?", (user_id,))


def add_quiz_completion(user_id: int, score: int):
    now = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        conn.execute(
            "INSERT INTO quiz_completions (user_id, score, completed_at) VALUES (?, ?, ?)",
            (user_id, score, now),
        )


def get_progress(user_id: int) -> dict:
    with _connect() as conn:
        wonder_count = conn.execute(
            "SELECT COUNT(*) FROM seen_wonders WHERE user_id = ?", (user_id,)
        ).fetchone()[0]
        quiz_count = conn.execute(
            "SELECT COUNT(*) FROM quiz_completions WHERE user_id = ?", (user_id,)
        ).fetchone()[0]
        seen_titles = [
            r["wonder_title"]
            for r in conn.execute(
                "SELECT wonder_title FROM seen_wonders WHERE user_id = ?", (user_id,)
            ).fetchall()
        ]
    return {
        "wonder_count": wonder_count,
        "quiz_count": quiz_count,
        "seen_titles": seen_titles,
    }
