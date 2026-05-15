#!/bin/bash
# Dagelijkse automatische run — voeg toe aan crontab:
# 0 6 * * * /path/to/frontline/cron.sh >> /path/to/frontline/cron.log 2>&1
set -e
cd "$(dirname "$0")"
echo "[$(date)] Frontlijn Briefing gestart"
python run.py
echo "[$(date)] Klaar"
