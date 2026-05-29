---
"@testivai/witness-playwright": patch
---

refactor: extract ignoreSelectors logic into pure testable helper module

Move the `collectIgnoreSelectors`, `buildIgnoreSelectorsCSS`, and
`readWitnessConfigSelectors` functions from inline code inside `snapshot.ts`
into a dedicated `src/config/ignore-selectors.ts` module.

No behaviour change — the logic is identical. The refactor makes the
three-source selector merge and CSS generation unit-testable without
a browser (26 unit tests added covering all edge cases).
