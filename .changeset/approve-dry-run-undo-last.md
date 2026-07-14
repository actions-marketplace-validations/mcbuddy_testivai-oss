---
"@testivai/witness": minor
---

Added `--dry-run` flag to `testivai approve` that prints what would be approved without modifying files. Also changed `testivai approve --undo` (without a name) to automatically undo the last approval by finding the most recent `.previous/` backup — no longer requires an explicit snapshot name.
