# Changelog

All notable changes to testivai-action will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.10] - 2026-07-14

### Added
- `status-context` input to customize the commit status context (default `TestivAI / visual`), so repos with multiple visual lanes (e.g. Playwright + pytest) can post separate statuses instead of overwriting each other. A non-default context also namespaces the PR comment upsert marker, giving each lane its own comment; the default context keeps the legacy marker so existing PR comments continue to update in place

## [1.0.0] - 2025-04-12

### Added
- Initial release
- GitHub Action for posting TestivAI visual reports
- Support for local mode results.json
- Markdown comment generation with emoji summary
- Configurable report directory
- Configurable artifact retention
