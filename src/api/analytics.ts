const ANALYTICS_KEY = 'wuxing_analytics';
const ANALYTICS_META_KEY = 'wuxing_analytics_meta';
const ANALYTICS_CONFIG_KEY = 'wuxing_analytics_config';
const ANALYTICS_QUEUE_KEY = 'wuxing_analytics_queue';
const DEFAULT_SITE = 'wuxing-mech-extension';
const MAX_DAILY_RETENTION = 90;
const MAX_QUEUE_SIZE = 50;

export type AnalyticsEventName =
    | 'popup_open'
    | 'first_open'
    | 'return_visit'
    | 'onboarding_view'
    | 'birth_submit'
    | 'fortune_generated'
    | 'detail_expand'
    | 'detail_collapse'
    | 'product_refresh'
    | 'product_click'
    | 'share_save'
    | 'locale_switch';

type AnalyticsPropertyValue = string | number | boolean | null;

export interface AnalyticsEventProperties {
    [key: string]: AnalyticsPropertyValue;
}

interface AnalyticsData {
    activeDays: string[];
    events: Record<string, number>;
    daily: Record<string, Record<string, number>>;
}

interface AnalyticsMeta {
    installId: string;
    firstSeenAt: string;
}

export interface AnalyticsConfig {
    endpoint: string;
    site: string;
    enabled: boolean;
}

interface AnalyticsEnvelope {
    name: AnalyticsEventName;
    site: string;
    installId: string;
    sessionId: string;
    timestamp: string;
    day: string;
    properties: AnalyticsEventProperties;
}

export interface AnalyticsStats {
    activeDays: string[];
    events: Record<string, number>;
    daily: Record<string, Record<string, number>>;
    pendingEvents: number;
}

const sessionId = createId();

function hasExtensionStorage(): boolean {
    return typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined';
}

function hasLocalStorage(): boolean {
    return typeof localStorage !== 'undefined';
}

function createId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `wx-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function today(now: Date = new Date()): string {
    return now.toISOString().slice(0, 10);
}

function getDefaultConfig(): AnalyticsConfig {
    return {
        endpoint: '',
        site: DEFAULT_SITE,
        enabled: false,
    };
}

function pruneActiveDays(activeDays: string[]): string[] {
    return activeDays.slice(-MAX_DAILY_RETENTION);
}

function pruneDaily(data: Record<string, Record<string, number>>): Record<string, Record<string, number>> {
    const keys = Object.keys(data).sort();

    if (keys.length <= MAX_DAILY_RETENTION) {
        return data;
    }

    const next = { ...data };
    for (const key of keys.slice(0, keys.length - MAX_DAILY_RETENTION)) {
        delete next[key];
    }

    return next;
}

function normalizeQueue(queue: AnalyticsEnvelope[]): AnalyticsEnvelope[] {
    return queue.slice(-MAX_QUEUE_SIZE);
}

function getLocal<T>(key: string): T | null {
    if (!hasLocalStorage()) {
        return null;
    }

    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) as T : null;
    } catch {
        return null;
    }
}

function setLocal<T>(key: string, value: T): void {
    if (!hasLocalStorage()) {
        return;
    }

    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('[Analytics] Failed to persist local data:', error);
    }
}

async function loadFromStorage<T>(key: string): Promise<T | null> {
    if (hasExtensionStorage()) {
        const result = await chrome.storage.local.get(key);
        return (result[key] as T | undefined) ?? null;
    }

    return getLocal<T>(key);
}

async function saveToStorage<T>(key: string, value: T): Promise<void> {
    if (hasExtensionStorage()) {
        await chrome.storage.local.set({ [key]: value });
        return;
    }

    setLocal(key, value);
}

async function loadStats(): Promise<AnalyticsData> {
    return (await loadFromStorage<AnalyticsData>(ANALYTICS_KEY)) ?? {
        activeDays: [],
        events: {},
        daily: {},
    };
}

async function saveStats(data: AnalyticsData): Promise<void> {
    await saveToStorage(ANALYTICS_KEY, data);
}

async function loadMeta(now: Date = new Date()): Promise<{ meta: AnalyticsMeta; isFirstOpen: boolean }> {
    const existing = await loadFromStorage<AnalyticsMeta>(ANALYTICS_META_KEY);
    if (existing) {
        return { meta: existing, isFirstOpen: false };
    }

    const meta: AnalyticsMeta = {
        installId: createId(),
        firstSeenAt: now.toISOString(),
    };
    await saveToStorage(ANALYTICS_META_KEY, meta);

    return { meta, isFirstOpen: true };
}

async function loadConfig(): Promise<AnalyticsConfig> {
    const config = await loadFromStorage<AnalyticsConfig>(ANALYTICS_CONFIG_KEY);
    return config ? { ...getDefaultConfig(), ...config } : getDefaultConfig();
}

async function loadQueue(): Promise<AnalyticsEnvelope[]> {
    return (await loadFromStorage<AnalyticsEnvelope[]>(ANALYTICS_QUEUE_KEY)) ?? [];
}

async function saveQueue(queue: AnalyticsEnvelope[]): Promise<void> {
    await saveToStorage(ANALYTICS_QUEUE_KEY, normalizeQueue(queue));
}

function recordLocalEvent(data: AnalyticsData, name: AnalyticsEventName, now: Date): AnalyticsData {
    const day = today(now);
    const next: AnalyticsData = {
        activeDays: [...data.activeDays],
        events: { ...data.events },
        daily: { ...data.daily },
    };

    next.events[name] = (next.events[name] || 0) + 1;
    next.daily[day] = { ...(next.daily[day] || {}) };
    next.daily[day][name] = (next.daily[day][name] || 0) + 1;
    next.daily = pruneDaily(next.daily);

    return next;
}

function buildEnvelope(
    meta: AnalyticsMeta,
    config: AnalyticsConfig,
    name: AnalyticsEventName,
    properties: AnalyticsEventProperties,
    now: Date,
): AnalyticsEnvelope {
    return {
        name,
        site: config.site,
        installId: meta.installId,
        sessionId,
        timestamp: now.toISOString(),
        day: today(now),
        properties,
    };
}

async function sendRemoteEvent(config: AnalyticsConfig, event: AnalyticsEnvelope): Promise<boolean> {
    if (!config.enabled || !config.endpoint) {
        return true;
    }

    const body = JSON.stringify(event);

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        try {
            const accepted = navigator.sendBeacon(
                config.endpoint,
                new Blob([body], { type: 'application/json' }),
            );

            if (accepted) {
                return true;
            }
        } catch {
            // Fall through to fetch.
        }
    }

    if (typeof fetch !== 'function') {
        return false;
    }

    try {
        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Wuxing-Site': config.site,
            },
            body,
            keepalive: true,
        });

        return response.ok;
    } catch {
        return false;
    }
}

async function flushRemoteQueue(config: AnalyticsConfig, events: AnalyticsEnvelope[]): Promise<void> {
    if (!config.enabled || !config.endpoint) {
        return;
    }

    const pending = await loadQueue();
    const nextQueue: AnalyticsEnvelope[] = [];

    for (const event of [...pending, ...events]) {
        const sent = await sendRemoteEvent(config, event);
        if (!sent) {
            nextQueue.push(event);
        }
    }

    await saveQueue(nextQueue);
}

async function dispatchEvent(
    name: AnalyticsEventName,
    properties: AnalyticsEventProperties = {},
    now: Date = new Date(),
): Promise<void> {
    const [stats, { meta }, config] = await Promise.all([
        loadStats(),
        loadMeta(now),
        loadConfig(),
    ]);

    const nextStats = recordLocalEvent(stats, name, now);
    await saveStats(nextStats);

    const event = buildEnvelope(meta, config, name, properties, now);
    await flushRemoteQueue(config, [event]);
}

/** Record popup open and derive first-open / return-visit events. */
export async function trackDAU(properties: AnalyticsEventProperties = {}, now: Date = new Date()): Promise<void> {
    const [stats, { meta, isFirstOpen }, config] = await Promise.all([
        loadStats(),
        loadMeta(now),
        loadConfig(),
    ]);

    const day = today(now);
    const hadDay = stats.activeDays.includes(day);
    const hadPriorDays = stats.activeDays.length > 0;

    const nextStats: AnalyticsData = {
        activeDays: hadDay ? stats.activeDays : pruneActiveDays([...stats.activeDays, day]),
        events: { ...stats.events },
        daily: { ...stats.daily },
    };

    const eventsToDispatch: AnalyticsEnvelope[] = [];

    const popupStats = recordLocalEvent(nextStats, 'popup_open', now);
    eventsToDispatch.push(buildEnvelope(meta, config, 'popup_open', properties, now));

    let finalStats = popupStats;

    if (isFirstOpen) {
        finalStats = recordLocalEvent(finalStats, 'first_open', now);
        eventsToDispatch.push(buildEnvelope(meta, config, 'first_open', properties, now));
    } else if (!hadDay && hadPriorDays) {
        finalStats = recordLocalEvent(finalStats, 'return_visit', now);
        eventsToDispatch.push(buildEnvelope(meta, config, 'return_visit', properties, now));
    }

    await saveStats(finalStats);
    await flushRemoteQueue(config, eventsToDispatch);
}

/** Track a named event with optional structured properties. */
export async function trackEvent(
    name: AnalyticsEventName,
    properties: AnalyticsEventProperties = {},
    now: Date = new Date(),
): Promise<void> {
    await dispatchEvent(name, properties, now);
}

export async function setAnalyticsConfig(config: Partial<AnalyticsConfig>): Promise<AnalyticsConfig> {
    const nextConfig = {
        ...getDefaultConfig(),
        ...(await loadConfig()),
        ...config,
    };

    await saveToStorage(ANALYTICS_CONFIG_KEY, nextConfig);
    return nextConfig;
}

export async function clearAnalyticsConfig(): Promise<void> {
    await saveToStorage(ANALYTICS_CONFIG_KEY, getDefaultConfig());
    await saveQueue([]);
}

export async function getAnalyticsConfig(): Promise<AnalyticsConfig> {
    return loadConfig();
}

/** Get current local analytics stats plus pending remote queue size. */
export async function getStats(): Promise<AnalyticsStats> {
    const [stats, queue] = await Promise.all([loadStats(), loadQueue()]);

    return {
        activeDays: stats.activeDays,
        events: stats.events,
        daily: stats.daily,
        pendingEvents: queue.length,
    };
}
