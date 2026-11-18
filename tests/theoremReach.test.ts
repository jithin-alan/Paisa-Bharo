import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import { db } from '../functions/src/helpers.ts';
import {
  THEOREMREACH_APP_ID,
  THEOREMREACH_EXCHANGE_RATE,
  buildSignedTheoremReachEntryUrl,
  createTheoremReachLaunchSession,
  executeTheoremReachBanEvent,
  executeTheoremReachReversalEvent,
  getTheoremReachLaunchUrl,
  isSafeFirestoreId,
  parseTheoremReachEventPayload,
  parseTheoremReachRewardPayload,
  reconstructTheoremReachCandidateUrls,
  signTheoremReachUrl,
  verifyTheoremReachIncomingUrl,
  verifyTheoremReachUrlSignature,
} from '../functions/src/theoremreach.ts';
import {
  executeCallback,
  handleTheoremReachEventHttp,
  providerPostback,
  theoremreachEventWebhook,
  verifyProviderSignature,
} from '../functions/src/providerCallbacks.ts';
import { TheoremReachAdapter } from '../src/providers/theoremReachAdapter.ts';

function sanitizeValue(val: unknown): any {
  if (val === null || val === undefined) return val;
  if (typeof val !== 'object') return val;
  if (val instanceof Date) return val.toISOString();
  if (Array.isArray(val)) return val.map(sanitizeValue);
  // Handle Firestore FieldValue sentinels safely
  const proto = Object.getPrototypeOf(val);
  if (proto && proto !== Object.prototype) {
    return '__SERVER_TIMESTAMP__';
  }
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
    out[k] = sanitizeValue(v);
  }
  return out;
}

class InMemoryFirestore {
  collections = new Map<string, Map<string, Record<string, any>>>();
  private autoIdCounter = 0;

  clear() {
    this.collections.clear();
    this.autoIdCounter = 0;
  }

  seed(col: string, id: string, data: Record<string, any>) {
    let map = this.collections.get(col);
    if (!map) {
      map = new Map();
      this.collections.set(col, map);
    }
    map.set(id, structuredClone(sanitizeValue(data)));
  }

  getDocData(col: string, id: string): Record<string, any> | undefined {
    const val = this.collections.get(col)?.get(id);
    return val ? structuredClone(val) : undefined;
  }

  getAllDocs(col: string): Array<{ id: string; data: Record<string, any> }> {
    const map = this.collections.get(col);
    if (!map) return [];
    return Array.from(map.entries()).map(([id, data]) => ({ id, data: structuredClone(data) }));
  }

  private createRef(col: string, id: string) {
    const store = this;
    return {
      id,
      path: `${col}/${id}`,
      collectionName: col,
      async get() {
        const doc = store.collections.get(col)?.get(id);
        return {
          exists: doc !== undefined,
          id,
          data: () => (doc !== undefined ? structuredClone(doc) : undefined),
        };
      },
      async set(data: Record<string, any>) {
        store.seed(col, id, data);
      },
      async update(partial: Record<string, any>) {
        const existing = store.collections.get(col)?.get(id);
        if (!existing) throw new Error(`Document ${col}/${id} does not exist`);
        store.seed(col, id, { ...existing, ...sanitizeValue(partial) });
      },
    };
  }

  collection(name: string) {
    return {
      doc: (id?: string) => {
        const docId = id || `auto_${++this.autoIdCounter}`;
        return this.createRef(name, docId);
      },
    };
  }

  async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    const stagedWrites: Array<() => void> = [];
    const stagedOverlay = new Map<string, Record<string, any>>();
    const tx = {
      get: async (ref: { collectionName: string; id: string; path: string }) => {
        const doc = stagedOverlay.has(ref.path)
          ? stagedOverlay.get(ref.path)
          : this.collections.get(ref.collectionName)?.get(ref.id);
        return {
          exists: doc !== undefined,
          id: ref.id,
          data: () => (doc !== undefined ? structuredClone(doc) : undefined),
        };
      },
      set: (ref: { collectionName: string; id: string; path: string }, data: Record<string, any>) => {
        const sanitized = structuredClone(sanitizeValue(data));
        stagedOverlay.set(ref.path, sanitized);
        stagedWrites.push(() => this.seed(ref.collectionName, ref.id, sanitized));
      },
      update: (ref: { collectionName: string; id: string; path: string }, partial: Record<string, any>) => {
        const existing = stagedOverlay.has(ref.path)
          ? stagedOverlay.get(ref.path)
          : this.collections.get(ref.collectionName)?.get(ref.id);
        if (!existing) throw new Error(`Document ${ref.path} does not exist for update`);
        const merged = { ...existing, ...structuredClone(sanitizeValue(partial)) };
        stagedOverlay.set(ref.path, merged);
        stagedWrites.push(() => this.seed(ref.collectionName, ref.id, merged));
      },
    };

    const result = await fn(tx);
    for (const apply of stagedWrites) apply();
    return result;
  }
}

function mockRes() {
  const headers: Record<string, string> = {};
  const result = {
    statusCode: 200,
    body: undefined as any,
    headers,
    set(key: string, value: string) {
      headers[key] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return result;
}

describe('Phase 3: TheoremReach Production-Readiness Security Suite', () => {
  const TEST_API_KEY = 'tr_test_api_key_25991';
  const TEST_SECRET = 'tr_test_secret_key_xyz';
  const TEST_PARTNER_ID = '58e07c40-90ea-473a-a9d4-9734df280536';
  let prevApiKey: string | undefined;
  let prevSecret: string | undefined;
  let prevPartnerId: string | undefined;
  let prevLivePostbacks: string | undefined;
  let prevCallbackBaseUrl: string | undefined;
  let prevCollectionDesc: PropertyDescriptor | undefined;
  let prevRunTxDesc: PropertyDescriptor | undefined;
  const memDb = new InMemoryFirestore();

  beforeEach(() => {
    prevApiKey = process.env.THEOREMREACH_API_KEY;
    prevSecret = process.env.THEOREMREACH_SECRET;
    prevPartnerId = process.env.THEOREMREACH_PARTNER_ID;
    prevLivePostbacks = process.env.PAISA_BHARO_LIVE_POSTBACKS_ENABLED;
    prevCallbackBaseUrl = process.env.THEOREMREACH_CALLBACK_BASE_URL;

    process.env.THEOREMREACH_API_KEY = TEST_API_KEY;
    process.env.THEOREMREACH_SECRET = TEST_SECRET;
    process.env.THEOREMREACH_PARTNER_ID = TEST_PARTNER_ID;
    process.env.PAISA_BHARO_LIVE_POSTBACKS_ENABLED = 'false';
    delete process.env.THEOREMREACH_CALLBACK_BASE_URL;

    memDb.clear();
    prevCollectionDesc = Object.getOwnPropertyDescriptor(db, 'collection');
    prevRunTxDesc = Object.getOwnPropertyDescriptor(db, 'runTransaction');

    Object.defineProperty(db, 'collection', {
      configurable: true,
      writable: true,
      value: (name: string) => memDb.collection(name),
    });
    Object.defineProperty(db, 'runTransaction', {
      configurable: true,
      writable: true,
      value: <T>(fn: (tx: any) => Promise<T>) => memDb.runTransaction(fn),
    });
  });

  afterEach(() => {
    if (prevCollectionDesc) Object.defineProperty(db, 'collection', prevCollectionDesc);
    else delete (db as any).collection;

    if (prevRunTxDesc) Object.defineProperty(db, 'runTransaction', prevRunTxDesc);
    else delete (db as any).runTransaction;

    if (prevApiKey === undefined) delete process.env.THEOREMREACH_API_KEY;
    else process.env.THEOREMREACH_API_KEY = prevApiKey;
    if (prevSecret === undefined) delete process.env.THEOREMREACH_SECRET;
    else process.env.THEOREMREACH_SECRET = prevSecret;
    if (prevPartnerId === undefined) delete process.env.THEOREMREACH_PARTNER_ID;
    else process.env.THEOREMREACH_PARTNER_ID = prevPartnerId;
    if (prevLivePostbacks === undefined) delete process.env.PAISA_BHARO_LIVE_POSTBACKS_ENABLED;
    else process.env.PAISA_BHARO_LIVE_POSTBACKS_ENABLED = prevLivePostbacks;
    if (prevCallbackBaseUrl === undefined) delete process.env.THEOREMREACH_CALLBACK_BASE_URL;
    else process.env.THEOREMREACH_CALLBACK_BASE_URL = prevCallbackBaseUrl;
  });

  describe('1. Firebase Functions v2 Secret Manager Binding & Missing-Secret Fail-Closed', () => {
    it('binds THEOREMREACH_API_KEY and THEOREMREACH_SECRET to all 3 TheoremReach functions', () => {
      const fns = [getTheoremReachLaunchUrl, providerPostback, theoremreachEventWebhook];
      for (const fn of fns) {
        const endpoint = (fn as any).__endpoint;
        const secretKeys = (endpoint?.secretEnvironmentVariables || []).map((s: any) => s.key);
        assert.ok(secretKeys.includes('THEOREMREACH_API_KEY'), 'Missing THEOREMREACH_API_KEY secret binding');
        assert.ok(secretKeys.includes('THEOREMREACH_SECRET'), 'Missing THEOREMREACH_SECRET secret binding');
      }
    });

    it('fails closed when THEOREMREACH_SECRET or THEOREMREACH_API_KEY is missing', async () => {
      memDb.seed('users', 'user_123', { uid: 'user_123', coinsBalance: 100, lifetimeEarnings: 100 });

      delete process.env.THEOREMREACH_SECRET;
      await assert.rejects(() => createTheoremReachLaunchSession('user_123'), /not configured/i);

      process.env.THEOREMREACH_SECRET = TEST_SECRET;
      delete process.env.THEOREMREACH_API_KEY;
      await assert.rejects(() => createTheoremReachLaunchSession('user_123'), /not configured/i);

      // Missing secret rejects reward callback
      delete process.env.THEOREMREACH_SECRET;
      const base =
        'https://us-central1-paisa-bharo-app.cloudfunctions.net/providerPostback/theoremreach?user_id=user_123&tx_id=tx_1&reward=100';
      const validSig = signTheoremReachUrl(base, TEST_SECRET);
      const rewardRes = mockRes();
      await (providerPostback as any)(
        {
          method: 'GET',
          path: '/theoremreach',
          headers: { host: 'us-central1-paisa-bharo-app.cloudfunctions.net' },
          originalUrl: `/theoremreach?user_id=user_123&tx_id=tx_1&reward=100&hash=${validSig}`,
          query: { user_id: 'user_123', tx_id: 'tx_1', reward: '100', hash: validSig },
        },
        rewardRes
      );
      assert.equal(rewardRes.statusCode, 403);

      // Missing API key rejects event webhook even with valid HMAC signature
      process.env.THEOREMREACH_SECRET = TEST_SECRET;
      delete process.env.THEOREMREACH_API_KEY;
      const evtBase =
        'https://us-central1-paisa-bharo-app.cloudfunctions.net/theoremreachEventWebhook?enc_salt=evt_miss';
      const evtSig = signTheoremReachUrl(evtBase, TEST_SECRET);
      const evtRes = mockRes();
      await (theoremreachEventWebhook as any)(
        {
          method: 'POST',
          headers: { host: 'us-central1-paisa-bharo-app.cloudfunctions.net' },
          originalUrl: `/theoremreachEventWebhook?enc_salt=evt_miss&hash=${evtSig}`,
          query: { enc_salt: 'evt_miss', hash: evtSig },
          body: { data: { api_key: TEST_API_KEY, user_id: 'user_123', event_type: 'ban' } },
        },
        evtRes
      );
      assert.equal(evtRes.statusCode, 403);
    });

    it('fails closed when THEOREMREACH_PARTNER_ID is missing or malformed', async () => {
      memDb.seed('users', 'user_123', { uid: 'user_123', coinsBalance: 100, lifetimeEarnings: 100 });

      delete process.env.THEOREMREACH_PARTNER_ID;
      await assert.rejects(() => createTheoremReachLaunchSession('user_123'), /not configured/i);

      process.env.THEOREMREACH_PARTNER_ID = ' 58e07c40-90ea-473a-a9d4-9734df280536 ';
      await assert.rejects(() => createTheoremReachLaunchSession('user_123'), /not configured/i);

      process.env.THEOREMREACH_PARTNER_ID = '"58e07c40-90ea-473a-a9d4-9734df280536"';
      await assert.rejects(() => createTheoremReachLaunchSession('user_123'), /not configured/i);

      // Direct builder also rejects missing partnerId
      delete process.env.THEOREMREACH_PARTNER_ID;
      assert.throws(
        () => buildSignedTheoremReachEntryUrl({
          apiKey: TEST_API_KEY, secretKey: TEST_SECRET,
          userId: 'user_123', transactionId: 'tr_session_001', externalId: 'user_123',
        }),
        /THEOREMREACH_PARTNER_ID is required/i
      );
    });

    it('uses the authenticated user UID as external_id and never falls back to transaction_id', () => {
      const url = buildSignedTheoremReachEntryUrl({
        apiKey: TEST_API_KEY, secretKey: TEST_SECRET,
        userId: 'user_123', transactionId: 'tr_session_001', partnerId: TEST_PARTNER_ID,
        externalId: 'user_123',
      });
      const params = new URLSearchParams(url.split('?')[1]);
      assert.equal(params.get('external_id'), 'user_123');
      assert.notEqual(params.get('external_id'), 'tr_session_001');
    });

    it('rejects an empty or invalid external_id instead of falling back to transaction_id', () => {
      assert.throws(
        () => buildSignedTheoremReachEntryUrl({
          apiKey: TEST_API_KEY, secretKey: TEST_SECRET,
          userId: 'user_123', transactionId: 'tr_session_001', partnerId: TEST_PARTNER_ID,
          externalId: '',
        }),
        /Valid externalId is required/i
      );
      assert.throws(
        () => buildSignedTheoremReachEntryUrl({
          apiKey: TEST_API_KEY, secretKey: TEST_SECRET,
          userId: 'user_123', transactionId: 'tr_session_001', partnerId: TEST_PARTNER_ID,
          externalId: 'guest_user',
        }),
        /Valid externalId is required/i
      );
    });

    it('binds THEOREMREACH_PARTNER_ID to all 3 TheoremReach functions', () => {
      const fns = [getTheoremReachLaunchUrl, providerPostback, theoremreachEventWebhook];
      for (const fn of fns) {
        const endpoint = (fn as any).__endpoint;
        const secretKeys = (endpoint?.secretEnvironmentVariables || []).map((s: any) => s.key);
        assert.ok(secretKeys.includes('THEOREMREACH_PARTNER_ID'), 'Missing THEOREMREACH_PARTNER_ID secret binding');
        assert.ok(!secretKeys.includes('THEOREMREACH_EXTERNAL_ID'), 'THEOREMREACH_EXTERNAL_ID must not be bound');
      }
    });

    it('generates distinct external_ids and transaction_ids for different users', async () => {
      memDb.seed('users', 'user_a', { uid: 'user_a', coinsBalance: 100, lifetimeEarnings: 100 });
      memDb.seed('users', 'user_b', { uid: 'user_b', coinsBalance: 100, lifetimeEarnings: 100 });

      const sessionA = await createTheoremReachLaunchSession('user_a');
      const sessionB = await createTheoremReachLaunchSession('user_b');

      const paramsA = new URLSearchParams(sessionA.launchUrl.split('?')[1]);
      const paramsB = new URLSearchParams(sessionB.launchUrl.split('?')[1]);

      assert.notEqual(paramsA.get('external_id'), paramsB.get('external_id'));
      assert.equal(paramsA.get('external_id'), 'user_a');
      assert.equal(paramsB.get('external_id'), 'user_b');
      assert.notEqual(paramsA.get('transaction_id'), paramsB.get('transaction_id'));
    });
  });

  describe('2. HMAC-SHA1 Signature Verification, Host Trust & Post-Hash Parameter Rejection', () => {
    it('builds valid signed entry URLs and rejects tampered parameters or wrong secrets', () => {
      assert.equal(THEOREMREACH_APP_ID, '25991');
      assert.equal(THEOREMREACH_EXCHANGE_RATE, 1000);

      const url = buildSignedTheoremReachEntryUrl({
        apiKey: TEST_API_KEY,
        secretKey: TEST_SECRET,
        userId: 'firebase_uid_991',
        transactionId: 'tr_session_001',
        partnerId: TEST_PARTNER_ID,
        externalId: 'firebase_uid_991',
      });

      assert.ok(!url.includes(TEST_SECRET), 'Secret must never appear in URL');
      assert.equal(verifyTheoremReachUrlSignature(url, TEST_SECRET), true);
      assert.equal(verifyTheoremReachUrlSignature(url, 'wrong_secret'), false);
      assert.equal(verifyTheoremReachUrlSignature(url.replace('firebase_uid_991', 'attacker_uid'), TEST_SECRET), false);

      // All 9 required parameters must be present in the documented order.
      const params = new URLSearchParams(url.split('?')[1]);
      const orderedKeys = [
        'api_key', 'user_id', 'transaction_id',
        'currency_name_plural', 'currency_name_singular', 'exchange_rate',
        'external_id', 'partner_id', 'hash',
      ];
      assert.deepEqual(orderedKeys, Array.from(params.keys()), 'Entry URL must carry all 9 params in documented order');
      assert.equal(params.get('api_key'), TEST_API_KEY);
      assert.equal(params.get('user_id'), 'firebase_uid_991');
      assert.equal(params.get('transaction_id'), 'tr_session_001');
      assert.equal(params.get('currency_name_plural'), 'coins');
      assert.equal(params.get('currency_name_singular'), 'coin');
      assert.equal(params.get('exchange_rate'), '1000');
      assert.equal(params.get('external_id'), 'firebase_uid_991');
      assert.equal(params.get('partner_id'), TEST_PARTNER_ID);
      assert.equal(params.get('hash'), signTheoremReachUrl(url.split('?')[0] + '?' + url.split('?')[1].replace(/&hash=[^&]*$/, ''), TEST_SECRET));
    });

    it('rejects any signed URL containing additional parameters after hash, duplicate hashes, or fragments', () => {
      const base =
        'https://us-central1-paisa-bharo-app.cloudfunctions.net/providerPostback/theoremreach?user_id=uid_abc&tx_id=tx_9001&reward=250';
      const sig = signTheoremReachUrl(base, TEST_SECRET);

      assert.equal(verifyTheoremReachUrlSignature(`${base}&hash=${sig}`, TEST_SECRET), true);
      assert.equal(verifyTheoremReachUrlSignature(`${base}&hash=${sig}&extra=1`, TEST_SECRET), false);
      assert.equal(verifyTheoremReachUrlSignature(`${base}&hash=${sig}&debug=true`, TEST_SECRET), false);
      assert.equal(verifyTheoremReachUrlSignature(`${base}&hash=${sig}&hash=${sig}`, TEST_SECRET), false);
      assert.equal(verifyTheoremReachUrlSignature(`${base}&hash=${sig}#frag`, TEST_SECRET), false);

      const onlyHashSig = signTheoremReachUrl('https://example.com/cb', TEST_SECRET);
      assert.equal(verifyTheoremReachUrlSignature(`https://example.com/cb?hash=${onlyHashSig}&extra=1`, TEST_SECRET), false);
    });

    it('rejects untrusted hosts / cross-endpoint replay and honors THEOREMREACH_CALLBACK_BASE_URL', () => {
      const attackerBase = 'https://evil.attacker.com/providerPostback/theoremreach?user_id=u1&tx_id=t1&reward=100';
      const attackerSig = signTheoremReachUrl(attackerBase, TEST_SECRET);

      const spoofedReq = {
        headers: {
          'x-forwarded-host': 'evil.attacker.com',
          'x-forwarded-proto': 'https',
        },
        originalUrl: `/providerPostback/theoremreach?user_id=u1&tx_id=t1&reward=100&hash=${attackerSig}`,
      };
      assert.deepEqual(reconstructTheoremReachCandidateUrls(spoofedReq, ['providerPostback']), []);
      assert.equal(verifyTheoremReachIncomingUrl(spoofedReq, TEST_SECRET, ['providerPostback']), false);

      // Legitimate Cloud Functions host verifies ONLY for allowed endpoint name
      const cfBase = 'https://us-central1-paisa-bharo-app.cloudfunctions.net/providerPostback/theoremreach?user_id=u1&tx_id=t1&reward=100';
      const cfSig = signTheoremReachUrl(cfBase, TEST_SECRET);
      const cfReq = {
        headers: { host: 'us-central1-paisa-bharo-app.cloudfunctions.net' },
        originalUrl: `/theoremreach?user_id=u1&tx_id=t1&reward=100&hash=${cfSig}`,
      };
      assert.equal(verifyTheoremReachIncomingUrl(cfReq, TEST_SECRET, ['providerPostback']), true);
      assert.equal(verifyTheoremReachIncomingUrl(cfReq, TEST_SECRET, ['theoremreachEventWebhook']), false);

      // Configured canonical base URL overrides host headers
      process.env.THEOREMREACH_CALLBACK_BASE_URL = 'https://callbacks.paisabharo.example';
      const customBase = 'https://callbacks.paisabharo.example/providerPostback/theoremreach?user_id=u1&tx_id=t1&reward=50';
      const customSig = signTheoremReachUrl(customBase, TEST_SECRET);
      const customReq = {
        headers: { host: 'us-central1-paisa-bharo-app.cloudfunctions.net' },
        originalUrl: `/theoremreach?user_id=u1&tx_id=t1&reward=50&hash=${customSig}`,
      };
      assert.equal(verifyTheoremReachIncomingUrl(customReq, TEST_SECRET, ['providerPostback']), true);
    });
  });

  describe('3. Reward Callback Strict GET-Only, Body Tampering & Duplicate Query Parameter Protections', () => {
    it('rejects POST on reward callback (405) and ignores any attacker-controlled req.body', async () => {
      process.env.PAISA_BHARO_LIVE_POSTBACKS_ENABLED = 'true';
      memDb.seed('users', 'user_123', { uid: 'user_123', coinsBalance: 100, lifetimeEarnings: 100 });

      const signedBase =
        'https://us-central1-paisa-bharo-app.cloudfunctions.net/providerPostback/theoremreach?user_id=user_123&tx_id=tr_tx_1&reward=50';
      const sig = signTheoremReachUrl(signedBase, TEST_SECRET);

      // POST to /providerPostback/theoremreach MUST return 405
      const postRes = mockRes();
      await (providerPostback as any)(
        {
          method: 'POST',
          path: '/theoremreach',
          headers: { host: 'us-central1-paisa-bharo-app.cloudfunctions.net' },
          originalUrl: `/theoremreach?user_id=user_123&tx_id=tr_tx_1&reward=50&hash=${sig}`,
          query: { user_id: 'user_123', tx_id: 'tr_tx_1', reward: '50', hash: sig },
          body: { reward: 9999, user_id: 'attacker' },
        },
        postRes
      );
      assert.equal(postRes.statusCode, 405);
      assert.equal(postRes.headers.Allow, 'GET');
      assert.equal(memDb.getDocData('users', 'user_123')?.coinsBalance, 100);

      // Even if a GET request somehow carries req.body, only signed req.query (50 coins) is used
      const getWithBodyRes = mockRes();
      await (providerPostback as any)(
        {
          method: 'GET',
          path: '/theoremreach',
          headers: { host: 'us-central1-paisa-bharo-app.cloudfunctions.net' },
          originalUrl: `/theoremreach?user_id=user_123&tx_id=tr_tx_1&reward=50&hash=${sig}`,
          query: { user_id: 'user_123', tx_id: 'tr_tx_1', reward: '50', hash: sig },
          body: { reward: 9999, user_id: 'attacker' },
        },
        getWithBodyRes
      );
      assert.equal(getWithBodyRes.statusCode, 200);
      assert.equal(getWithBodyRes.body.status, 'credited');
      assert.equal(getWithBodyRes.body.coinsAwarded, 50);
      assert.equal(memDb.getDocData('users', 'user_123')?.coinsBalance, 150);
    });

    it('rejects duplicate query parameters, post-hash params on HTTP endpoint, and path-injection IDs', async () => {
      assert.equal(isSafeFirestoreId('user_123'), true);
      assert.equal(isSafeFirestoreId('../../users/victim'), false);
      assert.equal(isSafeFirestoreId('user/sub'), false);
      assert.equal(isSafeFirestoreId('__reserved__'), false);

      assert.equal(
        parseTheoremReachRewardPayload({ user_id: 'user_123', tx_id: 'tx_1', reward: ['10', '9000'] }).kind,
        'invalid'
      );
      assert.equal(
        parseTheoremReachRewardPayload({ user_id: '../victim', tx_id: 'tx_1', reward: '50' }).kind,
        'invalid'
      );

      // HTTP with trailing extra param after hash -> 403
      const base =
        'https://us-central1-paisa-bharo-app.cloudfunctions.net/providerPostback/theoremreach?user_id=user_123&tx_id=tx_dup&reward=50';
      const sig = signTheoremReachUrl(base, TEST_SECRET);
      const extraParamRes = mockRes();
      await (providerPostback as any)(
        {
          method: 'GET',
          path: '/theoremreach',
          headers: { host: 'us-central1-paisa-bharo-app.cloudfunctions.net' },
          originalUrl: `/theoremreach?user_id=user_123&tx_id=tx_dup&reward=50&hash=${sig}&extra=1`,
          query: { user_id: 'user_123', tx_id: 'tx_dup', reward: '50', hash: sig, extra: '1' },
        },
        extraParamRes
      );
      assert.equal(extraParamRes.statusCode, 403);

      // HTTP with duplicate query param array -> 400
      const dupQueryBase =
        'https://us-central1-paisa-bharo-app.cloudfunctions.net/providerPostback/theoremreach?user_id=user_123&tx_id=tx_dup&reward=50&reward=9000';
      const dupSig = signTheoremReachUrl(dupQueryBase, TEST_SECRET);
      const dupQueryRes = mockRes();
      await (providerPostback as any)(
        {
          method: 'GET',
          path: '/theoremreach',
          headers: { host: 'us-central1-paisa-bharo-app.cloudfunctions.net' },
          originalUrl: `/theoremreach?user_id=user_123&tx_id=tx_dup&reward=50&reward=9000&hash=${dupSig}`,
          query: { user_id: 'user_123', tx_id: 'tx_dup', reward: ['50', '9000'], hash: dupSig },
        },
        dupQueryRes
      );
      assert.equal(dupQueryRes.statusCode, 400);
      assert.equal(dupQueryRes.body.status, 'invalid_payload');
    });
  });

  describe('4. Live Launch Session Persistence, Ownership, Banned-User Blocking & Deduplication', () => {
    it('creates Firestore launch session and enforces external_transaction_id ownership on rewards & events', async () => {
      process.env.PAISA_BHARO_LIVE_POSTBACKS_ENABLED = 'true';
      memDb.seed('users', 'user_owner', { uid: 'user_owner', coinsBalance: 100, lifetimeEarnings: 100 });
      memDb.seed('users', 'user_other', { uid: 'user_other', coinsBalance: 100, lifetimeEarnings: 100 });

      const launch = await getTheoremReachLaunchUrl.run({
        auth: { uid: 'user_owner' },
        data: {},
      } as any);

      assert.ok(launch.transactionId.startsWith('tr_user_owner_'));
      const storedSession = memDb.getDocData('theoremreach_sessions', launch.transactionId);
      assert.equal(storedSession?.userId, 'user_owner');
      assert.equal(storedSession?.status, 'launched');

      // 1) Unknown external_transaction_id rejected (403)
      const badSessionUrl = `https://us-central1-paisa-bharo-app.cloudfunctions.net/providerPostback/theoremreach?user_id=user_owner&tx_id=tx_sess_bad&reward=200&external_transaction_id=nonexistent_sess`;
      const badSessionSig = signTheoremReachUrl(badSessionUrl, TEST_SECRET);
      const badSessionRes = mockRes();
      await (providerPostback as any)(
        {
          method: 'GET',
          path: '/theoremreach',
          headers: { host: 'us-central1-paisa-bharo-app.cloudfunctions.net' },
          originalUrl: `/theoremreach?user_id=user_owner&tx_id=tx_sess_bad&reward=200&external_transaction_id=nonexistent_sess&hash=${badSessionSig}`,
          query: {
            user_id: 'user_owner',
            tx_id: 'tx_sess_bad',
            reward: '200',
            external_transaction_id: 'nonexistent_sess',
            hash: badSessionSig,
          },
        },
        badSessionRes
      );
      assert.equal(badSessionRes.statusCode, 403);
      assert.equal(badSessionRes.body.status, 'invalid_session');

      // 2) Valid session ID belonging to user_owner, claimed by user_other -> 403 session_user_mismatch
      const hijackedUrl = `https://us-central1-paisa-bharo-app.cloudfunctions.net/providerPostback/theoremreach?user_id=user_other&tx_id=tx_sess_hijack&reward=200&external_transaction_id=${launch.transactionId}`;
      const hijackedSig = signTheoremReachUrl(hijackedUrl, TEST_SECRET);
      const hijackRes = mockRes();
      await (providerPostback as any)(
        {
          method: 'GET',
          path: '/theoremreach',
          headers: { host: 'us-central1-paisa-bharo-app.cloudfunctions.net' },
          originalUrl: `/theoremreach?user_id=user_other&tx_id=tx_sess_hijack&reward=200&external_transaction_id=${launch.transactionId}&hash=${hijackedSig}`,
          query: {
            user_id: 'user_other',
            tx_id: 'tx_sess_hijack',
            reward: '200',
            external_transaction_id: launch.transactionId,
            hash: hijackedSig,
          },
        },
        hijackRes
      );
      assert.equal(hijackRes.statusCode, 403);
      assert.equal(hijackRes.body.status, 'session_user_mismatch');
      assert.equal(memDb.getDocData('users', 'user_other')?.coinsBalance, 100);

      // 3) Matching owner + session succeeds, and replay deduplicates cleanly
      const ownerUrl = `https://us-central1-paisa-bharo-app.cloudfunctions.net/providerPostback/theoremreach?user_id=user_owner&tx_id=tx_sess_ok&reward=200&external_transaction_id=${launch.transactionId}`;
      const ownerSig = signTheoremReachUrl(ownerUrl, TEST_SECRET);
      const ownerReq = {
        method: 'GET',
        path: '/theoremreach',
        headers: { host: 'us-central1-paisa-bharo-app.cloudfunctions.net' },
        originalUrl: `/theoremreach?user_id=user_owner&tx_id=tx_sess_ok&reward=200&external_transaction_id=${launch.transactionId}&hash=${ownerSig}`,
        query: {
          user_id: 'user_owner',
          tx_id: 'tx_sess_ok',
          reward: '200',
          external_transaction_id: launch.transactionId,
          hash: ownerSig,
        },
      };
      const firstRes = mockRes();
      await (providerPostback as any)(ownerReq, firstRes);
      assert.equal(firstRes.statusCode, 200);
      assert.equal(firstRes.body.status, 'credited');
      assert.equal(firstRes.body.newBalance, 300);
      assert.equal(memDb.getDocData('users', 'user_owner')?.coinsBalance, 300);
      assert.equal(memDb.getDocData('theoremreach_sessions', launch.transactionId)?.status, 'completed');

      // Duplicate replay
      const dupRes = mockRes();
      await (providerPostback as any)(ownerReq, dupRes);
      assert.equal(dupRes.statusCode, 200);
      assert.equal(dupRes.body.status, 'duplicate');
      assert.equal(dupRes.body.coinsAwarded, 0);
      assert.equal(memDb.getDocData('users', 'user_owner')?.coinsBalance, 300);

      // 4) Event webhook / handlers reject unknown or another user's external_transaction_id (403 invalid_session)
      const revWrongSess = await executeTheoremReachReversalEvent({
        encSalt: 'evt_sess_hijack_rev',
        userId: 'user_other',
        at: '2026-11-18T00:00:00Z',
        externalTransactionId: launch.transactionId,
        reversedTransactions: [
          { transactionId: 'tx_sess_ok', debitCoins: 200, amountInDollars: '0.2', amountInCurrency: '200' },
        ],
      });
      assert.equal(revWrongSess.status, 'invalid_session');

      const banWrongSess = await executeTheoremReachBanEvent({
        encSalt: 'evt_sess_hijack_ban',
        userId: 'user_other',
        at: '2026-11-18T00:00:00Z',
        externalTransactionId: launch.transactionId,
        banReason: 'fraud',
      });
      assert.equal(banWrongSess.status, 'invalid_session');
    });

    it('processes ban event without global suspension and blocks future TheoremReach launches & rewards', async () => {
      process.env.PAISA_BHARO_LIVE_POSTBACKS_ENABLED = 'true';
      memDb.seed('users', 'user_banned', { uid: 'user_banned', coinsBalance: 500, lifetimeEarnings: 500 });

      const banBase =
        'https://us-central1-paisa-bharo-app.cloudfunctions.net/theoremreachEventWebhook?enc_salt=evt_ban_77';
      const banSig = signTheoremReachUrl(banBase, TEST_SECRET);
      const banRes = mockRes();
      await (theoremreachEventWebhook as any)(
        {
          method: 'POST',
          headers: { host: 'us-central1-paisa-bharo-app.cloudfunctions.net' },
          originalUrl: `/theoremreachEventWebhook?enc_salt=evt_ban_77&hash=${banSig}`,
          query: { enc_salt: 'evt_ban_77', hash: banSig },
          body: {
            data: {
              api_key: TEST_API_KEY,
              user_id: 'user_banned',
              at: '2026-11-18T00:00:00Z',
              event_type: 'ban',
              ban_reason: 'speeding',
            },
          },
        },
        banRes
      );

      assert.equal(banRes.statusCode, 200);
      assert.equal(banRes.body.status, 'processed');

      const updatedUser = memDb.getDocData('users', 'user_banned');
      assert.equal(updatedUser?.providerBans?.theoremreach?.banned, true);
      assert.notEqual(updatedUser?.suspended, true);

      // Launch URL callable rejects banned user
      await assert.rejects(
        () => getTheoremReachLaunchUrl.run({ auth: { uid: 'user_banned' }, data: {} } as any),
        /restricted/i
      );

      // Reward callback rejects banned user (403) without crediting coins
      const rewardBase =
        'https://us-central1-paisa-bharo-app.cloudfunctions.net/providerPostback/theoremreach?user_id=user_banned&tx_id=tx_after_ban&reward=300';
      const rewardSig = signTheoremReachUrl(rewardBase, TEST_SECRET);
      const rewardRes = mockRes();
      await (providerPostback as any)(
        {
          method: 'GET',
          path: '/theoremreach',
          headers: { host: 'us-central1-paisa-bharo-app.cloudfunctions.net' },
          originalUrl: `/theoremreach?user_id=user_banned&tx_id=tx_after_ban&reward=300&hash=${rewardSig}`,
          query: { user_id: 'user_banned', tx_id: 'tx_after_ban', reward: '300', hash: rewardSig },
        },
        rewardRes
      );
      assert.equal(rewardRes.statusCode, 403);
      assert.equal(rewardRes.body.status, 'banned');
      assert.equal(rewardRes.body.coinsAwarded, 0);
      assert.equal(memDb.getDocData('users', 'user_banned')?.coinsBalance, 500);
    });
  });

  describe('5. Reversal Verification: Original Credit, User Ownership, Deduplication & Zero Clamping', () => {
    it('rejects reversals without an original credit or belonging to another user', async () => {
      memDb.seed('users', 'user_a', { uid: 'user_a', coinsBalance: 500, lifetimeEarnings: 500 });
      memDb.seed('users', 'user_b', { uid: 'user_b', coinsBalance: 500, lifetimeEarnings: 500 });

      // 1) Reversal without any original credit
      const missingRes = await executeTheoremReachReversalEvent({
        encSalt: 'evt_no_orig',
        userId: 'user_a',
        at: '2026-11-18T00:00:00Z',
        externalTransactionId: '',
        reversedTransactions: [
          { transactionId: 'tx_nonexistent', debitCoins: 200, amountInDollars: '0.2', amountInCurrency: '200' },
        ],
      });
      assert.equal(missingRes.status, 'original_tx_not_found');
      assert.equal(missingRes.coinsDeducted, 0);
      assert.equal(memDb.getDocData('users', 'user_a')?.coinsBalance, 500);

      // Seed original credit for user_a
      const creditRes = await executeCallback({
        provider: 'theoremreach',
        transactionId: 'tx_owned_by_a',
        userId: 'user_a',
        coinsAwarded: 250,
        reason: 'TheoremReach survey reward',
        metadata: { externalTransactionId: '' },
      });
      assert.equal(creditRes.status, 'credited');
      assert.equal(memDb.getDocData('users', 'user_a')?.coinsBalance, 750);

      // 2) Reversal targeting user_b against user_a's transaction must fail with user_mismatch
      const mismatchRes = await executeTheoremReachReversalEvent({
        encSalt: 'evt_wrong_user',
        userId: 'user_b',
        at: '2026-11-18T00:01:00Z',
        externalTransactionId: '',
        reversedTransactions: [
          { transactionId: 'tx_owned_by_a', debitCoins: 250, amountInDollars: '0.25', amountInCurrency: '250' },
        ],
      });
      assert.equal(mismatchRes.status, 'user_mismatch');
      assert.equal(mismatchRes.coinsDeducted, 0);
      assert.equal(memDb.getDocData('users', 'user_a')?.coinsBalance, 750);
      assert.equal(memDb.getDocData('users', 'user_b')?.coinsBalance, 500);
    });

    it('deduplicates repeated IDs within a single array, deduplicates across new enc_salt, and clamps at 0', async () => {
      process.env.PAISA_BHARO_LIVE_POSTBACKS_ENABLED = 'true';
      memDb.seed('users', 'user_rev', { uid: 'user_rev', coinsBalance: 100, lifetimeEarnings: 100 });

      await executeCallback({
        provider: 'theoremreach',
        transactionId: 'tx_rev_1',
        userId: 'user_rev',
        coinsAwarded: 250,
        reason: 'TheoremReach survey reward',
        metadata: { externalTransactionId: '' },
      });
      assert.equal(memDb.getDocData('users', 'user_rev')?.coinsBalance, 350);

      // Spend 200 coins before reversal arrives so balance = 150 (less than 250 reversal) -> must clamp at 0
      memDb.seed('users', 'user_rev', { uid: 'user_rev', coinsBalance: 150, lifetimeEarnings: 350 });

      // Array contains duplicate tx_rev_1 entries -> parsed list deduplicates to 1 entry, debit clamped to 150 -> 0
      const base =
        'https://us-central1-paisa-bharo-app.cloudfunctions.net/theoremreachEventWebhook?enc_salt=evt_rev_dup';
      const sig = signTheoremReachUrl(base, TEST_SECRET);
      const req = {
        method: 'POST',
        headers: { host: 'us-central1-paisa-bharo-app.cloudfunctions.net' },
        originalUrl: `/theoremreachEventWebhook?enc_salt=evt_rev_dup&hash=${sig}`,
        query: { enc_salt: 'evt_rev_dup', hash: sig },
        body: {
          data: {
            api_key: TEST_API_KEY,
            user_id: 'user_rev',
            at: '2026-11-18T00:05:00Z',
            event_type: 'reversal',
            reversed_transactions: [
              { transaction_id: 'tx_rev_1', amount_in_currency: '250', amount_in_dollars: '0.25' },
              { transaction_id: 'tx_rev_1', amount_in_currency: '250', amount_in_dollars: '0.25' },
            ],
          },
        },
      };

      const res1 = mockRes();
      await (theoremreachEventWebhook as any)(req, res1);
      assert.equal(res1.statusCode, 200);
      assert.equal(res1.body.status, 'processed');
      assert.equal(res1.body.coinsDeducted, 150);
      assert.equal(res1.body.newBalance, 0);
      assert.equal(memDb.getDocData('users', 'user_rev')?.coinsBalance, 0);
      assert.equal(memDb.getDocData('provider_transactions', 'theoremreach_tx_rev_1')?.fullyReversed, true);

      // Replay with same enc_salt -> duplicate
      const res2 = mockRes();
      await (theoremreachEventWebhook as any)(req, res2);
      assert.equal(res2.statusCode, 200);
      assert.equal(res2.body.status, 'duplicate');
      assert.equal(res2.body.coinsDeducted, 0);

      // Replay same tx_rev_1 with a DIFFERENT enc_salt -> still duplicate (already fully reversed)
      const secondRev = await executeTheoremReachReversalEvent({
        encSalt: 'evt_rev_different_salt',
        userId: 'user_rev',
        at: '2026-11-18T00:06:00Z',
        externalTransactionId: '',
        reversedTransactions: [
          { transactionId: 'tx_rev_1', debitCoins: 250, amountInDollars: '0.25', amountInCurrency: '250' },
        ],
      });
      assert.equal(secondRev.status, 'duplicate');
      assert.equal(secondRev.coinsDeducted, 0);
    });

    it('requires api_key on event webhook even when HMAC signature matches', async () => {
      const base =
        'https://us-central1-paisa-bharo-app.cloudfunctions.net/providerPostback/theoremreach-event?enc_salt=evt_no_key';
      const sig = signTheoremReachUrl(base, TEST_SECRET);

      const missingKeyRes = mockRes();
      await handleTheoremReachEventHttp(
        {
          method: 'POST',
          headers: { host: 'us-central1-paisa-bharo-app.cloudfunctions.net' },
          originalUrl: `/theoremreach-event?enc_salt=evt_no_key&hash=${sig}`,
          query: { enc_salt: 'evt_no_key', hash: sig },
          body: { data: { user_id: 'user_abc', event_type: 'ban', ban_reason: 'fraud' } },
        } as any,
        missingKeyRes as any,
        ['providerPostback']
      );
      assert.equal(missingKeyRes.statusCode, 403);
    });
  });

  describe('6. Existing Provider Regression & Frontend TheoremReachAdapter', () => {
    it('preserves POST-only enforcement, HMAC verification, and live transaction execution for Cint/AdGem/BitLabs/Affiliate', async () => {
      for (const p of ['cint', 'adgem', 'bitlabs', 'affiliate']) {
        const res = mockRes();
        await (providerPostback as any)({ method: 'GET', path: `/${p}`, headers: {}, query: {} }, res);
        assert.equal(res.statusCode, 405, `${p} must continue rejecting GET requests`);
      }

      process.env.CINT_API_KEY = 'cint_secret';
      const cintSig = crypto
        .createHmac('sha256', 'cint_secret')
        .update('1700000000|cint_user_1|srv_1|complete|sub_1', 'utf8')
        .digest('hex');

      assert.equal(
        verifyProviderSignature('cint', {
          timestamp: '1700000000',
          respondentId: 'cint_user_1',
          surveyId: 'srv_1',
          status: 'complete',
          subId: 'sub_1',
          secureHash: cintSig,
        }),
        true
      );

      // Live Cint callback execution via providerPostback + Firestore stub
      process.env.PAISA_BHARO_LIVE_POSTBACKS_ENABLED = 'true';
      memDb.seed('users', 'cint_user_1', { uid: 'cint_user_1', coinsBalance: 50, lifetimeEarnings: 50 });
      memDb.seed('survey_tokens', 'sv_srv_1_cint_user_1', { status: 'started' });

      const cintRes = mockRes();
      await (providerPostback as any)(
        {
          method: 'POST',
          path: '/cint',
          headers: {},
          query: {},
          body: {
            timestamp: '1700000000',
            respondentId: 'cint_user_1',
            surveyId: 'srv_1',
            status: 'complete',
            subId: 'sub_1',
            coinsAwarded: 120,
            secureHash: cintSig,
          },
        },
        cintRes
      );
      assert.equal(cintRes.statusCode, 200);
      assert.equal(cintRes.body.status, 'credited');
      assert.equal(memDb.getDocData('users', 'cint_user_1')?.coinsBalance, 170);
      assert.equal(memDb.getDocData('survey_tokens', 'sv_srv_1_cint_user_1')?.status, 'verified');

      process.env.BITLABS_SECRET = 'bitlabs_secret';
      const bitlabsSig = crypto.createHmac('sha256', 'bitlabs_secret').update('user_1250tx_1', 'utf8').digest('hex');
      assert.equal(verifyProviderSignature('bitlabs', { uid: 'user_1', val: '250', tx: 'tx_1', hash: bitlabsSig }), true);

      process.env.ADGEM_SECRET = 'adgem_secret';
      const adgemSig = crypto.createHmac('sha256', 'adgem_secret').update('user_1500tx_2', 'utf8').digest('hex');
      assert.equal(verifyProviderSignature('adgem', { player_id: 'user_1', amount: '500', transaction_id: 'tx_2', signature: adgemSig }), true);

      process.env.AFFILIATE_SECRET = 'aff_secret';
      const affSig = crypto.createHmac('sha256', 'aff_secret').update('ord_150', 'utf8').digest('hex');
      assert.equal(verifyProviderSignature('affiliate', { orderId: 'ord_1', commissionUsd: '50', signature: affSig }), true);

      delete process.env.CINT_API_KEY;
      delete process.env.BITLABS_SECRET;
      delete process.env.ADGEM_SECRET;
      delete process.env.AFFILIATE_SECRET;
    });

    it('rejects unauthenticated/guest users and consumes server-signed launch URLs in TheoremReachAdapter', async () => {
      const adapter = new TheoremReachAdapter(async () => ({
        data: {
          launchUrl:
            'https://theoremreach.com/respondent_entry/direct?api_key=k&user_id=uid_77&transaction_id=tr_1&currency_name_plural=coins&currency_name_singular=coin&exchange_rate=1000&external_id=tr_1&partner_id=58e07c40-90ea-473a-a9d4-9734df280536&hash=abc',
          transactionId: 'tr_1',
          appId: '25991',
          currency: 'coin',
          exchangeRate: 1000,
        },
      }));

      await assert.rejects(() => adapter.createLaunchSession(''), /authenticated account/);
      await assert.rejects(() => adapter.createLaunchSession('guest_user'), /authenticated account/);

      const session = await adapter.createLaunchSession('uid_77');
      assert.equal(session.provider, 'theoremreach');
      assert.equal(session.appId, '25991');
      assert.equal(session.currency, 'coin');
      assert.equal(session.exchangeRate, 1000);
      assert.ok(session.launchUrl.startsWith('https://theoremreach.com/respondent_entry/direct?'));

      const badServerAdapter = new TheoremReachAdapter(async () => ({
        data: {
          launchUrl: 'https://evil.example.com/phish',
          transactionId: 'tr_bad',
          appId: '25991',
          currency: 'coin',
          exchangeRate: 1000,
        },
      }));
      await assert.rejects(() => badServerAdapter.createLaunchSession('uid_77'), /invalid TheoremReach launch URL/i);
    });
  });
});
