import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assignPricing, directAssignment} from '../src/pricing.ts';

test('pricing splits evenly and persists independently of the concept', () => {
  const entries = new Map<string, string>();
  const storage = {getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => {entries.set(key, value);}};
  assert.equal(assignPricing(storage, () => .4999), 'inquiry');
  assert.equal(assignPricing(storage, () => .9), 'inquiry');
  entries.clear();
  assert.equal(assignPricing(storage, () => .5), 'pilot');
  entries.set('btf:museum-pricing-v1', 'invalid');
  assert.equal(assignPricing(storage, () => 0), 'inquiry');
  assert.equal(assignPricing({getItem() {throw Error();}, setItem() {throw Error();}}, () => .8), 'pilot');
});
test('direct museum URLs select only valid combinations, including under a base path', () => {
  for (const variant of ['mobile', 'device']) for (const pricing_variant of ['inquiry', 'pilot']) {
    assert.deepEqual(directAssignment(`/team-520-arts-accessibility/museums/${variant}/${pricing_variant}/`), {variant, pricing_variant});
  }
  assert.equal(directAssignment('/'), null);
  assert.equal(directAssignment('/museums/worksheet/pilot/'), null);
  assert.equal(directAssignment('/museums/mobile/free/'), null);
});
