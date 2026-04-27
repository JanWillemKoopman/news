import uuid
from datetime import datetime, timezone


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_threads(db, user_id: str) -> list:
    rows = db.execute(
        """SELECT
               m.listing_id,
               CASE WHEN m.sender_id=? THEN m.recipient_id ELSE m.sender_id END AS other_id,
               u.username AS other_username,
               u.avatar AS other_avatar,
               l.title AS listing_title,
               l.images AS listing_images,
               l.status AS listing_status,
               MAX(m.created_at) AS last_at,
               m.body AS last_body,
               SUM(CASE WHEN m.recipient_id=? AND m.read=0 THEN 1 ELSE 0 END) AS unread_count
           FROM messages m
           JOIN users u ON u.id = CASE WHEN m.sender_id=? THEN m.recipient_id ELSE m.sender_id END
           JOIN listings l ON l.id = m.listing_id
           WHERE m.sender_id=? OR m.recipient_id=?
           GROUP BY m.listing_id, other_id
           ORDER BY last_at DESC""",
        (user_id, user_id, user_id, user_id, user_id),
    ).fetchall()
    return [dict(r) for r in rows]


def get_thread(db, listing_id: str, user_id: str, other_id: str) -> list:
    rows = db.execute(
        """SELECT m.*, u.username AS sender_username, u.avatar AS sender_avatar
           FROM messages m JOIN users u ON u.id = m.sender_id
           WHERE m.listing_id=?
             AND ((m.sender_id=? AND m.recipient_id=?) OR (m.sender_id=? AND m.recipient_id=?))
           ORDER BY m.created_at ASC""",
        (listing_id, user_id, other_id, other_id, user_id),
    ).fetchall()
    return [dict(r) for r in rows]


def send_message(db, listing_id: str, sender_id: str, recipient_id: str, body: str) -> dict:
    msg_id = uuid.uuid4().hex
    ts = now_iso()
    db.execute(
        "INSERT INTO messages (id, listing_id, sender_id, recipient_id, body, created_at, read) VALUES (?,?,?,?,?,?,0)",
        (msg_id, listing_id, sender_id, recipient_id, body, ts),
    )
    db.commit()
    row = db.execute(
        """SELECT m.*, u.username AS sender_username, u.avatar AS sender_avatar
           FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id=?""",
        (msg_id,),
    ).fetchone()
    return dict(row)


def mark_read(db, listing_id: str, reader_id: str, other_id: str):
    db.execute(
        "UPDATE messages SET read=1 WHERE listing_id=? AND sender_id=? AND recipient_id=?",
        (listing_id, other_id, reader_id),
    )
    db.commit()
