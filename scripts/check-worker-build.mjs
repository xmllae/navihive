import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const redirectPath = resolve('.wrangler/deploy/config.json');
const redirect = JSON.parse(readFileSync(redirectPath, 'utf8'));
const configPath = resolve(dirname(redirectPath), redirect.configPath);
const config = JSON.parse(readFileSync(configPath, 'utf8'));
assert.ok(config.main, 'Build must include the API Worker, not only static assets');
assert.ok(existsSync(resolve(dirname(configPath), config.main)), 'Worker entry must exist');
assert.ok(
  config.d1_databases?.some(
    (db) =>
      db.binding === 'DB' &&
      db.database_name === 'navigation-db' &&
      db.database_id === 'fd93480b-314d-40b8-8f87-0614e34cc0ea'
  ),
  'Build must bind the existing navigation database'
);
assert.ok(config.assets?.run_worker_first?.includes('/api/*'), 'API must run before assets');
assert.equal(config.assets.not_found_handling, 'single-page-application');
assert.equal(config.vars?.AUTH_ENABLED, 'true');
assert.equal(config.vars?.AUTH_REQUIRED_FOR_READ, 'false');
assert.equal(config.keep_vars, true);
for (const key of ['AUTH_USERNAME', 'AUTH_PASSWORD', 'AUTH_SECRET']) {
  assert.equal(config.vars[key], undefined, `${key} must be configured outside Git`);
}
console.log('Worker entry, existing D1 binding, API routing and auth configuration verified');
