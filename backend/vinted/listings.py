import json
import uuid
from datetime import datetime, timezone


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def row_to_listing(row) -> dict:
    d = dict(row)
    d["images"] = json.loads(d.get("images") or "[]")
    return d


def row_to_user(row) -> dict:
    d = dict(row)
    d.pop("password_hash", None)
    return d


def create_listing(db, seller_id: str, data: dict, image_files) -> dict:
    from backend.vinted.uploads import save_image

    images = []
    for f in image_files[:5]:
        if f and f.filename:
            images.append(save_image(f, "listings"))

    listing_id = uuid.uuid4().hex
    ts = now_iso()
    db.execute(
        """INSERT INTO listings
           (id, seller_id, title, description, price, category, size, condition,
            brand, status, images, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,'active',?,?,?)""",
        (
            listing_id,
            seller_id,
            data["title"],
            data.get("description", ""),
            float(data["price"]),
            data["category"],
            data.get("size", ""),
            data["condition"],
            data.get("brand", ""),
            json.dumps(images),
            ts,
            ts,
        ),
    )
    db.commit()
    return dict(db.execute("SELECT * FROM listings WHERE id=?", (listing_id,)).fetchone())


def get_listing_with_seller(db, listing_id: str) -> dict | None:
    row = db.execute(
        """SELECT l.*, u.username, u.avatar, u.rating_avg, u.rating_count, u.location
           FROM listings l JOIN users u ON l.seller_id = u.id
           WHERE l.id=?""",
        (listing_id,),
    ).fetchone()
    if not row:
        return None
    d = dict(row)
    d["images"] = json.loads(d.get("images") or "[]")
    return d


def search_listings(db, q="", category="", size="", condition="", min_price=None,
                    max_price=None, sort="newest", offset=0, limit=20) -> dict:
    clauses = ["l.status = 'active'"]
    params = []

    if q:
        clauses.append("(l.title LIKE ? OR l.description LIKE ? OR l.brand LIKE ?)")
        like = f"%{q}%"
        params += [like, like, like]
    if category:
        clauses.append("l.category = ?")
        params.append(category)
    if size:
        clauses.append("l.size = ?")
        params.append(size)
    if condition:
        clauses.append("l.condition = ?")
        params.append(condition)
    if min_price is not None:
        clauses.append("l.price >= ?")
        params.append(float(min_price))
    if max_price is not None:
        clauses.append("l.price <= ?")
        params.append(float(max_price))

    where = " AND ".join(clauses)
    order = {
        "newest": "l.created_at DESC",
        "price_asc": "l.price ASC",
        "price_desc": "l.price DESC",
    }.get(sort, "l.created_at DESC")

    total = db.execute(
        f"SELECT COUNT(*) FROM listings l WHERE {where}", params
    ).fetchone()[0]

    rows = db.execute(
        f"""SELECT l.*, u.username, u.avatar
            FROM listings l JOIN users u ON l.seller_id = u.id
            WHERE {where} ORDER BY {order} LIMIT ? OFFSET ?""",
        params + [limit, offset],
    ).fetchall()

    listings = []
    for row in rows:
        d = dict(row)
        d["images"] = json.loads(d.get("images") or "[]")
        listings.append(d)

    return {"listings": listings, "total": total, "has_more": offset + limit < total}


def update_listing(db, listing_id: str, seller_id: str, data: dict, new_images) -> dict | None:
    from backend.vinted.uploads import save_image

    row = db.execute("SELECT * FROM listings WHERE id=? AND seller_id=?", (listing_id, seller_id)).fetchone()
    if not row:
        return None

    current = dict(row)
    images = json.loads(current.get("images") or "[]")

    for f in (new_images or [])[:5]:
        if f and f.filename:
            images.append(save_image(f, "listings"))
    images = images[:5]

    fields = {
        "title": data.get("title", current["title"]),
        "description": data.get("description", current["description"]),
        "price": float(data.get("price", current["price"])),
        "category": data.get("category", current["category"]),
        "size": data.get("size", current["size"]),
        "condition": data.get("condition", current["condition"]),
        "brand": data.get("brand", current["brand"]),
        "images": json.dumps(images),
        "updated_at": now_iso(),
    }

    db.execute(
        """UPDATE listings SET title=?, description=?, price=?, category=?, size=?,
           condition=?, brand=?, images=?, updated_at=? WHERE id=?""",
        (*fields.values(), listing_id),
    )
    db.commit()
    return row_to_listing(db.execute("SELECT * FROM listings WHERE id=?", (listing_id,)).fetchone())


def soft_delete_listing(db, listing_id: str, seller_id: str) -> bool:
    cur = db.execute(
        "UPDATE listings SET status='removed', updated_at=? WHERE id=? AND seller_id=? AND status='active'",
        (now_iso(), listing_id, seller_id),
    )
    db.commit()
    return cur.rowcount == 1
