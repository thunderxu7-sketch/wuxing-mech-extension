// Centralized share / landing-page configuration.
// These constants are the defaults used by getShareConfig() when no
// override has been written to chrome.storage.local under the
// `wuxing_share_config` key.

const LANDING_PAGE_BASE = 'https://wuxing-mech-landing.pages.dev/';

// UTM tagging so analytics can attribute traffic that comes back
// from share images and copied captions.
const SHARE_UTM = '?utm_source=extension&utm_medium=share';

export const DEFAULT_SHARE_URL = `${LANDING_PAGE_BASE}${SHARE_UTM}`;

// No real short-link service yet; for v1 the short URL points at the
// same landing page. Replace this once a shortener (t.cn / bit.ly /
// self-hosted) is wired in.
export const DEFAULT_SHORT_URL = DEFAULT_SHARE_URL;
