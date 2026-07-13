---
"@testivai/witness": minor
"@testivai/witness-playwright": minor
"@testivai/witness-webdriverio": minor
---

Attack the top reasons teams abandon visual testing — flaky captures and pixel-perfect strictness:

**Stabilized captures (both adapters, on by default).** Before every screenshot: CSS animations and transitions are frozen, the text caret is hidden, smooth scrolling is forced instant, and the capture waits (bounded 3s) for web fonts to finish loading. Disable with `stabilize: false` — globally in `.testivai/config.json`, per project in `testivai.config.ts` (Playwright), or per call.

**Human-intuitive pass criteria (`@testivai/witness`).** New `.testivai/config.json` fields:
- `maxDiffPercent` (default 0) — diffs at or below this percentage report as passed
- `maxDiffPixels` — absolute changed-pixel variant; either criterion passing is enough
- `noiseAutoPass` (default false) + `noiseMaxDiffPercent` (default 1) — DOM-identical diffs (the noise hint) within the bound auto-pass instead of demanding review

Auto-passed snapshots keep their diff image and carry `autoPassed: "threshold" | "noise"` in `results.json` (additive schema change); the HTML report labels them. Byte-different but visually identical captures (nothing above the per-pixel threshold) now report as passed instead of `changed 0.01%`.

**WebdriverIO parity: `ignoreSelectors`.** The WebdriverIO adapter now honors `ignoreSelectors` from `.testivai/config.json` and accepts per-call `ignoreSelectors` in `witness()` options, hiding matched elements (`visibility: hidden`, layout-preserving) for the duration of the capture — matching the Playwright adapter.
