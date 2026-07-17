from mmm_core.model.fit import Diagnostics, _quality_gate


def _diag(**kw):
    base = dict(
        max_r_hat=1.0,
        min_ess_bulk=1000.0,
        n_divergences=0,
        r2=0.9,
        mape=0.05,
        interval_coverage_94=0.94,
        decomposition_ok=True,
    )
    base.update(kw)
    return Diagnostics(**base)


def test_clean_fit_passes():
    gate = _quality_gate(_diag(), n_samples=2000)
    assert gate.verdict == "pass"
    assert gate.reasons == []
    assert all(gate.checks.values())


def test_high_rhat_fails():
    gate = _quality_gate(_diag(max_r_hat=1.2), n_samples=2000)
    assert gate.verdict == "fail"
    assert not gate.checks["converged_r_hat"]


def test_slightly_high_rhat_warns():
    gate = _quality_gate(_diag(max_r_hat=1.07), n_samples=2000)
    assert gate.verdict == "warn"


def test_many_divergences_fail():
    gate = _quality_gate(_diag(n_divergences=100), n_samples=2000)  # 5% > 2%
    assert gate.verdict == "fail"
    assert not gate.checks["few_divergences"]


def test_a_few_divergences_warn():
    gate = _quality_gate(_diag(n_divergences=3), n_samples=2000)
    assert gate.verdict == "warn"


def test_broken_decomposition_fails():
    gate = _quality_gate(_diag(decomposition_ok=False), n_samples=2000)
    assert gate.verdict == "fail"


def test_low_r2_warns():
    gate = _quality_gate(_diag(r2=0.1), n_samples=2000)
    assert gate.verdict == "warn"


def test_failed_placebo_fails():
    gate = _quality_gate(_diag(), n_samples=2000, placebo_ok=False)
    assert gate.verdict == "fail"
    assert not gate.checks["placebo_clean"]


def test_weak_cv_warns():
    gate = _quality_gate(_diag(), n_samples=2000, cv_mape=0.4)
    assert gate.verdict == "warn"
    assert not gate.checks["cross_validation_ok"]


def test_fail_dominates_warn():
    gate = _quality_gate(_diag(max_r_hat=1.2, min_ess_bulk=10.0), n_samples=2000)
    assert gate.verdict == "fail"  # a warn condition present too, but fail wins
