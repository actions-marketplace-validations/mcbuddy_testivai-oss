---
"@testivai/witness": minor
---

Zero-test-suite mode: `testivai witness <url>` captures a running app with no test framework at all — built for AI-generated and vibe-coded apps that ship without tests.

```bash
npx testivai witness http://localhost:3000
```

- Discovers same-origin pages by crawling the start page's links (cap with `--max-pages`), or capture exactly the routes you list via `--pages "/,/pricing"` or `pages` in `.testivai/config.json`
- Launches its own headless Chrome (or reuses a debuggable one via `--port`); set `TESTIVAI_CHROME_PATH` to point at any Chrome/Chromium binary, including a Playwright-downloaded one
- Full-page screenshot + DOM snapshot per page, with the same capture stabilization and `ignoreSelectors` handling as the test-suite adapters
- Everything downstream is the standard pipeline: baselines, pixel diff with your configured tolerances, DOM noise hint, HTML report, `testivai approve`, and the GitHub Action PR flow
- New config fields: `pages`, `maxPages`, `viewport`; new flags: `--pages`, `--max-pages`, `--viewport`

The existing sidecar form (`testivai witness <name>` against an already-running debuggable Chrome) is unchanged.
