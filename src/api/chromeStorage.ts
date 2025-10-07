// src/api/chromeStorage.ts
import type { UserSignature, UserSignatureInput, FortuneResult } from '../utils/algorithm';

const USER_SIGNATURE_KEY = 'user_signature';
const DAILY_CACHE_KEY = 'daily_fortune_cache';
const USER_INPUT_KEY = 'user_input_birth';

// 检查是否在 Chrome 扩展环境中的辅助函数
const isExtensionEnv = typeof chrome !== 'undefined' && chrome.storage;

// 辅助函数：安全地从 localStorage 读取
const getLocal = (key: string): any => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (e) {
        return null;
    }
};

// 辅助函数：安全地写入 localStorage
const setLocal = (key: string, data: any): void => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error("Could not save to localStorage:", e);
    }
};

/**
 * 获取存储的用户五行数字签名。
 */
export async function getStoredSignature(): Promise<UserSignature | null> {
    if (!isExtensionEnv) {
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
    if (!isExtensionEnv) {
        console.warn("[Storage] Not in extension environment. Returning null signature.");
        return null; // 在本地预览时返回 null，模拟未设置签名
    }
    await chrome.storage.local.set({ [USER_SIGNATURE_KEY]: signature });
}

/**
 * 获取当日运势缓存。
 * !! 新增逻辑：会检查缓存是否为当天，如果不是则返回 null。
 */
export async function getDailyCache(): Promise<{ date: string; data: FortuneResult } | null> {
    if (!isExtensionEnv) {
        console.warn("[Storage] Not in extension environment. Returning null signature.");
        return null; // 在本地预览时返回 null，模拟未设置签名
    }
    const result = await chrome.storage.local.get(DAILY_CACHE_KEY);
    const cache = result[DAILY_CACHE_KEY];

    if (!cache) {
        return null;
    }

    // 检查缓存的日期是否与当前日期匹配
    const todayString = new Date().toDateString();
    if (cache.date === todayString) {
        return cache; // 缓存有效，返回数据
    } else {
        return null; // 缓存已过期，返回 null
    }
}

/**
 * 设置当日运势缓存。
 */
export async function setDailyCache(data: FortuneResult): Promise<void> {
    if (!isExtensionEnv) {
        console.warn("[Storage] Not in extension environment. Returning null signature.");
        return null; // 在本地预览时返回 null，模拟未设置签名
    }
    const cache = {
        date: new Date().toDateString(),
        data: data,
    };
    await chrome.storage.local.set({ [DAILY_CACHE_KEY]: cache });
}

/**
 * 【新增】获取存储的用户出生时间输入。
 */
export async function getUserSignatureInput(): Promise<UserSignatureInput | null> {
    if (!isExtensionEnv) {
        // 在本地环境使用 localStorage 模拟异步读取
        // 注意：这里仍然返回一个 Promise，保持和 chrome.storage.local.get 的行为一致
        const input = getLocal(USER_INPUT_KEY);
        // 如果 localStorage 中没有，则返回 null，让 Popup 组件去使用默认值
        return Promise.resolve(input as UserSignatureInput | null); 
    }
    const data = await chrome.storage.local.get(USER_INPUT_KEY);
    return data[USER_INPUT_KEY] || null;
}

/**
 * 【新增】设置用户出生时间输入。
 */
export async function setUserSignatureInput(input: UserSignatureInput): Promise<void> {
    if (!isExtensionEnv) {
        setLocal(USER_INPUT_KEY, input); // 写入 localStorage
        return Promise.resolve();
    }
    await chrome.storage.local.set({ [USER_INPUT_KEY]: input });
    return Promise.resolve();
}