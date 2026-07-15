"""Hill saturation: diminishing returns of media pressure.

The Hill function maps (adstocked) spend to a bounded response in ``[0, 1)``:

    f(x) = x**s / (kappa**s + x**s)

- ``kappa`` (half-saturation) is the spend level at which the channel reaches half its
  ceiling: ``f(kappa) = 0.5``. It is the natural read-out for a "saturation point".
- ``s`` (slope/shape) controls the curvature: ``s <= 1`` gives immediately-concave
  diminishing returns; ``s > 1`` gives an S-curve (slow start, then a steep middle).

The function returns the *shape* only (0..1); the model multiplies it by a channel
coefficient (the ceiling / max effect). Keeping shape and scale separate is what makes
the fitted parameters interpretable.
"""

from __future__ import annotations

import numpy as np

__all__ = ["hill_saturation"]


def hill_saturation(
    x: np.ndarray,
    half_saturation: float | np.ndarray,
    slope: float | np.ndarray = 1.0,
) -> np.ndarray:
    """Apply Hill saturation elementwise.

    Args:
        x: Non-negative (adstocked) spend. Any shape; for 2-D ``(T, n_channels)`` input
            ``half_saturation``/``slope`` may be scalars or per-channel vectors.
        half_saturation: Spend at which the response is half its ceiling. Must be > 0.
        slope: Hill shape parameter. Must be > 0.

    Returns:
        Response in ``[0, 1)``, same shape as ``x``.
    """
    x = np.asarray(x, dtype=float)
    if np.any(x < 0.0):
        raise ValueError("hill_saturation expects non-negative spend")
    k = np.asarray(half_saturation, dtype=float)
    s = np.asarray(slope, dtype=float)
    if np.any(k <= 0.0):
        raise ValueError("half_saturation must be > 0")
    if np.any(s <= 0.0):
        raise ValueError("slope must be > 0")

    xs = np.power(x, s)
    ks = np.power(k, s)
    return xs / (ks + xs)
