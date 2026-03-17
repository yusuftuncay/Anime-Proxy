import { Hono } from "hono";
import { logger } from "hono/logger";
import { getCookie, setCookie } from "hono/cookie";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { 
    CORS_HEADERS, 
    PASSTHROUGH_HEADERS, 
    BLACKLIST_HEADERS, 
    MEDIA_CACHE_CONTROL 
} from "./constants";
import { generateHeadersOriginal } from "./headers";
import { processM3u8Line, resolveUrl } from "./processor";
import { handleDashboard, handleStatsFragment, handleStatusBadge } from "./dashboard";

const app = new Hono();

// Global performance tracker
let requestCount = 0;
let totalResponseTime = 0;
const start_time = Date.now();

// Global performance logger & metrics collector
app.use("*", async (c, next) => {
    const start = performance.now();
    await next();
    const end = performance.now();
    requestCount++;
    totalResponseTime += (end - start);
});

// ─── Help & Info Endpoints (HTMX Enhanced) ────────────────────────────────────

app.get("/", handleDashboard);
app.get("/help", handleDashboard);

app.get("/api/stats", (c) => {
    const uptimeSeconds = Math.floor((Date.now() - start_time) / 1000);
    const avgLatency = requestCount > 0 ? (totalResponseTime / requestCount).toFixed(2) : "0";
    
    return c.html(handleStatsFragment({
        uptime: `${uptimeSeconds}s`,
        requests: requestCount,
        latency: `${avgLatency}ms`
    }));
});

app.get("/api/status", (c) => {
    return c.html(handleStatusBadge("FAST ASF"));
});

app.get("/api/info", (c) => {
    const uptimeSeconds = Math.floor((Date.now() - start_time) / 1000);
    const avgLatency = requestCount > 0 ? (totalResponseTime / requestCount).toFixed(2) : "0";

    return c.json({
        name: "Anime Proxy",
        version: "1.2.0",
        description: "Industrial-grade unified proxy for Railway/Bun.",
        uptime: `${uptimeSeconds}s`,
        requests: requestCount,
        avg_latency: `${avgLatency}ms`,
        runtime: "Bun",
        status: "Online",
        performance: "Extreme"
    }, 200, CORS_HEADERS);
});

// ─── Options Preflight ────────────────────────────────────────────────────────

app.options("*", (c) => c.body(null, 204, CORS_HEADERS));

// ─── Watch Order Logic ────────────────────────────────────────────────────────

async function getMalIdFromAnilistId(anilistId: number): Promise<number | null> {
    const query = `query ($id: Int) { Media (id: $id, type: ANIME) { idMal } }`;
    try {
        const response = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ query, variables: { id: anilistId } }),
        });
        const data = await response.json();
        return data?.data?.Media?.idMal || null;
    } catch (err) {
        console.error("AniList API error:", err);
        return null;
    }
}

async function scrapeWatchOrder(malId: number) {
    const url = `https://chiaki.site/?/tools/watch_order/id/${malId}`;
    try {
        const response = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
        });
        if (!response.ok) return null;
        const html = await response.text();
        const entries: any[] = [];
        const trRegex = /<tr[^>]+data-id="(\d+)"[^>]*>([\s\S]*?)<\/tr>/g;
        let match;

        while ((match = trRegex.exec(html)) !== null) {
            const trTag = match[0];
            const content = match[2];
            const idAttr = trTag.match(/data-id="(\d+)"/);
            const typeAttr = trTag.match(/data-type="(\d+)"/);
            const epsAttr = trTag.match(/data-eps="(\d+)"/);
            const anilistIdAttr = trTag.match(/data-anilist-id="(\d*)"/);

            if (!idAttr || !typeAttr) continue;
            const type = parseInt(typeAttr[1]);
            if (type !== 1 && type !== 3) continue;

            const titleMatch = content.match(/<span class="wo_title">([\s\S]*?)<\/span>/);
            const secondaryTitleMatch = content.match(/<span class="uk-text-small">([\s\S]*?)<\/span>/);
            const imageMatch = content.match(/style="background-image:url\('([^']+)'\)"/);
            const metaMatch = content.match(/<span class="wo_meta">([\s\S]*?)<\/span>/);
            const ratingMatch = content.match(/<span class="wo_rating">([\s\S]*?)<\/span>/);

            const metaRaw = metaMatch ? metaMatch[1].replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim() : "";
            const parts = metaRaw.split('|').map(p => p.trim()).filter(p => p && !p.includes('★'));

            let episodesCount = null, duration = null;
            const epInfo = parts[2] || "";
            if (epInfo.includes('×')) { [episodesCount, duration] = epInfo.split('×').map(s => s.trim()); }
            else if (epInfo) { duration = epInfo; }

            entries.push({
                malId: parseInt(idAttr[1]),
                anilistId: anilistIdAttr && anilistIdAttr[1] ? parseInt(anilistIdAttr[1]) : null,
                title: titleMatch ? titleMatch[1].trim() : "Unknown",
                secondaryTitle: secondaryTitleMatch ? secondaryTitleMatch[1].trim() : null,
                type: type === 1 ? "TV" : "Movie",
                episodes: epsAttr ? parseInt(epsAttr[1]) : 0,
                image: imageMatch ? `https://chiaki.site/${imageMatch[1]}` : null,
                metadata: { date: parts[0] || null, type: parts[1] || null, episodes: episodesCount, duration: duration },
                rating: ratingMatch ? ratingMatch[1].trim() : null
            });
        }
        return entries;
    } catch (err) {
        console.error("Scraping error:", err);
        return null;
    }
}

app.get("/api/watch-order", async (c) => {
    const id = c.req.query("id");
    if (!id) return c.json({ error: "Missing anilistId" }, 400, CORS_HEADERS);
    const malId = await getMalIdFromAnilistId(parseInt(id));
    if (!malId) return c.json({ error: "MAL ID not found" }, 404, CORS_HEADERS);
    const data = await scrapeWatchOrder(malId);
    if (!data) return c.json({ error: "Scraping failed" }, 502, CORS_HEADERS);
    return c.json(data, 200, { ...CORS_HEADERS, "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" });
});

// ─── Unified Proxy Routine ────────────────────────────────────────────────────

app.all("*", async (c) => {
    const method = c.req.method;
    if (method !== "GET" && method !== "POST") return c.text("Method not allowed", 405, CORS_HEADERS);

    const path = c.req.path;
    const targetUrlRaw = c.req.query("url");

    // Relative redirection recovery
    if (!targetUrlRaw) {
        const lastHost = getCookie(c, "_last_requested");
        if (lastHost) {
            const remainingPath = path.startsWith("/api") ? path.slice(4) : path;
            const redirectUrl = `/?url=${encodeURIComponent(lastHost + (remainingPath.startsWith("/") ? "" : "/") + remainingPath)}${c.req.url.split("?")[1] ? "&" + c.req.url.split("?")[1] : ""}`;
            return c.redirect(redirectUrl);
        }
        return c.text("Missing URL parameter", 400, CORS_HEADERS);
    }

    let targetUrl: URL;
    try { targetUrl = new URL(targetUrlRaw); } catch { return c.text(`Invalid URL: ${targetUrlRaw}`, 400, CORS_HEADERS); }

    const originParam = c.req.query("origin");
    const headersParam = c.req.query("headers");
    const jsonParam = c.req.query("json");

    const upstreamHeaders = generateHeadersOriginal(targetUrl, originParam);

    // Forward Range and standard headers
    const clientHeaders = c.req.raw.headers;
    for (const h of ["range", "if-range", "if-none-match", "if-modified-since", "content-type"]) {
        const val = clientHeaders.get(h);
        if (val) upstreamHeaders[h] = val;
    }

    if (headersParam) {
        try {
            const parsed = JSON.parse(headersParam);
            for (const [k, v] of Object.entries(parsed)) { upstreamHeaders[k.toLowerCase()] = String(v); }
        } catch { /* ignore */ }
    }

    let body: any = null;
    if (method === "POST") {
        body = jsonParam ? jsonParam : await c.req.arrayBuffer();
        if (jsonParam) upstreamHeaders["content-type"] = "application/json";
    }

    let upstream: Response;
    try {
        upstream = await fetch(targetUrl.href, {
            method,
            headers: upstreamHeaders,
            body,
            redirect: "manual",
            // @ts-ignore
            tls: { rejectUnauthorized: false },
        });
    } catch (err) {
        console.error(`Failed to fetch ${targetUrl.href}:`, err);
        return c.text("Failed to fetch target URL", 502, CORS_HEADERS);
    }

    // Set cookie for relative redirection recovery
    const urlBase = `${targetUrl.protocol}//${targetUrl.host}${targetUrl.pathname.substring(0, targetUrl.pathname.lastIndexOf("/"))}`;
    setCookie(c, "_last_requested", urlBase, { maxAge: 3600, httpOnly: true, path: "/", sameSite: "Lax" });

    // Handle 3xx Redirects
    if (upstream.status >= 300 && upstream.status < 400) {
        const location = upstream.headers.get("location");
        if (location) {
            const resolvedLocation = resolveUrl(location, targetUrl);
            return c.redirect(`/?url=${encodeURIComponent(resolvedLocation.href)}`, upstream.status as any);
        }
    }

    const responseHeaders: Record<string, string> = { ...CORS_HEADERS };
    for (const [name, value] of upstream.headers.entries()) {
        if (!BLACKLIST_HEADERS.includes(name.toLowerCase())) { responseHeaders[name] = value; }
    }

    // High Performance Caching for Segments
    responseHeaders["Cache-Control"] = MEDIA_CACHE_CONTROL;

    const contentType = (upstream.headers.get("content-type") ?? "").toLowerCase();
    const isM3u8 = contentType.includes("mpegurl") || targetUrl.pathname.toLowerCase().endsWith(".m3u8");

    if (isM3u8) {
        const textBody = await upstream.text();
        if (textBody.trimStart().startsWith("#EXTM3U")) {
            const rewritten = textBody.split("\n").map((line) => processM3u8Line(line.replace(/\r$/, ""), targetUrl, originParam)).join("\n");
            return c.body(rewritten, upstream.status as ContentfulStatusCode, { ...responseHeaders, "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-cache, no-store, must-revalidate" });
        }
    }

    return c.body(upstream.body as ReadableStream, upstream.status as ContentfulStatusCode, responseHeaders);
});

const port = parseInt(process.env.PORT || "8080", 10);
console.log(`🚀 Proxy alive on http://0.0.0.0:${port}`);

export default {
    port,
    hostname: "0.0.0.0",
    fetch: app.fetch,
};
