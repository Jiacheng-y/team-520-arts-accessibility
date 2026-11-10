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
