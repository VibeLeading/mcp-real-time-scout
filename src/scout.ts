const MAX_TEXT = 100_000;
const FETCH_TIMEOUT_MS = 15_000;
const FEED_TTL_MS = 5 * 60 * 1000;
const FEED_CACHE_MAX = 200;

export interface FeedItem {
  title: string;
  link: string;
  date: string;
  snippet: string;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface FeedCacheEntry {
  fetchedAt: number;
  items: FeedItem[];
}

const feedCache = new Map<string, FeedCacheEntry>();

export async function fetch_url(url: string): Promise<{
  status: number;
  title: string;
  text: string;
}> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: "${url}"`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Only http(s) URLs are allowed, got "${parsed.protocol}"`);
  }

  const controller = new AbortController();
  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const signal = AbortSignal.any([controller.signal, timeout]);

  const res = await fetch(parsed, { signal, redirect: "follow" });
  const text = await res.text();
  const truncated = text.slice(0, MAX_TEXT);
  return {
    status: res.status,
    title: extractTitle(truncated),
    text: truncated,
  };
}

export async function search_web(
  query: string,
  num_results = 10,
): Promise<SearchResult[]> {
  const provider = process.env.MCP_SEARCH_PROVIDER?.trim().toLowerCase();
  const apiKey = process.env.MCP_SEARCH_API_KEY?.trim();

  if (!provider || !apiKey) {
    throw new Error(
      "No search provider configured. Set MCP_SEARCH_PROVIDER (brave | tavily) and " +
        "MCP_SEARCH_API_KEY environment variables, then restart the server.",
    );
  }

  let raw: unknown;
  if (provider === "brave") {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${num_results}`,
      { headers: { "X-Subscription-Token": apiKey } },
    );
    if (!res.ok) {
      throw new Error(`Brave Search API returned ${res.status}`);
    }
    raw = await res.json();
    return normalizeBrave(raw);
  }

  if (provider === "tavily") {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, query, max_results: num_results }),
    });
    if (!res.ok) {
      throw new Error(`Tavily API returned ${res.status}`);
    }
    raw = await res.json();
    return normalizeTavily(raw);
  }

  throw new Error(
    `Unsupported provider "${provider}". Supported: "brave" or "tavily".`,
  );
}

export function parse_feed(url: string, limit = 10): FeedItem[] {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Feed URL must be http(s).");
  }

  const cached = feedCache.get(url);
  if (cached && Date.now() - cached.fetchedAt < FEED_TTL_MS) {
    return cached.items.slice(0, limit);
  }

  return cached?.items.slice(0, limit) ?? [];
}

export function cache_feed(url: string, xml: string): FeedItem[] {
  const items = parseFeedXml(xml);

  if (feedCache.size >= FEED_CACHE_MAX) {
    const oldest = feedCache.keys().next().value;
    if (oldest !== undefined) {
      feedCache.delete(oldest);
    }
  }
  feedCache.set(url, { fetchedAt: Date.now(), items });
  return items;
}

function extractTitle(html: string): string {
  const match = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  return match ? htmlDecode(match[1]).trim() : "";
}

function htmlDecode(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function normalizeBrave(raw: unknown): SearchResult[] {
  const data = raw as {
    web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
  };
  return (data.web?.results ?? []).map((r) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    snippet: r.description ?? "",
  }));
}

function normalizeTavily(raw: unknown): SearchResult[] {
  const data = raw as {
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };
  return (data.results ?? []).map((r) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    snippet: r.content ?? "",
  }));
}

function parseFeedXml(xml: string): FeedItem[] {
  const blocks = extractBlocks(xml, ["item", "entry"]);
  return blocks.map((block) => {
    const pick = (tag: string): string => {
      const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i");
      const m = re.exec(block);
      return m ? htmlDecode(stripTags(m[1])).trim() : "";
    };
    const pickAttr = (tag: string, attr: string): string => {
      const re = new RegExp(`<${tag}[^>]*\\s+${attr}=["']([^"']*)["']`, "i");
      const m = re.exec(block);
      return m ? m[1] : "";
    };
    return {
      title: pick("title"),
      link: pick("link") || pickAttr("link", "href"),
      date: pick("pubDate") || pick("published") || pick("updated") || pick("dc:date"),
      snippet: pick("description") || pick("summary") || pick("content"),
    };
  });
}

function extractBlocks(xml: string, names: string[]): string[] {
  const blocks: string[] = [];
  for (const name of names) {
    const re = new RegExp(`<${name}[^>]*>[\\s\\S]*?<\\/${name}>`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
      blocks.push(m[0]);
    }
  }
  return blocks;
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, "").trim();
}

const DEFAULT_FEEDS: string[] = [
  "https://hnrss.org/frontpage",
  "https://www.theverge.com/rss/index.xml",
  "https://techcrunch.com/feed/",
  "https://feeds.arstechnica.com/arstechnica/index",
];

export interface TrackResult {
  feed: string;
  items: FeedItem[];
}

export function track_competitor(
  company: string,
  feeds: string[] | undefined,
  recentDays: number,
): TrackResult[] {
  const targetFeeds = feeds && feeds.length > 0 ? feeds : DEFAULT_FEEDS;
  const cutoff = Date.now() - recentDays * 24 * 60 * 60 * 1000;
  const needle = company.toLowerCase();

  const out: TrackResult[] = [];
  for (const feed of targetFeeds) {
    const items = (feedCache.get(feed)?.items ?? []).filter((item) => {
      const withinWindow = item.date === "" || Date.parse(item.date) >= cutoff;
      if (!withinWindow) return false;
      return (
        item.title.toLowerCase().includes(needle) ||
        item.snippet.toLowerCase().includes(needle)
      );
    });
    if (items.length > 0) {
      out.push({ feed, items });
    }
  }
  return out;
}
