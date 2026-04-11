// Wraps a raw affiliate destination URL with the analytics collector's
// /click endpoint so we can record clicks server-side and later swap
// destinations without rebuilding the extension.
//
// The collector validates the destination host against an allow-list,
// so passing an arbitrary URL here will not turn into an open redirect.

import { DEFAULT_ANALYTICS_ENDPOINT, DEFAULT_ANALYTICS_SITE } from '../config/analytics';
import type { Locale } from '../locales/types';

function deriveClickBase(endpoint: string): string {
    try {
        const url = new URL(endpoint);
        return `${url.origin}/click`;
    } catch {
        return `${endpoint.replace(/\/collect$/, '')}/click`;
    }
}

const DEFAULT_CLICK_ENDPOINT = deriveClickBase(DEFAULT_ANALYTICS_ENDPOINT);

export interface ClickTrackingParams {
    destination: string;
    productName: string;
    locale: Locale;
    installId: string | null;
    site?: string;
    clickEndpoint?: string;
}

export function wrapClickTracking(params: ClickTrackingParams): string {
    const {
        destination,
        productName,
        locale,
        installId,
        site = DEFAULT_ANALYTICS_SITE,
        clickEndpoint = DEFAULT_CLICK_ENDPOINT,
    } = params;

    if (!destination) {
        return destination;
    }

    const search = new URLSearchParams({
        to: destination,
        product: productName,
        loc: locale,
        site,
    });
    if (installId) {
        search.set('iid', installId);
    }

    return `${clickEndpoint}?${search.toString()}`;
}
