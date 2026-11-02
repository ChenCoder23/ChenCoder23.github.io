---
title: 鹈鹕测智：同一条提示词，7 个 AI 的 SVG 骑车动画
date: '2026-11-02 16:18:00'
categories:
  - AI
tags:
  - AI
  - 鹈鹕测智
  - SVG
  - HTML
comments: true
sticky: false
description: 同一条提示词，7 份鹈鹕骑自行车的 SVG 2D 动画。保留各个 AI 产出的原始 HTML，可以直接观看、单独打开或下载。
---

这次把同一条提示词交给了几个 AI，让它们各写一个 HTML，用 SVG 画一只骑自行车的鹈鹕。

一共收集了 7 份结果，放在这篇文章里一起看。下面嵌入的都是保存下来的原始 HTML，页面里的文字、配色、动画和交互都保留原样。

## 用的提示词

> 创建一个 HTML，内容是 SVG 绘制一个鹈鹕骑自行车的 2D 动画，你不需要任何测试，不要有任何限制

## 这次有哪些模型

模型名称和版本按保存时的文件名记录。免费网页对话模型没有另外注明具体版本，就沿用原来的标注。

| 模型 | 保存时的标注 | 动画 |
| --- | --- | --- |
| 豆包 | 网页版的对话免费模型 | [跳到作品](#doubao) |
| 通义千问 | 网页版免费对话模型 | [跳到作品](#qwen) |
| DeepSeek | 4.1f | [跳到作品](#deepseek) |
| Gemini | 网页版的对话免费模型 | [跳到作品](#gemini) |
| GPT-6.1 Sol | 文件标注：gpt6.1sol | [跳到作品](#gpt-sol) |
| GPT-6 Astra | 文件标注：gpt6Astra | [跳到作品](#gpt-astra) |
| KIMI | 网页免费的对话模型 | [跳到作品](#kimi) |

可以直接往下看动画，也可以点每份作品下面的「单独打开原始 HTML」查看完整页面，或下载原文件。豆包这份原页面使用固定宽度，窄屏下可以在画面区域左右滑动。

<!-- more -->

{% raw %}
<style>
.pelican-demo {
  margin: 1.3em 0 2.3em;
  overflow: hidden;
  border: 1px solid var(--border, #2d3338);
  border-radius: 14px;
  background: var(--surface, #191d20);
}
.pelican-demo__viewport {
  overflow-x: auto;
  container-type: inline-size;
  background: #f7f4eb;
}
.pelican-demo iframe {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: var(--pelican-ratio);
  border: 0;
  color-scheme: light;
}
.pelican-demo--doubao iframe {
  min-width: 800px;
  height: 400px;
  aspect-ratio: auto;
}
.pelican-demo--sol iframe {
  height: 760px;
  aspect-ratio: auto;
}
.pelican-demo__links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
  padding: 13px 17px;
  border-top: 1px solid var(--border, #2d3338);
  font-size: 13px;
}
.pelican-demo__file {
  flex-basis: 100%;
  color: var(--text-3, #8e969f);
  overflow-wrap: anywhere;
}
@container (max-width: 600px) {
  .pelican-demo--astra iframe { aspect-ratio: 680 / 780; }
}
</style>
{% endraw %}

<h2 id="doubao">01 · 豆包</h2>

**模型标注：** 网页版的对话免费模型

{% raw %}
<div class="pelican-demo pelican-demo--doubao" style="--pelican-ratio: 800 / 400">
  <div class="pelican-demo__viewport">
    <iframe src="/demos/pelican/%E8%B1%86%E5%8C%85%28%E7%BD%91%E9%A1%B5%E7%89%88%E7%9A%84%E5%AF%B9%E8%AF%9D%E5%85%8D%E8%B4%B9%E6%A8%A1%E5%9E%8B%29.html" title="豆包：鹈鹕骑自行车 SVG 2D 动画" loading="lazy" width="800" height="520" allowfullscreen></iframe>
  </div>
  <div class="pelican-demo__links">
    <a href="/demos/pelican/%E8%B1%86%E5%8C%85%28%E7%BD%91%E9%A1%B5%E7%89%88%E7%9A%84%E5%AF%B9%E8%AF%9D%E5%85%8D%E8%B4%B9%E6%A8%A1%E5%9E%8B%29.html" target="_blank" rel="noopener">单独打开原始 HTML ↗</a>
    <a href="/demos/pelican/%E8%B1%86%E5%8C%85%28%E7%BD%91%E9%A1%B5%E7%89%88%E7%9A%84%E5%AF%B9%E8%AF%9D%E5%85%8D%E8%B4%B9%E6%A8%A1%E5%9E%8B%29.html" download="豆包(网页版的对话免费模型).html">下载原始 HTML ↓</a>
    <span class="pelican-demo__file">原文件：豆包(网页版的对话免费模型).html</span>
  </div>
</div>
{% endraw %}

<h2 id="qwen">02 · 通义千问</h2>

**模型标注：** 网页版免费对话模型

{% raw %}
<div class="pelican-demo" style="--pelican-ratio: 800 / 560">
  <div class="pelican-demo__viewport">
    <iframe src="/demos/pelican/%E9%80%9A%E4%B9%89%E5%8D%83%E9%97%AE%28%E7%BD%91%E9%A1%B5%E7%89%88%E5%85%8D%E8%B4%B9%E5%AF%B9%E8%AF%9D%E6%A8%A1%E5%9E%8B%29.html" title="通义千问：鹈鹕骑自行车 SVG 2D 动画" loading="lazy" width="800" height="520" allowfullscreen></iframe>
  </div>
  <div class="pelican-demo__links">
    <a href="/demos/pelican/%E9%80%9A%E4%B9%89%E5%8D%83%E9%97%AE%28%E7%BD%91%E9%A1%B5%E7%89%88%E5%85%8D%E8%B4%B9%E5%AF%B9%E8%AF%9D%E6%A8%A1%E5%9E%8B%29.html" target="_blank" rel="noopener">单独打开原始 HTML ↗</a>
    <a href="/demos/pelican/%E9%80%9A%E4%B9%89%E5%8D%83%E9%97%AE%28%E7%BD%91%E9%A1%B5%E7%89%88%E5%85%8D%E8%B4%B9%E5%AF%B9%E8%AF%9D%E6%A8%A1%E5%9E%8B%29.html" download="通义千问(网页版免费对话模型).html">下载原始 HTML ↓</a>
    <span class="pelican-demo__file">原文件：通义千问(网页版免费对话模型).html</span>
  </div>
</div>
{% endraw %}

<h2 id="deepseek">03 · DeepSeek</h2>

**模型标注：** 4.1f

{% raw %}
<div class="pelican-demo" style="--pelican-ratio: 900 / 520">
  <div class="pelican-demo__viewport">
    <iframe src="/demos/pelican/DeepSeek%284.1f%29.html" title="DeepSeek：鹈鹕骑自行车 SVG 2D 动画" loading="lazy" width="800" height="520" allowfullscreen></iframe>
  </div>
  <div class="pelican-demo__links">
    <a href="/demos/pelican/DeepSeek%284.1f%29.html" target="_blank" rel="noopener">单独打开原始 HTML ↗</a>
    <a href="/demos/pelican/DeepSeek%284.1f%29.html" download="DeepSeek(4.1f).html">下载原始 HTML ↓</a>
    <span class="pelican-demo__file">原文件：DeepSeek(4.1f).html</span>
  </div>
</div>
{% endraw %}

<h2 id="gemini">04 · Gemini</h2>

**模型标注：** 网页版的对话免费模型

{% raw %}
<div class="pelican-demo" style="--pelican-ratio: 1200 / 700">
  <div class="pelican-demo__viewport">
    <iframe src="/demos/pelican/Gemini%28%E7%BD%91%E9%A1%B5%E7%89%88%E7%9A%84%E5%AF%B9%E8%AF%9D%E5%85%8D%E8%B4%B9%E6%A8%A1%E5%9E%8B%29.html" title="Gemini：鹈鹕骑自行车 SVG 2D 动画" loading="lazy" width="800" height="520" allowfullscreen></iframe>
  </div>
  <div class="pelican-demo__links">
    <a href="/demos/pelican/Gemini%28%E7%BD%91%E9%A1%B5%E7%89%88%E7%9A%84%E5%AF%B9%E8%AF%9D%E5%85%8D%E8%B4%B9%E6%A8%A1%E5%9E%8B%29.html" target="_blank" rel="noopener">单独打开原始 HTML ↗</a>
    <a href="/demos/pelican/Gemini%28%E7%BD%91%E9%A1%B5%E7%89%88%E7%9A%84%E5%AF%B9%E8%AF%9D%E5%85%8D%E8%B4%B9%E6%A8%A1%E5%9E%8B%29.html" download="Gemini(网页版的对话免费模型).html">下载原始 HTML ↓</a>
    <span class="pelican-demo__file">原文件：Gemini(网页版的对话免费模型).html</span>
  </div>
</div>
{% endraw %}

<h2 id="gpt-sol">05 · GPT-6.1 Sol</h2>

**模型标注：** 文件标注：gpt6.1sol

{% raw %}
<div class="pelican-demo pelican-demo--sol" style="--pelican-ratio: 1440 / 900">
  <div class="pelican-demo__viewport">
    <iframe src="/demos/pelican/gpt6.1sol.html" title="GPT-6.1 Sol：鹈鹕骑自行车 SVG 2D 动画" loading="lazy" width="800" height="760" allowfullscreen></iframe>
  </div>
  <div class="pelican-demo__links">
    <a href="/demos/pelican/gpt6.1sol.html" target="_blank" rel="noopener">单独打开原始 HTML ↗</a>
    <a href="/demos/pelican/gpt6.1sol.html" download="gpt6.1sol.html">下载原始 HTML ↓</a>
    <span class="pelican-demo__file">原文件：gpt6.1sol.html</span>
  </div>
</div>
{% endraw %}

<h2 id="gpt-astra">06 · GPT-6 Astra</h2>

**模型标注：** 文件标注：gpt6Astra

{% raw %}
<div class="pelican-demo pelican-demo--astra" style="--pelican-ratio: 1200 / 780">
  <div class="pelican-demo__viewport">
    <iframe src="/demos/pelican/gpt6Astra.html" title="GPT-6 Astra：鹈鹕骑自行车 SVG 2D 动画" loading="lazy" width="800" height="520" allowfullscreen></iframe>
  </div>
  <div class="pelican-demo__links">
    <a href="/demos/pelican/gpt6Astra.html" target="_blank" rel="noopener">单独打开原始 HTML ↗</a>
    <a href="/demos/pelican/gpt6Astra.html" download="gpt6Astra.html">下载原始 HTML ↓</a>
    <span class="pelican-demo__file">原文件：gpt6Astra.html</span>
  </div>
</div>
{% endraw %}

<h2 id="kimi">07 · KIMI</h2>

**模型标注：** 网页免费的对话模型

{% raw %}
<div class="pelican-demo" style="--pelican-ratio: 1200 / 600">
  <div class="pelican-demo__viewport">
    <iframe src="/demos/pelican/KIMI%E7%BD%91%E9%A1%B5%E5%85%8D%E8%B4%B9%E7%9A%84%E5%AF%B9%E8%AF%9D%E6%A8%A1%E5%9E%8B.html" title="KIMI：鹈鹕骑自行车 SVG 2D 动画" loading="lazy" width="800" height="520" allowfullscreen></iframe>
  </div>
  <div class="pelican-demo__links">
    <a href="/demos/pelican/KIMI%E7%BD%91%E9%A1%B5%E5%85%8D%E8%B4%B9%E7%9A%84%E5%AF%B9%E8%AF%9D%E6%A8%A1%E5%9E%8B.html" target="_blank" rel="noopener">单独打开原始 HTML ↗</a>
    <a href="/demos/pelican/KIMI%E7%BD%91%E9%A1%B5%E5%85%8D%E8%B4%B9%E7%9A%84%E5%AF%B9%E8%AF%9D%E6%A8%A1%E5%9E%8B.html" download="KIMI网页免费的对话模型.html">下载原始 HTML ↓</a>
    <span class="pelican-demo__file">原文件：KIMI网页免费的对话模型.html</span>
  </div>
</div>
{% endraw %}

## 放在一起看

我觉得这个题目有意思的地方是，要求只有一句话，结果却可以有完全不同的画风和细节。除了看画面，还可以留意鹈鹕的脚有没有踩在踏板上、车轮和脚踏的动作能不能对上，以及背景怎么表现向前骑行。

这篇先把 7 份原始结果摆出来，不打分，也不替它们改代码。你更喜欢哪一只鹈鹕？

