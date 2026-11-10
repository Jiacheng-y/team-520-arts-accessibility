import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSubmission } from '../supabase/functions/_shared/validation.ts';
const valid = { kind: 'signup', receipt: '123e4567-e89b-42d3-a456-426614174099', email: '  Curator@Museum.org ', audience: 'museum', organization: 'Gallery', role: 'Educator', consent: true, website: '', visitor_id: null, attribution: { source: 'outreach', medium: 'email', campaign: 'museum_pilot', ref: 'm017' } };
test('normalizes emails and retains bounded attribution', () => { const result = parseSubmission(valid); assert.equal(result.email, 'curator@museum.org'); assert.equal(result.attribution.ref, 'm017'); });
test('rejects malformed emails and missing consent', () => { assert.throws(() => parseSubmission({ ...valid, email: 'bad' })); assert.throws(() => parseSubmission({ ...valid, consent: false })); });
test('requires organization and role only for museum staff', () => { assert.throws(() => parseSubmission({ ...valid, organization: '' })); assert.doesNotThrow(() => parseSubmission({ ...valid, audience: 'visitor', organization: '', role: '' })); });
test('rejects unknown actions, oversized attribution and injected audience', () => { assert.throws(() => parseSubmission({ ...valid, kind: 'admin_delete' })); assert.throws(() => parseSubmission({ ...valid, audience: 'admin' })); assert.throws(() => parseSubmission({ ...valid, attribution: { ref: 'x'.repeat(201) } })); });
test('visits require UUIDs; ignores client timestamps', () => { assert.throws(() => parseSubmission({ kind: 'visit', event_id: 'bad', visitor_id: 'bad' })); const v = parseSubmission({ kind: 'visit', event_id: '123e4567-e89b-42d3-a456-426614174000', visitor_id: '123e4567-e89b-42d3-a456-426614174001', created_at: '2000-01-01' }); assert.equal('created_at' in v, false); });
test('qualification requires an unguessable signup receipt', () => { assert.throws(() => parseSubmission({ kind: 'qualify', receipt: 'abc', challenge: 'high', preference: 'layer', paid_pilot: 'yes' })); });
test('signup preserves the same private receipt across retries and rejects missing receipts', () => { const first = parseSubmission(valid); const retry = parseSubmission(valid); assert.equal(first.receipt, valid.receipt); assert.equal(retry.receipt, first.receipt); assert.throws(() => parseSubmission({ ...valid, receipt: undefined })); });
test('experiment attribution survives signup validation and rejects invented variants', () => {
  for (const variant of ['worksheet', 'mobile', 'device']) {
    assert.equal(parseSubmission({...valid, experiment: 'product-format-v1', variant}).variant, variant);
  }
  assert.throws(() => parseSubmission({...valid, experiment: 'product-format-v1', variant: 'invented'}));
  assert.throws(() => parseSubmission({...valid, variant: 'mobile'}));
});
test('experiment qualification asks interest in the assigned concept without comparing formats', () => {
  const response = {kind: 'qualify', receipt: valid.receipt, challenge: 'high', interest: 'very', paid_pilot: 'yes'};
  assert.equal(parseSubmission(response).interest, 'very');
  assert.throws(() => parseSubmission({...response, interest: 'invalid'}));
});
test('pricing attribution accepts both offers on mobile and device only', () => {
  for (const variant of ['mobile', 'device']) for (const pricing_variant of ['inquiry', 'pilot']) {
    const fields = {experiment: 'product-format-v1', variant, pricing_experiment: 'museum-pricing-v1', pricing_variant};
    assert.equal(parseSubmission({...valid, ...fields}).pricing_variant, pricing_variant);
    assert.equal(parseSubmission({kind: 'visit', event_id: valid.receipt, visitor_id: valid.receipt, ...fields}).pricing_experiment, 'museum-pricing-v1');
  }
  for (const fields of [
    {variant: 'worksheet', pricing_experiment: 'museum-pricing-v1', pricing_variant: 'pilot'},
    {variant: 'mobile', pricing_experiment: 'museum-pricing-v1'},
    {variant: 'device', pricing_variant: 'pilot'},
    {variant: 'mobile', pricing_experiment: 'museum-pricing-v1', pricing_variant: 'free'},
  ]) assert.throws(() => parseSubmission({...valid, experiment: 'product-format-v1', ...fields}));
});
