import logging
import threading
from datetime import timedelta
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory, session
from flask_cors import CORS
from backend.storage import get_summaries
from backend.config import PAGE_SIZE, TRIGGER_SECRET, SECRET_KEY
from backend.database import (
    create_user,
    verify_user,
    get_user_by_id,
    get_security_question,
    reset_password,
    mark_wonder_seen,
    get_seen_wonders,
    reset_seen_wonders,
    add_quiz_completion,
    get_progress,
)

logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).parent.parent  # project root: index.html, style.css, app.js

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")
app.secret_key = SECRET_KEY
app.permanent_session_lifetime = timedelta(days=30)
CORS(app, supports_credentials=True)


def _current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    return get_user_by_id(user_id)


# ── Static routes ──────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(str(STATIC_DIR), "index.html")


# ── News API ───────────────────────────────────────────────────────────────────

@app.route("/api/summaries")
def api_summaries():
    offset = request.args.get("offset", 0, type=int)
    limit = request.args.get("limit", PAGE_SIZE, type=int)
    return jsonify(get_summaries(offset=offset, limit=limit))


@app.route("/api/trigger", methods=["POST"])
def api_trigger():
    """Start handmatig een nieuwsupdate. Vereist TRIGGER_SECRET header."""
    if TRIGGER_SECRET:
        token = request.headers.get("X-Trigger-Secret", "")
        if token != TRIGGER_SECRET:
            return jsonify({"error": "Niet geautoriseerd"}), 401

    from backend.scheduler import run_weekly_update

    def _run():
        try:
            run_weekly_update()
        except Exception as e:
            logger.error(f"Handmatige update mislukt: {e}")

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
    return jsonify({"status": "gestart", "message": "Nieuwsupdate gestart op de achtergrond."})


@app.route("/api/status")
def api_status():
    result = get_summaries(offset=0, limit=1)
    return jsonify({
        "status": "ok",
        "total_samenvattingen": result["total"],
        "laatste": result["summaries"][0] if result["summaries"] else None,
    })


# ── Auth API ───────────────────────────────────────────────────────────────────

@app.route("/api/auth/register", methods=["POST"])
def api_register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"error": "Gebruikersnaam en wachtwoord zijn verplicht"}), 400
    if len(username) < 2 or len(username) > 30:
        return jsonify({"error": "Gebruikersnaam moet 2–30 tekens zijn"}), 400
    if len(password) < 6:
        return jsonify({"error": "Wachtwoord moet minimaal 6 tekens zijn"}), 400

    security_question = (data.get("security_question") or "").strip()
    security_answer   = (data.get("security_answer")   or "").strip()
    if not security_question or not security_answer:
        return jsonify({"error": "Veiligheidsvraag en antwoord zijn verplicht"}), 400

    user = create_user(username, password, security_question, security_answer)
    if user is None:
        return jsonify({"error": "Gebruikersnaam is al in gebruik"}), 409

    session.permanent = True
    session["user_id"] = user["id"]
    return jsonify({"id": user["id"], "username": user["username"]}), 201


@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    user = verify_user(username, password)
    if user is None:
        return jsonify({"error": "Onjuiste gebruikersnaam of wachtwoord"}), 401

    session.permanent = True
    session["user_id"] = user["id"]
    return jsonify({"id": user["id"], "username": user["username"]})


@app.route("/api/auth/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"status": "uitgelogd"})


@app.route("/api/auth/security-question")
def api_security_question():
    username = request.args.get("username", "").strip()
    if not username:
        return jsonify({"error": "Gebruikersnaam ontbreekt"}), 400
    question = get_security_question(username)
    if question is None:
        return jsonify({"error": "Gebruiker niet gevonden of geen veiligheidsvraag ingesteld"}), 404
    return jsonify({"question": question})


@app.route("/api/auth/reset-password", methods=["POST"])
def api_reset_password():
    data = request.get_json(silent=True) or {}
    username        = (data.get("username")        or "").strip()
    security_answer = (data.get("security_answer") or "").strip()
    new_password    = (data.get("new_password")    or "")
    if not username or not security_answer or not new_password:
        return jsonify({"error": "Alle velden zijn verplicht"}), 400
    if len(new_password) < 6:
        return jsonify({"error": "Wachtwoord moet minimaal 6 tekens zijn"}), 400
    if not reset_password(username, security_answer, new_password):
        return jsonify({"error": "Antwoord onjuist"}), 401
    return jsonify({"status": "wachtwoord opnieuw ingesteld"})


@app.route("/api/auth/me")
def api_me():
    user = _current_user()
    if not user:
        return jsonify({"error": "Niet ingelogd"}), 401
    progress = get_progress(user["id"])
    return jsonify({
        "id": user["id"],
        "username": user["username"],
        "wonder_count": progress["wonder_count"],
        "quiz_count": progress["quiz_count"],
        "seen_titles": progress["seen_titles"],
    })


# ── Progress API ───────────────────────────────────────────────────────────────

@app.route("/api/progress/wonder", methods=["POST"])
def api_mark_wonder():
    user = _current_user()
    if not user:
        return jsonify({"error": "Niet ingelogd"}), 401

    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Titel ontbreekt"}), 400

    mark_wonder_seen(user["id"], title)
    progress = get_progress(user["id"])
    return jsonify({
        "wonder_count": progress["wonder_count"],
        "quiz_count": progress["quiz_count"],
        "seen_titles": progress["seen_titles"],
    })


@app.route("/api/progress/wonder/reset", methods=["POST"])
def api_reset_wonders():
    user = _current_user()
    if not user:
        return jsonify({"error": "Niet ingelogd"}), 401

    reset_seen_wonders(user["id"])
    return jsonify({"status": "gereset"})


@app.route("/api/progress/quiz", methods=["POST"])
def api_complete_quiz():
    user = _current_user()
    if not user:
        return jsonify({"error": "Niet ingelogd"}), 401

    data = request.get_json(silent=True) or {}
    score = data.get("score", 0)
    if not isinstance(score, int):
        score = 0

    add_quiz_completion(user["id"], score)
    progress = get_progress(user["id"])
    return jsonify({
        "wonder_count": progress["wonder_count"],
        "quiz_count": progress["quiz_count"],
    })
