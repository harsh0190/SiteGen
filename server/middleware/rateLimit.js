// Per-user limit on AI endpoints: every request can trigger many paid or rate-limited model calls.
// Fixed window kept in memory, which is enough for a single server instance.
// (With several instances you would keep these counters in Redis instead.)

const WINDOW_MS = 60 * 60 * 1000; // one hour
const MAX_REQUESTS = Number(process.env.AI_RATE_LIMIT_PER_HOUR) || 20;

const windows = new Map(); // userId -> { count, resetAt }

// Drop expired windows so the map cannot grow forever
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of windows) {
      if (entry.resetAt <= now) windows.delete(key);
    }
  },
  10 * 60 * 1000,
).unref();

export function aiRateLimit(req, res, next) {
  const key = String(req.user?.userId ?? req.ip);
  const now = Date.now();

  let entry = windows.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    windows.set(key, entry);
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    const seconds = Math.ceil((entry.resetAt - now) / 1000);
    res.set("Retry-After", String(seconds));
    return res.status(429).json({
      error: `AI request limit reached (${MAX_REQUESTS} per hour). Try again in ${Math.ceil(seconds / 60)} minutes.`,
    });
  }

  next();
}
