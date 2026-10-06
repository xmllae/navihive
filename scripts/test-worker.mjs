import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { test } from 'node:test';
import { hashSync } from 'bcrypt-edge';

// Use Wrangler's own runtime; every database below is isolated and in memory.
const require = createRequire(import.meta.url);
const { Miniflare, convertV4MiniflareOptions } = require(
  require.resolve('miniflare', { paths: [require.resolve('wrangler')] })
);
const redirectPath = resolve('.wrangler/deploy/config.json');
const redirect = JSON.parse(readFileSync(redirectPath, 'utf8'));
const configPath = resolve(dirname(redirectPath), redirect.configPath);
const config = JSON.parse(readFileSync(configPath, 'utf8'));
assert.ok(config.main, 'Run pnpm build to produce the API Worker first');

async function start(bindings = {}) {
  const options = {
    modules: true,
    scriptPath: resolve(dirname(configPath), config.main),
    compatibilityDate: config.compatibility_date,
    d1Databases: { DB: 'navihive-api-regression-only' },
    d1Persist: false,
    bindings: { AUTH_ENABLED: 'true', AUTH_REQUIRED_FOR_READ: 'false', ...bindings },
  };
  const mf = new Miniflare(
    convertV4MiniflareOptions ? convertV4MiniflareOptions(options) : options
  );
  try {
    const db = await mf.getD1Database('DB');
    await db.exec(
      readFileSync('init_table.sql', 'utf8')
        .replace(/^--.*$/gm, '')
        .replace(/\r?\n/g, ' ')
    );
    await db.batch([
      db
        .prepare(
          'INSERT INTO groups (id, name, order_num, is_public) VALUES (1, ?, 0, 1), (2, ?, 1, 0)'
        )
        .bind('Public group', 'Private group'),
      db
        .prepare(
          'INSERT INTO sites (id, group_id, name, url, order_num, is_public) VALUES (1, 1, ?, ?, 0, 1), (2, 1, ?, ?, 1, 0), (3, 2, ?, ?, 0, 1)'
        )
        .bind(
          'Public site',
          'https://example.com',
          'Private site',
          'https://example.com',
          'Hidden group site',
          'https://example.com'
        ),
      db
        .prepare('INSERT INTO configs (key, value) VALUES (?, ?)')
        .bind('site.title', 'API regression fixture'),
    ]);
    return { mf, db };
  } catch (error) {
    await mf.dispose();
    throw error;
  }
}

const request = (mf, path, options) => mf.dispatchFetch(`https://example.com/api/${path}`, options);

test('account sidebar preference is shared between sessions, private and excluded from content imports', async () => {
  const { mf, db } = await start({
    AUTH_USERNAME: 'test-admin',
    AUTH_PASSWORD: hashSync('test-password', 4),
    AUTH_SECRET: 'local-regression-key-only',
  });
  const key = 'account-preference:test-admin:desktop-sidebar';
  try {
    assert.equal((await request(mf, 'preferences/desktop-sidebar')).status, 401);
    assert.equal((await request(mf, 'preferences/desktop-sidebar', { method: 'PUT' })).status, 401);
    await db
      .prepare('INSERT INTO configs (key, value) VALUES (?, ?)')
      .bind('account-preference:other-admin:desktop-sidebar', 'true')
      .run();
    const login = async () => {
      const response = await request(mf, 'login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'test-admin', password: 'test-password' }),
      });
      assert.equal((await response.json()).success, true);
      return {
        Cookie: response.headers.get('set-cookie').split(';')[0],
        'Content-Type': 'application/json',
      };
    };
    const first = await login();
    const second = await login();
    assert.deepEqual(
      await (await request(mf, 'preferences/desktop-sidebar', { headers: first })).json(),
      { collapsed: false }
    );
    for (const body of [
      { collapsed: 'true' },
      { collapsed: true, username: 'other-admin' },
      null,
    ]) {
      assert.equal(
        (
          await request(mf, 'preferences/desktop-sidebar', {
            method: 'PUT',
            headers: first,
            body: JSON.stringify(body),
          })
        ).status,
        400
      );
    }
    for (const collapsed of [true, false, true]) {
      const saved = await request(mf, 'preferences/desktop-sidebar', {
        method: 'PUT',
        headers: first,
        body: JSON.stringify({ collapsed }),
      });
      assert.equal(saved.status, 200);
      assert.deepEqual(
        await (await request(mf, 'preferences/desktop-sidebar', { headers: second })).json(),
        { collapsed }
      );
    }
    const configs = await (await request(mf, 'configs')).json();
    assert.ok(Object.keys(configs).every((name) => !name.startsWith('account-preference:')));
    for (const method of ['GET', 'PUT', 'DELETE']) {
      assert.equal(
        (
          await request(mf, `configs/${key}`, {
            method,
            headers: first,
            ...(method === 'PUT' ? { body: JSON.stringify({ value: 'false' }) } : {}),
          })
        ).status,
        403
      );
    }
    const backup = await (await request(mf, 'export', { headers: first })).json();
    assert.ok(Object.keys(backup.configs).every((name) => !name.startsWith('account-preference:')));
    const imported = await request(mf, 'import', {
      method: 'POST',
      headers: first,
      body: JSON.stringify({
        version: '1.0',
        exportDate: new Date().toISOString(),
        groups: [],
        sites: [],
        configs: { [key]: 'false', 'site.title': 'Imported title' },
      }),
    });
    assert.equal(imported.status, 200);
    assert.equal((await imported.json()).success, true);
    assert.deepEqual(
      await (await request(mf, 'preferences/desktop-sidebar', { headers: second })).json(),
      { collapsed: true }
    );
    assert.equal(
      (
        await db
          .prepare('SELECT value FROM configs WHERE key = ?')
          .bind('account-preference:other-admin:desktop-sidebar')
          .first()
      ).value,
      'true'
    );
  } finally {
    await mf.dispose();
  }
});

test('missing credentials allow public reads but block login, writes and initialization', async () => {
  const { mf, db } = await start();
  try {
    const status = await request(mf, 'auth/status');
    assert.equal(status.status, 200);
    assert.deepEqual(await status.json(), { authenticated: false });
    const groups = await request(mf, 'groups-with-sites', {
      headers: { Cookie: 'auth_token=invalid' },
    });
    assert.equal(groups.status, 200);
    const data = await groups.json();
    assert.deepEqual(
      data.map((group) => group.id),
      [1]
    );
    assert.deepEqual(
      data[0].sites.map((site) => site.id),
      [1]
    );
    const configs = await request(mf, 'configs');
    assert.equal(configs.status, 200);
    assert.equal((await configs.json())['site.title'], 'API regression fixture');
    for (const [path, method] of [
      ['login', 'POST'],
      ['groups', 'POST'],
      ['init', 'GET'],
    ]) {
      const response = await request(mf, path, { method });
      assert.equal(response.status, 503);
      assert.match((await response.json()).message, /认证配置缺失/);
    }
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM groups').first()).count, 2);
  } finally {
    await mf.dispose();
  }
});

test('configured authentication rejects visitors and restores private reads after login', async () => {
  const { mf } = await start({
    AUTH_USERNAME: 'test-admin',
    AUTH_PASSWORD: hashSync('test-password', 4),
    AUTH_SECRET: 'local-regression-key-only',
  });
  try {
    for (const [path, method] of [
      ['groups', 'POST'],
      ['init', 'GET'],
    ]) {
      assert.equal((await request(mf, path, { method })).status, 401);
    }
    const login = await request(mf, 'login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test-admin', password: 'test-password' }),
    });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).success, true);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const headers = { Cookie: cookie };
    assert.deepEqual(await (await request(mf, 'auth/status', { headers })).json(), {
      authenticated: true,
    });
    const groups = await (await request(mf, 'groups-with-sites', { headers })).json();
    assert.deepEqual(
      groups.map((group) => group.id),
      [1, 2]
    );
    assert.deepEqual(
      groups[0].sites.map((site) => site.id),
      [1, 2]
    );
    const logout = await request(mf, 'logout', { method: 'POST', headers });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
    assert.deepEqual(await (await request(mf, 'auth/status')).json(), { authenticated: false });
  } finally {
    await mf.dispose();
  }
});
