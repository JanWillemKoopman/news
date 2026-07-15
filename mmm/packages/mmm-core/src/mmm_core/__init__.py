"""mmm-core — the frozen, tested statistical core for the MMM wizard.

Only the data-ingestion & quality layer is implemented so far (step 1 of the
build order). The Bayesian model, attribution and response-curve modules land
in later steps and get their own subpackages.
"""

from mmm_core.ingestion import (
    BuildResult,
    ColumnSpec,
    QualityIssue,
    QualityReport,
    Role,
    Severity,
    SourceSpec,
    build_master_dataset,
)

__all__ = [
    "BuildResult",
    "ColumnSpec",
    "QualityIssue",
    "QualityReport",
    "Role",
    "Severity",
    "SourceSpec",
    "build_master_dataset",
]

__version__ = "0.1.0"
