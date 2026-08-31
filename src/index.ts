#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  fetch_url,
  search_web,
  parse_feed,
  cache_feed,
  track_competitor,
} from "./scout.js";

const server = new McpServer({
  name: "mcp-real-time-scout",
  version: "0.1.0",
});

server.tool(
  "fetch_url",
  "Fetch a web page over HTTP(S), returning HTTP status, title, and text content. " +
    "Useful to keep the HUD updated on a market page, competitor landing page, or release notes.",
  { url: z.string().describe("The http(s) URL to fetch.") },
  async ({ url }) => {
    try {
      const { status, title, text } = await fetch_url(url);
      return {
        content: [
          {
            type: "text" as const,
            text: `Status: ${status}\nTitle: ${title}\n\n${text}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          { type: "text" as const, text: `Error: ${(err as Error).message}` },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  "search_web",
  "Search the web for a query and return normalized results (title, url, snippet). " +
    "Requires MCP_SEARCH_PROVIDER and MCP_SEARCH_API_KEY to be configured.",
  {
    query: z.string().describe("The search query."),
    num_results: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe("Number of results to return (default 10)."),
  },
  async ({ query, num_results }) => {
    try {
      const results = await search_web(query, num_results);
      const lines = results.map(
        (r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`,
      );
      return {
        content: [
          {
            type: "text" as const,
            text: lines.length ? lines.join("\n\n") : "No results found.",
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          { type: "text" as const, text: `Error: ${(err as Error).message}` },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  "monitor_feed",
  "Parse and return the latest items from an RSS/Atom feed. " +
    "Results are cached in-memory for 5 minutes to be friendly.",
  {
    feed_url: z.string().describe("The RSS/Atom feed URL to parse."),
    limit: z.number().int().min(1).max(50).optional().default(10),
  },
  async ({ feed_url, limit }) => {
    try {
      let items = parse_feed(feed_url);
      if (items.length === 0) {
        const { text } = await fetch_url(feed_url);
        items = cache_feed(feed_url, text);
      }
      const shown = items.slice(0, limit);
      if (shown.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No items found in feed." }],
        };
      }
      const lines = shown.map(
        (it) => `Title: ${it.title}\nLink: ${it.link}\nDate: ${it.date}\nSnippet: ${it.snippet}`,
      );
      return {
        content: [{ type: "text" as const, text: lines.join("\n\n") }],
      };
    } catch (err) {
      return {
        content: [
          { type: "text" as const, text: `Error: ${(err as Error).message}` },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  "track_competitor",
  "Aggregate latest items from a set of feeds (or curated defaults), filter mentions " +
    "of a competitor company, and return matches sorted newest first.",
  {
    company: z.string().describe("Company name to search for in feeds."),
    feeds: z
      .array(z.string())
      .optional()
      .describe("Optional list of feed URLs; uses curated defaults if omitted."),
    recent_days: z.number().int().min(1).max(365).optional().default(7),
  },
  async ({ company, feeds, recent_days }) => {
    try {
      const result = track_competitor(company, feeds, recent_days);
      if (result.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No mentions of "${company}" found in the last ${recent_days} days.`,
            },
          ],
        };
      }
      const sections = result.map(({ feed, items }) => {
        const lines = items
          .map((it) => `- ${it.title} (${it.link}) [${it.date}]`)
          .join("\n");
        return `Feed: ${feed}\n${lines}`;
      });
      return { content: [{ type: "text" as const, text: sections.join("\n\n") }] };
    } catch (err) {
      return {
        content: [
          { type: "text" as const, text: `Error: ${(err as Error).message}` },
        ],
        isError: true,
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(`mcp-real-time-scout failed: ${err}`);
  process.exit(1);
});
