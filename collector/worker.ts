// Cloudflare Worker analytics collector for the WuXing extension.
//
// Routes:
//   GET  /health  — liveness probe
//   POST /collect — accepts the analytics envelope from src/api/analytics.ts
//                   and inserts it into the `events` D1 table
//   GET  /click   — affiliate click tracker; logs to `clicks` and 302s to `to`
//
// Deploy: see collector/README.md.

interface Env {
    DB: D1Database;
}

interface AnalyticsEnvelope {
    name: string;
    site: string;
    installId: string;
    sessionId: string;
    timestamp: string;
    day: string;
    properties?: Record<string, unknown>;
}

const CORS_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Wuxing-Site',
    'Access-Control-Max-Age': '86400',
};

// Hostnames we are willing to redirect to from /click. Anything else
// is rejected so the worker can never be turned into an open redirect.
// Subdomains of these hosts are also accepted (e.g. item.taobao.com).
const ALLOWED_DESTINATION_HOSTS = [
    'taobao.com',
    'tmall.com',
    'jd.com',
    'pinduoduo.com',
    'amazon.com',
    'amazon.co.uk',
    'amazon.de',
    'amazon.co.jp',
];

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        const url = new URL(request.url);

        if (url.pathname === '/health') {
            return json({ status: 'ok' });
        }

        if (url.pathname === '/collect') {
            return handleCollect(request, env);
        }

        if (url.pathname === '/click') {
            return handleClick(request, env, url);
        }

        return json({ error: 'not_found' }, 404);
    },
};

async function handleCollect(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
        return json({ error: 'method_not_allowed' }, 405);
    }

    let envelope: AnalyticsEnvelope;
    try {
        envelope = (await request.json()) as AnalyticsEnvelope;
    } catch {
        return json({ error: 'invalid_json' }, 400);
    }

    if (!isValidEnvelope(envelope)) {
        return json({ error: 'invalid_envelope' }, 400);
    }

    try {
        await env.DB.prepare(
            `INSERT INTO events
                (name, site, install_id, session_id, timestamp, day, properties)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
            .bind(
                envelope.name,
                envelope.site,
                envelope.installId,
                envelope.sessionId,
                envelope.timestamp,
                envelope.day,
                JSON.stringify(envelope.properties ?? {}),
            )
            .run();
    } catch (err) {
        return json({ error: 'storage_failed', detail: String(err) }, 500);
    }

    return json({ status: 'ok' });
}

async function handleClick(request: Request, env: Env, url: URL): Promise<Response> {
    if (request.method !== 'GET') {
        return json({ error: 'method_not_allowed' }, 405);
    }

    const to = url.searchParams.get('to') ?? '';
    const product = url.searchParams.get('product') ?? 'unknown';
    const installId = url.searchParams.get('iid') ?? 'anonymous';
    const site = url.searchParams.get('site') ?? 'wuxing-mech-extension';
    const locale = url.searchParams.get('loc') ?? 'unknown';

    if (!to || !isAllowedDestination(to)) {
        return json({ error: 'invalid_destination' }, 400);
    }

    // Best-effort logging — never block the redirect on storage failure.
    try {
        await env.DB.prepare(
            `INSERT INTO clicks
                (site, install_id, locale, product, destination, user_agent, referer)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
            .bind(
                site,
                installId,
                locale,
                product,
                to,
                request.headers.get('User-Agent'),
                request.headers.get('Referer'),
            )
            .run();
    } catch (err) {
        console.error('[click] storage failed:', err);
    }

    return Response.redirect(to, 302);
}

function isAllowedDestination(value: string): boolean {
    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        return false;
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return false;
    }

    const host = parsed.hostname.toLowerCase();
    return ALLOWED_DESTINATION_HOSTS.some(
        (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
}

function isValidEnvelope(value: unknown): value is AnalyticsEnvelope {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const e = value as Record<string, unknown>;
    return (
        typeof e.name === 'string' &&
        typeof e.site === 'string' &&
        typeof e.installId === 'string' &&
        typeof e.sessionId === 'string' &&
        typeof e.timestamp === 'string' &&
        typeof e.day === 'string'
    );
}

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
        },
    });
}
