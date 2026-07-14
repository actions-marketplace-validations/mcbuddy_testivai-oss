---
"@testivai/witness-playwright": minor
"@testivai/witness-webdriverio": minor
---

Fix baseline keying collisions in multi-project / multi-capability runs.

Previously, two Playwright projects (e.g. `chromium-desktop` and `mobile-safari`) capturing the same snapshot name silently overwrote each other's baselines under `.testivai/baselines/<name>/` — making cross-browser and responsive configs unusable.

The variant is now folded into the snapshot name:

- **Playwright**: when the config runs more than one project, snapshots become `<name>__<project>` (e.g. `homepage__mobile-safari`). Single-project configs are completely untouched — `homepage` stays `homepage`, and existing baselines keep working.
- **WebdriverIO**: new per-call `variant` option — `testivai.witness(browser, 'homepage', { variant: 'firefox-mobile' })` — for multi-capability runs.

Because the variant lives in the name, the on-disk layout, `results.json` schema, HTML report, `testivai approve`, and `/testivai approve` PR comments all work unchanged.
