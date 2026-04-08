// src/api/chromeStorage.ts
import type { UserSignature, UserSignatureInput, FortuneResult } from '../utils/algorithm';
import type { Locale } from '../locales/types';

const USER_SIGNATURE_KEY = 'user_signature';
const DAILY_CACHE_KEY = 'daily_fortune_cache';
const USER_INPUT_KEY = 'user_input_birth';
const LOCALE_KEY = 'user_locale';

interface DailyFortuneCache {
    date: string;
    signatureKey: string;
    data: FortuneResult;
}

function hasExtensionStorage(): boolean {
    return typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined';
}

// 辅助函数：安全地从 localStorage 读取
const getLocal = <T>(key: string): T | null => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) as T : null;
    } catch {
        return null;
    }
};

// 辅助函数：安全地写入 localStorage
const setLocal = <T>(key: string, data: T): void => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error("Could not save to localStorage:", error);
    }
};

function getTodayCacheDate(now: Date = new Date()): string {
    return now.toDateString();
}

export function getSignatureCacheKey(signature: UserSignature): string {
    return [
        signature.gold,
        signature.wood,
        signature.water,
        signature.fire,
        signature.earth,
    ].join(':');
}

/**
 * 获取存储的用户五行数字签名。
 */
export async function getStoredSignature(): Promise<UserSignature | null> {
    if (!hasExtensionStorage()) {
        console.warn("[Storage] Not in extension environment. Returning null signature.");
        return null; // 在本地预览时返回 null，模拟未设置签名
    }
    const data = await chrome.storage.local.get(USER_SIGNATURE_KEY);
    return data[USER_SIGNATURE_KEY] || null;
}

/**
 * 设置用户的五行数字签名。
 */
export async function setStoredSignature(signature: UserSignature): Promise<void> {
    if (!hasExtensionStorage()) {
        console.warn("[Storage] Not in extension environment. Returning null signature.");
        return;
    }
    await chrome.storage.local.set({ [USER_SIGNATURE_KEY]: signature });
}

/**
 * 获取当日运势缓存。
 * !! 新增逻辑：会检查缓存是否为当天，如果不是则返回 null。
 */
export async function getDailyCache(signature: UserSignature, now: Date = new Date()): Promise<DailyFortuneCache | null> {
    if (!hasExtensionStorage()) {
        console.warn("[Storage] Not in extension environment. Returning null signature.");
        return null; // 在本地预览时返回 null，模拟未设置签名
    }
    const result = await chrome.storage.local.get(DAILY_CACHE_KEY);
    const cache = result[DAILY_CACHE_KEY] as DailyFortuneCache | undefined;

    if (!cache) {
        return null;
    }

    const todayString = getTodayCacheDate(now);
    const signatureKey = getSignatureCacheKey(signature);

    if (cache.date !== todayString || cache.signatureKey !== signatureKey) {
        return null;
    }

    return cache;
}

/**
 * 设置当日运势缓存。
 */
export async function setDailyCache(signature: UserSignature, data: FortuneResult, now: Date = new Date()): Promise<void> {
    if (!hasExtensionStorage()) {
        console.warn("[Storage] Not in extension environment. Returning null signature.");
        return;
    }
    const cache: DailyFortuneCache = {
        date: getTodayCacheDate(now),
        signatureKey: getSignatureCacheKey(signature),
        data,
    };
    await chrome.storage.local.set({ [DAILY_CACHE_KEY]: cache });
}

/**
 * 【新增】获取存储的用户出生时间输入。
 */
export async function getUserSignatureInput(): Promise<UserSignatureInput | null> {
    if (!hasExtensionStorage()) {
        // 在本地环境使用 localStorage 模拟异步读取
        // 注意：这里仍然返回一个 Promise，保持和 chrome.storage.local.get 的行为一致
        const input = getLocal<UserSignatureInput>(USER_INPUT_KEY);
        // 如果 localStorage 中没有，则返回 null，让 Popup 组件去使用默认值
        return Promise.resolve(input);
    }
    const data = await chrome.storage.local.get(USER_INPUT_KEY);
    return data[USER_INPUT_KEY] || null;
}

/**
 * 【新增】设置用户出生时间输入。
 */
export async function setUserSignatureInput(input: UserSignatureInput): Promise<void> {
    if (!hasExtensionStorage()) {
        setLocal(USER_INPUT_KEY, input); // 写入 localStorage
        return Promise.resolve();
    }
    await chrome.storage.local.set({ [USER_INPUT_KEY]: input });
    return Promise.resolve();
}

/**
 * 获取用户语言偏好。
 */
export async function getLocale(): Promise<Locale> {
    if (!hasExtensionStorage()) {
        return getLocal<Locale>(LOCALE_KEY) || 'zh';
    }
    const data = await chrome.storage.local.get(LOCALE_KEY);
    return data[LOCALE_KEY] || 'zh';
}

/**
 * 设置用户语言偏好。
 */
export async function setLocale(locale: Locale): Promise<void> {
    if (!hasExtensionStorage()) {
        setLocal(LOCALE_KEY, locale);
        return;
    }
    await chrome.storage.local.set({ [LOCALE_KEY]: locale });
}
