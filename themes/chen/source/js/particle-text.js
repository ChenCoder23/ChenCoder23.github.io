(function () {
  'use strict';

  /* 首页顶部的粒子字标：把文字采样成粒子目标点，粒子先散开再聚合成字。
     移植自 Vue Bits 的 <ParticleText />，去掉 Vue 依赖重写成原生实现，
     颜色 / 字体 / 尺寸都读站点的 CSS（--particle-highlight、color、font-*），
     所以明暗主题切换会自动按新配色重建。
     细节：鼠标有斥力（触屏不做，避免影响滚动）；尊重「减少动态效果」；
     离开视口停止绘制；脚本没跑起来时容器里的文字字标照常显示。 */

  var FALLBACK_COLOR = { r: 27, g: 30, b: 34 };

  var OPTION_ATTRS = {
    particleSize: 'particle-size',
    density: 'density',
    scatter: 'scatter',
    gatherDuration: 'gather-duration',
    stagger: 'stagger',
    pointerRepel: 'pointer-repel',
    repelRadius: 'repel-radius',
    idleDrift: 'idle-drift',
    fontWeight: 'font-weight'
  };

  var NUMBER_KEYS = {
    particleSize: true,
    density: true,
    scatter: true,
    gatherDuration: true,
    stagger: true,
    pointerRepel: true,
    repelRadius: true,
    idleDrift: true,
    fontWeight: true
  };

  var DEFAULTS = {
    particleSize: 2,
    density: 4,
    scatter: 180,
    gatherDuration: 1600,
    stagger: 420,
    pointerRepel: 40,
    repelRadius: 120,
    idleDrift: 0.7,
    trigger: 'mount',
    fontWeight: 700,
    text: 'coderWizard'
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function toNumber(value, fallback) {
    var num = parseFloat(value);
    return isFinite(num) ? num : fallback;
  }

  function toBool(value, fallback) {
    if (value == null || value === '') return fallback;
    return !(value === 'false' || value === '0' || value === 'off');
  }

  // #rgb / #rrggbb / rgb() / rgba() 都能认
  function parseColor(input) {
    var text = String(input || '').trim();
    if (!text) return null;

    var hex = text.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
    if (hex) {
      var body = hex[1];
      if (body.length === 3) body = body[0] + body[0] + body[1] + body[1] + body[2] + body[2];
      return {
        r: parseInt(body.slice(0, 2), 16),
        g: parseInt(body.slice(2, 4), 16),
        b: parseInt(body.slice(4, 6), 16)
      };
    }

    var rgb = text.match(/^rgba?\(([^)]+)\)$/i);
    if (rgb) {
      var parts = rgb[1].split(/[,\s/]+/).filter(Boolean);
      if (parts.length >= 3) {
        return {
          r: clamp(Math.round(parseFloat(parts[0])), 0, 255),
          g: clamp(Math.round(parseFloat(parts[1])), 0, 255),
          b: clamp(Math.round(parseFloat(parts[2])), 0, 255)
        };
      }
    }

    return null;
  }

  function mixColor(from, to, amount) {
    return {
      r: Math.round(from.r + (to.r - from.r) * amount),
      g: Math.round(from.g + (to.g - from.g) * amount),
      b: Math.round(from.b + (to.b - from.b) * amount)
    };
  }

  function colorToCss(color) {
    return 'rgb(' + color.r + ', ' + color.g + ', ' + color.b + ')';
  }

  function readOptions(container) {
    var options = {
      text: container.getAttribute('data-text') || DEFAULTS.text,
      trigger: container.getAttribute('data-trigger') || DEFAULTS.trigger,
      fontSize: container.getAttribute('data-font-size') || '',
      fontFamily: container.getAttribute('data-font-family') || '',
      glow: toBool(container.getAttribute('data-glow'), true)
    };

    Object.keys(DEFAULTS).forEach(function (key) {
      if (!NUMBER_KEYS[key]) return;
      var raw = container.getAttribute('data-' + OPTION_ATTRS[key]);
      options[key] = raw == null || raw === '' ? DEFAULTS[key] : toNumber(raw, DEFAULTS[key]);
    });

    return options;
  }

  function readColors(container) {
    var computed = window.getComputedStyle(container);
    var base = parseColor(computed.color) || FALLBACK_COLOR;
    var highlight = parseColor(computed.getPropertyValue('--particle-highlight')) || base;
    return { base: base, highlight: highlight };
  }

  function waitForFonts(font) {
    if (!window.Promise) return null;
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return document.fonts.load(font).catch(function () {}).then(function () {
      return document.fonts.ready;
    }).catch(function () {});
  }

  function createEffect(container, canvas, ctx) {
    var options = readOptions(container);
    var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

    var particles = [];
    var colors = readColors(container);
    var pointer = { active: false, x: 0, y: 0, smoothX: 0, smoothY: 0 };
    var frame = null;
    var resizeFrame = null;
    var buildId = 0;
    var gathering = false;
    var gatherStart = 0;
    var reduced = !!(motionQuery && motionQuery.matches);
    var visible = true;
    var awakeUntil = 0;
    var width = 0;
    var height = 0;

    function paint(particle) {
      var size = particle.size;
      ctx.fillStyle = particle.color;
      if (size <= 2.1) {
        ctx.fillRect(particle.x - size / 2, particle.y - size / 2, size, size);
        return;
      }
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    function draw(now) {
      ctx.clearRect(0, 0, width, height);

      if (options.glow && !reduced) {
        ctx.shadowBlur = options.particleSize * 3;
        ctx.shadowColor = colorToCss(colors.highlight);
      } else {
        ctx.shadowBlur = 0;
      }

      pointer.smoothX += (pointer.x - pointer.smoothX) * 0.18;
      pointer.smoothY += (pointer.y - pointer.smoothY) * 0.18;

      var complete = true;

      for (var i = 0; i < particles.length; i += 1) {
        var particle = particles[i];
        var baseX = particle.targetX;
        var baseY = particle.targetY;
        var progress = 1;

        if (gathering) {
          var local = (now - gatherStart - particle.delay) / Math.max(1, reduced ? 1 : options.gatherDuration);
          progress = clamp(local, 0, 1);
          var eased = easeOutCubic(progress);
          baseX = particle.startX + (particle.targetX - particle.startX) * eased;
          baseY = particle.startY + (particle.targetY - particle.startY) * eased;
          if (progress < 1) complete = false;
        } else if (!reduced && options.idleDrift > 0) {
          var driftTime = now * 0.001;
          baseX += Math.sin(driftTime * 0.9 + particle.seed * 10) * options.idleDrift * particle.depth;
          baseY += Math.cos(driftTime * 0.75 + particle.depth * 10) * options.idleDrift * particle.depth;
        }

        if (pointer.active && !reduced && options.pointerRepel > 0 && options.repelRadius > 0) {
          var dx = baseX - pointer.smoothX;
          var dy = baseY - pointer.smoothY;
          var distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 0 && distance < options.repelRadius) {
            var force = Math.pow(1 - distance / options.repelRadius, 2) * options.pointerRepel;
            baseX += (dx / distance) * force;
            baseY += (dy / distance) * force;
          }
        }

        var follow = reduced ? 1 : 0.22;
        particle.x += (baseX - particle.x) * follow;
        particle.y += (baseY - particle.y) * follow;

        ctx.globalAlpha = clamp(0.35 + progress * 0.65, 0, 1);
        paint(particle);
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      if (gathering && complete) gathering = false;
    }

    function startGather(fromScatter) {
      if (!particles.length) return;

      var spread = reduced ? 0 : options.scatter;

      particles.forEach(function (particle) {
        if (fromScatter) {
          var angle = particle.seed * Math.PI * 2;
          var distance = spread * (0.35 + particle.depth * 0.75);
          particle.x = particle.targetX + Math.cos(angle) * distance + (particle.depth - 0.5) * spread * 0.55;
          particle.y = particle.targetY + Math.sin(angle) * distance + (particle.seed - 0.5) * spread * 0.55;
        }
        particle.startX = particle.x;
        particle.startY = particle.y;
        particle.delay = reduced ? 0 : particle.seed * options.stagger;
      });

      gatherStart = performance.now();
      gathering = true;
    }

    function busy(now) {
      return gathering || pointer.active || options.idleDrift > 0 || now < awakeUntil;
    }

    function tick(now) {
      frame = null;
      draw(now);
      if (visible && !reduced && busy(now)) {
        frame = window.requestAnimationFrame(tick);
      }
    }

    function ensureLoop() {
      if (frame === null && visible && !reduced && particles.length) {
        frame = window.requestAnimationFrame(tick);
      }
    }

    function resolveFontSize(value, family) {
      if (typeof value === 'number' && value > 0) return value;

      var text = String(value || '').trim();
      if (/^\d+(\.\d+)?$/.test(text)) return parseFloat(text);

      var probe = document.createElement('span');
      probe.textContent = 'M';
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      probe.style.pointerEvents = 'none';
      probe.style.fontSize = text;
      probe.style.fontWeight = String(options.fontWeight);
      probe.style.fontFamily = family;
      container.appendChild(probe);
      var size = parseFloat(window.getComputedStyle(probe).fontSize) || 96;
      probe.remove();
      return size;
    }

    function buildParticles(offCtx, metrics, content, fontSize, family) {
      var left = Math.ceil(metrics.actualBoundingBoxLeft || 0);
      var right = Math.ceil(metrics.actualBoundingBoxRight || metrics.width);
      var ascent = Math.ceil(metrics.actualBoundingBoxAscent || fontSize * 0.78);
      var descent = Math.ceil(metrics.actualBoundingBoxDescent || fontSize * 0.22);
      var padding = Math.max(12, Math.ceil(fontSize * 0.08));
      var textWidth = Math.max(1, left + right);
      var textHeight = Math.max(1, ascent + descent);

      var offscreen = document.createElement('canvas');
      offscreen.width = textWidth + padding * 2;
      offscreen.height = textHeight + padding * 2;
      var offCanvas = offscreen.getContext('2d', { willReadFrequently: true });
      if (!offCanvas) return;

      offCanvas.clearRect(0, 0, offscreen.width, offscreen.height);
      offCanvas.font = options.fontWeight + ' ' + fontSize + 'px ' + family;
      offCanvas.textAlign = 'left';
      offCanvas.textBaseline = 'alphabetic';
      offCanvas.fillStyle = '#ffffff';
      offCanvas.fillText(content, padding - left, padding + ascent);

      var imageData = offCanvas.getImageData(0, 0, offscreen.width, offscreen.height);
      // 采样网格跟着字号缩放：默认 4px 是 106px 字号下的手感，
      // 手机上的字只有 40px 左右、笔画才 3-4px 宽，还用 4px 网格会把整条笔画漏掉，
      // 字就会缺胳膊少腿。按字号等比缩小后，不论字大字小都很完整。
      var step = Math.max(2, Math.round(Math.max(2, Math.floor(options.density)) * fontSize / 106));
      var targets = [];

      for (var y = 0; y < offscreen.height; y += step) {
        for (var x = 0; x < offscreen.width; x += step) {
          var alpha = imageData.data[(y * offscreen.width + x) * 4 + 3];
          if (alpha > 40) {
            targets.push({
              x: width / 2 - offscreen.width / 2 + x,
              y: height / 2 - offscreen.height / 2 + y,
              alpha: alpha / 255
            });
          }
        }
      }

      var maxParticles = Math.max(900, Math.min(5200, Math.floor((width * height) / 90)));
      var stride = Math.max(1, Math.ceil(targets.length / maxParticles));
      var selected = [];
      for (var i = 0; i < targets.length; i += stride) selected.push(targets[i]);

      particles = selected.map(function (target, index) {
        var seed = ((index * 9301 + 49297) % 233280) / 233280;
        var depth = 0.45 + (((index * 233 + 97) % 1000) / 1000) * 0.9;
        var blend = clamp(target.x / Math.max(1, width) + (seed - 0.5) * 0.35, 0, 1);
        var angle = seed * Math.PI * 2;
        var distance = (reduced ? 0 : options.scatter) * (0.35 + depth * 0.75);
        var startX = target.x + Math.cos(angle) * distance + (seed - 0.5) * options.scatter * 0.45;
        var startY = target.y + Math.sin(angle) * distance + (depth - 0.9) * options.scatter * 0.45;

        return {
          x: reduced ? target.x : startX,
          y: reduced ? target.y : startY,
          startX: startX,
          startY: startY,
          targetX: target.x,
          targetY: target.y,
          size: Math.max(0.6, options.particleSize * (0.75 + target.alpha * 0.45)),
          color: colorToCss(mixColor(colors.base, colors.highlight, blend)),
          seed: seed,
          depth: depth,
          delay: seed * options.stagger
        };
      });

      pointer.x = width / 2;
      pointer.y = height / 2;
      pointer.smoothX = pointer.x;
      pointer.smoothY = pointer.y;

      if (reduced) {
        particles.forEach(function (particle) {
          particle.x = particle.targetX;
          particle.y = particle.targetY;
          particle.startX = particle.targetX;
          particle.startY = particle.targetY;
          particle.delay = 0;
        });
        gathering = false;
        draw(performance.now());
      } else {
        startGather(false);
        ensureLoop();
      }

      container.classList.add('is-live');
    }

    function sampleText() {
      buildId += 1;
      var currentBuild = buildId;

      var rect = container.getBoundingClientRect();
      width = Math.floor(rect.width);
      height = Math.floor(rect.height);
      if (width <= 0 || height <= 0) return;

      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      colors = readColors(container);
      reduced = !!(motionQuery && motionQuery.matches);

      var computed = window.getComputedStyle(container);
      var family = options.fontFamily || computed.fontFamily || 'sans-serif';
      var fontSize = options.fontSize ? resolveFontSize(options.fontSize, family) : parseFloat(computed.fontSize) || 96;
      var font = options.fontWeight + ' ' + fontSize + 'px ' + family;
      var content = String(options.text || ' ');

      var pending = waitForFonts(font);
      if (!pending) return;

      pending.then(function () {
        if (currentBuild !== buildId) return;

        var offscreen = document.createElement('canvas');
        var offCtx = offscreen.getContext('2d', { willReadFrequently: true });
        if (!offCtx) return;

        offCtx.font = font;
        var metrics = offCtx.measureText(content);
        var maxTextWidth = width * 0.92;

        if (metrics.width > maxTextWidth) {
          fontSize = Math.max(18, fontSize * (maxTextWidth / Math.max(1, metrics.width)));
          font = options.fontWeight + ' ' + fontSize + 'px ' + family;
          offCtx.font = font;
          metrics = offCtx.measureText(content);
        }

        buildParticles(offCtx, metrics, content, fontSize, family);
      });
    }

    function queueSample() {
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(function () {
        resizeFrame = null;
        sampleText();
      });
    }

    function onPointerMove(event) {
      // 触屏不做斥力，否则会影响在字标上滑动翻页
      if (event.pointerType && event.pointerType !== 'mouse') return;
      var rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
      ensureLoop();
    }

    function onPointerLeave() {
      pointer.active = false;
      awakeUntil = performance.now() + 900;
      ensureLoop();
    }

    function onPointerEnter(event) {
      onPointerMove(event);
      if (options.trigger === 'hover') {
        startGather(true);
        ensureLoop();
      }
    }

    function onClick() {
      if (options.trigger !== 'click') return;
      startGather(true);
      ensureLoop();
    }

    function onMotionChange() {
      sampleText();
    }

    function onThemeChange() {
      sampleText();
    }

    canvas.addEventListener('pointerenter', onPointerEnter);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('click', onClick);
    if (motionQuery && motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange);

    var resizeObserver = null;
    if (typeof window.ResizeObserver === 'function') {
      resizeObserver = new window.ResizeObserver(queueSample);
      resizeObserver.observe(container);
    } else {
      window.addEventListener('resize', queueSample);
    }

    var intersection = null;
    if (typeof window.IntersectionObserver === 'function') {
      intersection = new window.IntersectionObserver(function (entries) {
        visible = entries.some(function (entry) { return entry.isIntersecting; });
        if (visible) {
          ensureLoop();
        } else if (frame !== null) {
          window.cancelAnimationFrame(frame);
          frame = null;
        }
      }, { rootMargin: '140px' });
      intersection.observe(container);
    }

    var themeObserver = null;
    if (typeof window.MutationObserver === 'function') {
      themeObserver = new window.MutationObserver(onThemeChange);
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    sampleText();

    return function destroy() {
      buildId += 1;
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener('resize', queueSample);
      if (intersection) intersection.disconnect();
      if (themeObserver) themeObserver.disconnect();
      if (motionQuery && motionQuery.removeEventListener) motionQuery.removeEventListener('change', onMotionChange);
      canvas.removeEventListener('pointerenter', onPointerEnter);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('click', onClick);
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
      frame = null;
      resizeFrame = null;
    };
  }

  function mount(container) {
    if (!container || container.__chenParticle) return;
    var canvas = container.querySelector('canvas');
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    container.__chenParticle = createEffect(container, canvas, ctx);
  }

  function mountAll(scope) {
    var list = (scope || document).querySelectorAll('[data-particle-text]');
    Array.prototype.forEach.call(list, mount);
  }

  window.ChenParticleText = mountAll;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { mountAll(); });
  } else {
    mountAll();
  }
})();
