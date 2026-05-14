---
"@testivai/witness": patch
"@testivai/witness-playwright": patch
---

**DOM diff noise-hint** — `@testivai/witness` now runs a lightweight DOM comparison alongside every pixel diff. When screenshots diverge but the DOM tree is structurally identical, the diff is flagged with `"noiseHint": true` in `results.json` and in the GitHub Action PR comment, signalling render-timing or anti-aliasing noise rather than a real UI change. No external dependencies added (~5 KB gzipped).

`@testivai/witness-playwright` reporter updated to read and surface the `dom` field from `results.json` in the HTML report and via `mcbuddy/testivai-oss@v1` PR comments.
