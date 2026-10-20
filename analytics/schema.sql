CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY,
  visitor TEXT NOT NULL,
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  referrer TEXT NOT NULL,
  device TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS visits_created ON visits(created_at);
CREATE INDEX IF NOT EXISTS visits_seen ON visits(last_seen);
