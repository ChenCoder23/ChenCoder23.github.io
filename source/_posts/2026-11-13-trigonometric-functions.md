---
title: 考研数学：常见三角函数与反三角函数的图形、性质和读法
date: '2026-11-13 12:00:00'
categories:
  - 考研数学
tags:
  - 高等数学
  - 三角函数
  - 反三角函数
comments: true
description: 从一张手写图出发，逐个认识 6 种三角函数和 4 种反三角函数。对照原图与标准图形，理解定义域、值域、周期、渐近线，点击按钮学习中英文读法，再用导数、极限和例题巩固。
---

复习三角函数时，最容易出现的情况是：看见图形觉得熟悉，真要说出定义域、值域，或者遇到 $\arcsin x$、$\csc x$，又会把“反函数”和“倒数”混在一起。

这篇文章从下面这张手写图出发，把 **6 种三角函数、4 种常用反三角函数**分别拆开讲。每个函数都有手写图局部、标准图形，以及中英文发音按钮。先会认、会读，再记性质和做题。

<!-- more -->

{% raw %}
<link rel="stylesheet" href="/css/trigonometry.css">
<div class="trig-controls" id="trig-controls" aria-label="函数发音设置">
  <label for="trig-speed">跟读语速</label>
  <select id="trig-speed"><option value="0.72">慢速</option><option value="0.9" selected>适中</option><option value="1">正常</option></select>
  <button type="button" id="trig-stop" disabled>停止朗读</button>
  <p class="trig-status" id="trig-status" role="status" aria-live="polite">点击各函数旁的「中文读法」或「英文读法」跟读，按钮只朗读函数名称；再次点击同一按钮可停止。声音由设备语音提供。</p>
</div>
<noscript><p>启用 JavaScript 后可以点击发音按钮；图形、文字和公式源码仍可阅读。</p></noscript>
{% endraw %}

## 完整手写原图

先看完整笔记，再逐个对照后面的图形与讲解。下图保留了整张照片，显示时已转正。

{% raw %}
<figure class="trig-overview"><img src="/images/trigonometry/complete-note.svg" width="1706" height="1279" alt="完整手写笔记：正弦、余弦、正切、余切、正割、余割及四种反三角函数的图形"><figcaption>完整手写原图 · 点击图片可放大查看</figcaption></figure>
{% endraw %}

[打开完整大图](/images/trigonometry/complete-note.svg) · [查看上传的原始照片](/images/trigonometry/original.jpg)

## 先把这几个约定说清楚

**全文默认使用弧度制。** $\pi$ 对应 $180^\circ$，$\pi/2$ 对应 $90^\circ$，$\pi/6$ 对应 $30^\circ$。后面的导数和重要极限都以弧度制为前提。

- **定义域**：允许输入哪些 $x$。
- **值域**：函数能够输出哪些 $y$。
- **周期**：图形每隔多长重复一次。下文的周期指最小正周期。
- **渐近线**：曲线不断靠近的直线。本文用红色虚线标出；竖直渐近线对应的位置没有函数值。
- $k\in\mathbb Z$ 表示 $k$ 可以取任意整数。区间的方括号表示包含端点，圆括号表示不包含端点。

手写图按函数分成了 10 个局部，显示时已转正；为了保留笔迹，未重绘原图。每个局部旁边补了一幅标准图形。原图是记忆草图，**开闭区间、端点和渐近线以正文与标准图为准**。标准图中的蓝线是函数，实心点在函数图形上，画框边缘只是展示范围的边界。

## 一、六种三角函数：先抓住正弦和余弦

在单位圆上，从 $x$ 轴正方向转过角度 $x$，终点的坐标就是 $(\cos x,\sin x)$。所以可以先记：**余弦看横坐标，正弦看纵坐标**。

另外四个函数都能由它们表示：

$$\tan x=\frac{\sin x}{\cos x},\qquad \cot x=\frac{\cos x}{\sin x}$$

$$\sec x=\frac{1}{\cos x},\qquad \csc x=\frac{1}{\sin x}$$

这些关系成立时，分母必须不为零。尤其注意：$\cot x=1/\tan x$ 只在两边都有定义时成立；余切本身在 $x=\pi/2$ 处有定义，值为 $0$，此时正切却没有定义。因此，判断余切的定义域要看 $\cos x/\sin x$。

### 1. 正弦 sin：从原点出发的波浪

{% raw %}
<div class="trig-listen"><span class="trig-word">sin · sine</span><button type="button" data-trig-lang="zh-CN" data-trig-say="正弦。" aria-label="播放正弦的中文读法">▶ 中文读法</button><button type="button" data-trig-lang="en-US" data-trig-say="Sine." aria-label="播放 sine 的英文读法">▶ 英文读法</button></div>
<div class="trig-pair"><figure><img src="/images/trigonometry/sin-note.svg" width="440" height="375" alt="手写正弦图：从原点出发，先上升再下降"><figcaption>手写图 · 正弦</figcaption></figure><figure><img src="/images/trigonometry/sin-graph.svg" width="640" height="340" alt="正弦标准图：在负一与一之间周期振荡，经过原点"><figcaption>标准图 · 蓝色实线为 y = sin x</figcaption></figure></div>
{% endraw %}

**怎么读：** $\sin x$ 读“正弦 $x$”；英文读 **sine x**，sine 与英语 sign 同音，不要逐个读成 S、I、N。

- 定义域：$\mathbb R$；值域：$[-1,1]$。
- 周期：$2\pi$；奇函数，$\sin(-x)=-\sin x$，图形关于原点对称。
- 零点：$x=k\pi$。
- 在 $[-\pi/2+2k\pi,\pi/2+2k\pi]$ 上递增，在 $[\pi/2+2k\pi,3\pi/2+2k\pi]$ 上递减。

画一个周期时，先标五个点：

$$ (0,0),\quad (\pi/2,1),\quad (\pi,0),\quad (3\pi/2,-1),\quad (2\pi,0). $$

把它们用平滑曲线连起来，就得到“零 → 最高 → 零 → 最低 → 零”。例如 $\sin(\pi/6)=1/2$，输入的是角度，输出的是一个数。

### 2. 余弦 cos：从最高点出发的波浪

{% raw %}
<div class="trig-listen"><span class="trig-word">cos · cosine</span><button type="button" data-trig-lang="zh-CN" data-trig-say="余弦。" aria-label="播放余弦的中文读法">▶ 中文读法</button><button type="button" data-trig-lang="en-US" data-trig-say="Cosine." aria-label="播放 cosine 的英文读法">▶ 英文读法</button></div>
<div class="trig-pair"><figure><img src="/images/trigonometry/cos-note.svg" width="390" height="355" alt="手写余弦图：在纵轴处达到一，随后下降"><figcaption>手写图 · 余弦</figcaption></figure><figure><img src="/images/trigonometry/cos-graph.svg" width="640" height="340" alt="余弦标准图：经过零一，关于纵轴对称，周期为二派"><figcaption>标准图 · 蓝色实线为 y = cos x</figcaption></figure></div>
{% endraw %}

**怎么读：** $\cos x$ 读“余弦 $x$”；英文读 **cosine x**，可以按 co-sine 分段跟读。

- 定义域：$\mathbb R$；值域：$[-1,1]$。
- 周期：$2\pi$；偶函数，$\cos(-x)=\cos x$，图形关于 $y$ 轴对称。
- 零点：$x=\pi/2+k\pi$。
- 在 $[-\pi+2k\pi,2k\pi]$ 上递增，在 $[2k\pi,\pi+2k\pi]$ 上递减。

一个周期的五个关键点是：

$$ (0,1),\quad (\pi/2,0),\quad (\pi,-1),\quad (3\pi/2,0),\quad (2\pi,1). $$

它和正弦是同样形状的波浪，只是位置不同：$\cos x=\sin(x+\pi/2)$，也就是把正弦图向左平移 $\pi/2$。

**容易混：** $\sin 0=0$，$\cos 0=1$。只要看清纵轴上的起点，两幅图就不容易认反。

### 3. 正切 tan：每一支都向上走

{% raw %}
<div class="trig-listen"><span class="trig-word">tan · tangent</span><button type="button" data-trig-lang="zh-CN" data-trig-say="正切。" aria-label="播放正切的中文读法">▶ 中文读法</button><button type="button" data-trig-lang="en-US" data-trig-say="Tangent." aria-label="播放 tangent 的英文读法">▶ 英文读法</button></div>
<div class="trig-pair"><figure><img src="/images/trigonometry/tan-note.svg" width="295" height="355" alt="手写正切图：在负派二分之一与派二分之一之间递增"><figcaption>手写图 · 正切的中央一支</figcaption></figure><figure><img src="/images/trigonometry/tan-graph.svg" width="640" height="340" alt="正切标准图：各支递增，红色虚线位于正负派二分之一"><figcaption>标准图 · 红色虚线为竖直渐近线</figcaption></figure></div>
{% endraw %}

**怎么读：** $\tan x$ 读“正切 $x$”；英文读 **tangent x**，tan 是 tangent 的缩写。

$$\tan x=\frac{\sin x}{\cos x}$$

- 定义域：$x\ne\pi/2+k\pi$；值域：$\mathbb R$。
- 周期：$\pi$；奇函数。
- 过原点，零点为 $x=k\pi$，且 $\tan(\pi/4)=1$。
- 在每个 $(-\pi/2+k\pi,\pi/2+k\pi)$ 上严格递增。
- 竖直渐近线：$x=\pi/2+k\pi$。

为什么会有渐近线？因为靠近 $\pi/2$ 时，分母 $\cos x$ 趋近于 $0$，而分子趋近于 $1$，商的绝对值就会越来越大。

**不能说它在整个定义域上递增。** 它只在每一段连续区间内递增，跨过渐近线会从很大的正数跳到很小的负数。例如 $\pi/4<3\pi/4$，但对应函数值是 $1>-1$。

### 4. 余切 cot：每一支都向下走

{% raw %}
<div class="trig-listen"><span class="trig-word">cot · cotangent</span><button type="button" data-trig-lang="zh-CN" data-trig-say="余切。" aria-label="播放余切的中文读法">▶ 中文读法</button><button type="button" data-trig-lang="en-US" data-trig-say="Cotangent." aria-label="播放 cotangent 的英文读法">▶ 英文读法</button></div>
<div class="trig-pair"><figure><img src="/images/trigonometry/cot-note.svg" width="525" height="370" alt="手写余切图：在零与派之间递减，经过派二分之一零"><figcaption>手写图 · 余切的一支</figcaption></figure><figure><img src="/images/trigonometry/cot-graph.svg" width="640" height="340" alt="余切标准图：各支递减，渐近线为整数倍派"><figcaption>标准图 · y 轴也是竖直渐近线</figcaption></figure></div>
{% endraw %}

**怎么读：** $\cot x$ 读“余切 $x$”；英文读 **cotangent x**，可以按 co-tangent 跟读。

$$\cot x=\frac{\cos x}{\sin x}$$

- 定义域：$x\ne k\pi$；值域：$\mathbb R$。
- 周期：$\pi$；奇函数。
- 零点：$x=\pi/2+k\pi$；$\cot(\pi/4)=1$。
- 在每个 $(k\pi,(k+1)\pi)$ 上严格递减。
- 竖直渐近线：$x=k\pi$。

在 $(0,\pi)$ 这一支上，图形从正无穷方向降下来，经过 $(\pi/2,0)$，再往负无穷方向落下去。记图时可以对照：**正切一支往上，余切一支往下；正切过原点，余切在原点处没有定义。**

### 5. 正割 sec：余弦取倒数

{% raw %}
<div class="trig-listen"><span class="trig-word">sec · secant</span><button type="button" data-trig-lang="zh-CN" data-trig-say="正割。" aria-label="播放正割的中文读法">▶ 中文读法</button><button type="button" data-trig-lang="en-US" data-trig-say="Secant." aria-label="播放 secant 的英文读法">▶ 英文读法</button></div>
<div class="trig-pair"><figure><img src="/images/trigonometry/sec-note.svg" width="490" height="285" alt="手写正割图：最低点为零一的向上分支"><figcaption>手写图 · 只画了正割中央的正值分支</figcaption></figure><figure><img src="/images/trigonometry/sec-graph.svg" width="640" height="340" alt="正割标准图：正负分支交替，函数值不进入负一到一的开区间"><figcaption>标准图 · 补全正、负分支</figcaption></figure></div>
{% endraw %}

**怎么读：** $\sec x$ 读“正割 $x$”；英文读 **secant x**。secant 的开头是长音 /siː/，不要把 sec 按 second 的缩写去读。

$$\sec x=\frac{1}{\cos x}$$

- 定义域：$x\ne\pi/2+k\pi$。
- 值域：$(-\infty,-1]\cup[1,+\infty)$。
- 周期：$2\pi$；偶函数；没有零点。
- 竖直渐近线：$x=\pi/2+k\pi$。
- 中央分支经过 $(0,1)$，在 $(-\pi/2,0]$ 上递减，在 $[0,\pi/2)$ 上递增。

为什么中间 $(-1,1)$ 没有图形？因为 $0<|\cos x|\le1$ 时，取倒数得到 $|\sec x|\ge1$。

例如 $\cos 0=1$，所以 $\sec 0=1$；$\cos\pi=-1$，所以 $\sec\pi=-1$。原图只画了一支向上的“碗”，**正割还存在位于 $y\le-1$ 的向下分支**。

### 6. 余割 csc：正弦取倒数

{% raw %}
<div class="trig-listen"><span class="trig-word">csc · cosecant</span><button type="button" data-trig-lang="zh-CN" data-trig-say="余割。" aria-label="播放余割的中文读法">▶ 中文读法</button><button type="button" data-trig-lang="en-US" data-trig-say="Cosecant." aria-label="播放 cosecant 的英文读法">▶ 英文读法</button></div>
<div class="trig-pair"><figure><img src="/images/trigonometry/csc-note.svg" width="535" height="235" alt="手写余割图：派二分之一附近为正分支，负派二分之一附近为负分支"><figcaption>手写图 · 余割的相邻两支</figcaption></figure><figure><img src="/images/trigonometry/csc-graph.svg" width="640" height="340" alt="余割标准图：整数倍派处有竖直渐近线，正负分支交替"><figcaption>标准图 · 正负分支之间被渐近线隔开</figcaption></figure></div>
{% endraw %}

**怎么读：** $\csc x$ 读“余割 $x$”；英文读 **cosecant x**，可以按 co-secant 跟读。有些书用 cosec，表示同一个函数。

$$\csc x=\frac{1}{\sin x}$$

- 定义域：$x\ne k\pi$。
- 值域：$(-\infty,-1]\cup[1,+\infty)$。
- 周期：$2\pi$；奇函数；没有零点。
- 竖直渐近线：$x=k\pi$。
- 在 $(0,\pi/2]$ 上递减，在 $[\pi/2,\pi)$ 上递增，最低点是 $(\pi/2,1)$；其余分支结合周期性与奇对称理解。

例如 $\sin(\pi/6)=1/2$，所以 $\csc(\pi/6)=2$。正弦越接近零，余割的绝对值越大；正弦达到 $\pm1$ 时，余割也等于 $\pm1$。

**倒数关系要成对记：正割配余弦，余割配正弦。** 名字里有“正”不等于一定和正弦配对。

## 二、反三角函数：给一个函数值，找回角度

正弦解决的是“给角度求数值”：$\sin(\pi/6)=1/2$。反正弦解决的是“给数值求角度”：$\arcsin(1/2)=\pi/6$。

但 $\sin(5\pi/6)$ 也等于 $1/2$，为什么反正弦只返回 $\pi/6$？因为函数每次只能给出一个确定结果，我们必须先选一段原函数，使这一段上的不同角度对应不同的值，再把它反过来。

| 原函数选择的区间 | 反函数 | 反函数的值域，也叫主值范围 |
| --- | --- | --- |
| 正弦在 $[-\pi/2,\pi/2]$ | $\arcsin x$ | $[-\pi/2,\pi/2]$ |
| 余弦在 $[0,\pi]$ | $\arccos x$ | $[0,\pi]$ |
| 正切在 $(-\pi/2,\pi/2)$ | $\arctan x$ | $(-\pi/2,\pi/2)$ |
| 余切在 $(0,\pi)$ | $\operatorname{arccot}x$ | $(0,\pi)$ |

本文对反余切采用高等数学中常见的 $(0,\pi)$ 主值约定；遇到其他资料，先看它的定义。**反函数的图形，是原函数选定这一段关于直线 $y=x$ 的镜像**：原来的输入、输出交换了位置。

英文里的 arc 可以单独读出来，例如 arc sine、arc cosine；也可以说 inverse sine、inverse cosine。下面的英文按钮采用 arc 的读法。

### 7. 反正弦 arcsin：在左右端点之间上升

{% raw %}
<div class="trig-listen"><span class="trig-word">arcsin · arc sine</span><button type="button" data-trig-lang="zh-CN" data-trig-say="反正弦。" aria-label="播放反正弦的中文读法">▶ 中文读法</button><button type="button" data-trig-lang="en-US" data-trig-say="Arc sine." aria-label="播放 arc sine 的英文读法">▶ 英文读法</button></div>
<div class="trig-pair"><figure><img src="/images/trigonometry/arcsin-note.svg" width="525" height="330" alt="手写反正弦图：由负一负派二分之一上升到一派二分之一"><figcaption>手写图 · 反正弦</figcaption></figure><figure><img src="/images/trigonometry/arcsin-graph.svg" width="640" height="340" alt="反正弦标准图：定义域负一到一，包含两个端点，经过原点"><figcaption>标准图 · 两个端点均为实心点</figcaption></figure></div>
{% endraw %}

**怎么读：** $\arcsin x$ 读“反正弦 $x$”，英文 **arc sine x**。

$$y=\arcsin x\iff\sin y=x,\quad y\in[-\pi/2,\pi/2]$$

- 定义域：$[-1,1]$；值域：$[-\pi/2,\pi/2]$。
- 奇函数；在整个定义域上严格递增；不具有周期性。
- 三个关键点：$(-1,-\pi/2)$、$(0,0)$、$(1,\pi/2)$。

例如 $\arcsin(-1/2)=-\pi/6$，因为 $\sin(-\pi/6)=-1/2$，且 $-\pi/6$ 落在主值范围内。

**两个端点确实存在。** 虽然端点附近曲线越来越陡，普通导数公式只适用于 $-1<x<1$，但函数本身在 $x=\pm1$ 仍有值。

### 8. 反余弦 arccos：从 π 降到 0

{% raw %}
<div class="trig-listen"><span class="trig-word">arccos · arc cosine</span><button type="button" data-trig-lang="zh-CN" data-trig-say="反余弦。" aria-label="播放反余弦的中文读法">▶ 中文读法</button><button type="button" data-trig-lang="en-US" data-trig-say="Arc cosine." aria-label="播放 arc cosine 的英文读法">▶ 英文读法</button></div>
<div class="trig-pair"><figure><img src="/images/trigonometry/arccos-note.svg" width="550" height="410" alt="手写反余弦图：经过零派二分之一的下降曲线"><figcaption>手写图 · 区间端点需按正文修正</figcaption></figure><figure><img src="/images/trigonometry/arccos-graph.svg" width="640" height="340" alt="反余弦标准图：从负一派下降至一零，两个端点均包含"><figcaption>标准图 · 定义域和值域均包含端点</figcaption></figure></div>
{% endraw %}

**怎么读：** $\arccos x$ 读“反余弦 $x$”，英文 **arc cosine x**。

$$y=\arccos x\iff\cos y=x,\quad y\in[0,\pi]$$

- 定义域：$[-1,1]$；值域：$[0,\pi]$，两端都包含。
- 非奇非偶；在整个定义域上严格递减；不具有周期性。
- 三个关键点：$(-1,\pi)$、$(0,\pi/2)$、$(1,0)$。
- 对 $x\in[-1,1]$，有 $\arcsin x+\arccos x=\pi/2$。

例如 $\arccos(1/2)=\pi/3$，$\arccos(-1/2)=2\pi/3$。**余弦值为负时，反余弦返回的是第二象限的角，不是负角。**

原图旁边的区间容易看成开区间，复习时要改正：$\arccos(-1)=\pi$、$\arccos(1)=0$，所以不能把端点排除。

### 9. 反正切 arctan：上升，但永远碰不到上下界

{% raw %}
<div class="trig-listen"><span class="trig-word">arctan · arc tangent</span><button type="button" data-trig-lang="zh-CN" data-trig-say="反正切。" aria-label="播放反正切的中文读法">▶ 中文读法</button><button type="button" data-trig-lang="en-US" data-trig-say="Arc tangent." aria-label="播放 arc tangent 的英文读法">▶ 英文读法</button></div>
<div class="trig-pair"><figure><img src="/images/trigonometry/arctan-note.svg" width="530" height="375" alt="手写反正切图：经过原点，两端靠近正负派二分之一"><figcaption>手写图 · 反正切</figcaption></figure><figure><img src="/images/trigonometry/arctan-graph.svg" width="640" height="340" alt="反正切标准图：单调上升并趋近正负派二分之一的水平渐近线"><figcaption>标准图 · 红色虚线为水平渐近线</figcaption></figure></div>
{% endraw %}

**怎么读：** $\arctan x$ 读“反正切 $x$”，英文 **arc tangent x**。

$$y=\arctan x\iff\tan y=x,\quad y\in(-\pi/2,\pi/2)$$

- 定义域：$\mathbb R$；值域：$(-\pi/2,\pi/2)$。
- 奇函数；在 $\mathbb R$ 上严格递增；不具有周期性。
- 关键值：$\arctan 0=0$、$\arctan 1=\pi/4$、$\arctan(-1)=-\pi/4$。
- 水平渐近线：$y=\pm\pi/2$。

$$\lim_{x\to+\infty}\arctan x=\frac\pi2,\qquad \lim_{x\to-\infty}\arctan x=-\frac\pi2$$

**“趋于”不等于“取到”。** 对任何有限的 $x$，反正切都取不到 $\pm\pi/2$，所以值域要用圆括号。它和反正弦都上升、都过原点，但反正弦的图形有两个端点，反正切的图形则一直向左右延伸。

### 10. 反余切 arccot：下降，从 π 靠近 0

{% raw %}
<div class="trig-listen"><span class="trig-word">arccot · arc cotangent</span><button type="button" data-trig-lang="zh-CN" data-trig-say="反余切。" aria-label="播放反余切的中文读法">▶ 中文读法</button><button type="button" data-trig-lang="en-US" data-trig-say="Arc cotangent." aria-label="播放 arc cotangent 的英文读法">▶ 英文读法</button></div>
<div class="trig-pair"><figure><img src="/images/trigonometry/arccot-note.svg" width="535" height="405" alt="手写反余切图：经过零派二分之一，向右趋近横轴"><figcaption>手写图 · 反余切</figcaption></figure><figure><img src="/images/trigonometry/arccot-graph.svg" width="640" height="340" alt="反余切标准图：严格递减，渐近线为零与派，横轴也是渐近线"><figcaption>标准图 · 横轴 y = 0 也是渐近线</figcaption></figure></div>
{% endraw %}

**怎么读：** $\operatorname{arccot}x$ 读“反余切 $x$”，英文 **arc cotangent x**。

$$y=\operatorname{arccot}x\iff\cot y=x,\quad y\in(0,\pi)$$

- 定义域：$\mathbb R$；值域：$(0,\pi)$。
- 非奇非偶；在 $\mathbb R$ 上严格递减；不具有周期性。
- 关键值：$\operatorname{arccot}0=\pi/2$、$\operatorname{arccot}1=\pi/4$、$\operatorname{arccot}(-1)=3\pi/4$。
- 水平渐近线：$y=0$ 和 $y=\pi$，都取不到。

按本文约定，对所有实数 $x$：

$$\operatorname{arccot}x=\frac\pi2-\arctan x$$

当 $x\to+\infty$ 时它趋于 $0$；当 $x\to-\infty$ 时它趋于 $\pi$。**不能直接写成 $\arctan(1/x)$**：例如 $x=-1$ 时，后者为 $-\pi/4$，而反余切为 $3\pi/4$；在 $x=0$ 时，$1/x$ 更没有定义。

## 三、考研计算常用的关系与公式

### 先分清反函数、倒数和平方

| 写法 | 含义 | 例子 |
| --- | --- | --- |
| $\arcsin x$ | 反正弦，输出主值角度 | $\arcsin(1/2)=\pi/6$ |
| $1/\sin x=\csc x$ | 正弦的倒数 | $\csc(\pi/6)=2$ |
| $\sin^2x$ | $(\sin x)^2$ | $\sin^2(\pi/6)=1/4$ |

有些教材用 $\sin^{-1}x$ 表示 $\arcsin x$。此处的 $-1$ 是反函数记号，不是普通的负一次幂。写笔记时直接使用 $\arcsin x$ 最不容易混淆；明确写成 $(\sin x)^{-1}$ 才是取倒数。

### 特殊角：先记正弦，余弦倒着排

| $x$ | $0$ | $\pi/6$ | $\pi/4$ | $\pi/3$ | $\pi/2$ |
| --- | --- | --- | --- | --- | --- |
| $\sin x$ | $0$ | $1/2$ | $\sqrt2/2$ | $\sqrt3/2$ | $1$ |
| $\cos x$ | $1$ | $\sqrt3/2$ | $\sqrt2/2$ | $1/2$ | $0$ |
| $\tan x$ | $0$ | $\sqrt3/3$ | $1$ | $\sqrt3$ | 无定义 |

正弦这一行可以记成 $\sqrt0/2,\sqrt1/2,\sqrt2/2,\sqrt3/2,\sqrt4/2$。余弦反过来排，正切再用“正弦除以余弦”算。

### 三个平方关系

$$\sin^2x+\cos^2x=1$$
$$1+\tan^2x=\sec^2x$$
$$1+\cot^2x=\csc^2x$$

后两式分别由第一式除以 $\cos^2x$、$\sin^2x$ 得到，因此要避开对应分母为零的位置。

做化简与极限时，还常用：

$$\sin 2x=2\sin x\cos x$$
$$\cos 2x=1-2\sin^2x=2\cos^2x-1$$
$$1-\cos x=2\sin^2(x/2)$$

### 十个导数：成对记符号

以下公式都使用弧度制，并在导数存在的点成立。

| 函数 $f(x)$ | 导数 $f'(x)$ |
| --- | --- |
| $\sin x$ | $\cos x$ |
| $\cos x$ | $-\sin x$ |
| $\tan x$ | $\sec^2x$ |
| $\cot x$ | $-\csc^2x$ |
| $\sec x$ | $\sec x\tan x$ |
| $\csc x$ | $-\csc x\cot x$ |
| $\arcsin x$ | $1/\sqrt{1-x^2}$，$|x|<1$ |
| $\arccos x$ | $-1/\sqrt{1-x^2}$，$|x|<1$ |
| $\arctan x$ | $1/(1+x^2)$ |
| $\operatorname{arccot}x$ | $-1/(1+x^2)$ |

前三对中，名字带“余”的一项，导数公式前都有负号。两对反三角函数也是“反正”为正、“反余”为负。

**遇到复合函数，别漏掉内层导数。** 例如：

$$\frac{d}{dx}\arctan(2x)=\frac{2}{1+4x^2}$$

$$\frac{d}{dx}\arcsin(2x)=\frac{2}{\sqrt{1-4x^2}},\qquad |x|<\frac12$$

第二个函数本身的定义域是 $[-1/2,1/2]$，但这条有限导数公式只在开区间 $(-1/2,1/2)$ 内成立。

### 趋于零时的等价无穷小

当 $x\to0$ 时：

$$\sin x\sim x,\quad \tan x\sim x,\quad \arcsin x\sim x,\quad \arctan x\sim x$$

$$1-\cos x\sim\frac{x^2}{2}$$

这里 $f(x)\sim g(x)$ 表示它们的比值趋于 $1$，不是说两者处处相等。例如：

$$\lim_{x\to0}\frac{\arctan(3x)}{\sin(2x)}=\frac32$$

**不能在加减式里随意逐项替换。** 比如 $\sin x-x$ 的主要部分发生了抵消，直接把 $\sin x$ 换成 $x$ 会丢掉信息；需要更高阶展开时，应使用 $\sin x=x-x^3/6+o(x^3)$。

## 四、两道例题，把主值范围用起来

### 例 1：arcsin(sin x) 一定等于 x 吗？

求 $\arcsin(\sin(5\pi/6))$。

先算里面：$\sin(5\pi/6)=1/2$。再找主值范围 $[-\pi/2,\pi/2]$ 内正弦等于 $1/2$ 的角，得到：

$$\arcsin\left(\sin\frac{5\pi}{6}\right)=\arcsin\frac12=\frac\pi6$$

答案不是 $5\pi/6$。只有当 $x\in[-\pi/2,\pi/2]$ 时，才能直接写 $\arcsin(\sin x)=x$。

反过来，$\sin(\arcsin x)=x$ 对所有 $x\in[-1,1]$ 都成立。**先看谁在外面，再看主值范围。**

### 例 2：不用计算器，求 sin(arccos x)

设 $\theta=\arccos x$。于是 $\cos\theta=x$，而 $\theta\in[0,\pi]$。

由平方关系，$\sin^2\theta=1-x^2$。这个区间内 $\sin\theta\ge0$，因此取非负根：

$$\sin(\arccos x)=\sqrt{1-x^2},\qquad x\in[-1,1]$$

这一步不能只靠“开平方”，还必须利用角度所在区间确定正负号。

## 五、合上笔记，检查这四个问题

{% raw %}
<details class="trig-check"><summary>1. sec 是哪个函数的倒数？csc 呢？</summary><p>sec x = 1 / cos x，是余弦的倒数；csc x = 1 / sin x，是正弦的倒数。分母必须不为零。</p></details>
<details class="trig-check"><summary>2. arcsin 1 和 arctan 1 分别是多少？</summary><p>arcsin 1 = π/2；arctan 1 = π/4。反正弦能取到 π/2，反正切只能无限接近 π/2。</p></details>
<details class="trig-check"><summary>3. arccos(−1/2) 为什么不是 −π/3？</summary><p>反余弦的主值范围是 [0, π]，而且 cos(−π/3) = 1/2。正确答案是 2π/3，它位于第二象限。</p></details>
<details class="trig-check"><summary>4. 余切在 π/2 处有没有定义？</summary><p>有，cot(π/2) = cos(π/2) / sin(π/2) = 0。此处 tan 没有定义，所以不能机械地用 1 / tan x 判断 cot 的定义域。</p></details>
{% endraw %}

复习时可以按这个顺序过一遍：**先读名称，再看形状，接着说定义域和值域，最后做一个特殊值或求导。** 能从图形解释出公式，比单独背十行表格更容易记牢。

英语名称与读法可对照佛蒙特大学的 [Math pronunciations](https://gswarrin.w3.uvm.edu/vocab/index.html)。secant、cosecant 的发音也可分别查阅 Cambridge Dictionary 的 [secant](https://dictionary.cambridge.org/dictionary/english/secant) 和 [cosecant](https://dictionary.cambridge.org/dictionary/english/cosecant) 词条。页面按钮使用设备语音合成，音色和可用语言取决于浏览器及系统语音包。

{% raw %}
<script src="/js/trigonometry.js" defer></script>
{% endraw %}
