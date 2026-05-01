import hashlib
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone, date, timedelta

from backend.config import DB_PATH


def init_db():
    with _connect() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TEXT NOT NULL,
                security_question TEXT NOT NULL DEFAULT '',
                security_answer_hash TEXT NOT NULL DEFAULT '',
                security_answer_salt TEXT NOT NULL DEFAULT ''
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
        # Migrate existing databases
        for col, definition in [
            ("security_question",    "TEXT NOT NULL DEFAULT ''"),
            ("security_answer_hash", "TEXT NOT NULL DEFAULT ''"),
            ("security_answer_salt", "TEXT NOT NULL DEFAULT ''"),
            ("streak",               "INTEGER NOT NULL DEFAULT 0"),
            ("last_activity_date",   "TEXT NOT NULL DEFAULT ''"),
            ("total_points",         "INTEGER NOT NULL DEFAULT 0"),
        ]:
            try:
                conn.execute(f"ALTER TABLE users ADD COLUMN {col} {definition}")
            except sqlite3.OperationalError:
                pass  # column already exists


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


def create_user(username: str, password: str, security_question: str, security_answer: str) -> dict | None:
    salt = secrets.token_hex(32)
    password_hash = _hash_password(password, salt)
    ans_salt = secrets.token_hex(32)
    ans_hash = _hash_password(security_answer.strip().lower(), ans_salt)
    now = datetime.now(timezone.utc).isoformat()
    try:
        with _connect() as conn:
            cursor = conn.execute(
                "INSERT INTO users (username, password_hash, salt, created_at, security_question, security_answer_hash, security_answer_salt) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (username, password_hash, salt, now, security_question, ans_hash, ans_salt),
            )
            return {"id": cursor.lastrowid, "username": username}
    except sqlite3.IntegrityError:
        return None


def get_security_question(username: str) -> str | None:
    with _connect() as conn:
        row = conn.execute(
            "SELECT security_question FROM users WHERE username = ?", (username,)
        ).fetchone()
    if not row or not row["security_question"]:
        return None
    return row["security_question"]


def reset_password(username: str, security_answer: str, new_password: str) -> bool:
    with _connect() as conn:
        row = conn.execute(
            "SELECT id, security_answer_hash, security_answer_salt FROM users WHERE username = ?",
            (username,),
        ).fetchone()
        if not row:
            return False
        expected = _hash_password(security_answer.strip().lower(), row["security_answer_salt"])
        if not secrets.compare_digest(expected, row["security_answer_hash"]):
            return False
        new_salt = secrets.token_hex(32)
        new_hash = _hash_password(new_password, new_salt)
        conn.execute(
            "UPDATE users SET password_hash = ?, salt = ? WHERE id = ?",
            (new_hash, new_salt, row["id"]),
        )
    return True


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


def update_streak(user_id: int, conn) -> int:
    today = date.today().isoformat()
    row = conn.execute(
        "SELECT streak, last_activity_date FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    last = row["last_activity_date"] if row else ""
    streak = row["streak"] if row else 0

    if last == today:
        return streak  # already counted today

    yesterday = (date.today() - timedelta(days=1)).isoformat()
    if last == yesterday:
        streak += 1
    else:
        streak = 1  # missed a day or first time

    conn.execute(
        "UPDATE users SET streak = ?, last_activity_date = ? WHERE id = ?",
        (streak, today, user_id),
    )
    return streak


def mark_wonder_seen(user_id: int, wonder_title: str) -> int:
    now = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO seen_wonders (user_id, wonder_title, seen_at) VALUES (?, ?, ?)",
            (user_id, wonder_title, now),
        )
        return update_streak(user_id, conn)


def get_seen_wonders(user_id: int) -> list[str]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT wonder_title FROM seen_wonders WHERE user_id = ?", (user_id,)
        ).fetchall()
    return [r["wonder_title"] for r in rows]


def reset_seen_wonders(user_id: int):
    with _connect() as conn:
        conn.execute("DELETE FROM seen_wonders WHERE user_id = ?", (user_id,))


def add_quiz_completion(user_id: int, score: int, points: int = 0):
    now = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        conn.execute(
            "INSERT INTO quiz_completions (user_id, score, completed_at) VALUES (?, ?, ?)",
            (user_id, score, now),
        )
        if points > 0:
            conn.execute(
                "UPDATE users SET total_points = total_points + ? WHERE id = ?",
                (points, user_id),
            )


def get_progress(user_id: int) -> dict:
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()
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
        user_row = conn.execute(
            "SELECT streak, total_points FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        streak = user_row["streak"] if user_row else 0
        total_points = user_row["total_points"] if user_row else 0
        daily_count = conn.execute(
            "SELECT COUNT(*) FROM seen_wonders WHERE user_id = ? AND seen_at >= ?",
            (user_id, today_start),
        ).fetchone()[0]
    return {
        "wonder_count": wonder_count,
        "quiz_count": quiz_count,
        "seen_titles": seen_titles,
        "streak": streak,
        "total_points": total_points,
        "daily_count": daily_count,
    }
