import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from './worker.mjs';

function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  const DB = {
    prepare(sql) { return { bind(...params) { return {
      async run() { return db.prepare(sql).run(...params); },
      async all() { return { results: db.prepare(sql).all(...params) }; }
    }; } }; },
    async batch(statements) { return Promise.all(statements.map(s => s.all())); }
  };
  const env = { DB, ADMIN_TOKEN: 'test-secret', ALLOWED_ORIGINS: 'https://blog.example' };
  const request = (path, body, token) => new Request('https://worker.example' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Origin: 'https://blog.example', 'User-Agent': 'Mozilla/5.0 iPhone Mobile', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  return { db, env, request };
}
const visit = { id: 'visit-1234567890123456', visitor: 'visitor-1234567890123456', path: '/post/', title: '测试文章', referrer: 'https://search.example/?private=1', duration: 0 };

test('采集、心跳去重、停留单调、鉴权、统计及清理', async () => {
  const { db, env, request } = setup();
  assert.equal((await worker.fetch(request('/collect', visit), env)).status, 200);
  await worker.fetch(request('/collect', { ...visit, duration: 32 }), env);
  await worker.fetch(request('/collect', { ...visit, duration: 10 }), env);
  await worker.fetch(request('/collect', { ...visit, id: 'visit-2234567890123456', path: '/' }), env);
  assert.equal((await worker.fetch(request('/stats'), env)).status, 401);
  assert.equal((await worker.fetch(request('/stats?days=2', undefined, 'test-secret'), env)).status, 400);
  const result = await (await worker.fetch(request('/stats?days=7', undefined, 'test-secret'), env)).json();
  assert.equal(result.summary[0].pv, 2);
  assert.equal(result.summary[0].uv, 1);
  assert.equal(result.online[0].count, 1);
  assert.equal(result.pages.find(p => p.path === '/post/').duration, 32);
  assert.equal(result.sources[0].name, 'search.example');
  assert.equal(result.devices[0].name, '手机');
  assert.equal(result.recent.length, 2);
  db.exec('UPDATE visits SET created_at=1');
  await worker.scheduled({}, env);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM visits').get().n, 0);
  db.close();
});

test('拒绝非法来源、后台页面、查询参数及无效事件；预检允许查询鉴权头', async () => {
  const { db, env, request } = setup();
  const bad = new Request('https://worker.example/collect', { method: 'POST', headers: { Origin: 'https://evil.example' }, body: JSON.stringify(visit) });
  assert.equal((await worker.fetch(bad, env)).status, 403);
  for (const path of ['/admin/', '/blog/admin/', '/post/?secret=1', '//evil.example/']) {
    assert.equal((await worker.fetch(request('/collect', { ...visit, path }), env)).status, 400);
  }
  assert.equal((await worker.fetch(request('/collect', { ...visit, id: 'bad' }), env)).status, 400);
  const options = await worker.fetch(new Request('https://worker.example/stats', { method: 'OPTIONS', headers: { Origin: 'https://blog.example' } }), env);
  assert.equal(options.status, 204);
  assert.match(options.headers.get('Access-Control-Allow-Headers'), /Authorization/);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM visits').get().n, 0);
  db.close();
});
