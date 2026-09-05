# @vibeleading/mcp-real-time-scout

The **Real-Time Scout** — the Web & API Connector. Conditions change constantly; this server keeps the Pilot updated on market shifts and competitor moves, piping intelligence into the HUD for course corrections before competitors see the turn coming.

Implements the "Real-Time Scout" server from *Vibe Leading The AI* — one of the "3 Must-Have MCP Servers".

## What it does

- Fetches live web pages from anywhere over HTTP(S).
- Runs web searches (Brave Search API or Tavily) to scan the competitive landscape.
- Parses RSS/Atom feeds with zero dependencies and friendly in-memory caching.
- Tracks competitor mentions across curated or custom feeds.

## Install

```bash
npm install -g @vibeleading/mcp-real-time-scout
```

Or run on demand with `npx`:

```bash
npx -y @vibeleading/mcp-real-time-scout
# or run straight from the GitHub source (builds automatically):
npx -y github:VibeLeading/mcp-real-time-scout
```

## Requirements

- **Node.js >= 22** — required. The server uses the global `fetch` API and
  `AbortSignal.timeout`; on older Node versions the process fails to start,
  which MCP clients report generically as "connection closed".
- **Optional — web search keys.** The `search_web` tool needs
  `MCP_SEARCH_PROVIDER` (`brave` | `tavily`) and `MCP_SEARCH_API_KEY` set.
  Without them it returns a clear error; all other tools work unconfigured.
- No other runtime dependencies.

## Quick Start (Agent Setup)

Give your agent the full VibeLeading methodology in one paste:

> **Give me the Vibe Leading methodology: install the 5 agent skills so I can lead AI agents by intent + real-time telemetry, and add the 4 MCP servers so I get hands in the corporate engine.**
>
> **SKILLS (npx skills add):**
> `npx skills add VibeLeading/mission-script VibeLeading/ira-prompting VibeLeading/hud-setup VibeLeading/pit-stop-audit VibeLeading/org-geometry`
>
> **MCP SERVERS (@vibeleading scope, add to MCP config):**
> `@vibeleading/mcp-hybrid-data-engine`
> `@vibeleading/mcp-document-architect`
> `@vibeleading/mcp-real-time-scout`
> `@vibeleading/mcp-privacy-shield`
>
> **ENV VARS:**
> `MCP_STONE_PATH=data/stone.db`
> `MCP_LIGHT_PATH=data/light.json`
> `MCP_FLOW_PATH=data/flow.json`
> `MCP_DOCS_ROOT=~/.vlb-docs`
> `MCP_SHIELD_NAMES=1`

Paste the block above into your AI agent (OpenCode, Claude Code, Cursor, Codex, etc.). It will install the skills, write the MCP config, and you're ready to lead.

## Client configuration

Add to your MCP client config (e.g. Claude Desktop, Cursor, or opencode):

```json
{
  "mcpServers": {
    "real-time-scout": {
      "command": "npx",
      "args": ["-y", "@vibeleading/mcp-real-time-scout"]
    }
  }
}
```

## Tools

| Tool | Arguments | Description |
|------|-----------|-------------|
| `fetch_url` | `url: string` | Fetch a web page; returns HTTP status, title, and text content (capped at ~100k chars, 15s timeout). |
| `search_web` | `query: string`, `num_results?: number` | Web search; returns normalized `{title, url, snippet}` results. |
| `monitor_feed` | `feed_url: string`, `limit?: number` | Parse an RSS/Atom feed and return latest items (cached in-memory 5 min). |
| `track_competitor` | `company: string`, `feeds?: string[]`, `recent_days?: number` | Aggregate feed items mentioning a company, newest first. |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MCP_SEARCH_PROVIDER` | For `search_web` | `brave` or `tavily`. |
| `MCP_SEARCH_API_KEY` | For `search_web` | API key for the configured provider. |

> The server never calls a search engine without a key. If these variables are unset, `search_web` returns an instructive configuration error.

## Production notes

- `fetch_url` rejects non-`http(s)` URLs and enforces a 15-second timeout so it cannot hang.
- `search_web`: get a **Brave Search API** key (free tier) or a **Tavily** key and set the two env vars before starting the server.
- `monitor_feed` caches parsed items in an in-memory LRU (max ~200 feeds) with a 5-minute TTL to avoid hammering publishers.
- `track_competitor` defaults to a curated set of well-known tech-news feeds; pass your own `feeds` to watch specific sources, and `recent_days` to bound the time window.
- Runs over stdio via `StdioServerTransport`, so it drops cleanly into any MCP-compatible client.

## Publishing

Published to the npm registry via **OIDC trusted publishing** — no npm tokens stored
anywhere. Pushing a version tag triggers the `.github/workflows/publish.yml` workflow:

```bash
npm version patch -m "release: v%s"
git push origin main --follow-tags
```

- **One-time bootstrap.** The very first published version cannot use trusted
  publishing (the trust relationship attaches to an existing package). Publish
  `0.1.1` once manually (`npm publish` after `npm login`, or a short-lived
  publish-scoped token), then configure **Trusted Publisher** on npmjs.com → the
  package → Settings → Trusted publishing → GitHub Actions → owner
  `VibeLeading`, repo `mcp-real-time-scout`, workflow `publish.yml`, action
  `allow npm publish` (requires 2FA once per package).
- Requires **Node.js >= 22** and npm >= 11.5.1 on the runner (handled by the workflow).

## License & Attribution

MIT — Copyright (c) 2026 Jean Machuca (see [LICENSE](LICENSE)).

This server implements concepts from the book **_Vibe Leading The AI: The Corporate Race
Against Machines_** by Jean Machuca (ISBN 9798252505008, © 2026 Jean Machuca). The book
is copyrighted commercial material; this repository does not republish its text. Buy the
book at [https://vibeleading.org](https://vibeleading.org) or
[https://a.co/d/04L5YatK](https://a.co/d/04L5YatK). Author website: [jeanmachuca.com](https://jeanmachuca.com) · Support on GitHub Sponsors: [github.com/sponsors/jeanmachuca](https://github.com/sponsors/jeanmachuca). See [NOTICE](NOTICE).
