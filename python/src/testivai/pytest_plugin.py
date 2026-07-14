"""
pytest plugin — registered automatically via the `pytest11` entry point.

Provides:
  - `testivai_witness` fixture: capture helper that defaults the snapshot
    name to the current test's name (sanitized).
  - session-finish hook: when temp captures exist, runs `testivai report`
    so the run ends with baselines compared and the report written.
    Disable with TESTIVAI_AUTO_REPORT=0.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

import pytest

from ._capture import witness
from .runner import run_report


@pytest.fixture
def testivai_witness(request):
    """
    Usage with pytest-playwright:

        def test_homepage(page, testivai_witness):
            page.goto("http://localhost:3000")
            testivai_witness(page, "homepage")

    The name argument is optional — it defaults to the test name.
    """

    def _witness(page, name: str | None = None, **kwargs):
        snapshot_name = name or re.sub(r"[^a-z0-9_-]+", "_", request.node.name, flags=re.IGNORECASE).lower()
        return witness(page, snapshot_name, **kwargs)

    return _witness


def pytest_sessionfinish(session, exitstatus):  # noqa: ARG001 - pytest hook signature
    if os.environ.get("TESTIVAI_AUTO_REPORT", "1") == "0":
        return
    root = Path.cwd()
    temp_dir = root / ".testivai" / "temp"
    if not temp_dir.is_dir() or not any(temp_dir.iterdir()):
        return
    try:
        run_report(root)
    except RuntimeError as err:  # CLI not found — report how to finish manually
        print(f"\n[testivai] {err}")
        print("[testivai] Captures are in .testivai/temp/ — run `npx testivai report` to compare.")
