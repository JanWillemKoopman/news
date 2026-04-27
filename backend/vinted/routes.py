import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from flask import (
    Blueprint,
    jsonify,
    request,
    session,
    send_from_directory,
    g,
)

from backend.config import VINTED_UPLOAD_DIR
from backend.vinted.auth import hash_password, check_password, require_auth, current_user_id
from backend.vinted.db import get_db, close_db, init_db
from backend.vinted import listings as listing_mod
from backend.vinted import messages as msg_mod
from backend.vinted import transactions as tx_mod
from backend.vinted import reviews as rev_mod

FRONTEND_DIR = Path(__file__).parent.parent.parent / "vinted"

vinted_bp = Blueprint("vinted", __name__)


# ─── lifecycle ───────────────────────────────────────────────────────────────

@vinted_bp.record_once
def on_register(state):
    init_db()
    state.app.teardown_appcontext(close_db)


# ─── page routes ─────────────────────────────────────────────────────────────

_PAGES = {
    "": "index.html",
    "login": "login.html",
    "register": "register.html",
    "sell": "sell.html",
    "my-listings": "my-listings.html",
    "inbox": "inbox.html",
    "profile": "profile.html",
    "listing": "listing.html",
    "checkout": "checkout.html",
    "edit-listing": "edit-listing.html",
    "thread": "thread.html",
}


@vinted_bp.route("/vinted/", defaults={"path": ""})
@vinted_bp.route("/vinted/<path:path>")
def serve_page(path):
    # strip trailing slashes and ID segments
    base = path.rstrip("/").split("/")[0] if path else ""
    filename = _PAGES.get(base, "index.html")
    return send_from_directory(str(FRONTEND_DIR), filename)


# ─── image serving ────────────────────────────────────────────────────────────

@vinted_bp.route("/api/v/uploads/<folder>/<filename>")
def serve_upload(folder, filename):
    if folder not in ("listings", "avatars"):
        return jsonify({"error": "Niet gevonden"}), 404
    return send_from_directory(str(VINTED_UPLOAD_DIR / folder), filename)


# ─── auth ─────────────────────────────────────────────────────────────────────

def _now():
    return datetime.now(timezone.utc).isoformat()


@vinted_bp.route("/api/v/auth/register", methods=["POST"])
def auth_register():
    db = get_db()
    data = request.get_json(force=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not (3 <= len(username) <= 30):
        return jsonify({"error": "Gebruikersnaam moet 3-30 tekens zijn"}), 422
    if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
        return jsonify({"error": "Ongeldig e-mailadres"}), 422
    if len(password) < 8:
        return jsonify({"error": "Wachtwoord moet minimaal 8 tekens zijn"}), 422

    user_id = uuid.uuid4().hex
    try:
        db.execute(
            "INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?,?,?,?,?)",
            (user_id, username, email, hash_password(password), _now()),
        )
        db.commit()
    except Exception:
        return jsonify({"error": "Gebruikersnaam of e-mail al in gebruik"}), 409

    session.permanent = True
    session["user_id"] = user_id
    session["username"] = username
    return jsonify({"user_id": user_id, "username": username}), 201


@vinted_bp.route("/api/v/auth/login", methods=["POST"])
def auth_login():
    db = get_db()
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    row = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not row or not check_password(password, row["password_hash"]):
        return jsonify({"error": "Onjuist e-mailadres of wachtwoord"}), 401

    session.permanent = True
    session["user_id"] = row["id"]
    session["username"] = row["username"]
    return jsonify({"user_id": row["id"], "username": row["username"]})


@vinted_bp.route("/api/v/auth/logout", methods=["POST"])
def auth_logout():
    session.clear()
    return jsonify({"ok": True})


@vinted_bp.route("/api/v/auth/me")
def auth_me():
    uid = current_user_id()
    if not uid:
        return jsonify({"error": "Niet ingelogd"}), 401
    db = get_db()
    row = db.execute("SELECT id, username, avatar FROM users WHERE id=?", (uid,)).fetchone()
    if not row:
        session.clear()
        return jsonify({"error": "Niet ingelogd"}), 401
    return jsonify(dict(row))


# ─── listings ─────────────────────────────────────────────────────────────────

@vinted_bp.route("/api/v/listings")
def api_listings():
    db = get_db()
    result = listing_mod.search_listings(
        db,
        q=request.args.get("q", ""),
        category=request.args.get("category", ""),
        size=request.args.get("size", ""),
        condition=request.args.get("condition", ""),
        min_price=request.args.get("min_price"),
        max_price=request.args.get("max_price"),
        sort=request.args.get("sort", "newest"),
        offset=int(request.args.get("offset", 0)),
        limit=int(request.args.get("limit", 20)),
    )
    return jsonify(result)


@vinted_bp.route("/api/v/listings", methods=["POST"])
@require_auth
def api_create_listing():
    db = get_db()
    data = request.form
    required = ["title", "price", "category", "condition"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"Veld '{field}' is verplicht"}), 422
    try:
        price = float(data["price"])
        if price < 0:
            raise ValueError
    except ValueError:
        return jsonify({"error": "Ongeldige prijs"}), 422

    image_files = request.files.getlist("images")
    listing = listing_mod.create_listing(db, current_user_id(), data, image_files)
    listing["images"] = json.loads(listing.get("images") or "[]")
    return jsonify({"listing": listing}), 201


@vinted_bp.route("/api/v/listings/<listing_id>")
def api_get_listing(listing_id):
    db = get_db()
    result = listing_mod.get_listing_with_seller(db, listing_id)
    if not result:
        return jsonify({"error": "Niet gevonden"}), 404
    return jsonify({"listing": result})


@vinted_bp.route("/api/v/listings/<listing_id>", methods=["PATCH"])
@require_auth
def api_update_listing(listing_id):
    db = get_db()
    data = request.form or request.get_json(force=True) or {}
    new_images = request.files.getlist("images") if request.files else []
    result = listing_mod.update_listing(db, listing_id, current_user_id(), data, new_images)
    if result is None:
        return jsonify({"error": "Niet gevonden of geen toegang"}), 404
    return jsonify({"listing": result})


@vinted_bp.route("/api/v/listings/<listing_id>", methods=["DELETE"])
@require_auth
def api_delete_listing(listing_id):
    db = get_db()
    ok = listing_mod.soft_delete_listing(db, listing_id, current_user_id())
    if not ok:
        return jsonify({"error": "Niet gevonden of geen toegang"}), 404
    return jsonify({"ok": True})


# ─── users ────────────────────────────────────────────────────────────────────

@vinted_bp.route("/api/v/users/<user_id>")
def api_get_user(user_id):
    db = get_db()
    row = db.execute(
        "SELECT id, username, avatar, bio, location, rating_avg, rating_count, created_at FROM users WHERE id=?",
        (user_id,),
    ).fetchone()
    if not row:
        return jsonify({"error": "Niet gevonden"}), 404

    active = db.execute(
        """SELECT * FROM listings WHERE seller_id=? AND status='active' ORDER BY created_at DESC LIMIT 20""",
        (user_id,),
    ).fetchall()
    listings = []
    for r in active:
        d = dict(r)
        d["images"] = json.loads(d.get("images") or "[]")
        listings.append(d)

    return jsonify({"user": dict(row), "listings": listings})


@vinted_bp.route("/api/v/users/me", methods=["PATCH"])
@require_auth
def api_update_me():
    db = get_db()
    uid = current_user_id()
    data = request.form or request.get_json(force=True) or {}

    avatar_file = request.files.get("avatar")
    avatar_filename = None
    if avatar_file and avatar_file.filename:
        from backend.vinted.uploads import save_image
        avatar_filename = save_image(avatar_file, "avatars")

    current = db.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    fields = {
        "username": data.get("username", current["username"]).strip(),
        "bio": data.get("bio", current["bio"] or ""),
        "location": data.get("location", current["location"] or ""),
        "avatar": avatar_filename or current["avatar"],
    }
    if not (3 <= len(fields["username"]) <= 30):
        return jsonify({"error": "Gebruikersnaam moet 3-30 tekens zijn"}), 422

    try:
        db.execute(
            "UPDATE users SET username=?, bio=?, location=?, avatar=? WHERE id=?",
            (*fields.values(), uid),
        )
        db.commit()
    except Exception:
        return jsonify({"error": "Gebruikersnaam al in gebruik"}), 409

    session["username"] = fields["username"]
    row = db.execute(
        "SELECT id, username, avatar, bio, location, rating_avg, rating_count, created_at FROM users WHERE id=?",
        (uid,),
    ).fetchone()
    return jsonify({"user": dict(row)})


@vinted_bp.route("/api/v/users/<user_id>/reviews")
def api_user_reviews(user_id):
    db = get_db()
    return jsonify({"reviews": rev_mod.get_reviews_for_user(db, user_id)})


# ─── messages ─────────────────────────────────────────────────────────────────

@vinted_bp.route("/api/v/messages")
@require_auth
def api_inbox():
    db = get_db()
    return jsonify({"threads": msg_mod.get_threads(db, current_user_id())})


@vinted_bp.route("/api/v/messages/<listing_id>/<other_id>")
@require_auth
def api_get_thread(listing_id, other_id):
    db = get_db()
    uid = current_user_id()
    msgs = msg_mod.get_thread(db, listing_id, uid, other_id)
    msg_mod.mark_read(db, listing_id, uid, other_id)
    listing_row = db.execute("SELECT id, title, images, status FROM listings WHERE id=?", (listing_id,)).fetchone()
    listing = dict(listing_row) if listing_row else {}
    if listing:
        listing["images"] = json.loads(listing.get("images") or "[]")
    other_row = db.execute("SELECT id, username, avatar FROM users WHERE id=?", (other_id,)).fetchone()
    return jsonify({
        "messages": msgs,
        "listing": listing,
        "other_user": dict(other_row) if other_row else {},
    })


@vinted_bp.route("/api/v/messages/<listing_id>/<other_id>", methods=["POST"])
@require_auth
def api_send_message(listing_id, other_id):
    db = get_db()
    uid = current_user_id()
    data = request.get_json(force=True) or {}
    body = (data.get("body") or "").strip()
    if not body:
        return jsonify({"error": "Bericht mag niet leeg zijn"}), 422
    msg = msg_mod.send_message(db, listing_id, uid, other_id, body)
    return jsonify({"message": msg}), 201


@vinted_bp.route("/api/v/messages/<listing_id>/<other_id>/read", methods=["POST"])
@require_auth
def api_mark_read(listing_id, other_id):
    db = get_db()
    msg_mod.mark_read(db, listing_id, current_user_id(), other_id)
    return jsonify({"ok": True})


# ─── transactions ─────────────────────────────────────────────────────────────

@vinted_bp.route("/api/v/transactions", methods=["POST"])
@require_auth
def api_create_transaction():
    db = get_db()
    uid = current_user_id()
    data = request.get_json(force=True) or {}
    listing_id = data.get("listing_id", "")
    shipping_name = (data.get("shipping_name") or "").strip()
    shipping_address = (data.get("shipping_address") or "").strip()

    if not listing_id or not shipping_name or not shipping_address:
        return jsonify({"error": "Vul alle velden in"}), 422

    listing = db.execute("SELECT * FROM listings WHERE id=?", (listing_id,)).fetchone()
    if not listing:
        return jsonify({"error": "Artikel niet gevonden"}), 404
    if listing["seller_id"] == uid:
        return jsonify({"error": "Je kunt je eigen artikel niet kopen"}), 422

    tx = tx_mod.create_transaction(db, listing_id, uid, shipping_name, shipping_address)
    if tx is None:
        return jsonify({"error": "Dit artikel is al verkocht"}), 409
    return jsonify({"transaction": tx}), 201


@vinted_bp.route("/api/v/transactions/<tx_id>")
@require_auth
def api_get_transaction(tx_id):
    db = get_db()
    uid = current_user_id()
    tx = tx_mod.get_transaction(db, tx_id)
    if not tx or (tx["buyer_id"] != uid and tx["seller_id"] != uid):
        return jsonify({"error": "Niet gevonden"}), 404
    return jsonify({"transaction": tx})


# ─── reviews ──────────────────────────────────────────────────────────────────

@vinted_bp.route("/api/v/reviews", methods=["POST"])
@require_auth
def api_create_review():
    db = get_db()
    data = request.get_json(force=True) or {}
    tx_id = data.get("transaction_id", "")
    rating = data.get("rating")
    comment = (data.get("comment") or "").strip()

    try:
        rating = int(rating)
        if not (1 <= rating <= 5):
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "Beoordeling moet tussen 1 en 5 zijn"}), 422

    review = rev_mod.create_review(db, current_user_id(), tx_id, rating, comment)
    if review is None:
        return jsonify({"error": "Beoordeling niet mogelijk of al gegeven"}), 422
    return jsonify({"review": review}), 201
