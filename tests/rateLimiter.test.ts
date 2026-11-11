import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRateLimiter } from '../src/middleware/rateLimiter.ts';

describe('MemoryRateLimiter Middleware', () => {
  it('allows requests within the configured threshold', () => {
    const limiter = new MemoryRateLimiter({
      windowMs: 1000,
      max: 3,
    });

    const mw = limiter.middleware();
    let nextCalled = 0;
    const req = {
      ip: '192.168.1.1',
      headers: {},
      socket: { remoteAddress: '192.168.1.1' },
    } as any;

    const resHeaders: Record<string, string> = {};
    const res = {
      setHeader: (k: string, v: string) => {
        resHeaders[k] = v;
      },
      status: (_code: number) => ({ json: () => {} }),
    } as any;

    // First request
    mw(req, res, () => {
      nextCalled++;
    });
    assert.equal(nextCalled, 1);
    assert.equal(resHeaders['X-RateLimit-Remaining'], '3');

    // Second request
    mw(req, res, () => {
      nextCalled++;
    });
    assert.equal(nextCalled, 2);
    assert.equal(resHeaders['X-RateLimit-Remaining'], '2');

    limiter.destroy();
  });

  it('blocks and returns 429 when limit is exceeded', () => {
    const limiter = new MemoryRateLimiter({
      windowMs: 1000,
      max: 2,
      message: 'Rate limit exceeded',
    });

    const mw = limiter.middleware();
    const req = {
      ip: '10.0.0.5',
      headers: {},
      socket: { remoteAddress: '10.0.0.5' },
    } as any;

    let statusCode = 0;
    let jsonBody: any = null;
    const resHeaders: Record<string, string> = {};

    const createRes = () => ({
      setHeader: (k: string, v: string) => {
        resHeaders[k] = v;
      },
      status: (code: number) => {
        statusCode = code;
        return {
          json: (body: any) => {
            jsonBody = body;
          },
        };
      },
    } as any);

    let nextCalls = 0;
    const next = () => { nextCalls++; };

    // Request 1: Allowed
    mw(req, createRes(), next);
    // Request 2: Allowed
    mw(req, createRes(), next);
    assert.equal(nextCalls, 2);

    // Request 3: Exceeds limit -> 429
    mw(req, createRes(), next);
    assert.equal(nextCalls, 2); // next() not called
    assert.equal(statusCode, 429);
    assert.equal(jsonBody.success, false);
    assert.equal(jsonBody.error, 'Rate limit exceeded');
    assert.ok(resHeaders['Retry-After']);

    limiter.destroy();
  });

  it('resets counters after sliding window expires', async () => {
    const limiter = new MemoryRateLimiter({
      windowMs: 50, // 50ms window
      max: 1,
    });

    const mw = limiter.middleware();
    const req = {
      ip: '127.0.0.1',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as any;

    let calls = 0;
    const next = () => { calls++; };
    const res = {
      setHeader: () => {},
      status: () => ({ json: () => {} }),
    } as any;

    mw(req, res, next);
    assert.equal(calls, 1);

    // Immediate second call should be blocked
    let blockedCode = 0;
    const blockedRes = {
      setHeader: () => {},
      status: (c: number) => {
        blockedCode = c;
        return { json: () => {} };
      },
    } as any;
    mw(req, blockedRes, next);
    assert.equal(blockedCode, 429);

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 60));

    // Should be allowed again
    mw(req, res, next);
    assert.equal(calls, 2);

    limiter.destroy();
  });
});
