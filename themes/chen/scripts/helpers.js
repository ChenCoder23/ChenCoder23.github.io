'use strict';

// 主题辅助函数：纯文本提取 / 字数统计 / 预计阅读时长

function chenPlain(html) {
  return String(html == null ? '' : html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<figure[\s\S]*?<\/figure>/gi, ' ')
    .replace(/<table[\s\S]*?<\/table>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// 中文按字计数，西文按词计数
function chenCount(content) {
  const text = chenPlain(content);
  if (!text) return 0;
  const cjk = text.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g);
  const cjkCount = cjk ? cjk.length : 0;
  const latin = text.replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g, ' ');
  const words = latin.match(/[A-Za-z0-9][A-Za-z0-9'’._+-]*/g);
  return cjkCount + (words ? words.length : 0);
}

hexo.extend.helper.register('chen_text', function (content) {
  return chenPlain(content);
});

hexo.extend.helper.register('chen_words', function (content) {
  return chenCount(content);
});

// 中文阅读速度按 300 字/分钟估算
hexo.extend.helper.register('chen_reading_time', function (content, words) {
  const count = typeof words === 'number' && words > 0 ? words : chenCount(content);
  return Math.max(1, Math.round(count / 300));
});

// 列表摘要：只输出纯文本，交给模板做转义
hexo.extend.helper.register('chen_excerpt', function (post, length) {
  const max = length || 140;
  const text = chenPlain(post && post.content);
  return text.length > max ? text.slice(0, max) + '…' : text;
});

// 导航 / 分类高亮
hexo.extend.helper.register('chen_nav_active', function (itemPath) {
  const here = String(this.page.path || '').replace(/index\.html$/, '').replace(/\/+$/, '') || '/';
  const target = String(itemPath || '').replace(/\/+$/, '') || '/';
  if (target === '/') return here === '/' ? ' is-active' : '';
  return here === target || here.indexOf(target + '/') === 0 ? ' is-active' : '';
});

/* ---------- 相关文章 / 系列连载 ---------- */

// 取全部已发布文章：优先用渲染上下文里的 site，兜底走 hexo.locals
function chenAllPosts(locals) {
  try {
    if (locals && locals.site && locals.site.posts) return locals.site.posts.toArray();
  } catch (e) { /* ignore */ }
  try {
    const query = hexo.locals.get('posts');
    if (query) return query.toArray();
  } catch (e) { /* ignore */ }
  return [];
}

// 分类 / 标签可能被写成字符串、数组或 Query 对象，统一成名字数组
function chenNameList(list) {
  if (!list) return [];
  let arr = [];
  if (typeof list.toArray === 'function') arr = list.toArray();
  else if (Array.isArray(list)) arr = list;
  else arr = [list];
  return arr.map(function (item) {
    if (item == null) return '';
    if (typeof item === 'string') return item;
    return String(item.name || '');
  }).filter(Boolean);
}

// 标题关键词：西文按单词、中文按二元组，用于兜底的相关性判断
function chenTitleKeywords(title) {
  const text = String(title || '').toLowerCase();
  const words = text.match(/[a-z0-9][a-z0-9+#._-]{2,}/g) || [];
  const grams = [];
  text.replace(/[^\u4e00-\u9fff]+/g, ' ').split(' ').forEach(function (run) {
    for (let i = 0; i + 1 < run.length; i++) grams.push(run.slice(i, i + 2));
  });
  return words.concat(grams);
}

function chenIntersect(a, b) {
  let hit = 0;
  a.forEach(function (item) { if (b.indexOf(item) > -1) hit += 1; });
  return hit;
}

// 相关文章：同标签 +3、同分类 +2、标题关键词 +1（最多 4 分），分数相同取更新的
// 一篇都没匹配上时，退化成"最新发布"，保证文末不会空着
hexo.extend.helper.register('chen_related', function (page, limit) {
  const max = Number(limit) > 0 ? Number(limit) : 4;
  const posts = chenAllPosts(this);
  if (!page || !posts.length) return [];

  const tags = chenNameList(page.tags);
  const cats = chenNameList(page.categories);
  const keywords = chenTitleKeywords(page.title);
  const scored = [];

  posts.forEach(function (post) {
    if (!post || post.path === page.path) return;
    let score = 0;
    score += chenIntersect(chenNameList(post.tags), tags) * 3;
    score += chenIntersect(chenNameList(post.categories), cats) * 2;
    if (keywords.length) {
      score += Math.min(chenIntersect(chenTitleKeywords(post.title), keywords), 4);
    }
    if (score > 1) scored.push({ post: post, score: score });
  });

  scored.sort(function (a, b) {
    return b.score - a.score || (b.post.date - a.post.date);
  });

  const picked = scored.slice(0, max).map(function (item) { return item.post; });
  if (picked.length) return picked;

  return posts
    .filter(function (post) { return post.path !== page.path; })
    .sort(function (a, b) { return b.date - a.date; })
    .slice(0, Math.min(max, 3));
});

// 系列连载：front-matter 写 series: 系列名（可选 series_order: 1, 2, 3…）
hexo.extend.helper.register('chen_series', function (page) {
  const name = page && page.series;
  if (!name) return null;

  const posts = chenAllPosts(this).filter(function (post) {
    return post && post.series === name;
  });
  // 只有一篇时没必要展示「第 1 / 1 篇」的系列导航
  if (posts.length < 2) return null;

  const ordered = posts.every(function (post) { return !isNaN(Number(post.series_order)); });
  posts.sort(function (a, b) {
    if (ordered) return Number(a.series_order) - Number(b.series_order);
    return a.date - b.date;
  });

  let index = -1;
  posts.forEach(function (post, i) { if (post.path === page.path) index = i; });
  if (index < 0) return null;

  return {
    name: name,
    posts: posts,
    index: index + 1,
    total: posts.length,
    prev: index > 0 ? posts[index - 1] : null,
    next: index + 1 < posts.length ? posts[index + 1] : null
  };
});
