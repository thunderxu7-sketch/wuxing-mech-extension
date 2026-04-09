import assert from 'node:assert/strict';
import test from 'node:test';

import { buildShareCaption, createShareQrDataUrl, getDisplayShareUrl } from '../src/ui/utils/shareContent';

test('getDisplayShareUrl prefers configured short url', () => {
    assert.equal(
        getDisplayShareUrl('https://wx.today/abc', 'https://github.com/thunderxu7-sketch/wuxing-mech-extension'),
        'https://wx.today/abc',
    );
    assert.equal(
        getDisplayShareUrl('', 'https://github.com/thunderxu7-sketch/wuxing-mech-extension'),
        'https://github.com/thunderxu7-sketch/wuxing-mech-extension',
    );
});

test('buildShareCaption includes score, talisman and share link', () => {
    const caption = buildShareCaption({
        locale: 'zh',
        talismanName: '招财符',
        subtitle: '今日宜：聚财纳福',
        score: 88,
        shareUrl: 'https://github.com/thunderxu7-sketch/wuxing-mech-extension',
        shortUrl: 'https://wx.today/abc',
    });

    assert.match(caption, /88分/);
    assert.match(caption, /招财符/);
    assert.match(caption, /https:\/\/wx\.today\/abc/);
});

test('createShareQrDataUrl returns a PNG data url', async () => {
    const qrDataUrl = await createShareQrDataUrl('https://wx.today/abc');

    assert.match(qrDataUrl, /^data:image\/png;base64,/);
});
