---
sidebar_position: 2
title: OSS vs Cloud
---

# OSS vs Cloud — capability matrix

**TestivAI is one product with an open-source core.** Everything needed to
capture, diff, decide, and approve — the `@testivai/*` packages in this repo —
is MIT-licensed and runs fully local. The cloud lane is not a separate
version: it is a paid feature layer on top of this same core (hosted history,
team approvals, deeper analysis), enabled by adding an API key to the same
install.

| Capability | OSS core (this repo) | Cloud (paid layer) |
|---|---|---|
| **Frameworks (1.0)** | Playwright ✅<br/>WebdriverIO ✅<br/>others via `testivai run` (experimental) | Playwright + 11 frameworks fully supported |
| **Frameworks (iter 2)** | + Cypress ✅<br/>+ Puppeteer ✅ | (same) |
| Capture full-page screenshots | ✅ | ✅ |
| **Stabilized captures** — animations frozen, caret hidden, fonts awaited | ✅ (default) | ✅ |
| Local pixel diff with threshold | ✅ | ✅ |
| **Tunable pass criteria** — `maxDiffPercent`, `maxDiffPixels` | ✅ | ✅ |
| **Noise auto-pass** — DOM-identical diffs within tolerance pass (`noiseAutoPass`) | ✅ | ✅ |
| Ignore regions (`ignoreSelectors`, both adapters) | ✅ | ✅ |
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
- **CSS fingerprinting + layout + AI** lives in Cloud today. The 5-layer engine uses computed-style comparison plus a layout-tree differ plus a Gemini-backed counselor to surface "why" the diff happened.

The guiding principle: **detection runs where your code runs; collaboration runs in the cloud.** Everything you need to capture, diff, and decide locally belongs in OSS, and the OSS lane will keep getting better at detection. What the cloud lane owns is team-scale state — cross-run history, dashboards, shared approvals, and AI explanations — the things that only make sense with a hosted service behind them.

If you only need local visual regression for a small team or a single project, the OSS lane is sufficient. If you need cross-run history, REVEAL explanations, or team approval workflows, that's what cloud is for.

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
