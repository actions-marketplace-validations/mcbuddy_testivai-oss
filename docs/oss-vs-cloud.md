---
sidebar_position: 2
title: OSS vs Cloud
---

# OSS vs Cloud — capability matrix

TestivAI ships in two lanes that share the same SDK install. Both lanes are usable today; cloud is opt-in and never required.

| Capability | OSS (this repo) | Cloud (paid) |
|---|---|---|
| **Frameworks (1.0)** | Playwright ✅<br/>WebdriverIO ✅<br/>others via `testivai run` (experimental) | Playwright + 11 frameworks fully supported |
| **Frameworks (iter 2)** | + Cypress ✅<br/>+ Puppeteer ✅ | (same) |
| Capture full-page screenshots | ✅ | ✅ |
| Local pixel diff with threshold | ✅ | ✅ |
| Ignore regions | ✅ | ✅ |
| **DOM tree diff (noise hint)** | ✅ | ✅ |
| Self-contained HTML report (`visual-report/index.html`) | ✅ | ✅ |
| Machine-readable results (`results.json`) | ✅ | ✅ |
| Approve/undo baselines locally (`testivai approve`) | ✅ | ✅ |
| Baselines stored in git | ✅ | ✅ |
| GitHub Action — PR comment + commit status | ✅ | ✅ |
| Works **offline / no account** | ✅ | — (account required) |
| **CSS fingerprinting** comparison layer | ❌ | ✅ |
| **Layout engine** comparison layer | ❌ | ✅ |
| **AI counselor** (REVEAL) — explains why a diff happened | ❌ | ✅ |
| Cross-run history dashboard | ❌ | ✅ |
| Cross-PR baseline tracking | ❌ | ✅ |
| Team approval workflow | ❌ | ✅ |
| Smart Baseline approval flow (PROVISIONAL → CONFIRMED/HANGING) | ❌ | ✅ |
| Hosted dashboard, projects, members | ❌ | ✅ |

## How the boundary is drawn

The OSS lane gives you **everything you need to run visual regression locally and in CI** — capture, diff, report, approve, comment on PRs. The cloud lane adds **team-scale infrastructure** (history, dashboards, REVEAL AI, smart baselines) on top of the same captures.

Concretely:

- **Pixel + DOM** lives in OSS. Every screenshot is paired with a snapshot of the page DOM (`document.documentElement.outerHTML`). When pixels differ but DOM is structurally identical, the report flags the diff as likely render noise. This is the OSS noise hint.
- **CSS fingerprinting + layout + AI** lives in Cloud. The 5-layer engine uses computed-style comparison plus a layout-tree differ plus a Gemini-backed counselor to surface "why" the diff happened. These layers are deliberately not in OSS.

This split is permanent. OSS won't grow CSS fingerprinting; cloud won't drop dashboard/history. If you only need local visual regression for a small team or a single project, the OSS lane is sufficient. If you need cross-run history, REVEAL explanations, or team approval workflows, that's what cloud is for.

## How to switch lanes

The same `@testivai/witness-playwright` (or `-webdriverio`) package handles both. The mode is a single config field:

```jsonc
// .testivai/config.json
{
  "mode": "local"   // or "cloud"
}
```

In cloud mode, set `TESTIVAI_API_KEY` in the environment and snapshots upload to the hosted service. In local mode, captures stay on disk and the HTML report is generated locally.

Adapters with **cloud mode pending** (as of 1.0): WebdriverIO is local-only this iteration.
