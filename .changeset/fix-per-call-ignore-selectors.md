---
"@testivai/witness-playwright": patch
---

Fix per-call `ignoreSelectors` (and `stabilize`) being dropped by the config merge. `testivai.witness(page, testInfo, 'name', { ignoreSelectors: ['.badge'] })` silently ignored the selectors — the elements were neither hidden from the screenshot nor excluded from the DOM snapshot. Long masked by the diff engine's cumulated threshold absorbing the few leaked pixels; surfaced by the text-aware DOM diff correctly flagging the leaked dynamic text.
