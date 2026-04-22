#!/usr/bin/env python3
"""
Entry point voor de PSV Nieuwsbrief pipeline.
Wordt aangeroepen door GitHub Actions elke zondagavond.

Gebruik:
  python scripts/update_psv.py                  # Volledige run
  python scripts/update_psv.py --dry-run        # Test zonder opslaan
  python scripts/update_psv.py --stage=scout    # Stop na Scout-stage
"""
import argparse
import sys
from pathlib import Path

# Zorg dat de project-root op sys.path staat
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.psv.orchestrator import run


def main() -> None:
    parser = argparse.ArgumentParser(description="PSV Nieuwsbrief Generator")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Voer pipeline uit zonder te schrijven naar summaries.json",
    )
    parser.add_argument(
        "--stage",
        choices=["preflight", "scout", "researcher", "deep_reader", "editor", "writer"],
        help="Stop de pipeline na deze stage (handig voor debugging)",
    )
    args = parser.parse_args()
    run(dry_run=args.dry_run, stage=args.stage)


if __name__ == "__main__":
    main()
