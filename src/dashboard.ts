import { CORS_HEADERS } from "./constants";

/**
 * Premium Dashboard & Help UI for the Proxy.
 * Uses HTMX (htmlx) for real-time, low-latency status updates.
 */

const DASHBOARD_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Anime Proxy | High Performance</title>
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0a0a0f;
            --card-bg: #12121e;
            --accent: #ff0055;
            --accent-glow: rgba(255, 0, 85, 0.3);
            --text-main: #ffffff;
            --text-dim: #9494b8;
            --gradient: linear-gradient(135deg, #ff0055 0%, #7000ff 100%);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Outfit', sans-serif;
            background-color: var(--bg);
            color: var(--text-main);
            line-height: 1.6;
            overflow-x: hidden;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 4rem 2rem;
            position: relative;
            z-index: 1;
        }

        /* Glassmorphism background elements */
        body::before {
            content: '';
            position: absolute;
            top: -10%;
            right: -10%;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
            z-index: 0;
            pointer-events: none;
        }

        header {
            text-align: center;
            margin-bottom: 4rem;
        }

        h1 {
            font-size: 3.5rem;
            font-weight: 800;
            background: var(--gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 1rem;
            letter-spacing: -1px;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            background: rgba(0, 255, 128, 0.1);
            color: #00ff80;
            padding: 0.5rem 1.25rem;
            border-radius: 2rem;
            font-weight: 600;
            font-size: 0.9rem;
            border: 1px solid rgba(0, 255, 128, 0.2);
            margin-top: 1rem;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            background: #00ff80;
            border-radius: 50%;
            margin-right: 10px;
            box-shadow: 0 0 10px #00ff80;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0.5; }
            100% { transform: scale(1); opacity: 1; }
        }

        .stats-strip {
            display: flex;
            gap: 1.5rem;
            justify-content: center;
            margin-bottom: 3rem;
            flex-wrap: wrap;
        }

        .stat-item {
            background: rgba(255, 255, 255, 0.03);
            padding: 1rem 2rem;
            border-radius: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.05);
            text-align: center;
            min-width: 150px;
        }

        .stat-value {
            display: block;
            font-size: 1.5rem;
            font-weight: 800;
            color: var(--accent);
        }

        .stat-label {
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--text-dim);
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
        }

        .card {
            background: var(--card-bg);
            padding: 2.5rem;
            border-radius: 1.5rem;
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .card:hover {
            transform: translateY(-10px);
            border-color: var(--accent);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }

        .card h2 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            color: var(--text-main);
        }

        .card p {
            color: var(--text-dim);
            font-size: 1rem;
        }

        code {
            display: block;
            background: #000;
            padding: 1rem;
            border-radius: 0.75rem;
            color: #00ffd5;
            font-family: 'Fira Code', monospace;
            font-size: 0.85rem;
            margin-top: 1rem;
            overflow-x: auto;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .htmx-indicator {
            opacity: 0;
            transition: opacity 200ms ease-in;
        }
        .htmx-request .htmx-indicator {
            opacity: 1;
        }

        .footer {
            text-align: center;
            margin-top: 6rem;
            color: var(--text-dim);
            font-size: 0.9rem;
        }

        .footer a {
            color: var(--accent);
            text-decoration: none;
        }

        @media (max-width: 600px) {
            h1 { font-size: 2.5rem; }
            .container { padding: 2rem 1rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Anime Proxy</h1>
            <p style="color: var(--text-dim); font-size: 1.2rem;">Ultra high-performance M3U8 & Binary Streaming</p>
            <div class="status-badge" hx-get="/api/status" hx-trigger="every 5s" hx-swap="outerHTML">
                <div class="status-dot"></div>
                Status: ONLINE (Bun)
            </div>
        </header>

        <div id="stats-container" class="stats-strip" hx-get="/api/stats" hx-trigger="load, every 10s">
            <!-- HTMX will load stats here -->
            <div class="stat-item">
                <span class="stat-value">...</span>
                <span class="stat-label">Requests</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">...</span>
                <span class="stat-label">Uptime</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">...</span>
                <span class="stat-label">Latency</span>
            </div>
        </div>

        <div class="card" style="grid-column: 1 / -1; background: linear-gradient(rgba(18, 18, 30, 0.8), rgba(18, 18, 30, 0.8)), url('https://images.unsplash.com/photo-1578632292335-df3abbb0d586?q=80&w=1000&auto=format&fit=crop'); background-size: cover; background-position: center;">
            <h2>Quick Proxy Search</h2>
            <p>Paste a manifest or media URL below to stream it instantly through the proxy.</p>
            <form id="proxy-form" style="display: flex; gap: 10px; margin-top: 1.5rem;">
                <input type="url" id="proxy-url" placeholder="https://example.com/video.m3u8" required 
                    style="flex: 1; padding: 1rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.5); color: white; outline: none; transition: border-color 0.3s;">
                <button type="submit" style="padding: 1rem 2rem; border-radius: 0.75rem; border: none; background: var(--gradient); color: white; font-weight: 800; cursor: pointer; transition: transform 0.2s;">
                    STREAM
                </button>
            </form>
            <script>
                document.getElementById('proxy-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    const url = document.getElementById('proxy-url').value;
                    if (url) {
                        window.location.href = '/?url=' + encodeURIComponent(url);
                    }
                });
                // Focus styling
                const input = document.getElementById('proxy-url');
                input.addEventListener('focus', () => input.style.borderColor = 'var(--accent)');
                input.addEventListener('blur', () => input.style.borderColor = 'rgba(255,255,255,0.1)');
            </script>
        </div>

        <div class="grid">
            <div class="card">
                <h2>Direct Proxy</h2>
                <p>Stream any file by appending the target URL.</p>
                <code>/?url=ENCODED_URL</code>
            </div>
            <div class="card">
                <h2>Live Activity</h2>
                <div id="logs" hx-get="/api/logs" hx-trigger="load, every 3s" style="margin-top: 1rem; border-radius: 0.5rem; background: rgba(0,0,0,0.3); padding: 1rem; height: 150px; overflow-y: hidden;">
                    <!-- Logs will appear here -->
                </div>
            </div>
            <div class="card">
                <h2>Health Check</h2>
                <p>Granular system health and metadata JSON.</p>
                <code>/api/info</code>
            </div>
            <div class="card">
                <h2>Watch Order</h2>
                <p>Fetch Anilist & MAL watch order metadata.</p>
                <code>/api/watch-order?id=ANILIST_ID</code>
            </div>
            <div class="card">
                <h2>Stats API</h2>
                <p>Pure HTMX fragment for real-time monitoring.</p>
                <code>/api/stats</code>
            </div>
            <div class="card">
                <h2>Dashboard Force</h2>
                <p>Force the UI overlay on any proxy request.</p>
                <code>?dashboard=true</code>
            </div>
        </div>

        <div class="footer">
            Built for Railway.app &bull; Optimized by <a href="#">Vertixx</a>
        </div>
    </div>
</body>
</html>
`;

export function handleDashboard(c: any) {
    return c.html(DASHBOARD_HTML, 200, CORS_HEADERS);
}

export function handleStatsFragment(stats: { uptime: string, requests: number, latency: string }) {
    return `
        <div class="stat-item">
            <span class="stat-value">${stats.requests}</span>
            <span class="stat-label">Total Requests</span>
        </div>
        <div class="stat-item">
            <span class="stat-value">${stats.uptime}</span>
            <span class="stat-label">Server Uptime</span>
        </div>
        <div class="stat-item">
            <span class="stat-value">${stats.latency}</span>
            <span class="stat-label">Avg. Latency</span>
        </div>
    `;
}

export function handleStatusBadge(status: string) {
    return `
        <div class="status-badge" hx-get="/api/status" hx-trigger="every 5s" hx-swap="outerHTML">
            <div class="status-dot"></div>
            Status: ${status} (Bun)
        </div>
    `;
}
