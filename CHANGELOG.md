# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-09-05

### Fixed

- Publish/install packaging: added a `prepare` script so the server builds `dist/` automatically when installed from GitHub (e.g. `npx -y github:VibeLeading/mcp-real-time-scout`). Previously the `bin` referenced a `dist/index.js` that did not exist on install, causing the process to exit immediately.

## [Unreleased]

### Added

- NOTICE file clarifying MIT-licensed code vs the copyrighted book; expanded README license & attribution section.

## [0.1.0] - 2026-08-31

### Added

- Initial release: MCP server over stdio with `StdioServerTransport`.
- `fetch_url` tool: fetch a web page over HTTP(S) with 15s timeout and ~100k char cap.
- `search_web` tool: Brave Search API / Tavily adapter with normalized results.
- `monitor_feed` tool: zero-dependency RSS/Atom parser with in-memory LRU cache (5-min TTL).
- `track_competitor` tool: aggregate feed items mentioning a company, newest first.
