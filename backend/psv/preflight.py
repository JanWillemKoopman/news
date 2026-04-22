import logging
import os
from datetime import datetime

from backend.psv import config

logger = logging.getLogger(__name__)


def run() -> dict:
    errors = []

    if not config.GEMINI_API_KEY:
        errors.append("GEMINI_API_KEY ontbreekt in omgevingsvariabelen")

    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not os.access(config.DATA_DIR, os.W_OK):
        errors.append(f"Data-map niet schrijfbaar: {config.DATA_DIR}")

    run_dir = config.RUNS_DIR / datetime.now().strftime("%Y-%m-%d")
    run_dir.mkdir(parents=True, exist_ok=True)
    if not os.access(run_dir, os.W_OK):
        errors.append(f"Runs-map niet schrijfbaar: {run_dir}")

    if errors:
        for e in errors:
            logger.error(f"Preflight: {e}")
        raise SystemExit(f"Preflight gefaald: {'; '.join(errors)}")

    run_config = {
        "scout_model":       config.SCOUT_MODEL,
        "researcher_model":  config.RESEARCHER_MODEL,
        "deep_reader_model": config.DEEP_READER_MODEL,
        "editor_model":      config.EDITOR_MODEL,
        "writer_model":      config.WRITER_MODEL,
        "reviewer_model":    config.REVIEWER_MODEL,
        "run_dir":           str(run_dir),
        "summaries_file":    str(config.SUMMARIES_FILE),
        "seen_items_file":   str(config.SEEN_ITEMS_FILE),
    }
    logger.info(f"Preflight OK — run-config: {run_config}")
    return {"run_dir": str(run_dir), "config": run_config}
