// 独立本地验收：内存 SQLite + 同一 Worker 处理器，不会改线上配置或发送云端数据。
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import worker from './worker.mjs';
const db = new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
const env = { ADMIN_TOKEN: 'local-test-only', ALLOWED_ORIGINS: 'http://localhost:4000', DB: {
  prepare(sql) { return { bind(...params) { return {
    async run() { return db.prepare(sql).run(...params); },
    async all() { return { results: db.prepare(sql).all(...params) }; }
  }; } }; },
  async batch(statements) { return Promise.all(statements.map(s => s.all())); }
} };
createServer(async (req, res) => {
  try {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const response = await worker.fetch(new Request('http://localhost:8787' + req.url, {
      method: req.method, headers: req.headers,
      ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: Buffer.concat(chunks) })
    }), env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) { res.writeHead(500); res.end('Local API failure'); }
}).listen(8787, '127.0.0.1');
const root = resolve('public');
createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/analytics-config.json') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ enabled: true, endpoint: 'http://localhost:8787' })); return;
    }
    const path = resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!path.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    let content = readFileSync(path);
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json' };
    res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream');
    if (extname(path) === '.html' && !/(^|\/)admin(\/|$)/.test(pathname)) {
      content = content.toString().replace('</body>', '<script defer src="/js/analytics.js" data-analytics-endpoint="http://localhost:8787"></script></body>');
    }
    res.end(content);
  } catch (e) { res.writeHead(404); res.end('Not found'); }
}).listen(4000, '127.0.0.1');
console.log('本地验收：http://localhost:4000/admin/#/analytics；查询密钥 local-test-only（仅内存数据）');
