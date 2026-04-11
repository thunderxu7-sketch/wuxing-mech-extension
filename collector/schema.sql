-- D1 schema for the WuXing analytics collector.
-- Apply with:
--   npx wrangler d1 execute wuxing-analytics --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    site TEXT NOT NULL,
    install_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    day TEXT NOT NULL,
    properties TEXT NOT NULL DEFAULT '{}',
    received_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_day ON events(day);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(name);
CREATE INDEX IF NOT EXISTS idx_events_install_id ON events(install_id);
CREATE INDEX IF NOT EXISTS idx_events_day_name ON events(day, name);

CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site TEXT NOT NULL,
    install_id TEXT NOT NULL,
    locale TEXT NOT NULL,
    product TEXT NOT NULL,
    destination TEXT NOT NULL,
    user_agent TEXT,
    referer TEXT,
    received_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clicks_product ON clicks(product);
CREATE INDEX IF NOT EXISTS idx_clicks_install_id ON clicks(install_id);
CREATE INDEX IF NOT EXISTS idx_clicks_received_at ON clicks(received_at);
