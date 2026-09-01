/**
 * Standalone witness mode — pure helpers for URL/page handling.
 *
 * `testivai witness <url>` captures a running app with no test suite at all:
 * routes come from config/flags or a same-origin link crawl of the start
 * page. These helpers are pure so they can be unit-tested without a browser.
 */

/** File extensions that are downloads, not pages. */
const NON_PAGE_EXTENSIONS =
  /\.(png|jpe?g|gif|svg|webp|ico|css|js|mjs|json|xml|txt|pdf|zip|tar|gz|mp[34]|webm|woff2?|ttf|eot)$/i;

/** Snapshot name from a URL path: '/' → 'home', '/pricing/plans' → 'pricing-plans'. */
export function pageNameFromUrl(url: string): string {
  const { pathname } = new URL(url);
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  if (!clean) return 'home';
  return clean
    .split('/')
    .map((segment) => segment.replace(/[^a-z0-9_-]+/gi, '_'))
    .join('-')
    .toLowerCase();
}

/** Resolve explicit page paths (from --pages or config) against the base URL. */
export function resolvePages(baseUrl: string, pages: string[]): string[] {
  const base = new URL(baseUrl);
  const resolved = pages
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => new URL(p, base).href);
  return [...new Set(resolved)];
}

/**
 * Filter raw hrefs collected from the start page down to crawlable pages:
 * same-origin, http(s), no downloads, hash stripped, deduped, capped.
 * The start URL itself is always first.
 */
export function filterCrawledLinks(startUrl: string, hrefs: string[], maxPages: number): string[] {
  const start = new URL(startUrl);
  const seen = new Set<string>();
  const pages: string[] = [];

  const push = (raw: string): void => {
    let url: URL;
    try {
      url = new URL(raw, start);
    } catch {
      return;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if (url.origin !== start.origin) return;
    if (NON_PAGE_EXTENSIONS.test(url.pathname)) return;
    url.hash = '';
    const key = url.pathname.replace(/\/+$/, '') + url.search;
    if (seen.has(key)) return;
    seen.add(key);
    pages.push(url.href);
  };

  push(startUrl);
  for (const href of hrefs) {
    if (pages.length >= maxPages) break;
    push(href);
  }
  return pages.slice(0, maxPages);
}

/** Parse a `1280x800`-style viewport flag. */
export function parseViewport(value: string): { width: number; height: number } {
  const match = /^(\d{3,5})x(\d{3,5})$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid viewport "${value}" — expected WIDTHxHEIGHT, e.g. 1280x800`);
  }
  return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
}
