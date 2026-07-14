---
"@testivai/witness": minor
"@testivai/witness-playwright": patch
"@testivai/witness-webdriverio": patch
---

Dogfooding fixes — found by running `testivai witness` against our own marketing site:

**Stabilization no longer hides entry-animated content.** The injected CSS now uses near-zero durations (`animation-duration: 0.001s`, one iteration, `transition-duration: 0.001s`) instead of `animation/transition: none`, so animations **complete instantly at their final state**. Pages whose content starts at `opacity: 0` and reveals via entry animations or class transitions — most modern marketing/vibe-coded sites — render fully instead of capturing blank.

**Standalone mode reveals scroll-triggered content.** `testivai witness <url>` now scrolls stepwise through the page (bounded) and returns to the top before capturing, so IntersectionObserver reveal-on-scroll sections actually render — without resizing the viewport, which would break `100vh` layouts.

**The DOM diff now sees text.** Visible text nodes are tokenized (whitespace-normalized; script/style bodies stay opaque) and reported as `textChanges` in the DOM summary. Previously a wording change (`Free` → `Gratis`) read as "structurally identical" — harmless when the noise hint was only a label, but with `noiseAutoPass` enabled it silently auto-passed real text regressions. Text changes now mark the DOM as changed, never auto-pass, and appear in the HTML report, the PR comment, and MCP verdicts (`results.json` schema addition, backward compatible).

**`ignoreSelectors` now excludes elements from the DOM snapshot too.** Ignored elements were only hidden visually; with the text-aware DOM diff, dynamic ignored content (live counters, feeds) would flag DOM changes the pixels could not show. All three capture paths now serialize the DOM with ignored elements removed — one consistent semantic: ignored means excluded from both signals.

**Standalone capture hardening (from live-site dogfooding):** layout metrics are polled until non-zero (fresh Chrome can report 0-width before first layout), and the web-font wait is extended to 10s bounded — a fallback-font capture diffs 30%+ against a webfont baseline on real networks.
