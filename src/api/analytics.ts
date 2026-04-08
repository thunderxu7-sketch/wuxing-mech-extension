// Lightweight analytics using chrome.storage.local
// View data via chrome://extensions → inspect popup → Application → Local Storage

const ANALYTICS_KEY = 'wuxing_analytics';

interface AnalyticsData {
    activeDays: string[];
    events: Record<string, number>;
    daily: Record<string, Record<string, number>>;
}

const isExtensionEnv = typeof chrome !== 'undefined' && chrome.storage;

async function load(): Promise<AnalyticsData> {
    const empty: AnalyticsData = { activeDays: [], events: {}, daily: {} };
    if (!isExtensionEnv) return empty;
    const result = await chrome.storage.local.get(ANALYTICS_KEY);
    return result[ANALYTICS_KEY] || empty;
}

async function save(data: AnalyticsData): Promise<void> {
    if (!isExtensionEnv) return;
    await chrome.storage.local.set({ [ANALYTICS_KEY]: data });
}

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

/** Record a DAU ping (call once per popup open) */
export async function trackDAU(): Promise<void> {
    const data = await load();
    const d = today();
    if (!data.activeDays.includes(d)) {
        data.activeDays.push(d);
        // Keep last 90 days only
        if (data.activeDays.length > 90) {
            data.activeDays = data.activeDays.slice(-90);
        }
    }
    await save(data);
}

/** Track a named event */
export async function trackEvent(name: string): Promise<void> {
    const data = await load();
    const d = today();

    // Aggregate
    data.events[name] = (data.events[name] || 0) + 1;

    // Daily breakdown
    if (!data.daily[d]) data.daily[d] = {};
    data.daily[d][name] = (data.daily[d][name] || 0) + 1;

    // Prune daily entries older than 90 days
    const keys = Object.keys(data.daily).sort();
    if (keys.length > 90) {
        for (const k of keys.slice(0, keys.length - 90)) {
            delete data.daily[k];
        }
    }

    await save(data);
}

/** Get all analytics data (for debug / future dashboard) */
export async function getStats(): Promise<AnalyticsData> {
    return load();
}
