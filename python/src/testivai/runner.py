"""
Report runner — invokes the @testivai/witness CLI for the compare/report
half of the pipeline (diff, tolerances, noise hint, HTML report, exit code).

Node.js is guaranteed present in playwright-python environments: Playwright
for Python bundles a Node driver. We still resolve conservatively:
  1. TESTIVAI_CLI env var — full command override (e.g. "node /x/testivai.js")
  2. ./node_modules/.bin/testivai — the PROJECT's installed version (walks up
     from cwd, Node convention; a stale global must never shadow it)
  3. `testivai` on PATH (global install)
  4. `npx --yes @testivai/witness` (zero-install fallback)
"""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path
from typing import Optional


def resolve_cli(project_root: Optional[Path] = None) -> list[str]:
    override = os.environ.get("TESTIVAI_CLI")
    if override:
        return override.split()
    # Project-local install wins over anything global (Node convention)
    current = Path(project_root or Path.cwd()).resolve()
    for candidate_root in [current, *current.parents]:
        local_bin = candidate_root / "node_modules" / ".bin" / "testivai"
        if local_bin.exists():
            return [str(local_bin)]
    direct = shutil.which("testivai")
    if direct:
        return [direct]
    npx = shutil.which("npx")
    if npx:
        return [npx, "--yes", "@testivai/witness"]
    raise RuntimeError(
        "testivai: could not find the @testivai/witness CLI. Install Node.js "
        "and either `npm i -D @testivai/witness` or ensure `npx` is on PATH, "
        "or set TESTIVAI_CLI to the command to run."
    )


def run_report(
    project_root: Optional[Path] = None,
    *,
    fail_on_diff: bool = False,
    open_report: bool = False,
) -> int:
    """Run `testivai report` in project_root. Returns the exit code."""
    cmd = [*resolve_cli(project_root), "report", "-q"]
    if fail_on_diff:
        cmd.append("--fail-on-diff")
    if open_report:
        cmd.append("--open")
    completed = subprocess.run(cmd, cwd=str(project_root or Path.cwd()))
    return completed.returncode
