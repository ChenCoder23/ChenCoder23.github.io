'use strict';

// 数学公式：Markdown 渲染前把 $...$ / $$...$$ 抽成占位符，渲染后再还原成
// <span class="math-tex" data-tex="...">，由前端 KaTeX 负责排版。
// 这样做的好处：公式里的 _ * \ | 不会被 Markdown 当成强调 / 表格 / 转义处理。

var SALT = Math.random().toString(36).slice(2, 8).toUpperCase();
var PREFIX = 'CHENMATH' + SALT + 'TK';
var SUFFIX = 'X';
// 只用十六进制，避免 + / = 被 Markdown / Nunjucks 转义（= 会变成 &#x3D;）
var TOKEN_RE = new RegExp(PREFIX + '([0-9a-f]+)' + SUFFIX, 'g');

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function token(tex, display) {
  var raw = (display ? 'd' : 'i') + tex;
  return PREFIX + Buffer.from(raw, 'utf8').toString('hex') + SUFFIX;
}

// 已经是 HTML 的代码块要整体跳过：Hexo 会在 before_post_render 之前
// 先把围栏代码块高亮成 <hexoPostRenderCodeBlock><figure class="highlight">…</figure>，
// 这里看到的是 HTML 而不是反引号，不跳过就会把代码里的 $ 当成公式。
function skipHtmlBlock(src, i) {
  var match = /^<(hexoPostRenderCodeBlock|pre|code|script|style)\b/i.exec(src.slice(i, i + 40));
  if (!match) return 0;
  var close = src.slice(i).toLowerCase().indexOf('</' + match[1].toLowerCase() + '>');
  if (close < 0) return 0;
  return close + match[1].length + 3;
}

// 逐字符扫描：跳过代码块 / 行内代码 / 转义 $，其余部分把公式交给 onMath 处理
function transform(src, onMath) {
  var out = '';
  var i = 0;
  var n = src.length;

  while (i < n) {
    var ch = src.charAt(i);

    // 0) 已渲染好的代码块 / 脚本 / 样式：整块原样跳过
    if (ch === '<') {
      var skip = skipHtmlBlock(src, i);
      if (skip > 0) {
        out += src.slice(i, i + skip);
        i += skip;
        continue;
      }
    }

    // 1) 转义美元符号：\$ 原样保留
    if (ch === '\\' && src.charAt(i + 1) === '$') {
      out += '\\$';
      i += 2;
      continue;
    }

    // 2) 围栏代码块（只在行首生效）：整块原样跳过
    if ((ch === '`' || ch === '~') && (i === 0 || src.charAt(i - 1) === '\n')) {
      var fence = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n\1[^\n]*(?=\n|$)|$)/.exec(src.slice(i));
      if (fence) {
        out += fence[0];
        i += fence[0].length;
        continue;
      }
    }

    // 3) 行内代码
    if (ch === '`') {
      var run = /^(`+)/.exec(src.slice(i, i + 8));
      if (run) {
        var closeIdx = src.indexOf(run[1], i + run[1].length);
        if (closeIdx > -1) {
          out += src.slice(i, closeIdx + run[1].length);
          i = closeIdx + run[1].length;
          continue;
        }
      }
    }

    // 4) 公式：$$...$$ 或 $...$
    if (ch === '$') {
      var display = src.charAt(i + 1) === '$';
      var open = display ? '$$' : '$';
      var start = i + open.length;
      var canOpen = start < n && (display || !/\s/.test(src.charAt(start)));

      if (canOpen) {
        var k = start;
        var found = -1;
        while (k < n) {
          var c = src.charAt(k);
          if (c === '\\') { k += 2; continue; }
          if (c === '$') {
            if (display) {
              if (src.charAt(k + 1) === '$') { found = k; break; }
              k += 1;
              continue;
            }
            // 行内公式：收尾 $ 前面不能是空格，后面不能紧跟数字（避免把 $5 当公式）
            if (!/\s/.test(src.charAt(k - 1)) && !/[0-9]/.test(src.charAt(k + 1))) { found = k; break; }
            k += 1;
            continue;
          }
          if (!display && c === '\n') break;
          k += 1;
        }

        if (found > -1) {
          var body = src.slice(start, found);
          if (body.trim() !== '') {
            out += onMath(body, display);
            i = found + open.length;
            continue;
          }
        }
      }
    }

    out += ch;
    i += 1;
  }

  return out;
}

function mathEnabled(page) {
  return !(page && page.math === false);
}

hexo.extend.filter.register('before_post_render', function (data) {
  if (!mathEnabled(data.page)) return data;
  if (String(data.content || '').indexOf('$') < 0) return data;
  data.content = transform(data.content, token);
  return data;
}, 11); // 排在 Hexo 核心的代码块高亮（10）之后，这样代码块已经是 HTML，能被整体跳过

hexo.extend.filter.register('after_post_render', function (data) {
  if (!mathEnabled(data.page)) return data;
  if (String(data.content || '').indexOf(PREFIX) < 0) return data;
  data.content = data.content.replace(TOKEN_RE, function (all, b64) {
    var raw;
    try {
      raw = Buffer.from(b64, 'hex').toString('utf8');
    } catch (e) {
      return all;
    }
    var display = raw.charAt(0) === 'd';
    var tex = raw.slice(1);
    return '<span class="math-tex' + (display ? ' math-tex--display' : '') + '"' +
      ' data-tex="' + escAttr(tex) + '"' +
      (display ? ' data-display="1"' : '') +
      ' role="math">' + escText(tex) + '</span>';
  });
  return data;
});
