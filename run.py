import logging
from backend.app import app
from backend.scheduler import create_scheduler
from backend.config import PORT

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

if __name__ == "__main__":
    scheduler = create_scheduler()
    scheduler.start()
    try:
        app.run(host="0.0.0.0", port=PORT, debug=False)
    finally:
        scheduler.shutdown()
