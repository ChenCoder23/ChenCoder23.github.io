(function () {
  'use strict';

  /* 全站光丝背景：移植自 Vue Bits 的 <WebThreads />，去掉 Vue 与 ogl 依赖，
     渲染部分用原生 WebGL2 重写，着色器逐字照搬原组件。
     配置来自 source/_data/site.json 的 webThreads 字段（后台「站点设置」可改），
     由主题模板注入 window.__CHEN_THREADS__；配色分浅色 / 深色两套，
     跟随 html[data-theme] 切换，换主题即时换色。
     这一层是 pointer-events: none 的固定背景，鼠标事件挂在 window 上，
     不挡页面点击；拿不到 WebGL2 上下文时静默退出，页面停在 CSS 渐变底上。 */

  var DEFAULT_COLORS = {
    light: { color1: '#cf4436', color2: '#2f6fae', color3: '#1b1e22' },
    dark: { color1: '#ef6055', color2: '#5a96e6', color3: '#ffffff' }
  };

  /* 兜底参数：与主题 layout.ejs、后台 admin.js 里的默认值保持一致。
     后台只暴露配色 / 速度 / 线条数 / 亮度 / 不透明度，其余沿用组件默认值。 */
  var DEFAULTS = {
    speed: 0.2,
    threadCount: 6,
    frequency: 5.0,
    spread: 0.18,
    taper: 1.0,
    position: 0.5,
    fanMode: 'center',
    glow: 0.02,
    falloff: 0.6,
    thickness: 1.1,
    brightness: 0.6,
    opacity: 1.0,
    mirror: true,
    shimmer: false,
    grain: true,
    grainIntensity: 0.05,
    mouseInteraction: true,
    mouseStrength: 0.3
  };

  var FAN_MODE = { center: 0, left: 1, right: 2 };

  var UNIFORM_NAMES = [
    'iResolution', 'iTime', 'uSpeed', 'uThreadCount', 'uFrequency', 'uSpread', 'uTaper',
    'uPosition', 'uFanMode', 'uGlow', 'uFalloff', 'uThickness', 'uBrightness', 'uOpacity',
    'uMirror', 'uShimmer', 'uGrain', 'uGrainIntensity', 'uColor1', 'uColor2', 'uColor3',
    'uMouse', 'uMouseStrength', 'uEnableMouse', 'uMouseActive'
  ];

  var vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

  var fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uThreadCount;
uniform float uFrequency;
uniform float uSpread;
uniform float uTaper;
uniform float uPosition;
uniform float uFanMode;
uniform float uGlow;
uniform float uFalloff;
uniform float uThickness;
uniform float uBrightness;
uniform float uOpacity;
uniform float uMirror;
uniform float uShimmer;
uniform float uGrain;
uniform float uGrainIntensity;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uEnableMouse;
uniform float uMouseActive;
out vec4 fragColor;

#define TAU 6.28318530718
#define MAX_THREADS 10

float glow(float x, float str, float dist) {
  return dist / pow(max(x, 1e-4), str);
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float n = max(uThreadCount, 1.0);

  float pinchX = uFanMode < 0.5 ? 0.5 : (uFanMode < 1.5 ? 0.0 : 1.0);
  if (uEnableMouse > 0.5) {
    pinchX = mix(pinchX, uMouse.x, clamp(uMouseStrength, 0.0, 1.0) * uMouseActive);
  }

  float spreadDx = uSpread * abs(uv.x - pinchX);
  float baseT = iTime * uSpeed;
  float tauOverN = TAU / n;
  float mirror = uMirror > 0.5 ? sign(pinchX - uv.x) : 1.0;
  bool doShimmer = uShimmer > 0.5;
  float shimmerT = iTime * 1.7;
  float invThickness = 1.0 / max(uThickness, 0.01);
  float xFreq = uv.x * uFrequency;
  float yOff = uv.y - uPosition;
  float ciScale = n > 1.0 ? 1.0 / (n - 1.0) : 0.0;

  vec3 col = vec3(0.0);
  float gsum = 0.0;

  for (int idx = 0; idx < MAX_THREADS; idx++) {
    float i = float(idx);
    if (i >= n) break;

    float amplitude = spreadDx * (1.0 + i * uTaper);
    float shimmer = doShimmer ? sin(shimmerT + i * 1.3) * 0.35 : 0.0;
    float phase = (baseT + i * tauOverN) * mirror + shimmer;

    float sdf = abs(yOff + sin(xFreq + phase) * amplitude) * invThickness;

    float g = glow(sdf, uFalloff, uGlow);
    float ci = i * ciScale;
    vec3 threadCol = mix(uColor1, uColor2, ci);

    col += g * threadCol;
    gsum += g;
  }

  float coreAmt = smoothstep(0.5, 2.2, gsum);
  col = mix(col, uColor3 * gsum, coreAmt * 0.5);

  float bright = uBrightness;
  if (uEnableMouse > 0.5) {
    vec2 md = uv - uMouse;
    float d2 = dot(md, md);
    bright += clamp(uMouseStrength, 0.0, 1.0) * uMouseActive * exp(-d2 * 6.0) * 0.6;
  }
  col *= bright;

  float alpha = clamp(gsum, 0.0, 1.0) * uOpacity;

  vec3 outRgb = col * alpha;

  if (uGrain > 0.5) {
    float gv = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453) - 0.5) * uGrainIntensity;
    outRgb = clamp(outRgb + gv, 0.0, 1.0);
    alpha = clamp(alpha + gv, 0.0, 1.0);
  }

  fragColor = vec4(outRgb, alpha);
}
`;

  function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }

  function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ''));
    if (!result) return new Float32Array([1, 1, 1]);
    return new Float32Array([
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ]);
  }

  function themeName() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function pickNumber(value, fallback, min, max) {
    var num = typeof value === 'number' ? value : parseFloat(value);
    if (!isFinite(num)) return fallback;
    return clamp(num, min, max);
  }

  function pickColor(value, fallback) {
    return (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim())) ? value.trim() : fallback;
  }

  function pickBool(value, fallback) {
    return typeof value === 'boolean' ? value : fallback;
  }

  /* 把「浅/深两套配色 + 共用参数」的配置摊平成一份完整 props */
  function resolve(config, theme) {
    var cfg = (config && typeof config === 'object') ? config : {};
    var fallback = DEFAULT_COLORS[theme] || DEFAULT_COLORS.light;
    var palette = (cfg[theme] && typeof cfg[theme] === 'object') ? cfg[theme] : fallback;

    return {
      color1: pickColor(palette.color1, fallback.color1),
      color2: pickColor(palette.color2, fallback.color2),
      color3: pickColor(palette.color3, fallback.color3),
      speed: pickNumber(cfg.speed, DEFAULTS.speed, 0, 3),
      threadCount: Math.round(pickNumber(cfg.threadCount, DEFAULTS.threadCount, 1, 10)),
      frequency: pickNumber(cfg.frequency, DEFAULTS.frequency, 0.1, 40),
      spread: pickNumber(cfg.spread, DEFAULTS.spread, 0, 2),
      taper: pickNumber(cfg.taper, DEFAULTS.taper, 0, 10),
      position: pickNumber(cfg.position, DEFAULTS.position, 0, 1),
      fanMode: FAN_MODE[cfg.fanMode] === undefined ? DEFAULTS.fanMode : cfg.fanMode,
      glow: pickNumber(cfg.glow, DEFAULTS.glow, 0, 1),
      falloff: pickNumber(cfg.falloff, DEFAULTS.falloff, 0, 8),
      thickness: pickNumber(cfg.thickness, DEFAULTS.thickness, 0.01, 10),
      brightness: pickNumber(cfg.brightness, DEFAULTS.brightness, 0, 5),
      opacity: pickNumber(cfg.opacity, DEFAULTS.opacity, 0, 1),
      mirror: pickBool(cfg.mirror, DEFAULTS.mirror),
      shimmer: pickBool(cfg.shimmer, DEFAULTS.shimmer),
      grain: pickBool(cfg.grain, DEFAULTS.grain),
      grainIntensity: pickNumber(cfg.grainIntensity, DEFAULTS.grainIntensity, 0, 1),
      mouseInteraction: pickBool(cfg.mouseInteraction, DEFAULTS.mouseInteraction),
      mouseStrength: pickNumber(cfg.mouseStrength, DEFAULTS.mouseStrength, 0, 1)
    };
  }

  function compile(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createEffect(container, config) {
    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false
    });
    if (!gl) return null;   // 没有 WebGL2 就静默退出，页面留在 CSS 渐变底上

    var vs = compile(gl, gl.VERTEX_SHADER, vertex);
    var fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
    var program = (vs && fs) ? gl.createProgram() : null;
    if (!program) return null;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);

    // 与 ogl 的 Triangle 一致：一个盖住整个视口的大三角形
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var positionLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    var loc = {};
    UNIFORM_NAMES.forEach(function (name) { loc[name] = gl.getUniformLocation(program, name); });

    gl.clearColor(0, 0, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);   // 着色器输出预乘 alpha，交给浏览器合成

    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var props = resolve(config, themeName());
    var rgb1 = hexToRgb(props.color1);
    var rgb2 = hexToRgb(props.color2);
    var rgb3 = hexToRgb(props.color3);
    var width = 1;
    var height = 1;
    var time = 0;
    var currentMouse = [0.5, 0.5];
    var targetMouse = [0.5, 0.5];
    var currentActive = 0;
    var targetActive = 0;
    var raf = 0;
    var isPageVisible = !document.hidden;
    var t0 = performance.now();

    function syncColors() {
      rgb1 = hexToRgb(props.color1);
      rgb2 = hexToRgb(props.color2);
      rgb3 = hexToRgb(props.color3);
    }

    function upload() {
      gl.uniform2f(loc.iResolution, width, height);
      gl.uniform1f(loc.iTime, time);
      gl.uniform1f(loc.uSpeed, props.speed);
      gl.uniform1f(loc.uThreadCount, props.threadCount);
      gl.uniform1f(loc.uFrequency, props.frequency);
      gl.uniform1f(loc.uSpread, props.spread);
      gl.uniform1f(loc.uTaper, props.taper);
      gl.uniform1f(loc.uPosition, props.position);
      gl.uniform1f(loc.uFanMode, FAN_MODE[props.fanMode] || 0);
      gl.uniform1f(loc.uGlow, props.glow);
      gl.uniform1f(loc.uFalloff, props.falloff);
      gl.uniform1f(loc.uThickness, props.thickness);
      gl.uniform1f(loc.uBrightness, props.brightness);
      gl.uniform1f(loc.uOpacity, props.opacity);
      gl.uniform1f(loc.uMirror, props.mirror ? 1 : 0);
      gl.uniform1f(loc.uShimmer, props.shimmer ? 1 : 0);
      gl.uniform1f(loc.uGrain, props.grain ? 1 : 0);
      gl.uniform1f(loc.uGrainIntensity, props.grainIntensity);
      gl.uniform3fv(loc.uColor1, rgb1);
      gl.uniform3fv(loc.uColor2, rgb2);
      gl.uniform3fv(loc.uColor3, rgb3);
      gl.uniform2f(loc.uMouse, currentMouse[0], currentMouse[1]);
      gl.uniform1f(loc.uMouseStrength, props.mouseStrength);
      gl.uniform1f(loc.uEnableMouse, props.mouseInteraction ? 1 : 0);
      gl.uniform1f(loc.uMouseActive, currentActive);
    }

    function render() {
      upload();
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function setSize() {
      var rect = container.getBoundingClientRect();
      var w = Math.max(1, Math.floor(rect.width));
      var h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      width = gl.drawingBufferWidth;
      height = gl.drawingBufferHeight;
      gl.viewport(0, 0, width, height);
      render();
    }

    function loop(t) {
      time = (t - t0) * 0.001;
      currentMouse[0] += 0.05 * (targetMouse[0] - currentMouse[0]);
      currentMouse[1] += 0.05 * (targetMouse[1] - currentMouse[1]);
      currentActive += 0.05 * (targetActive - currentActive);
      render();
      raf = window.requestAnimationFrame(loop);
    }

    function start() {
      if (!raf && isPageVisible) raf = window.requestAnimationFrame(loop);
    }

    function stop() {
      if (raf) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    function onPointerMove(e) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      targetMouse[0] = (e.clientX - rect.left) / rect.width;
      targetMouse[1] = 1.0 - (e.clientY - rect.top) / rect.height;
      targetActive = 1;
    }

    function onPointerLeave() { targetActive = 0; }

    function onVisibility() {
      isPageVisible = !document.hidden;
      if (isPageVisible) start();
      else stop();
    }

    // 背景层不接收指针事件，鼠标监听挂在 window / document 上
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);

    var resizeObserver = null;
    if (typeof window.ResizeObserver === 'function') {
      resizeObserver = new window.ResizeObserver(setSize);
      resizeObserver.observe(container);
    } else {
      window.addEventListener('resize', setSize);
    }

    var themeObserver = null;
    if (typeof window.MutationObserver === 'function') {
      themeObserver = new window.MutationObserver(function () {
        props = resolve(config, themeName());
        syncColors();
        render();
      });
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    setSize();
    start();

    return {
      update: function (next) {
        config = next || config;
        props = resolve(config, themeName());
        syncColors();
        render();
      },
      destroy: function () {
        stop();
        if (resizeObserver) resizeObserver.disconnect();
        else window.removeEventListener('resize', setSize);
        if (themeObserver) themeObserver.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        document.removeEventListener('mouseleave', onPointerLeave);
        window.removeEventListener('pointermove', onPointerMove);
        try {
          container.removeChild(canvas);
        } catch (e) { /* 画布已经被移走 */ }
        var lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      }
    };
  }

  function mount(container, config) {
    if (!container || container.__chenThreads) return null;
    var instance = createEffect(container, config || window.__CHEN_THREADS__ || null);
    if (!instance) return null;
    container.__chenThreads = instance;
    return {
      update: instance.update,
      destroy: function () {
        container.__chenThreads = null;
        instance.destroy();
      }
    };
  }

  function mountAll(scope) {
    var list = (scope || document).querySelectorAll('[data-web-threads]');
    Array.prototype.forEach.call(list, function (el) { mount(el); });
  }

  window.ChenWebThreads = {
    mount: mount,
    mountAll: mountAll,
    defaults: function () { return resolve(null, themeName()); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { mountAll(); });
  } else {
    mountAll();
  }
})();
