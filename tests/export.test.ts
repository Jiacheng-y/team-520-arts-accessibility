import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('Next exports both routes with repository-aware assets and no Node server', async () => {
  assert.equal(existsSync('next.config.mjs'), true, 'Next.js export configuration is required');
  const { default: config } = await import('../next.config.mjs');
  assert.equal(config.output, 'export');
  assert.equal(config.trailingSlash, true);
  assert.equal(config.images?.unoptimized, true);
  assert.equal(existsSync('app/page.tsx'), true);
  assert.equal(existsSync('app/dashboard/page.tsx'), true);
});

test('GitHub deployment publishes static Next output and public Supabase configuration', () => {
  const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
  assert.match(workflow, /path: out/);
  assert.match(workflow, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(workflow, /NEXT_PUBLIC_BASE_PATH/);
});
