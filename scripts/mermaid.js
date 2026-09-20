'use strict';

// Mermaid 流程图：必须在 Hexo 核心的 backtick_code_block（优先级 10）之前接管
// ```mermaid 围栏，否则它会被当成未知语言降级成 plaintext，语言信息丢失、
// 源码里的 $ > { } 也会被转义。处理方式和 math.js 一致：先占位，渲染后再还原。

var SALT = Math.random().toString(36).slice(2, 8).toUpperCase();
var PREFIX = 'CHENMERMAID' + SALT + 'TK';
var TOKEN_RE = new RegExp(PREFIX + '([0-9a-f]+)X', 'g');
// 只认 ```mermaid，不认 ```mermaidExtra 之类的其他语言
var FENCE_RE = /(^|\n)([ \t]*)(`{3,}|~{3,})[ \t]*mermaid(?![0-9A-Za-z_-])[^\n]*\n([\s\S]*?)(?:\n\2\3[^\n]*(?=\n|$)|$)/g;

var COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';

function escText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function token(source) {
  return PREFIX + Buffer.from(source, 'utf8').toString('hex') + 'X';
}

function blockHtml(source) {
  return '<div class="mermaid-block" data-mermaid="1">' +
    '<div class="mermaid-block__bar">' +
      '<span class="mermaid-block__label">mermaid</span>' +
      '<div class="mermaid-block__tools">' +
        '<button type="button" class="mermaid-block__btn" data-act="src">源码</button>' +
        '<button type="button" class="mermaid-block__btn" data-act="copy">' + COPY_ICON + '<span>复制</span></button>' +
      '</div>' +
    '</div>' +
    '<div class="mermaid-block__stage"><span class="mermaid-block__spin" aria-hidden="true"></span></div>' +
    '<pre class="mermaid-block__code"><code class="language-mermaid">' + escText(source) + '</code></pre>' +
    '<p class="mermaid-block__hint" hidden></p>' +
    '</div>';
}

hexo.extend.filter.register('before_post_render', function (data) {
  var content = String(data.content || '');
  if (content.indexOf('mermaid') < 0) return data;
  data.content = content.replace(FENCE_RE, function (all, lead, indent, fence, body) {
    return lead + token(body.replace(/[ \t]+$/, ''));
  });
  return data;
}, 5);

hexo.extend.filter.register('after_post_render', function (data) {
  var content = String(data.content || '');
  if (content.indexOf(PREFIX) < 0) return data;

  function render(all, hex) {
    var source = Buffer.from(hex, 'hex').toString('utf8');
    return blockHtml(source);
  }

  // 段落里只有占位符时，整段替换成块级标记，避免 <div> 落在 <p> 里
  content = content.replace(new RegExp('<p>\\s*' + PREFIX + '([0-9a-f]+)X\\s*</p>', 'g'), render);
  data.content = content.replace(TOKEN_RE, render);
  return data;
});
