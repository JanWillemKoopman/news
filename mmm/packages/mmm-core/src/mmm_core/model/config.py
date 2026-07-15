"""Model configuration: how a channel enters the model, and its prior expectations.

This is exactly the surface Claude *parameterizes* per client — which channel is
intent-driven vs. brand-building, how long its carry-over is expected to last, whether
to add a seasonality/trend term — without ever rewriting the model maths itself.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class ChannelType(str, Enum):
    """Coarse channel behaviour, used to pick sensible default adstock priors."""

    INTENT = "intent"   # captures existing demand (search, marketplaces) -> short carry-over
    BRAND = "brand"     # builds future demand (prospecting, video) -> long carry-over
    GENERIC = "generic" # unknown / mixed -> weakly-informative middle


# Prior-centre for the adstock half-life (in weeks) per channel type. These *center* a
# weakly-informative prior; the data still moves them. Intent channels fade within a
# week or two; brand channels linger for over a month.
_DEFAULT_HALF_LIFE: dict[ChannelType, float] = {
    ChannelType.INTENT: 1.0,
    ChannelType.GENERIC: 2.5,
    ChannelType.BRAND: 5.0,
}


def default_half_life(channel_type: ChannelType) -> float:
    return _DEFAULT_HALF_LIFE[channel_type]


@dataclass(frozen=True)
class ChannelConfig:
    """One media channel's configuration in the model.

    Args:
        name: Column name of the channel's spend in the master dataset.
        channel_type: Behaviour class, drives the default adstock prior.
        l_max: Maximum adstock carry-over lag in weeks.
        expected_half_life: Centre of the adstock half-life prior (weeks). Defaults to
            the per-type value; override when you have channel-specific knowledge.
    """

    name: str
    channel_type: ChannelType = ChannelType.GENERIC
    l_max: int = 12
    expected_half_life: float | None = None

    def half_life_prior_center(self) -> float:
        return self.expected_half_life or default_half_life(self.channel_type)


@dataclass(frozen=True)
class ModelConfig:
    """Full model specification over a master dataset.

    Args:
        kpi: Column name of the KPI (target) in the master dataset.
        channels: The media channels to attribute.
        control_columns: Exogenous controls (e.g. price) entered linearly.
        add_trend: Include a linear time trend as baseline component.
        seasonality_periods: Seasonal cycle length in weeks (52 = yearly). ``None`` off.
        n_fourier_modes: Number of Fourier pairs for the seasonal term.
    """

    kpi: str
    channels: tuple[ChannelConfig, ...]
    control_columns: tuple[str, ...] = ()
    add_trend: bool = True
    seasonality_periods: float | None = 52.0
    n_fourier_modes: int = 2

    def __post_init__(self) -> None:
        if not self.channels:
            raise ValueError("model needs at least one channel")
        names = [c.name for c in self.channels]
        if len(names) != len(set(names)):
            raise ValueError("channel names must be unique")

    @property
    def channel_names(self) -> list[str]:
        return [c.name for c in self.channels]
