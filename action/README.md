# TestivAI Visual Report — GitHub Action

Posts TestivAI visual regression results from `results.json` to pull requests as a comment + commit status. Designed to consume the local-mode output of `@testivai/witness` and the framework adapters (`@testivai/witness-playwright`, `@testivai/witness-webdriverio`, …).

## Usage

```yaml
name: Visual Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test

      # Post results to PR (always runs so a failed test still gets a report)
      - uses: mcbuddy/testivai-oss/action@v1
        if: always()
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          report-dir: visual-report
          fail-on-diff: false
```

Pin to `@v1` for rolling major-version updates, or `@v1.0.0` for a fixed point release.

## Inputs

| Input | Description | Required | Default |
|---|---|---|---|
| `github-token` | GitHub token for posting comments + commit status | Yes | `${{ github.token }}` |
| `report-dir` | Directory containing `results.json` and the rendered HTML report | Yes | `visual-report` |
| `fail-on-diff` | Fail workflow if visual changes detected | No | `false` |
| `upload-artifact` | Upload report as a workflow artifact | No | `true` |
| `artifact-retention-days` | Days to retain artifact | No | `30` |

## What it posts

- **PR comment** (upserted via `<!-- testivai-visual-report -->` marker) summarising passed / changed / new counts, with collapsed details for each changed snapshot and approval commands
- **Commit status** under the context `TestivAI / visual` — `success`, `pending`, or `failure` based on `fail-on-diff`
- **Workflow artifact** of the entire `report-dir` (HTML report, `results.json`, diff images)

The PR comment surfaces the **DOM noise hint** from the OSS `@testivai/witness` pixel-and-DOM comparison: when pixels differ but the DOM is structurally identical, the comment flags the change as likely render noise. When the DOM also differs, the comment summarises added / removed / attribute-change counts so reviewers can decide whether the change is intentional.

## Example output

```
### 🔍 TestivAI Visual Report

✅ 12 passed · ⚠️ 3 changed · 🆕 2 new

#### Changed Snapshots
<details>
<summary>checkout-page — 0.5% different</summary>

> 💡 DOM unchanged — pixel diff is likely render noise (anti-aliasing, font hinting).

npx testivai approve "checkout-page"
</details>

<details>
<summary>nav-redesign — 8.5% different</summary>

> 🧱 DOM changed — 2 added, 1 attribute change.

npx testivai approve "nav-redesign"
</details>
```

## Contributing

The action ships as a single bundled file at `action/dist/index.js` (built with `@vercel/ncc`). GitHub Actions runs that file directly from the consumer's checked-out source — there is no install step, no `npm install` at action-runtime — so **`dist/` must be committed** any time the source changes.

```bash
# From the repo root
pnpm --filter testivai-action run build
git add action/dist
git commit
```

CI guards this with a step that fails any PR where `action/dist/` is out of sync with `action/src/`. If your PR errors with “action/dist/ is out of sync with src/”, run the build above and commit the result.

## Releases

Tag a clean semver release and the [Release Action workflow](../.github/workflows/release-action.yml) automatically rolls the matching major-version tag (e.g. tagging `v1.2.3` updates the `v1` tag to point at the same SHA). Pre-release tags (`v1.0.0-rc.1`) are skipped — they don't move the stable major pointer.

## License

MIT

## Links

- Repo: https://github.com/mcbuddy/testivai-oss
- Issues: https://github.com/mcbuddy/testivai-oss/issues
- Marketing: https://testiv.ai
