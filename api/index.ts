import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { handle } from "hono/vercel";

export const config = {
    runtime: "edge",
};

// ─── Default headers for upstream requests ────────────────────────────────────
const DEFAULT_HEADERS: Record<string, string> = {
    "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0",
    accept: "*/*",
    "accept-language": "en-US,en;q=0.5",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
};

interface DomainGroup {
    patterns: RegExp[];
    origin: string;
    referer: string;
    customHeaders?: Record<string, string>;
}

const DOMAIN_GROUPS: DomainGroup[] = [
    {
        patterns: [/\.padorupado\.ru$/i, /\.kwikie\.ru$/i],
        origin: "https://kwik.si",
        referer: "https://kwik.si/",
        customHeaders: { "cache-control": "no-cache", pragma: "no-cache" },
    },
    {
        patterns: [/\.streamtape\.to$/i],
        origin: "https://streamtape.to",
        referer: "https://streamtape.to/",
    },
    {
        patterns: [/vidcache\.net$/i],
        origin: "https://www.animegg.org",
        referer: "https://www.animegg.org/",
    },
    {
        patterns: [
            /krussdomi\.com$/i,
            /revolutionizingtheweb\.xyz$/i,
            /nextgentechnologytrends\.xyz$/i,
            /smartinvestmentstrategies\.xyz$/i,
            /creativedesignstudioxyz\.xyz$/i,
            /breakingdigitalboundaries\.xyz$/i,
            /ultimatetechinnovation\.xyz$/i,
        ],
        origin: "https://krussdomi.com",
        referer: "https://krussdomi.com/",
    },
    {
        patterns: [/(?:^|\.)owocdn\.top$/i],
        origin: "https://kwik.cx",
        referer: "https://kwik.cx/",
    },
    {
        patterns: [/\.akamaized\.net$/i],
        origin: "https://players.akamai.com",
        referer: "https://players.akamai.com/",
    },
    {
        patterns: [
            /(?:^|\.)shadowlandschronicles\./i,
            /digitalshinecollective\.xyz$/i,
            /thrivequesthub\.xyz$/i,
            /novaedgelabs\.xyz$/i,
        ],
        origin: "https://cloudnestra.com",
        referer: "https://cloudnestra.com/",
    },
    {
        patterns: [/(?:^|\.)viddsn\./i, /\.anilike\.cyou$/i],
        origin: "https://vidwish.live/",
        referer: "https://vidwish.live/",
    },
    {
        patterns: [/(?:^|\.)watching\.onl$/i],
        origin: "https://megaplay.buzz",
        referer: "https://megaplay.buzz/",
    },
    {
        patterns: [/(?:^|\.)dotstream\./i, /(?:^|\.)playcloud1\./i],
        origin: "https://megaplay.buzz/",
        referer: "https://megaplay.buzz/",
    },
    {
        patterns: [/\.cloudfront\.net$/i],
        origin: "https://d2zihajmogu5jn.cloudfront.net",
        referer: "https://d2zihajmogu5jn.cloudfront.net/",
    },
    {
        patterns: [/\.ttvnw\.net$/i],
        origin: "https://www.twitch.tv",
        referer: "https://www.twitch.tv/",
    },
    {
        patterns: [/\.xx\.fbcdn\.net$/i],
        origin: "https://www.facebook.com",
        referer: "https://www.facebook.com/",
    },
    {
        patterns: [/\.anih1\.top$/i, /\.xyk3\.top$/i],
        origin: "https://ee.anih1.top",
        referer: "https://ee.anih1.top/",
    },
    {
        patterns: [/\.premilkyway\.com$/i],
        origin: "https://uqloads.xyz",
        referer: "https://uqloads.xyz/",
    },
    {
        patterns: [/\.streamcdn\.com$/i],
        origin: "https://anime.uniquestream.net",
        referer: "https://anime.uniquestream.net/",
    },
    {
        patterns: [
            /\.raffaellocdn\.net$/i,
            /\.feetcdn\.com$/i,
            /clearskydrift45\.site$/i,
        ],
        origin: "https://kerolaunochan.online",
        referer: "https://kerolaunochan.online/",
    },
    {
        patterns: [
            /dewbreeze84\.online$/i,
            /cloudydrift38\.site$/i,
            /sunshinerays93\.live$/i,
            /clearbluesky72\.wiki$/i,
            /breezygale56\.online$/i,
            /frostbite27\.pro$/i,
            /frostywinds57\.live$/i,
            /icyhailstorm64\.wiki$/i,
            /icyhailstorm29\.online$/i,
            /windflash93\.xyz$/i,
            /stormdrift27\.site$/i,
            /tempestcloud61\.wiki$/i,
            /sunburst66\.pro$/i,
            /douvid\.xyz$/i,
        ],
        origin: "https://megacloud.blog",
        referer: "https://megacloud.blog/",
        customHeaders: { "cache-control": "no-cache", pragma: "no-cache" },
    },
    {
        patterns: [/\.echovideo\.to$/i],
        origin: "https://aniwave.se",
        referer: "https://aniwave.se/",
    },
    {
        patterns: [/\.vid-cdn\.xyz$/i],
        origin: "https://anizone.to/",
        referer: "https://anizone.to/",
    },
    {
        patterns: [/\.1stkmgv1\.com$/i],
        origin: "https://animeyy.com",
        referer: "https://animeyy.com/",
    },
    {
        patterns: [/ninstream\.com$/i],
        origin: "https://senshi.live",
        referer: "https://senshi.live/",
    },
    {
        patterns: [/video1\.cdnlibs\.org$/i, /cdnlibs\.org$/i],
        origin: "https://v3.animelib.org",
        referer: "https://v3.animelib.org/",
    },
    {
        patterns: [/kodik\.info$/i, /kodik\.cc$/i],
        origin: "https://kodik.info",
        referer: "https://kodik.info/",
    },
    {
        patterns: [/video\.sibnet\.ru$/i],
        origin: "https://video.sibnet.ru",
        referer: "https://video.sibnet.ru/",
    },
    {
        patterns: [/filemoon\.sx$/i, /filemoon\.to$/i, /filemoon\.in$/i],
        origin: "https://filemoon.sx",
        referer: "https://filemoon.sx/",
    },
    {
        patterns: [/doodstream\.com$/i, /dood\.wf$/i, /dood\.re$/i, /d0000d\.com$/i],
        origin: "https://doodstream.com",
        referer: "https://doodstream.com/",
    },
    {
        patterns: [/streamwish\.to$/i, /streamwish\.com$/i, /swdyu\.com$/i],
        origin: "https://streamwish.to",
        referer: "https://streamwish.to/",
    },
    {
        patterns: [/kisskh\.co$/i],
        origin: "https://kisskh.co",
        referer: "https://kisskh.co/",
    },
    {
        patterns: [/watchanimeworld\.in$/i],
        origin: "https://watchanimeworld.in",
        referer: "https://watchanimeworld.in/",
    },
    {
        patterns: [/animeworld\.ac$/i, /animeworld\.so$/i],
        origin: "https://animeworld.ac",
        referer: "https://animeworld.ac/",
    },
    {
        patterns: [/anicrush\.to$/i],
        origin: "https://anicrush.to",
        referer: "https://anicrush.to/",
        customHeaders: { "x-requested-with": "XMLHttpRequest" },
    },
    {
        patterns: [/anikai\.to$/i, /animekai\.to$/i],
        origin: "https://anikai.to",
        referer: "https://anikai.to/",
    },
    {
        patterns: [/1movies\.bz$/i],
        origin: "https://1movies.bz",
        referer: "https://1movies.bz/",
    },
    {
        patterns: [/monoschinos2\.net$/i, /monoschinos\.net$/i],
        origin: "https://wvv.monoschinos2.net",
        referer: "https://wvv.monoschinos2.net/",
        customHeaders: { "x-requested-with": "XMLHttpRequest" },
    },
    {
        patterns: [/veranimes\.net$/i],
        origin: "https://wwv.veranimes.net",
        referer: "https://wwv.veranimes.net/",
    },
    {
        patterns: [/animetoast\.cc$/i],
        origin: "https://www.animetoast.cc",
        referer: "https://www.animetoast.cc/",
    },
    {
        patterns: [/animeler\.pw$/i, /play\.animeler\.pw$/i],
        origin: "https://play.animeler.pw",
        referer: "https://play.animeler.pw/",
    },
    {
        patterns: [/vidlink\.pro$/i],
        origin: "https://vidlink.pro",
        referer: "https://vidlink.pro/",
    },
    {
        patterns: [/poseidonhd2\.co$/i],
        origin: "https://poseidonhd2.co",
        referer: "https://poseidonhd2.co/",
    },
    {
        patterns: [/kaa\.lt$/i, /kickass-anime\.ro$/i],
        origin: "https://kickass-anime.ro",
        referer: "https://kickass-anime.ro/",
    },
    {
        patterns: [/mangacloud\.org$/i],
        origin: "https://mangacloud.org",
        referer: "https://mangacloud.org/",
    },
    {
        patterns: [/mangapub\.com$/i],
        origin: "https://mangapub.com",
        referer: "https://mangapub.com/",
    },
    {
        patterns: [/fireani\.me$/i],
        origin: "https://fireani.me",
        referer: "https://fireani.me/",
    },
    {
        patterns: [/aniwatchtv\.to$/i],
        origin: "https://aniwatchtv.to",
        referer: "https://aniwatchtv.to/",
    },
    {
        patterns: [
            /lightningspark77\.pro$/i,
            /thunderwave48\.xyz$/i,
            /stormwatch95\.site$/i,
            /windyrays29\.online$/i,
            /thunderstrike77\.online$/i,
            /lightningflash39\.live$/i,
            /cloudburst82\.xyz$/i,
            /drizzleshower19\.site$/i,
            /rainstorm92\.xyz$/i,
        ],
        origin: "https://megacloud.club",
        referer: "https://megacloud.club/",
    },
    {
        patterns: [
            /cloudburst99\.xyz$/i,
            /frostywinds73\.pro$/i,
            /stormwatch39\.live$/i,
            /sunnybreeze16\.live$/i,
            /mistydawn62\.pro$/i,
            /lightningbolt21\.live$/i,
            /gentlebreeze85\.xyz$/i,
        ],
        origin: "https://videostr.net",
        referer: "https://videostr.net/",
    },
    {
        patterns: [/vmeas\.cloud$/i],
        origin: "https://vidmoly.to",
        referer: "https://vidmoly.to/",
    },
    {
        patterns: [/nextwaveinitiative\.xyz$/i],
        origin: "https://edgedeliverynetwork.org",
        referer: "https://edgedeliverynetwork.org/",
    },
    {
        patterns: [
            /lightningbolts\.ru$/i,
            /lightningbolt\.site$/i,
            /vyebzzqlojvrl\.top$/i,
        ],
        origin: "https://vidsrc.cc",
        referer: "https://vidsrc.cc/",
    },
    {
        patterns: [/vidlvod\.store$/i],
        origin: "https://vidlink.pro",
        referer: "https://vidlink.pro/",
    },
    {
        patterns: [/sunnybreeze16\.live$/i],
        origin: "https://megacloud.store",
        referer: "https://megacloud.store/",
    },
    {
        patterns: [
            /heatwave90\.pro$/i,
            /humidmist27\.wiki$/i,
            /frozenbreeze65\.live$/i,
            /drizzlerain73\.online$/i,
            /sunrays81\.xyz$/i,
        ],
        origin: "https://kerolaunochan.live",
        referer: "https://kerolaunochan.live/",
    },
    {
        patterns: [/\.vkcdn5\.com$/i],
        origin: "https://vkspeed.com",
        referer: "https://vkspeed.com/",
    },
    {
        patterns: [/embed\.su$/i, /usbigcdn\.cc$/i, /\.congacdn\.cc$/i],
        origin: "https://embed.su",
        referer: "https://embed.su/",
    },
    {
        patterns: [/hls\.kr$/i, /hls\.kr\.direct$/i],
        origin: "https://hls.kr",
        referer: "https://hls.kr/",
    },
    {
        patterns: [/(?:^|\.)vidhosters\.com$/i],
        origin: "https://vidhosters.com",
        referer: "https://vidhosters.com/",
    },
    {
        patterns: [/(?:^|\.)pahe\.la$/i, /(?:^|\.)pahe\.li$/i],
        origin: "https://pahe.la",
        referer: "https://pahe.la/",
    },
];

// Cache hostname -> domain group to avoid regex scan per request
const domainGroupCache = new Map<string, DomainGroup | null>();
const CACHE_MAX = 512;

function findDomainGroup(hostname: string): DomainGroup | null {
    const cached = domainGroupCache.get(hostname);
    if (cached !== undefined) return cached;
    const group = DOMAIN_GROUPS.find((g) =>
        g.patterns.some((re) => re.test(hostname))
    ) ?? null;
    if (domainGroupCache.size >= CACHE_MAX) {
        const first = domainGroupCache.keys().next().value;
        if (first !== undefined) domainGroupCache.delete(first);
    }
    domainGroupCache.set(hostname, group);
    return group;
}

function generateHeadersForUrl(
    url: URL,
): Record<string, string> {
    const headers: Record<string, string> = { ...DEFAULT_HEADERS };

    const group = findDomainGroup(url.hostname);

    if (group) {
        headers["origin"] = group.origin;
        headers["referer"] = group.referer;
        if (group.customHeaders) {
            Object.assign(headers, group.customHeaders);
        }
    } else {
        const origin = url.origin;
        headers["origin"] = origin;
        headers["referer"] = `${origin}/`;
    }

    return headers;
}

// ─── CORS constants ───────────────────────────────────────────────────────────
const CORS_HEADERS: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
    "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Range, X-Requested-With, Origin, Referer, Accept, Accept-Encoding, Accept-Language, Cache-Control, Pragma, Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site, Sec-Ch-Ua, Sec-Ch-Ua-Mobile, Sec-Ch-Ua-Platform, Connection",
    "Access-Control-Expose-Headers":
        "Content-Length, Content-Range, Accept-Ranges, Content-Type, Cache-Control, Expires, Vary, ETag, Last-Modified",
    "Access-Control-Max-Age": "86400",
    "Cross-Origin-Resource-Policy": "cross-origin",
    Vary: "Origin",
};

const PASSTHROUGH_HEADERS = new Set([
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "cache-control",
    "expires",
    "last-modified",
    "etag",
    "vary",
]);

// Headers to remove from the upstream response before sending to client
const BLACKLIST_HEADERS = new Set([
    "vary",
    "content-encoding",
    "transfer-encoding",
    "content-length",
    "connection",
    "server",
]);

function resolveUrl(line: string, base: URL): URL {
    try {
        return new URL(line);
    } catch {
        return new URL(line, base);
    }
}

function buildProxyQuery(url: URL, debugEnabled = false): string {
    let q = "url=" + encodeURIComponent(url.href);
    if (debugEnabled) q += "&debug=1";
    return q;
}

function extractManifestDebug(textBody: string) {
    const lines = textBody.split("\n").map((line) => line.replace(/\r$/, ""));
    const streamLines = lines.filter((line) => line.startsWith("#EXT-X-STREAM-INF"));
    const codecs = streamLines
        .map((line) => line.match(/CODECS="([^"]+)"/)?.[1] ?? null)
        .filter((value): value is string => Boolean(value));

    return {
        lineCount: lines.length,
        variantCount: streamLines.length,
        codecs: [...new Set(codecs)].slice(0, 8),
        preview: lines.filter((line) => line.startsWith("#EXT")).slice(0, 8),
    };
}

function extractQuotedAttr(s: string, valueStart: number): [string, number] | null {
    if (s[valueStart] !== '"') return null;
    const closeQuote = s.indexOf('"', valueStart + 1);
    if (closeQuote === -1) return null;
    return [s.slice(valueStart + 1, closeQuote), closeQuote + 1];
}

function rewriteUriAttrs(attrs: string, scrapeUrl: URL, debugEnabled = false): string {
    let result = "";
    let i = 0;
    while (i < attrs.length) {
        const eqPos = attrs.indexOf("=", i);
        if (eqPos === -1) { result += attrs.slice(i); break; }
        const key = attrs.slice(i, eqPos);
        const afterEq = eqPos + 1;
        if ((key === "URI" || key === "URL") && attrs[afterEq] === '"') {
            const parsed = extractQuotedAttr(attrs, afterEq);
            if (parsed) {
                const [value, afterClose] = parsed;
                const resolved = resolveUrl(value, scrapeUrl);
                const q = buildProxyQuery(resolved, debugEnabled);
                result += `${key}="/?${q}"`;
                i = afterClose;
                continue;
            }
        }
        if (attrs[afterEq] === '"') {
            const parsed = extractQuotedAttr(attrs, afterEq);
            if (parsed) {
                const [, afterClose] = parsed;
                result += attrs.slice(i, afterClose);
                i = afterClose;
                continue;
            }
        }
        const commaPos = attrs.indexOf(",", afterEq);
        if (commaPos === -1) { result += attrs.slice(i); break; }
        result += attrs.slice(i, commaPos + 1);
        i = commaPos + 1;
    }
    return result;
}

function processM3u8Line(
    line: string,
    scrapeUrl: URL,
    debugEnabled = false,
): string {
    if (line.length === 0) return "";

    if (line[0] === "#") {
        if (line.length > 20 && (line.includes('URI="') || line.includes('URL="'))) {
            const colonPos = line.indexOf(":");
            if (colonPos !== -1) {
                const prefix = line.slice(0, colonPos + 1);
                const attrs = line.slice(colonPos + 1);
                return prefix + rewriteUriAttrs(attrs, scrapeUrl, debugEnabled);
            }
        }
        return line;
    }

    const resolved = resolveUrl(line, scrapeUrl);
    const q = buildProxyQuery(resolved, debugEnabled);
    return `/?${q}`;
}

// ─── Hono app ─────────────────────────────────────────────────────────────────
const app = new Hono();

// Forward options to handle preflights
app.options("*", (c) => c.body(null, 204, CORS_HEADERS));

function handleInfo(c: any) {
    return c.json({
        name: "Anime Proxy",
        version: "1.1.0",
        description: "High-performance M3U8 and binary proxy for anime streaming.",
        status: "Online",
        endpoints: {
            proxy: {
                path: "/api",
                method: "GET | POST",
                description: "Main proxy route. Expects 'url' parameter.",
                status: "Operational"
            },
            debug_manifest: {
                path: "/api/debug-manifest",
                method: "GET",
                description: "Analyse M3U8 manifest structure and debug segments.",
                status: "Operational"
            },
            info: {
                path: "/api/info",
                method: "GET",
                description: "Project metadata and endpoint documentation.",
                status: "Operational"
            }
        }
    }, 200, CORS_HEADERS);
}

app.get("/api/info", handleInfo);
app.get("/info", handleInfo);

app.get("/api/debug-manifest", async (c) => {
    const targetUrlRaw = c.req.query("url");
    if (!targetUrlRaw) {
        return c.json({ error: "Missing url parameter" }, 400, CORS_HEADERS);
    }

    let targetUrl: URL;
    try {
        targetUrl = new URL(targetUrlRaw);
    } catch {
        return c.json({ error: "Invalid url parameter" }, 400, CORS_HEADERS);
    }

    const upstreamHeaders = generateHeadersForUrl(targetUrl);

    try {
        const upstream = await fetch(targetUrl.href, {
            headers: upstreamHeaders,
            redirect: "manual",
        });
        const contentType = upstream.headers.get("content-type") ?? "";
        const textBody = await upstream.text();

        return c.json({
            upstreamUrl: targetUrl.href,
            contentType,
            status: upstream.status,
            ...extractManifestDebug(textBody),
        }, 200, CORS_HEADERS);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return c.json({ error: errorMessage }, 502, CORS_HEADERS);
    }
});

// Main handler for both GET and POST
app.all("*", async (c) => {
    const method = c.req.method;
    if (method !== "GET" && method !== "POST") {
        return c.text("Method not allowed", 405, CORS_HEADERS);
    }

    const path = c.req.path;
    const targetUrlRaw = c.req.query("url");
    const debugEnabled = c.req.query("debug") === "1";

    // ── Handle requests without 'url' param ────────────────────────────
    if (!targetUrlRaw) {
        if (path === "/" || path === "/api" || path === "/api/") {
            return handleInfo(c);
        }

        // Attempt relative redirection using the last host cookie
        const lastHost = getCookie(c, "_last_requested");
        if (lastHost) {
            const remainingPath = path.startsWith("/api") ? path.slice(4) : path;
            const separator = remainingPath.startsWith("/") ? "" : "/";
            const redirectTarget = new URL(lastHost + separator + remainingPath);
            const redirectUrl = `/?${buildProxyQuery(redirectTarget, debugEnabled)}`;
            return c.redirect(redirectUrl);
        }

        return c.text("Missing URL parameter", 400, CORS_HEADERS);
    }

    // ── Validate target URL ─────────────────────────────────────────────
    let targetUrl: URL;
    try {
        targetUrl = new URL(targetUrlRaw);
    } catch {
        return c.text(`Invalid URL: ${targetUrlRaw}`, 400, CORS_HEADERS);
    }

    const headersParam = c.req.query("headers");
    const jsonParam = c.req.query("json");

    // ── Build upstream request ──────────────────────────────────────────
    const upstreamHeaders = generateHeadersForUrl(targetUrl);

    // Forward client headers (Range, etc.)
    const clientHeaders = c.req.raw.headers;
    for (const h of ["range", "if-range", "if-none-match", "if-modified-since"]) {
        const val = clientHeaders.get(h);
        if (val) upstreamHeaders[h] = val;
    }

    // Add custom headers from query
    if (headersParam) {
        try {
            const parsed = JSON.parse(headersParam);
            for (const [k, v] of Object.entries(parsed)) {
                const key = k.toLowerCase();
                // Never let the client override origin/referer — domain group logic owns those
                if (key === "origin" || key === "referer") continue;
                upstreamHeaders[key] = String(v);
            }
        } catch { /* ignore */ }
    }

    // Handle POST data
    let body: any = null;
    if (method === "POST") {
        if (jsonParam) {
            body = jsonParam;
            upstreamHeaders["content-type"] = "application/json";
        } else {
            body = await c.req.arrayBuffer();
        }
    }

    // ── Fetch upstream ──────────────────────────────────────────────────
    let upstream: Response;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

        upstream = await fetch(targetUrl.href, {
            method,
            headers: upstreamHeaders,
            body,
            redirect: "manual",
            signal: controller.signal,
        });
        clearTimeout(timeout);
    } catch (err) {
        console.error(`[Proxy Error] Failed to fetch ${targetUrl.href}:`, err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        return c.text(`Fetch failed: ${errorMessage}`, 502, CORS_HEADERS);
    }

    // Store the base URL in a cookie to help with subsequent relative requests
    const urlBase = `${targetUrl.protocol}//${targetUrl.host}${targetUrl.pathname.substring(0, targetUrl.pathname.lastIndexOf("/"))}`;
    setCookie(c, "_last_requested", urlBase, {
        maxAge: 3600,
        httpOnly: true,
        path: "/",
        sameSite: "Lax",
    });

    // ── Handle Redirects ────────────────────────────────────────────────
    if (upstream.status >= 300 && upstream.status < 400) {
        const location = upstream.headers.get("location");
        if (location) {
            const resolvedLocation = resolveUrl(location, targetUrl);
            const proxiedLocation = `/?url=${encodeURIComponent(resolvedLocation.href)}`;
            return c.redirect(proxiedLocation, upstream.status as any);
        }
    }

    // ── Build Response Headers ──────────────────────────────────────────
    const responseHeaders: Record<string, string> = { ...CORS_HEADERS };
    for (const [name, value] of upstream.headers.entries()) {
        if (!BLACKLIST_HEADERS.has(name.toLowerCase())) {
            responseHeaders[name] = value;
        }
    }

    // Only apply immutable cache to actual media segments
    const ext = targetUrl.pathname.split(".").pop()?.toLowerCase() ?? "";
    const isMediaSegment = ext === "ts" || ext === "mp4" || ext === "m4s" || ext === "aac" || ext === "vtt" || ext === "webm";
    if (isMediaSegment) {
        responseHeaders["Cache-Control"] = "public, max-age=31536000, s-maxage=31536000, immutable";
    }

    const contentType = (upstream.headers.get("content-type") ?? "").toLowerCase();
    const isM3u8ByContentType =
        contentType.includes("mpegurl") ||
        contentType.includes("application/vnd.apple.mpegurl") ||
        contentType.includes("application/x-mpegurl");
    const isM3u8ByUrl = targetUrl.pathname.toLowerCase().endsWith(".m3u8");

    // ── M3U8 rewriting path ─────────────────────────────────────────────
    if (isM3u8ByContentType || isM3u8ByUrl) {
        try {
            const textBody = await upstream.text();
            if (!textBody || textBody.length === 0) {
                return c.body(null, upstream.status as ContentfulStatusCode, responseHeaders);
            }

            const looksLikeM3u8 = textBody.trimStart().startsWith("#EXTM3U");

            if (isM3u8ByContentType || looksLikeM3u8) {
                const lines: string[] = [];
                let start = 0;
                const len = textBody.length;
                while (start < len) {
                    let end = textBody.indexOf("\n", start);
                    if (end === -1) end = len;
                    let line = textBody.slice(start, end);
                    if (line.endsWith("\r")) line = line.slice(0, -1);
                    lines.push(processM3u8Line(line, targetUrl));
                    start = end + 1;
                }
                const rewritten = lines.join("\n");

                return c.body(rewritten, upstream.status as ContentfulStatusCode, {
                    ...responseHeaders,
                    "Content-Type": "application/vnd.apple.mpegurl",
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                });
            }
            return c.body(textBody, upstream.status as ContentfulStatusCode, responseHeaders);
        } catch (err) {
            console.error(`[Proxy Error] M3U8 processing failed for ${targetUrl.href}:`, err);
            return c.text("M3U8 processing failed", 500, CORS_HEADERS);
        }
    }

    // ── Passthrough (binary segments, etc.) ─────────────────────────────
    return c.body(upstream.body as ReadableStream, upstream.status as ContentfulStatusCode, responseHeaders);
});

export default handle(app);
