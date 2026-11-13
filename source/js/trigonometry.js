/* Pronounce the full mathematical names, never their letter abbreviations. */
(function () {
  'use strict';
  var panel = document.getElementById('trig-controls');
  if (!panel) return;
  var buttons = Array.from(document.querySelectorAll('[data-trig-say]'));
  var status = document.getElementById('trig-status');
  var stop = document.getElementById('trig-stop');
  var speed = document.getElementById('trig-speed');
  var synth = window.speechSynthesis;
  var active = null;
  var current = null; // Retain the utterance until end/error (including Safari).
  var timeout = null;
  var serial = 0;
  var feedback = null;
  function announce(message) {
    status.textContent = message;
    if (feedback) feedback.textContent = message;
  }
  function reset() {
    clearTimeout(timeout);
    if (active) active.setAttribute('aria-pressed', 'false');
    active = null;
    current = null;
    stop.disabled = true;
  }
  function cancel(message) {
    serial++;
    reset();
    if (synth) synth.cancel();
    if (message) announce(message);
  }
  if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') {
    buttons.forEach(function (b) { b.disabled = true; });
    stop.disabled = true;
    status.textContent = '当前浏览器不支持发音。可以按文字读法学习，或使用支持语音的浏览器。';
    return;
  }
  // Voice lists may arrive asynchronously; retrieve them again at each click.
  synth.getVoices();
  if (synth.addEventListener) synth.addEventListener('voiceschanged', function () { synth.getVoices(); });
  buttons.forEach(function (button) {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', function () {
      if (active === button) { cancel('已停止，可以点击任意读音继续跟读。'); return; }
      cancel();
      if (feedback) feedback.textContent = '';
      var row = button.closest('.trig-listen');
      feedback = row.querySelector('.trig-feedback');
      if (!feedback) {
        feedback = document.createElement('span');
        feedback.className = 'trig-feedback';
        row.appendChild(feedback);
      }
      var token = serial;
      var lang = button.dataset.trigLang;
      var text = button.dataset.trigSay;
      var utterance = new SpeechSynthesisUtterance(text);
      var voices = synth.getVoices();
      var voice = voices.find(function (v) { return v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase(); }) ||
        voices.find(function (v) { return v.lang.toLowerCase().split(/[-_]/)[0] === lang.split('-')[0]; });
      utterance.lang = lang;
      if (voice) utterance.voice = voice;
      utterance.rate = Number(speed.value);
      active = button;
      current = utterance;
      stop.disabled = false;
      button.setAttribute('aria-pressed', 'true');
      announce('准备朗读：' + text);
      utterance.onstart = function () { if (token === serial) announce('正在朗读：' + text); };
      utterance.onend = function () {
        if (token !== serial) return;
        reset();
        announce('朗读完成，点击可再听一遍。读法：' + text);
      };
      utterance.onerror = function () {
        if (token !== serial) return;
        reset();
        announce('未能播放。请检查设备音量及对应语言的语音包，或换用支持语音的浏览器。读法：' + text);
      };
      // Some engines can fail silently when there is no usable voice.
      timeout = setTimeout(function () {
        if (token === serial && current) cancel('发音未完成。请检查设备语音包或换用浏览器。读法：' + text);
      }, 15000);
      try { synth.resume(); synth.speak(utterance); }
      catch (_) { utterance.onerror(); }
    });
  });
  stop.addEventListener('click', function () { cancel('已停止，可以点击任意读音继续跟读。'); });
  window.addEventListener('pagehide', function () { cancel(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && current) cancel('已停止朗读。'); });
})();
