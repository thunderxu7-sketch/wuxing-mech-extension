// src/api/chromeStorage.ts
import { UserSignature, FortuneResult } from '../utils/algorithm'; // 稍后定义这些类型

const USER_SIGNATURE_KEY = 'user_signature';
const DAILY_CACHE_KEY = 'daily_fortune_cache';

/**
 * 获取存储的用户五行数字签名。
 */
export async function getStoredSignature(): Promise<UserSignature | null> {
    const data = await chrome.storage.local.get(USER_SIGNATURE_KEY);
    return data[USER_SIGNATURE_KEY] || null;
}

/**
 * 设置用户的五行数字签名。
 */
export async function setStoredSignature(signature: UserSignature): Promise<void> {
    await chrome.storage.local.set({ [USER_SIGNATURE_KEY]: signature });
}

/**
 * 获取当日运势缓存。
 * !! 新增逻辑：会检查缓存是否为当天，如果不是则返回 null。
 */
export async function getDailyCache(): Promise<{ date: string; data: FortuneResult } | null> {
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
    const cache = {
        date: new Date().toDateString(),
        data: data,
    };
    await chrome.storage.local.set({ [DAILY_CACHE_KEY]: cache });
}