import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getAnalyticsPermissionStatus,
    getAnalyticsConfig,
    getStats,
    hasAnalyticsEndpointPermission,
    requestAnalyticsEndpointPermission,
    setAnalyticsConfig,
    trackDAU,
} from '../src/api/analytics';

function installChromeStorageMock() {
    const store: Record<string, unknown> = {};
    const grantedOrigins = new Set<string>();
    const chromeMock = {
        storage: {
            local: {
                async get(key: string) {
                    return { [key]: store[key] };
                },
                async set(items: Record<string, unknown>) {
                    Object.assign(store, items);
                },
            },
        },
        permissions: {
            async contains(details: { origins?: string[] }) {
                return (details.origins || []).every((origin) => grantedOrigins.has(origin));
            },
            async request(details: { origins?: string[] }) {
                for (const origin of details.origins || []) {
                    grantedOrigins.add(origin);
                }
                return true;
            },
        },
    } as unknown as typeof chrome;

    Object.defineProperty(globalThis, 'chrome', {
        configurable: true,
        value: chromeMock,
    });

    return { store, grantedOrigins };
}

function uninstallChromeStorageMock() {
    Reflect.deleteProperty(globalThis, 'chrome');
}

function installFetchMock(responses: boolean[]) {
    const payloads: unknown[] = [];
    let index = 0;

    Object.defineProperty(globalThis, 'fetch', {
        configurable: true,
        value: async (_input: string, init?: { body?: string }) => {
            payloads.push(init?.body ? JSON.parse(init.body) : null);

            const ok = responses[index] ?? true;
            index += 1;

            return { ok };
        },
    });

    return payloads;
}

function uninstallFetchMock() {
    Reflect.deleteProperty(globalThis, 'fetch');
}

test('analytics persists config and flushes queued events on later success', async () => {
    installChromeStorageMock();
    const payloads = installFetchMock([false, false, true, true, true, true]);

    try {
        await setAnalyticsConfig({
            enabled: true,
            site: 'test-site',
            endpoint: 'https://collector.example.com/events',
        });
        await requestAnalyticsEndpointPermission('https://collector.example.com/events');

        const config = await getAnalyticsConfig();
        assert.deepEqual(config, {
            enabled: true,
            site: 'test-site',
            endpoint: 'https://collector.example.com/events',
        });

        await trackDAU({ locale: 'zh' }, new Date('2026-04-08T09:00:00.000Z'));

        const queuedStats = await getStats();
        assert.equal(queuedStats.events.popup_open, 1);
        assert.equal(queuedStats.events.first_open, 1);
        assert.equal(queuedStats.pendingEvents, 2);

        await trackDAU({ locale: 'zh' }, new Date('2026-04-09T09:00:00.000Z'));

        const flushedStats = await getStats();
        assert.equal(flushedStats.events.popup_open, 2);
        assert.equal(flushedStats.events.first_open, 1);
        assert.equal(flushedStats.events.return_visit, 1);
        assert.equal(flushedStats.pendingEvents, 0);
        assert.equal(flushedStats.activeDays.length, 2);

        assert.equal(payloads.length, 6);
        assert.equal((payloads[0] as { name: string }).name, 'popup_open');
        assert.equal((payloads[1] as { name: string }).name, 'first_open');
        assert.equal((payloads[5] as { name: string }).name, 'return_visit');
    } finally {
        uninstallFetchMock();
        uninstallChromeStorageMock();
    }
});

test('analytics permission helpers derive and request endpoint origin access', async () => {
    installChromeStorageMock();

    try {
        await setAnalyticsConfig({
            enabled: true,
            site: 'test-site',
            endpoint: 'https://collector.example.com/events',
        });

        assert.equal(await hasAnalyticsEndpointPermission('https://collector.example.com/events'), false);

        const statusBefore = await getAnalyticsPermissionStatus();
        assert.equal(statusBefore.originPattern, 'https://collector.example.com/*');
        assert.equal(statusBefore.granted, false);

        const granted = await requestAnalyticsEndpointPermission('https://collector.example.com/events');
        assert.equal(granted, true);
        assert.equal(await hasAnalyticsEndpointPermission('https://collector.example.com/events'), true);

        const statusAfter = await getAnalyticsPermissionStatus();
        assert.equal(statusAfter.granted, true);
    } finally {
        uninstallChromeStorageMock();
    }
});
