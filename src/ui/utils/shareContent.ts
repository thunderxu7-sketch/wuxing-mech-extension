import QRCode from 'qrcode';

import type { Locale } from '../../locales/types';

interface ShareCaptionParams {
    locale: Locale;
    talismanName: string;
    subtitle: string;
    score: number;
    shareUrl: string;
    shortUrl: string;
    tarotName?: string;
    tarotPosition?: string;
}

export function getDisplayShareUrl(shortUrl: string, shareUrl: string): string {
    return shortUrl || shareUrl;
}

export function buildShareCaption(params: ShareCaptionParams): string {
    const displayLink = getDisplayShareUrl(params.shortUrl, params.shareUrl);
    const tarotPart = params.tarotName
        ? ` | ${params.locale === 'zh' ? '塔罗' : 'Tarot'}：${params.tarotName}(${params.tarotPosition})`
        : '';

    if (params.locale === 'zh') {
        return `今日五行校准：${params.score}分 | 灵符：${params.talismanName}${tarotPart} | ${params.subtitle}\n查看今日灵符：${displayLink}`;
    }

    return `Today's WuXing score: ${params.score}/100 | Talisman: ${params.talismanName}${tarotPart} | ${params.subtitle}\nView today's talisman: ${displayLink}`;
}

export async function createShareQrDataUrl(url: string): Promise<string> {
    return QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        margin: 1,
        scale: 6,
        color: {
            dark: '#2c2c2c',
            light: '#fcfbf7',
        },
    });
}

export async function copyTextToClipboard(text: string): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    if (typeof document === 'undefined') {
        throw new Error('Clipboard unavailable');
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error('Copy command failed');
        }
    } finally {
        document.body.removeChild(textarea);
    }
}
