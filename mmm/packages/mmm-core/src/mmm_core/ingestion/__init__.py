"""Multi-source data ingestion & quality checks for MMM.

Public surface:
    - Role / ColumnSpec / SourceSpec   — describe what each uploaded file contains.
    - EventDummySpec / build_event_dummy — declare 0/1 control columns for named weeks.
    - build_master_dataset(...)        — align sources to one ISO-week master table.
    - BuildResult                      — the aligned data + analysis window + report.
    - QualityReport / QualityIssue     — everything worth warning the builder about.
"""

from mmm_core.ingestion.events import EventDummySpec, build_event_dummy
from mmm_core.ingestion.pipeline import BuildResult, build_master_dataset
from mmm_core.ingestion.quality import QualityIssue, QualityReport, Severity
from mmm_core.ingestion.spec import ColumnSpec, Role, SourceSpec

__all__ = [
    "BuildResult",
    "ColumnSpec",
    "EventDummySpec",
    "QualityIssue",
    "QualityReport",
    "Role",
    "Severity",
    "SourceSpec",
    "build_event_dummy",
    "build_master_dataset",
]
