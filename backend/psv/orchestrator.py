"""
Orchestrator — voert de volledige PSV-nieuwsbrief pipeline uit.

Stages: preflight → scout → researcher → deep_reader → editor → writer ⇄ reviewer → publisher

CLI-flags:
  --dry-run         Schrijft niet naar summaries.json (wel naar runs/)
  --stage=<naam>    Stopt na de opgegeven stage (voor debugging)
"""
import logging
import sys

from backend.psv import (
    preflight,
    scout,
    researcher,
    source_scanner,
    deep_reader,
    editor,
    writer,
    reviewer,
    publisher,
)

logger = logging.getLogger(__name__)


def run(dry_run: bool = False, stage: str = None) -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    logger.info("=" * 60)
    logger.info("PSV Nieuwsbrief Pipeline — start")
    logger.info(f"dry_run={dry_run}  stop_na_stage={stage or 'geen'}")
    logger.info("=" * 60)

    # ── 0. Preflight ──────────────────────────────────────────
    pre = preflight.run()
    run_dir = pre["run_dir"]
    if stage == "preflight":
        return

    # ── 1. Scout ──────────────────────────────────────────────
    scout_profile = scout.run(run_dir)
    if stage == "scout":
        return

    # ── 2. Researcher ─────────────────────────────────────────
    research_per_sectie = researcher.run(scout_profile, run_dir)
    totaal_items = sum(len(v) for v in research_per_sectie.values())
    if totaal_items == 0:
        logger.error("Researcher vond geen items — pipeline afgebroken.")
        sys.exit(1)
    if stage == "researcher":
        return

    # ── 2b. Source Scanner ────────────────────────────────────
    scanner_items = source_scanner.run(scout_profile, run_dir)
    for sectie, items in scanner_items.items():
        research_per_sectie.setdefault(sectie, []).extend(items)

    # ── 3. Deep Reader ────────────────────────────────────────
    deep_per_sectie = deep_reader.run(research_per_sectie, scout_profile, run_dir)
    if stage == "deep_reader":
        return

    # ── 4. Editor ─────────────────────────────────────────────
    editor_result = editor.run(deep_per_sectie, scout_profile, run_dir)
    if not editor_result.get("sectievolgorde"):
        logger.error("Editor kon geen sectievolgorde bepalen — pipeline afgebroken.")
        sys.exit(1)
    if stage == "editor":
        return

    # ── 5 + 6. Writer ⇄ Reviewer ─────────────────────────────
    writer_result, review = reviewer.run_loop(
        writer_func=writer.run,
        editor_result=editor_result,
        deep_per_sectie=deep_per_sectie,
        scout_profile=scout_profile,
        run_dir=run_dir,
    )
    if stage == "writer":
        return

    # ── 7. Publisher ──────────────────────────────────────────
    publisher.run(
        writer_result=writer_result,
        deep_per_sectie=deep_per_sectie,
        scout_profile=scout_profile,
        run_dir=run_dir,
        dry_run=dry_run,
    )

    score = review.get("score", "?")
    n     = len(writer_result.get("secties", []))
    logger.info("=" * 60)
    logger.info(f"Pipeline voltooid — score: {score}/10, secties: {n}, dry_run: {dry_run}")
    logger.info("=" * 60)
