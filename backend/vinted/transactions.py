import uuid
from datetime import datetime, timezone


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_transaction(db, listing_id: str, buyer_id: str, shipping_name: str, shipping_address: str) -> dict | None:
    # Atomic: only succeed if listing is still active
    cur = db.execute(
        "UPDATE listings SET status='sold', updated_at=? WHERE id=? AND status='active'",
        (now_iso(), listing_id),
    )
    if cur.rowcount == 0:
        return None  # already sold or doesn't exist

    listing = db.execute("SELECT * FROM listings WHERE id=?", (listing_id,)).fetchone()
    tx_id = uuid.uuid4().hex
    ts = now_iso()
    db.execute(
        """INSERT INTO transactions
           (id, listing_id, buyer_id, seller_id, amount, shipping_name, shipping_address, status, created_at)
           VALUES (?,?,?,?,?,?,?,'completed',?)""",
        (tx_id, listing_id, buyer_id, listing["seller_id"], listing["price"],
         shipping_name, shipping_address, ts),
    )
    db.commit()
    return get_transaction(db, tx_id)


def get_transaction(db, tx_id: str) -> dict | None:
    row = db.execute(
        """SELECT t.*,
               l.title AS listing_title, l.images AS listing_images,
               b.username AS buyer_username, s.username AS seller_username
           FROM transactions t
           JOIN listings l ON l.id = t.listing_id
           JOIN users b ON b.id = t.buyer_id
           JOIN users s ON s.id = t.seller_id
           WHERE t.id=?""",
        (tx_id,),
    ).fetchone()
    return dict(row) if row else None
