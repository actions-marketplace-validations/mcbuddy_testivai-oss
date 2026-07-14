---
"@testivai/witness": minor
---

New `testivai report` command — the language-agnostic half of the adapter contract. Any Playwright binding (Python, Java, .NET, …) can capture by writing `.testivai/temp/<name>/screenshot.png` (+ `dom.html`) with its native APIs, then run `testivai report` for diffing, tolerances, the noise hint, the HTML report, and CI exit codes (`--fail-on-diff`, `--open`). This powers the new `testivai` Python package (PyPI) and the experimental Java adapter.
