---
"@testivai/witness": patch
---

Fix the `testivai` CLI crashing on startup with commander 14. Commander 14 treats conflicting flags as fatal, and the CLI declared `-v` for both `--version` and `--verbose`; every invocation threw `Cannot add option '-v, --verbose'`. Version now uses the conventional `-V, --version`, leaving `-v` for `--verbose`. The startup banner also now uses local-first wording.
