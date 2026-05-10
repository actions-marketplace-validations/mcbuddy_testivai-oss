# Changesets

This folder holds **pending changesets** — markdown files that record planned version bumps for the published packages. The Release workflow consumes them to build a "version packages" PR.

## TL;DR for contributors

If your PR changes a published package, run:

```bash
pnpm changeset
```

Pick the affected packages + bump level, write a one-line summary, commit the resulting `.changeset/*.md` file with your PR. That's it.

See [CONTRIBUTING.md](../CONTRIBUTING.md#releases--changesets) for the full release flow.

## Config

- **Independent versioning** — each published package bumps based on its own changesets. No `linked` or `fixed` groups.
- **Cascading internal-dependency bumps** — when `@testivai/witness` bumps, `witness-playwright` and `witness-webdriverio` get an automatic `patch` bump because they depend on it via `workspace:*` (`updateInternalDependencies: "patch"`).
- **Public access** — `access: "public"` so scoped `@testivai/*` packages are publishable.
- **Ignored** — `@testivai-oss/e2e` and `testivai-action` are private and never published; the changesets CLI excludes them.

See `config.json` in this folder for the full config.
