"""Build one aligned ISO-week master dataset from several uploaded sources.

Pipeline (per the agreed methodology, with one deliberate ordering fix):

    1. Per source: detect & parse the date column, drop unparseable rows, flag
       duplicate raw rows, assign each row to an ISO week (Monday), and aggregate
       to week level (sum for KPI/spend, mean for controls).
    2. Resolve column-name collisions across sources (auto-prefix + warn).
    3. Outer-join all weekly sources on the week (Monday) index.
    4. Determine the overlapping analysis window from the *essential* sources
       (the period in which every essential source has data).
    5. Trim to that window and reindex onto a gap-free weekly grid.
    6. **Window-first imputation**: only now impute missing spend weeks with 0, so we
       never invent zero-spend weeks *before a channel existed* (which would bias
       adstock/saturation). Warn — never silently fill — on gaps in KPI/control data.
    7. Post-join checks: near-identical channels (correlation) and year-end anomalies.

Everything suspicious is reported on :class:`QualityReport`; the numbers themselves are
only ever aggregated or zero-imputed within the window, never fabricated.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from mmm_core.ingestion.dates import detect_date_column, to_week_start
from mmm_core.ingestion.events import EventDummySpec, build_event_dummy
from mmm_core.ingestion.quality import QualityReport, Severity
from mmm_core.ingestion.spec import Role, SourceSpec, aggregation_for

# A robust-z threshold above which a year-end KPI point is flagged as a possible anomaly.
_ANOMALY_Z = 5.0
# Default Pearson correlation above which two spend channels are flagged near-identical.
_DEFAULT_CORR_THRESHOLD = 0.95


@dataclass
class BuildResult:
    """The aligned master dataset and everything learned while building it."""

    data: pd.DataFrame                      # index: week_start (Monday), sorted, gap-free
    window: tuple[pd.Timestamp, pd.Timestamp] | None
    report: QualityReport
    column_roles: dict[str, Role] = field(default_factory=dict)
    sources: list[str] = field(default_factory=list)

    def columns_with_role(self, role: Role) -> list[str]:
        return [name for name, r in self.column_roles.items() if r is role]


def _prepare_source(
    spec: SourceSpec, df: pd.DataFrame, report: QualityReport
) -> tuple[pd.DataFrame, dict[str, Role], dict[str, str]]:
    """Clean, date-index and aggregate a single source to ISO-week level."""
    df = df.copy()

    date_col = detect_date_column(df, spec.date_column)
    if spec.date_column is None:
        report.add(
            "date_column_detected", Severity.INFO,
            f"auto-detected date column {date_col!r}", source=spec.name, column=date_col,
        )

    n_dup = int(df.duplicated().sum())
    if n_dup:
        report.add(
            "duplicate_rows", Severity.WARNING,
            f"{n_dup} duplicate raw row(s) found and kept (they will aggregate together)",
            source=spec.name, count=n_dup,
        )

    parsed = pd.to_datetime(df[date_col], errors="coerce")
    n_bad = int(parsed.isna().sum())
    if n_bad:
        report.add(
            "unparseable_dates", Severity.WARNING,
            f"{n_bad} row(s) with unparseable dates were dropped",
            source=spec.name, count=n_bad,
        )
    keep = parsed.notna()
    df = df.loc[keep].copy()
    df["_week"] = to_week_start(parsed.loc[keep])

    agg: dict[str, str] = {}
    roles: dict[str, Role] = {}
    fills: dict[str, str] = {}
    for col in spec.columns:
        if col.name not in df.columns:
            report.add(
                "missing_column", Severity.ERROR,
                f"declared column {col.name!r} is not present in the source",
                source=spec.name, column=col.name,
            )
            continue
        numeric = pd.to_numeric(df[col.name], errors="coerce")
        n_nan = int(numeric.isna().sum())
        if n_nan:
            report.add(
                "non_numeric_values", Severity.INFO,
                f"{n_nan} non-numeric/missing value(s) in {col.name!r} treated as missing",
                source=spec.name, column=col.name, count=n_nan,
            )
        df[col.name] = numeric
        agg[col.name] = aggregation_for(col.role)
        roles[col.resolved_name()] = col.role
        if col.fill is not None:
            fills[col.resolved_name()] = col.fill

    if not agg:
        # Every declared column was missing — return an empty, correctly-typed frame.
        empty = pd.DataFrame(index=pd.DatetimeIndex([], name="week_start"))
        return empty, roles, fills

    weekly = df.groupby("_week").agg(agg)
    weekly = weekly.rename(columns={c.name: c.resolved_name() for c in spec.columns if c.name in agg})
    weekly.index.name = "week_start"
    return weekly.sort_index(), roles, fills


def _resolve_collisions(
    weekly_by_source: dict[str, pd.DataFrame],
    roles_by_source: dict[str, dict[str, Role]],
    fills_by_source: dict[str, dict[str, str]],
    report: QualityReport,
) -> tuple[dict[str, pd.DataFrame], dict[str, Role], dict[str, str]]:
    """Prefix column names that appear in more than one source, and merge role/fill maps."""
    owners: dict[str, list[str]] = defaultdict(list)
    for src, weekly in weekly_by_source.items():
        for name in weekly.columns:
            owners[name].append(src)

    renamed: dict[str, pd.DataFrame] = {}
    merged_roles: dict[str, Role] = {}
    merged_fills: dict[str, str] = {}
    for src, weekly in weekly_by_source.items():
        rename_map: dict[str, str] = {}
        for name in weekly.columns:
            final = f"{src}_{name}" if len(owners[name]) > 1 else name
            if final != name:
                rename_map[name] = final
            merged_roles[final] = roles_by_source[src][name]
            if name in fills_by_source.get(src, {}):
                merged_fills[final] = fills_by_source[src][name]
        if rename_map:
            report.add(
                "column_name_collision", Severity.WARNING,
                f"column(s) {sorted(rename_map)} exist in multiple sources; "
                f"prefixed with source name in {src!r}",
                source=src, renamed=rename_map,
            )
        renamed[src] = weekly.rename(columns=rename_map)
    return renamed, merged_roles, merged_fills


def _flag_near_identical(
    data: pd.DataFrame, spend_cols: list[str], threshold: float, report: QualityReport
) -> None:
    """Warn on pairs of spend channels whose weekly series are near-identical."""
    usable = [c for c in spend_cols if data[c].std(skipna=True) and data[c].notna().sum() > 2]
    if len(usable) < 2:
        return
    corr = data[usable].corr()
    for i, a in enumerate(usable):
        for b in usable[i + 1:]:
            r = corr.loc[a, b]
            if pd.notna(r) and abs(r) >= threshold:
                report.add(
                    "near_identical_channels", Severity.WARNING,
                    f"channels {a!r} and {b!r} are near-identical (r={r:.3f}); raw "
                    f"correlation can mislead — they may be confounded, not causal",
                    columns=[a, b], correlation=float(r),
                )


def _flag_year_end_anomalies(
    data: pd.DataFrame, kpi_cols: list[str], report: QualityReport
) -> None:
    """Warn on extreme KPI values landing in the turn-of-year weeks (52/53/1)."""
    iso = data.index.isocalendar()
    turn_of_year = iso["week"].isin([1, 52, 53]).to_numpy()
    for col in kpi_cols:
        series = data[col]
        clean = series.dropna()
        if len(clean) < 8:
            continue
        median = clean.median()
        mad = (clean - median).abs().median()
        # Robust scale via the MAD; fall back to the std for a (near-)constant baseline
        # with a single spike, where the MAD collapses to 0 but the spike is still real.
        scale = mad * 1.4826 if mad > 0 else clean.std(ddof=0)
        if not scale or np.isnan(scale):
            continue
        robust_z = (series - median) / scale
        flagged = turn_of_year & (robust_z.abs().to_numpy() > _ANOMALY_Z)
        if flagged.any():
            weeks = [ts.date().isoformat() for ts in data.index[flagged]]
            report.add(
                "year_end_anomaly", Severity.WARNING,
                f"{col!r} has extreme value(s) in turn-of-year week(s) {weeks}; "
                f"consider an event dummy or excluding these weeks",
                column=col, weeks=weeks,
            )


def _apply_event_dummies(
    data: pd.DataFrame,
    event_dummies: list[EventDummySpec],
    report: QualityReport,
) -> dict[str, Role]:
    """Attach one 0/1 control column per event dummy, post window-trim."""
    roles: dict[str, Role] = {}
    for spec in event_dummies:
        if spec.name in data.columns:
            report.add(
                "event_dummy_name_collision", Severity.ERROR,
                f"event dummy {spec.name!r} collides with an existing column name",
                column=spec.name,
            )
            continue
        dummy = build_event_dummy(data.index, spec)
        if dummy.sum() == 0:
            report.add(
                "event_dummy_outside_window", Severity.WARNING,
                f"event dummy {spec.name!r} has no active week inside the analysis "
                f"window ({data.index.min().date()}..{data.index.max().date()}); it "
                f"will be all zero and have no effect on the fit",
                column=spec.name, weeks=[f"{y}-W{w:02d}" for y, w in spec.weeks],
            )
        data[spec.name] = dummy.to_numpy()
        roles[spec.name] = Role.CONTROL
    return roles


def build_master_dataset(
    sources: list[tuple[SourceSpec, pd.DataFrame]],
    *,
    correlation_threshold: float = _DEFAULT_CORR_THRESHOLD,
    impute_spend_zero: bool = True,
    event_dummies: list[EventDummySpec] | None = None,
) -> BuildResult:
    """Align several uploaded sources into one gap-free ISO-week master dataset.

    Args:
        sources: ``(SourceSpec, DataFrame)`` pairs — one per uploaded file.
        correlation_threshold: Pearson |r| above which spend channels are flagged
            near-identical.
        impute_spend_zero: Whether to fill missing spend weeks with 0 *inside* the
            analysis window (recommended; a missing spend week means the channel ran
            no ads that week).
        event_dummies: Optional 0/1 control columns for named ISO weeks (anomalies,
            one-off promotions, ...), added after the window is trimmed so the
            builder never has to hand-edit a source file to flag one.

    Returns:
        A :class:`BuildResult`. If there is no overlapping window across the essential
        sources, ``window`` is ``None``, ``data`` is empty, and the report carries an
        error.
    """
    report = QualityReport()
    if not sources:
        raise ValueError("build_master_dataset requires at least one source")

    weekly_by_source: dict[str, pd.DataFrame] = {}
    roles_by_source: dict[str, dict[str, Role]] = {}
    fills_by_source: dict[str, dict[str, str]] = {}
    essential_spans: dict[str, tuple[pd.Timestamp, pd.Timestamp]] = {}

    for spec, df in sources:
        weekly, roles, fills = _prepare_source(spec, df, report)
        weekly_by_source[spec.name] = weekly
        roles_by_source[spec.name] = roles
        fills_by_source[spec.name] = fills
        if spec.essential and not weekly.empty:
            essential_spans[spec.name] = (weekly.index.min(), weekly.index.max())

    weekly_by_source, column_roles, column_fills = _resolve_collisions(
        weekly_by_source, roles_by_source, fills_by_source, report
    )

    # Outer-join everything first, so we can also see out-of-window coverage if needed.
    master: pd.DataFrame | None = None
    for weekly in weekly_by_source.values():
        if weekly.empty:
            continue
        master = weekly if master is None else master.join(weekly, how="outer")
    if master is None:
        master = pd.DataFrame(index=pd.DatetimeIndex([], name="week_start"))
    master = master.sort_index()

    source_names = [spec.name for spec, _ in sources]

    if not essential_spans:
        report.add(
            "no_essential_data", Severity.ERROR,
            "no essential source produced any data; cannot determine an analysis window",
        )
        return BuildResult(master, None, report, column_roles, source_names)

    window_start = max(span[0] for span in essential_spans.values())
    window_end = min(span[1] for span in essential_spans.values())
    if window_start > window_end:
        report.add(
            "no_overlap", Severity.ERROR,
            "essential sources do not overlap in time; no common analysis window exists",
            window_start=str(window_start.date()), window_end=str(window_end.date()),
        )
        return BuildResult(master, None, report, column_roles, source_names)

    # Trim to the window and reindex onto a gap-free weekly (Monday) grid.
    full_index = pd.date_range(window_start, window_end, freq="7D", name="week_start")
    data = master.loc[window_start:window_end].reindex(full_index)

    spend_cols = [c for c, r in column_roles.items() if r is Role.SPEND and c in data.columns]
    kpi_cols = [c for c, r in column_roles.items() if r is Role.KPI and c in data.columns]
    control_cols = [c for c, r in column_roles.items() if r is Role.CONTROL and c in data.columns]

    # KPI / control gaps are reported, never invented.
    for col in kpi_cols:
        gaps = data.index[data[col].isna()]
        if len(gaps):
            report.add(
                "kpi_gaps", Severity.WARNING,
                f"KPI column {col!r} has {len(gaps)} missing week(s) inside the window",
                column=col, weeks=[ts.date().isoformat() for ts in gaps],
            )
    for col in control_cols:
        n_gaps = int(data[col].isna().sum())
        if not n_gaps:
            continue
        strategy = column_fills.get(col)
        if strategy is not None:
            from mmm_core.features import fill_missing

            data[col] = fill_missing(data[col], strategy)
            report.add(
                "control_filled", Severity.INFO,
                f"control column {col!r} had {n_gaps} missing week(s), filled with "
                f"strategy {strategy!r}",
                column=col, count=n_gaps, strategy=strategy,
            )
        else:
            report.add(
                "control_gaps", Severity.WARNING,
                f"control column {col!r} has {n_gaps} missing week(s) inside the window "
                f"(left as missing — set a `fill` strategy or clean it before modelling)",
                column=col, count=n_gaps,
            )

    # Window-first spend imputation: a missing spend week inside the window == no ads.
    if impute_spend_zero and spend_cols:
        filled = {c: int(data[c].isna().sum()) for c in spend_cols}
        data[spend_cols] = data[spend_cols].fillna(0.0)
        total_filled = sum(filled.values())
        if total_filled:
            report.add(
                "spend_imputed_zero", Severity.INFO,
                f"imputed {total_filled} missing spend week(s) with 0 inside the window",
                per_column=filled,
            )

    if event_dummies:
        column_roles.update(_apply_event_dummies(data, list(event_dummies), report))

    _flag_near_identical(data, spend_cols, correlation_threshold, report)
    _flag_year_end_anomalies(data, kpi_cols, report)

    # Sanity checks on the output contract itself.
    assert data.index.is_unique, "master index has duplicate weeks"
    assert data.index.is_monotonic_increasing, "master index is not sorted"

    return BuildResult(
        data=data,
        window=(pd.Timestamp(window_start), pd.Timestamp(window_end)),
        report=report,
        column_roles=column_roles,
        sources=source_names,
    )
