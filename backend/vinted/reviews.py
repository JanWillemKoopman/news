import uuid
from datetime import datetime, timezone


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_review(db, reviewer_id: str, transaction_id: str, rating: int, comment: str) -> dict | None:
    tx = db.execute(
        "SELECT * FROM transactions WHERE id=? AND (buyer_id=? OR seller_id=?)",
        (transaction_id, reviewer_id, reviewer_id),
    ).fetchone()
    if not tx:
        return None

    reviewee_id = tx["seller_id"] if tx["buyer_id"] == reviewer_id else tx["buyer_id"]
    review_id = uuid.uuid4().hex
    ts = now_iso()
    try:
        db.execute(
            """INSERT INTO reviews (id, reviewer_id, reviewee_id, transaction_id, rating, comment, created_at)
               VALUES (?,?,?,?,?,?,?)""",
            (review_id, reviewer_id, reviewee_id, transaction_id, rating, comment, ts),
        )
    except Exception:
        return None  # UNIQUE constraint: already reviewed

    # Recalculate rating_avg and rating_count for reviewee
    db.execute(
        """UPDATE users SET
               rating_avg = (SELECT AVG(rating) FROM reviews WHERE reviewee_id=?),
               rating_count = (SELECT COUNT(*) FROM reviews WHERE reviewee_id=?)
           WHERE id=?""",
        (reviewee_id, reviewee_id, reviewee_id),
    )
    db.commit()

    row = db.execute(
        """SELECT r.*, u.username AS reviewer_username, u.avatar AS reviewer_avatar
           FROM reviews r JOIN users u ON u.id = r.reviewer_id WHERE r.id=?""",
        (review_id,),
    ).fetchone()
    return dict(row)


def get_reviews_for_user(db, user_id: str) -> list:
    rows = db.execute(
        """SELECT r.*, u.username AS reviewer_username, u.avatar AS reviewer_avatar
           FROM reviews r JOIN users u ON u.id = r.reviewer_id
           WHERE r.reviewee_id=? ORDER BY r.created_at DESC""",
        (user_id,),
    ).fetchall()
    return [dict(r) for r in rows]
