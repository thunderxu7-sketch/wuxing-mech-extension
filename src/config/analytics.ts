// Centralized analytics collector configuration.
// These constants are the defaults used by getDefaultConfig() in
// src/api/analytics.ts when no override has been written to
// chrome.storage.local under the `wuxing_analytics_config` key.

// Cloudflare Worker collector deployed from collector/worker.ts.
// See collector/README.md for the deploy procedure.
export const DEFAULT_ANALYTICS_ENDPOINT =
    'https://wuxing-collector.thunderxu7.workers.dev/collect';

// Site identifier sent with every event so a single collector can
// host multiple products in the future.
export const DEFAULT_ANALYTICS_SITE = 'wuxing-mech-extension';

// We ship with analytics enabled by default. Nothing actually leaves
// the device until the user grants the optional host permission for
// the collector origin via the launch settings UI in the popup, so
// this is still an explicit opt-in from the user's point of view.
export const DEFAULT_ANALYTICS_ENABLED = true;
