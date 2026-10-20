const DAY = 86400000;
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim().toLowerCase());
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin' };
    if (!allowed.includes(origin.toLowerCase())) return new Response('{"error":"来源未获授权"}', { status: 403, headers });
    Object.assign(headers, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
    const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    try {
      if (url.pathname === '/collect' && request.method === 'POST') {
        if (Number(request.headers.get('Content-Length')) > 4096) return reply({ error: '请求过大' }, 413);
        const raw = await request.text();
        if (raw.length > 4096) return reply({ error: '请求过大' }, 413);
        let data;
        try { data = JSON.parse(raw); } catch { return reply({ error: '数据格式错误' }, 400); }
        if (!data || typeof data !== 'object' || !/^[a-zA-Z0-9-]{16,64}$/.test(data.id || '') || !/^[a-zA-Z0-9-]{16,64}$/.test(data.visitor || '') || typeof data.path !== 'string' || data.path.length > 1024 || !data.path.startsWith('/') || data.path.startsWith('//') || /[?#]/.test(data.path) || /(^|\/)admin(\/|$)/i.test(data.path)) return reply({ error: '无效的浏览记录' }, 400);
        const duration = Math.min(14400, Math.max(0, Math.round(Number(data.duration) || 0)));
        let referrer = '';
        try { referrer = new URL(data.referrer).hostname; } catch {}
        const ua = request.headers.get('User-Agent') || '';
        if (/bot|crawler|spider/i.test(ua)) return reply({ ok: true });
        const device = /ipad|tablet/i.test(ua) ? '平板' : /mobile|android|iphone/i.test(ua) ? '手机' : '电脑';
        const now = Date.now();
        await env.DB.prepare(`INSERT INTO visits (id,visitor,path,title,referrer,device,created_at,last_seen,duration)
          VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET last_seen=excluded.last_seen,
          duration=MAX(visits.duration,excluded.duration) WHERE visits.visitor=excluded.visitor AND visits.path=excluded.path`)
          .bind(data.id, data.visitor, data.path.slice(0, 1024), String(data.title || '').slice(0, 200), referrer, device, now, now, duration).run();
        return reply({ ok: true });
      }
      if (url.pathname === '/stats' && request.method === 'GET') {
        if (!env.ADMIN_TOKEN || request.headers.get('Authorization') !== 'Bearer ' + env.ADMIN_TOKEN) return reply({ error: '监控密钥无效' }, 401);
        const days = Number(url.searchParams.get('days') || 7);
        if (![1, 7, 30, 90].includes(days)) return reply({ error: '时间范围无效' }, 400);
        // 北京时间自然日，包括今天。
        const today = Math.floor((Date.now() + 8 * 3600000) / DAY) * DAY - 8 * 3600000;
        const since = today - (days - 1) * DAY;
        const queries = [
          ['summary', 'SELECT COUNT(*) pv, COUNT(DISTINCT visitor) uv, COALESCE(ROUND(AVG(duration)),0) duration FROM visits WHERE created_at>=?', since],
          ['online', 'SELECT COUNT(DISTINCT visitor) count FROM visits WHERE last_seen>=?', Date.now() - 90000],
          ['trend', "SELECT date(created_at/1000,'unixepoch','+8 hours') day,COUNT(*) pv,COUNT(DISTINCT visitor) uv FROM visits WHERE created_at>=? GROUP BY day ORDER BY day", since],
          ['pages', 'SELECT path,MAX(title) title,COUNT(*) pv,COUNT(DISTINCT visitor) uv,ROUND(AVG(duration)) duration FROM visits WHERE created_at>=? GROUP BY path ORDER BY pv DESC LIMIT 20', since],
          ['sources', "SELECT referrer name,COUNT(*) count FROM visits WHERE created_at>=? GROUP BY referrer ORDER BY count DESC LIMIT 20", since],
          ['devices', 'SELECT device name,COUNT(*) count FROM visits WHERE created_at>=? GROUP BY device ORDER BY count DESC', since],
          ['recent', 'SELECT path,title,referrer,device,created_at,duration FROM visits WHERE created_at>=? ORDER BY created_at DESC LIMIT 50', since]
        ];
        const results = await env.DB.batch(queries.map(([, sql, param]) => env.DB.prepare(sql).bind(param)));
        return reply(Object.fromEntries(queries.map(([key], i) => [key, results[i].results])));
      }
      return reply({ error: '接口不存在' }, 404);
    } catch (error) {
      console.error('Analytics request failed', error);
      return reply({ error: '监控服务暂时不可用，请检查数据库配置' }, 500);
    }
  },
  async scheduled(event, env) {
    await env.DB.prepare('DELETE FROM visits WHERE created_at<?').bind(Date.now() - 90 * DAY).run();
  }
};
