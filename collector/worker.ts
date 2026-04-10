// Cloudflare Worker analytics collector for the WuXing extension.
//
// Accepts POST /collect with the envelope produced by
// src/api/analytics.ts and inserts it into a D1 table. Use /health
// for a cheap liveness probe.
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Wuxing-Site',
    'Access-Control-Max-Age': '86400',
};

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        const url = new URL(request.url);

        if (url.pathname === '/health') {
            return json({ status: 'ok' });
        }

        if (url.pathname !== '/collect') {
            return json({ error: 'not_found' }, 404);
        }

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
    },
};

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
