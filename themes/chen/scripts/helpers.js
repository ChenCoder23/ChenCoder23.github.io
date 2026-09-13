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
