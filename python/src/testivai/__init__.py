"""
TestivAI for Python — local-first visual regression capture for
playwright-python, sharing baselines, reports, tolerances, and PR approvals
with the JS/TS adapters through one on-disk contract.

    from testivai import witness

    def test_homepage(page):
        page.goto("http://localhost:3000")
        witness(page, "homepage")

Then `testivai report` (run automatically by the pytest plugin) compares
against `.testivai/baselines/` and writes `visual-report/index.html`.
"""

from ._capture import (
    STABILIZE_CSS,
    build_ignore_css,
    load_local_config,
    sanitize_variant,
    witness,
)
from .runner import resolve_cli, run_report

__all__ = [
    "witness",
    "run_report",
    "resolve_cli",
    "load_local_config",
    "build_ignore_css",
    "sanitize_variant",
    "STABILIZE_CSS",
]

__version__ = "0.1.0"
