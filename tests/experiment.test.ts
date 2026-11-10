import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assignVariant} from '../src/experiment.ts';

test('new visitors have three equal assignment intervals', () => {
  const storage = {getItem: () => null, setItem: () => {}};
  for (const [random, expected] of [[0, 'worksheet'], [.3333, 'worksheet'], [1/3, 'mobile'], [.6666, 'mobile'], [2/3, 'device'], [.9999, 'device']] as const) {
    assert.equal(assignVariant(storage, () => random), expected);
  }
});
test('returning visitors retain their assignment and damaged state is replaced', () => {
  const entries = new Map<string, string>();
  const storage = {getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => {entries.set(key, value);}};
  assert.equal(assignVariant(storage, () => .5), 'mobile');
  assert.equal(assignVariant(storage, () => .9), 'mobile');
  entries.set('btf:product-format-v1', 'invalid');
  assert.equal(assignVariant(storage, () => .9), 'device');
});
test('blocked storage still permits a valid assignment', () => {
  const storage = {getItem: () => {throw Error('blocked');}, setItem: () => {throw Error('blocked');}};
  assert.equal(assignVariant(storage, () => 0), 'worksheet');
});

test('displayed direct assignments are attributed without overwriting saved random assignments', async () => {
  const entries = new Map([['btf:product-format-v1', 'worksheet'], ['btf:museum-pricing-v1', 'inquiry']]);
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
  }});
  const location = {pathname: ''};
  Object.defineProperty(globalThis, 'location', {configurable: true, value: location});
  try {
    const {experimentAttribution} = await import('../src/experiment.ts');
    for (const variant of ['mobile', 'device']) for (const pricing_variant of ['inquiry', 'pilot']) {
      location.pathname = `/museums/${variant}/${pricing_variant}/`;
      assert.deepEqual(experimentAttribution(), {experiment: 'product-format-v1', variant, pricing_experiment: 'museum-pricing-v1', pricing_variant});
    }
    location.pathname = '/';
    assert.deepEqual(experimentAttribution(), {experiment: 'product-format-v1', variant: 'worksheet'});
    assert.equal(entries.get('btf:museum-pricing-v1'), 'inquiry');
  } finally {
    Reflect.deleteProperty(globalThis, 'localStorage');
    Reflect.deleteProperty(globalThis, 'location');
  }
});
