---
"@testivai/witness": minor
"@testivai/witness-playwright": minor
---

feat: OSS noise warning in HTML report + ignoreSelectors support

**HTML report** — adds an "OSS mode — pixel-exact" notice in the sidebar
explaining that dynamic content may cause false positives, how to reduce
noise (`threshold`, `ignoreSelectors`), and a pointer to TestivAI Cloud
for AI-powered noise filtering.

**ignoreSelectors** — new config option that hides matched CSS elements
(via `visibility: hidden`) before the screenshot is taken, so dynamic
content never contributes to the diff. Works in both baseline and
candidate runs so hidden areas are always identical.

Configure globally in `.testivai/config.json`:
```json
{ "ignoreSelectors": [".version-badge", "[data-testivai-ignore]"] }
```

Or per-snapshot in the test:
```ts
await testivai.witness(page, testInfo, 'home', {
  ignoreSelectors: ['#live-chat-widget']
});
```
