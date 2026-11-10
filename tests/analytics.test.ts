import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSubmission} from '../supabase/functions/_shared/validation.ts';

test('visit collection carries the displayed concept only after analytics consent', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-public-key';
  const entries = new Map([['btf:product-format-v1', 'device'], ['btf:museum-pricing-v1', 'pilot']]);
  const originalFetch = globalThis.fetch;
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  }});
  Object.defineProperty(globalThis, 'location', {configurable: true, value: {search: '?utm_campaign=experiment-test'}});
  const requests: Record<string, unknown>[] = [];
  globalThis.fetch = async (_url, init) => {
    const payload = JSON.parse(String(init?.body));
    parseSubmission(payload); // Exercise the actual ingestion contract.
    requests.push(payload);
    return new Response(JSON.stringify({ok: true}), {status: 200});
  };
  try {
    const {trackVisit} = await import('../src/analytics.ts');
    await trackVisit();
    assert.equal(requests.length, 0);
    entries.set('btf:analytics', 'allow');
    await trackVisit();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].experiment, 'product-format-v1');
    assert.equal(requests[0].variant, 'device');
    assert.equal(requests[0].pricing_experiment, 'museum-pricing-v1');
    assert.equal(requests[0].pricing_variant, 'pilot');
    assert.deepEqual(requests[0].attribution, {campaign: 'experiment-test'});
    await trackVisit();
    assert.equal(requests.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    Reflect.deleteProperty(globalThis, 'localStorage');
    Reflect.deleteProperty(globalThis, 'location');
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }
});
