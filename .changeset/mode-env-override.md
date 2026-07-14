---
"@testivai/witness": patch
---

`TESTIVAI_MODE=cloud|local` now overrides `.testivai/config.json` for lane selection. Repos hosting both lanes side by side (like the demo app) previously had the cloud lane silently hijacked into local mode by the OSS lane's `{ "mode": "local" }` marker file.
