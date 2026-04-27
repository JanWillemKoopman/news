import hashlib
import os
from functools import wraps
from flask import session, jsonify


def hash_password(plain: str) -> str:
    salt = os.urandom(16).hex()
    h = hashlib.pbkdf2_hmac("sha256", plain.encode(), bytes.fromhex(salt), 260000).hex()
    return f"{salt}:{h}"


def check_password(plain: str, stored: str) -> bool:
    try:
        salt, expected = stored.split(":")
        actual = hashlib.pbkdf2_hmac("sha256", plain.encode(), bytes.fromhex(salt), 260000).hex()
        return actual == expected
    except Exception:
        return False


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("user_id"):
            return jsonify({"error": "Niet ingelogd"}), 401
        return f(*args, **kwargs)
    return decorated


def current_user_id() -> str | None:
    return session.get("user_id")
