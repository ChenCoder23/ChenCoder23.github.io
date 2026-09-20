(function () {
  'use strict';

  var prose = document.getElementById('prose');
  if (!prose) return;

  // 正文里的小图标（徽章、emoji 等）不参与放大
  var MIN_SIZE = 160;
  var links = Array.prototype.slice.call(prose.querySelectorAll('img')).filter(function (img) {
    return !img.closest('.mermaid-block');
  });
  if (!links.length) return;

  var current = 0;
  var lastFocus = null;
  var box = null;
  var imgEl = null;
  var capEl = null;
  var cntEl = null;
  var openEl = null;

  function build() {
    box = document.createElement('div');
    box.className = 'lightbox';
    box.id = 'lightbox';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', '图片查看');
    box.innerHTML =
      '<div class="lightbox__bar">' +
        '<span class="lightbox__count" aria-hidden="true"></span>' +
        '<a class="lightbox__btn lightbox__open" target="_blank" rel="noopener">原图</a>' +
        '<button type="button" class="lightbox__btn" data-act="zoom">放大</button>' +
        '<button type="button" class="lightbox__btn lightbox__btn--solid" data-act="close">关闭</button>' +
      '</div>' +
      '<div class="lightbox__stage"><img alt=""></div>' +
      '<p class="lightbox__cap"></p>' +
      '<button type="button" class="lightbox__nav lightbox__nav--prev" data-act="prev" aria-label="上一张">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>' +
      '</button>' +
      '<button type="button" class="lightbox__nav lightbox__nav--next" data-act="next" aria-label="下一张">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>' +
      '</button>';
    document.body.appendChild(box);

    imgEl = box.querySelector('.lightbox__stage img');
    capEl = box.querySelector('.lightbox__cap');
    cntEl = box.querySelector('.lightbox__count');
    openEl = box.querySelector('.lightbox__open');

    box.addEventListener('click', function (e) {
      var act = e.target.closest('[data-act]');
      if (act) {
        var action = act.getAttribute('data-act');
        if (action === 'close') close();
        else if (action === 'prev') step(-1);
        else if (action === 'next') step(1);
        else if (action === 'zoom') toggleZoom();
        return;
      }
      if (e.target === box || e.target.classList.contains('lightbox__stage')) close();
    });

    box.querySelector('.lightbox__stage').addEventListener('click', function (e) {
      if (e.target === imgEl) toggleZoom();
    });

    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(true); }
      else if (e.key === '-') { e.preventDefault(); setZoom(false); }
    });

    var touchX = null;
    box.addEventListener('touchstart', function (e) {
      touchX = e.touches.length === 1 ? e.touches[0].clientX : null;
    }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (touchX === null || !e.changedTouches.length) return;
      var dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 60) step(dx > 0 ? -1 : 1);
    }, { passive: true });
  }

  function setZoom(on) {
    if (!box) return;
    box.classList.toggle('is-zoom', !!on);
    var btn = box.querySelector('[data-act="zoom"]');
    if (btn) btn.textContent = on ? '适应屏幕' : '放大';
  }

  function toggleZoom() {
    setZoom(!box.classList.contains('is-zoom'));
  }

  function show(index) {
    current = (index + links.length) % links.length;
    var source = links[current];
    var alt = (source.getAttribute('alt') || '').trim();
    imgEl.src = source.currentSrc || source.src;
    imgEl.alt = alt;
    capEl.textContent = alt;
    capEl.hidden = !alt;
    cntEl.textContent = (current + 1) + ' / ' + links.length;
    openEl.href = source.currentSrc || source.src;
    var many = links.length > 1;
    box.querySelector('.lightbox__nav--prev').hidden = !many;
    box.querySelector('.lightbox__nav--next').hidden = !many;
    setZoom(false);
    box.querySelector('.lightbox__stage').scrollTop = 0;
    box.querySelector('.lightbox__stage').scrollLeft = 0;
  }

  function step(delta) {
    show(current + delta);
  }

  function open(index) {
    if (!box) build();
    lastFocus = document.activeElement;
    show(index);
    box.hidden = false;
    document.body.classList.add('lightbox-open');
    requestAnimationFrame(function () { box.classList.add('is-on'); });
    var closeBtn = box.querySelector('[data-act="close"]');
    if (closeBtn) closeBtn.focus();
  }

  function close() {
    if (!box || box.hidden) return;
    box.classList.remove('is-on');
    document.body.classList.remove('lightbox-open');
    setTimeout(function () {
      box.hidden = true;
      imgEl.removeAttribute('src');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }, 180);
  }

  prose.addEventListener('click', function (e) {
    var img = e.target.closest('img');
    if (!img) return;
    var index = links.indexOf(img);
    if (index < 0) return;
    var natural = img.naturalWidth || img.width || 0;
    if (natural && natural < MIN_SIZE) return;
    e.preventDefault();
    open(index);
  });

  window.ChenLightbox = { open: open, close: close, images: links };
})();
