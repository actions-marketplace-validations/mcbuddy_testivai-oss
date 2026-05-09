---
sidebar_position: 99
title: Cloud-only frameworks
---

# Cloud-only frameworks

The OSS lane ships dedicated adapter packages for **Playwright** and **WebdriverIO** (with Cypress and Puppeteer landing in iteration 2). These give you the most reliable local-mode experience — captured via the framework's native APIs, no CDP injection, no race conditions.

For other frameworks, you have two paths today:

## Path A — `testivai run` sidecar (experimental)

The framework-agnostic [`testivai run`](./../sidecar-testivai-run.md) wrapper works with any framework that can launch Chrome with `--remote-debugging-port`. Labeled experimental because launch coordination across frameworks is brittle. Useful as a fallback while you wait for a dedicated adapter.

## Path B — TestivAI Cloud

The hosted TestivAI service supports the full set of frameworks below with first-class adapters and CSS / layout / AI-counselor analysis on top of pixel + DOM. **Cloud frameworks require a TestivAI account** and `TESTIVAI_API_KEY`.

| Framework | Language | Cloud | OSS adapter |
|---|---|---|---|
| Cypress | JavaScript | ✅ | iter 2 |
| Puppeteer | JavaScript | ✅ | iter 2 |
| Selenium + Jest | JavaScript | ✅ | community |
| Selenium + pytest | Python | ✅ | community via [extension API](./../extension-api.md) |
| Selenium + unittest | Python | ✅ | community |
| Robot Framework | Python | ✅ | sidecar |
| Selenium + JUnit 5 | Java | ✅ | community |
| Selenium + TestNG | Java | ✅ | community |
| RSpec + Capybara | Ruby | ✅ | community |
| Cucumber + Capybara | Ruby | ✅ | community |

Ship a community adapter by writing the captured screenshots + DOM to `.testivai/temp/<name>/` per the [extension API contract](./../extension-api.md). Once that's done, the existing OSS CLI, HTML report, and GitHub Action work unchanged.

## See also

- [Why local-first?](../intro.md)
- [OSS vs Cloud capability matrix](./../oss-vs-cloud.md)
- [`testivai run` experimental sidecar](./../sidecar-testivai-run.md)
- [Extension API](./../extension-api.md) — for community-built adapters
- [TestivAI Cloud documentation](https://testiv.ai/docs) (external)
