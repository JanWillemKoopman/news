import logging
import threading
from datetime import timedelta
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from backend.storage import get_summaries
from backend.config import PAGE_SIZE, TRIGGER_SECRET, SECRET_KEY
from backend.vinted.routes import vinted_bp

logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).parent.parent  # project root: index.html, style.css, app.js

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")
app.secret_key = SECRET_KEY
app.permanent_session_lifetime = timedelta(days=7)
CORS(app, supports_credentials=True)
app.register_blueprint(vinted_bp)


@app.route("/")
def index():
    return send_from_directory(str(STATIC_DIR), "index.html")


@app.route("/api/summaries")
def api_summaries():
    offset = request.args.get("offset", 0, type=int)
    limit = request.args.get("limit", PAGE_SIZE, type=int)
    return jsonify(get_summaries(offset=offset, limit=limit))


@app.route("/api/trigger", methods=["POST"])
def api_trigger():
    """Start handmatig een nieuwsupdate (voor testen). Vereist TRIGGER_SECRET header."""
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
