# Roadmap

What's missing, in the order we intend to fix it. Informed by a code audit
(2026-07) and the reasons teams abandon visual testing: false-positive
fatigue, non-deterministic captures, and baseline maintenance burden.

Sizes: **S** < a day · **M** days · **L** week+. Issues welcome for any item;
items marked 🤝 are good community contributions.

## 1. Correctness first — things that behave like bugs

### 1.1 Baseline keying by project / browser — ✅ SHIPPED
Multi-project Playwright configs now key snapshots as `<name>__<project>`
(single-project configs untouched — no migration needed); WebdriverIO gets a
per-call `variant` option for multi-capability runs. The variant lives in
the snapshot name, so the on-disk layout, results.json, report, and both
approve flows work unchanged. Unblocks cross-browser (3.3) and the viewport
matrix (2.3). Still open:
- standalone `witness <url>` viewport-matrix keying (`__WxH`) — lands with 2.3

### 1.2 Capture stabilization defaults — ✅ SHIPPED
Both adapters now freeze CSS animations/transitions, hide the caret, force
instant scrolling, and wait (bounded 3s) for web fonts before every capture —
on by default, off via `stabilize: false` (config.json, project config, or
per call). Still open from the original plan:
- optional `waitForStable` (two identical consecutive frames) for stubborn pages — **S** 🤝

### 1.3 Pass criteria that match human intuition — ✅ SHIPPED (project-level)
`.testivai/config.json` now supports `maxDiffPercent`, `maxDiffPixels`, and
opt-in `noiseAutoPass` + `noiseMaxDiffPercent`. Auto-passed snapshots keep
their diff image and are labeled in the report and `results.json`
(`autoPassed`). Byte-different but visually identical captures now pass
instead of reading `changed 0.01%`. Still open:
- per-snapshot tolerance override via `witness()` options (needs metadata
  plumbing from capture to compare) — **M**

## 2. Workflow completeness

### 2.0 Zero-test-suite mode — ✅ SHIPPED
`testivai witness <url>` captures a running app with no test framework:
same-origin crawl or explicit `--pages`, launches its own headless Chrome,
full stabilization + ignoreSelectors parity, standard pipeline downstream
(baselines, tolerances, report, PR approvals). Built for AI-generated and
vibe-coded apps (Lovable, Bolt, v0) that ship without tests. Still open:
- viewport matrix per page (blocked on baseline keying, 1.1)
- `waitForStable` frame-compare for JS-animated pages 🤝

### 2.1 Locator masking parity — **S**
`ignoreSelectors` (CSS `visibility:hidden`, layout-preserving) is our
mechanism — now supported in **both** adapters (WebdriverIO gained global +
per-call support alongside stabilization). Playwright users also expect
`mask: [locator]` per call; accept locators in `witness()` options and translate.

### 2.2 Element-level snapshots — **M**
`witness(page.locator('.card'), ...)` for component-scoped baselines.
Component-level capture is how design-system folks think; today we only do
full-page.

### 2.3 Multi-viewport matrix — **S** (after 1.1)
`viewports: [[1280,800],[375,812]]` in config → one `witness()` call captures
each, baselines keyed per viewport.

### 2.4 Report: diff view modes, filtering, keyboard nav — **M** 🤝
The report has side-by-side + zoom. Reviewers of 50+ snapshots need: overlay
blink/swipe/onion-skin modes, status + name filtering, `j/k` keyboard
navigation, "copy approve command" per snapshot (exists) and per selection.

### 2.5 Sharded CI merge — **M**
Playwright shards are standard on large suites; today each shard writes its
own `visual-report/`. Add `testivai merge-reports <dirs...>` producing one
report + one results.json, and document the shard workflow in the action.

### 2.6 `testivai status` — **S** 🤝
Print the latest results summary in the terminal (per-snapshot verdicts,
same wording as the MCP tool) without opening the HTML report.

### 2.7 Retry & flake awareness — **M**
When Playwright retries a test, only the final attempt should produce a
capture (today every attempt writes to temp). Track snapshots whose status
flip-flops across recent runs and badge them "flaky" in the report.

## 3. Detection depth

### 3.1 Computed-style fingerprint — **L**, the headline item
The known gap: a stylesheet-only change (identical DOM, different pixels)
currently earns a "likely render noise" hint — a false negative on the exact
signal we ask users to trust. Plan: per-element digest of computed styles
captured alongside the DOM snapshot; noise hint only fires when DOM **and**
style digests both match. Tracked publicly; our benchmark repo documents the
failure case this closes.

### 3.2 Diff region → element attribution — **L**, the differentiator
We already store the DOM for every capture and layout data exists in the
schema. Cluster changed-pixel regions, intersect with element bounding
boxes, and report *which elements* changed: "`.pricing-card:nth-child(2)`
moved 24px down". No local-first tool does this; it's also the single most
useful output for an AI agent deciding whether its change was intended.

### 3.3 Cross-browser validation — **S** (after 1.1)
Nothing in the capture path is Chromium-specific (native Playwright APIs
throughout). After baseline keying lands, test + document Firefox/WebKit
support and add them to the e2e matrix.

### 3.4 Anti-aliasing tuning — **S** 🤝
Expose pixelmatch's `includeAA` and per-channel threshold in config for
teams that want stricter or looser rasterization tolerance.

## 4. Ecosystem

- **Cypress adapter** — **M** 🤝 planned; adapter interface doc coming so the
  community can own it (same for Puppeteer)
- **Storybook mode** — decision pending demand (component-story capture loop)
- **MCP server** — shipped (`@testivai/mcp`); next: image downscaling for
  model-context friendliness, and an opt-in `run_visual_tests` tool
- **`testivai run` sidecar** — remains experimental; graduates only if
  non-JS-framework demand shows up in issues

---

**What we will not build in OSS:** hosted dashboards, cross-run history,
team approval workflows — that's the [cloud lane](./docs/oss-vs-cloud.md).
Detection improvements always land in OSS.

Have a need that isn't here? [Open an issue](https://github.com/mcbuddy/testivai-oss/issues) —
adoption stories with concrete pain move items up this list.
