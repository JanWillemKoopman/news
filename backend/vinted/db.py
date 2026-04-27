import sqlite3
from flask import g
from backend.config import VINTED_DB

DDL = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar TEXT,
    bio TEXT,
    location TEXT,
    rating_avg REAL DEFAULT 0.0,
    rating_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    seller_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    size TEXT,
    condition TEXT NOT NULL,
    brand TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    images TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL REFERENCES listings(id),
    sender_id TEXT NOT NULL REFERENCES users(id),
    recipient_id TEXT NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL REFERENCES listings(id),
    buyer_id TEXT NOT NULL REFERENCES users(id),
    seller_id TEXT NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    shipping_name TEXT,
    shipping_address TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    reviewer_id TEXT NOT NULL REFERENCES users(id),
    reviewee_id TEXT NOT NULL REFERENCES users(id),
    transaction_id TEXT NOT NULL REFERENCES transactions(id),
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(reviewer_id, transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_messages_listing ON messages(listing_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_listing ON transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
"""


def get_db():
    if "vinted_db" not in g:
        conn = sqlite3.connect(str(VINTED_DB))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        g.vinted_db = conn
    return g.vinted_db


def close_db(e=None):
    db = g.pop("vinted_db", None)
    if db is not None:
        db.close()


def init_db():
    VINTED_DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(VINTED_DB))
    conn.executescript(DDL)
    conn.commit()
    conn.close()
