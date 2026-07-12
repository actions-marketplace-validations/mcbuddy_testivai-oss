---
"@testivai/witness-playwright": minor
---

Remove the duplicate `testivai` bin and the undocumented `./cli` subpath export from `@testivai/witness-playwright`.

Both `@testivai/witness` and `@testivai/witness-playwright` declared a `testivai` bin, so which CLI answered `npx testivai` depended on install/hoisting order. When the playwright package's init-only CLI won, documented commands like `testivai approve --all` failed. `@testivai/witness` (a dependency of this package) is now the single owner of the `testivai` bin; its CLI provides `init`, `auth`, `run`, `witness`, and `approve`, so `npx testivai init` keeps working.
