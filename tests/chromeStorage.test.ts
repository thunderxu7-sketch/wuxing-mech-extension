import assert from 'node:assert/strict';
import test from 'node:test';

import type { FortuneResult, UserSignature } from '../src/utils/algorithm';
import { getDailyCache, getShareConfig, getSignatureCacheKey, setDailyCache } from '../src/api/chromeStorage';

function installChromeStorageMock() {
    const store: Record<string, unknown> = {};
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
    } as unknown as typeof chrome;

    Object.defineProperty(globalThis, 'chrome', {
        configurable: true,
        value: chromeMock,
    });

    return store;
}

function uninstallChromeStorageMock() {
    Reflect.deleteProperty(globalThis, 'chrome');
}

const signature: UserSignature = {
    gold: 120,
    wood: 80,
    water: 60,
    fire: 140,
    earth: 100,
};

const otherSignature: UserSignature = {
    gold: 120,
    wood: 81,
    water: 60,
    fire: 140,
    earth: 100,
};

const fortuneResult: FortuneResult = {
    score: 66,
    imbalanceElement: 'fire',
    energyDifference: {
        gold: 90,
        wood: 70,
        water: 60,
        fire: 120,
        earth: 80,
    },
};

test('getSignatureCacheKey uses a stable element order', () => {
    assert.equal(getSignatureCacheKey(signature), '120:80:60:140:100');
});

test('daily cache only hits for the same signature on the same day', async () => {
    const store = installChromeStorageMock();
    const today = new Date(2026, 3, 8, 9, 0, 0);
    const tomorrow = new Date(2026, 3, 9, 9, 0, 0);

    try {
        await setDailyCache(signature, fortuneResult, today);

        const cacheHit = await getDailyCache(signature, today);
        const signatureMiss = await getDailyCache(otherSignature, today);
        const expiredMiss = await getDailyCache(signature, tomorrow);

        assert.deepEqual(cacheHit?.data, fortuneResult);
        assert.equal(cacheHit?.signatureKey, getSignatureCacheKey(signature));
        assert.equal(signatureMiss, null);
        assert.equal(expiredMiss, null);
        assert.equal(typeof store.daily_fortune_cache, 'object');
    } finally {
        uninstallChromeStorageMock();
    }
});

test('share config falls back to the default landing page when unset', async () => {
    installChromeStorageMock();

    const expected = 'https://wuxing-mech-landing.pages.dev/?utm_source=extension&utm_medium=share';

    try {
        const config = await getShareConfig();

        assert.equal(config.shareUrl, expected);
        assert.equal(config.shortUrl, expected);
    } finally {
        uninstallChromeStorageMock();
    }
});
