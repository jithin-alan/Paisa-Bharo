import { Request, Response, NextFunction } from 'express';

interface RateLimitStoreEntry {
  timestamps: number[];
}

export interface RateLimiterOptions {
  windowMs: number; // Duration of the sliding window in ms
  max: number; // Maximum number of connections during windowMs
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export class MemoryRateLimiter {
  private hits: Map<string, RateLimitStoreEntry> = new Map();
  private windowMs: number;
  private max: number;
  private message: string;
  private keyGenerator: (req: Request) => string;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.max = options.max;
    this.message = options.message || 'Too many requests, please try again later.';
    this.keyGenerator =
      options.keyGenerator ||
      ((req: Request) => {
        const forwarded = req.headers['x-forwarded-for'];
        if (typeof forwarded === 'string') {
          return forwarded.split(',')[0].trim();
        }
        return req.ip || req.socket.remoteAddress || '127.0.0.1';
      });

    // Cleanup stale entries every minute to prevent memory leaks
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), Math.max(this.windowMs, 60000));
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  public cleanup(now = Date.now()): void {
    const threshold = now - this.windowMs;
    for (const [key, entry] of this.hits.entries()) {
      entry.timestamps = entry.timestamps.filter(ts => ts > threshold);
      if (entry.timestamps.length === 0) {
        this.hits.delete(key);
      }
    }
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.keyGenerator(req);
      const now = Date.now();
      const threshold = now - this.windowMs;

      let entry = this.hits.get(key);
      if (!entry) {
        entry = { timestamps: [] };
        this.hits.set(key, entry);
      }

      // Filter timestamps within current window
      entry.timestamps = entry.timestamps.filter(ts => ts > threshold);

      const count = entry.timestamps.length;
      const remaining = Math.max(0, this.max - count);
      const resetTime = entry.timestamps.length > 0 ? Math.ceil((entry.timestamps[0] + this.windowMs) / 1000) : Math.ceil((now + this.windowMs) / 1000);

      res.setHeader('X-RateLimit-Limit', this.max.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', resetTime.toString());

      if (count >= this.max) {
        const retryAfterSec = Math.max(1, Math.ceil((entry.timestamps[0] + this.windowMs - now) / 1000));
        res.setHeader('Retry-After', retryAfterSec.toString());
        return res.status(429).json({
          success: false,
          error: this.message,
          retryAfter: retryAfterSec,
        });
      }

      entry.timestamps.push(now);
      next();
    };
  }

  public reset(): void {
    this.hits.clear();
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.hits.clear();
  }
}

/**
 * Creates rate limiter middleware
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const limiter = new MemoryRateLimiter(options);
  return limiter.middleware();
}
