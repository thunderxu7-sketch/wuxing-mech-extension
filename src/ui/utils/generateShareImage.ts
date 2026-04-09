import html2canvas from 'html2canvas';
import type { TalismanRecommendation } from '../../utils/algorithm';
import type { Locale } from '../../locales/types';
import { createShareQrDataUrl, getDisplayShareUrl } from './shareContent';

interface ShareCardParams {
    talisman: TalismanRecommendation;
    score: number;
    tarotAdvice: string;
    talismanImageSrc: string;
    locale: Locale;
    shareUrl: string;
    shortUrl: string;
}

const TITLES: Record<Locale, string> = {
    zh: '五行校准',
    en: 'WuXing Calibrate',
};

const BRAND_LINES: Record<Locale, string> = {
    zh: '五行校准 · 每日灵符',
    en: 'WuXing Calibrate · Daily Talisman',
};

function formatDate(locale: Locale): string {
    const today = new Date();
    if (locale === 'zh') {
        return `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    }
    return today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export async function generateShareImage(params: ShareCardParams): Promise<void> {
    const { talisman, score, tarotAdvice, talismanImageSrc, locale, shareUrl, shortUrl } = params;

    const dateStr = formatDate(locale);
    const title = TITLES[locale];
    const brandLine = BRAND_LINES[locale];
    const scoreColor = score >= 70 ? '#28a745' : score >= 50 ? '#d4a017' : '#dc3545';
    const displayLink = getDisplayShareUrl(shortUrl, shareUrl);
    const qrCodeDataUrl = await createShareQrDataUrl(displayLink);

    const card = document.createElement('div');
    card.style.cssText = `
        width: 360px;
        padding: 28px 24px 20px;
        box-sizing: border-box;
        background: linear-gradient(180deg, #fcfbf7 0%, #f5f0e8 100%);
        font-family: 'Songti SC', 'Noto Serif SC', 'Georgia', 'Times New Roman', serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        position: fixed;
        left: -9999px;
        top: 0;
        z-index: -1;
    `;

    card.innerHTML = `
        <div style="font-size: 11px; color: #999; letter-spacing: 1px;">${dateStr}</div>
        <div style="font-size: 22px; color: #b8860b; font-weight: bold; letter-spacing: 4px; margin: 8px 0 18px;">${title}</div>
        <img
            src="${talismanImageSrc}"
            style="width: 190px; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.12);"
            crossorigin="anonymous"
        />
        <div style="font-size: 20px; color: #b8860b; letter-spacing: 4px; margin-top: 16px; font-weight: bold;">${talisman.name}</div>
        <div style="font-size: 12px; color: #6c757d; letter-spacing: 2px; margin-top: 4px;">${talisman.blessing}</div>
        <div style="font-size: 15px; color: #2c2c2c; font-weight: 600; margin-top: 10px;">${talisman.subtitle}</div>
        <div style="margin-top: 14px; display: flex; align-items: baseline; gap: 4px;">
            <span style="font-size: 32px; color: ${scoreColor}; font-weight: bold; line-height: 1;">${score}</span>
            <span style="font-size: 12px; color: #999;">/ 100</span>
        </div>
        <div style="
            font-size: 12px;
            color: #4a4a4a;
            font-style: italic;
            text-align: center;
            line-height: 1.8;
            margin-top: 14px;
            padding: 10px 16px;
            border-left: 2px solid #d8c8e8;
            background: rgba(156, 39, 176, 0.03);
            border-radius: 0 4px 4px 0;
            width: 280px;
            box-sizing: border-box;
        ">"${tarotAdvice}"</div>
        <div style="
            width: 100%;
            margin-top: 18px;
            padding: 14px 16px;
            box-sizing: border-box;
            border: 1px solid #e0dcd0;
            border-radius: 10px;
            background: rgba(255,255,255,0.72);
            display: flex;
            align-items: center;
            gap: 14px;
        ">
            <img
                src="${qrCodeDataUrl}"
                style="width: 76px; height: 76px; border-radius: 6px; border: 1px solid #e0dcd0;"
            />
            <div style="flex: 1; min-width: 0;">
                <div style="font-size: 11px; color: #999; letter-spacing: 1px; margin-bottom: 6px;">SCAN / OPEN</div>
                <div style="font-size: 12px; color: #2c2c2c; line-height: 1.6; word-break: break-all;">${displayLink}</div>
            </div>
        </div>
        <div style="
            margin-top: 20px;
            border-top: 1px solid #e0dcd0;
            padding-top: 10px;
            width: 100%;
            text-align: center;
        ">
            <div style="font-size: 10px; color: #b8860b; letter-spacing: 2px;">${brandLine}</div>
        </div>
    `;

    document.body.appendChild(card);

    const img = card.querySelector('img');
    if (img && !img.complete) {
        await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
        });
    }

    try {
        const canvas = await html2canvas(card, {
            scale: 2,
            backgroundColor: null,
            useCORS: true,
        });

        const filePrefix = locale === 'zh' ? `五行校准_${talisman.name}` : `WuXing_${talisman.id}`;
        const link = document.createElement('a');
        link.download = `${filePrefix}_${dateStr}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } finally {
        document.body.removeChild(card);
    }
}
