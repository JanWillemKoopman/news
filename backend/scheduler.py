import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz
from backend.config import SCHEDULE_DAY, SCHEDULE_HOUR, SCHEDULE_MINUTE, TIMEZONE

logger = logging.getLogger(__name__)


def run_weekly_update():
    from backend.researcher import research_news
    from backend.summarizer import summarize_articles
    from backend.storage import save_summary
    from backend.config import NEWS_SOURCES

    logger.info("Wekelijkse nieuwsupdate gestart...")

    today = datetime.now()
    week_end = today.strftime("%Y-%m-%d")
    week_start = (today - timedelta(days=7)).strftime("%Y-%m-%d")

    try:
        articles = research_news()
        title, summary = summarize_articles(articles, week_start, week_end)
        entry = save_summary(
            title=title,
            summary=summary,
            week_start=week_start,
            week_end=week_end,
            sources=NEWS_SOURCES,
        )
        logger.info(f"Update succesvol afgerond: '{entry['title']}'")
        return entry
    except Exception:
        logger.exception("Wekelijkse update mislukt")
        raise


def create_scheduler() -> BackgroundScheduler:
    tz = pytz.timezone(TIMEZONE)
    scheduler = BackgroundScheduler(timezone=tz)
    scheduler.add_job(
        run_weekly_update,
        trigger=CronTrigger(
            day_of_week=SCHEDULE_DAY,
            hour=SCHEDULE_HOUR,
            minute=SCHEDULE_MINUTE,
            timezone=tz,
        ),
        id="weekly_news_update",
        name="Wekelijkse nieuwsupdate",
        replace_existing=True,
    )
    logger.info(
        f"Scheduler ingepland: elke {SCHEDULE_DAY} om {SCHEDULE_HOUR:02d}:{SCHEDULE_MINUTE:02d} ({TIMEZONE})"
    )
    return scheduler
