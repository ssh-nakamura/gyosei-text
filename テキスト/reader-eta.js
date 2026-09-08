(function (root) {
  'use strict';

  function Pace() {
    this.samples = [];
    this.reset();
  }
  Pace.prototype.reset = function () { this.last = null; this.wait = 0; };
  Pace.prototype.observe = function (point) {
    var last = this.last;
    this.last = point;
    if (!last) return;
    var seconds = (point.at - last.at) / 1000;
    var movement = point.y - last.y;
    var chars = point.chars - last.chars;
    if (!point.active || !last.active || seconds <= 0 || seconds > 3 ||
        movement < -2 || movement > point.viewport * 1.25 || chars < 0) {
      this.wait = 0;
      return;
    }
    this.wait += seconds;
    if (chars <= 0 || movement <= 0) return;
    // A rapid scan must not become the user's measured reading speed.
    if (chars / this.wait <= 50) this.samples.push({ chars: chars, seconds: this.wait });
    this.wait = 0;
    while (this.samples.length > 1 && this.samples.reduce(function (n, s) { return n + s.seconds; }, 0) > 600) {
      this.samples.shift();
    }
  };
  Pace.prototype.rate = function () {
    var chars = 0, seconds = 0;
    this.samples.forEach(function (s) { chars += s.chars; seconds += s.seconds; });
    return seconds >= 20 && chars >= 150 ? chars / seconds : null;
  };
  function label(remaining, rate) {
    if (remaining <= 0) return '章末';
    if (!rate) return '章の残り：ペース計測中';
    var minutes = Math.ceil(remaining / rate / 60);
    if (minutes <= 1) return '章の残り：約1分';
    if (minutes < 60) return '章の残り：約' + minutes + '分';
    var hours = Math.floor(minutes / 60), rest = minutes % 60;
    return '章の残り：約' + hours + '時間' + (rest ? rest + '分' : '');
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Pace: Pace, label: label };
    return;
  }

  var output = document.getElementById('rd-eta');
  if (!output) return;
  var sections = Array.from(document.querySelectorAll('section[id]')).filter(function (s) {
    return !s.parentElement.closest('section[id]');
  });
  var pace = new Pace(), blocks = [], total = 0, dirty = true;
  var lastInput = performance.now(), lastY = window.scrollY;
  var rebuildTimer;
  output.title = '現在位置から章末までの本文文字量と、このページで読み進めたペースからの目安。非表示・非アクティブの時間、90秒以上操作のない時間、大きなジャンプは除外します。理解度や読了を判定するものではありません。';

  function invalidate() {
    dirty = true;
    pace.reset();
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(tick, 200);
  }
  function measure() {
    blocks = []; total = 0;
    sections.forEach(function (section) {
      var walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT), node;
      while ((node = walker.nextNode())) {
        var chars = node.nodeValue.replace(/\s/g, '').length;
        if (!chars || node.parentElement.closest('script,style,nav,button,svg,.refs,.rd-chk,[hidden]')) continue;
        var range = document.createRange(); range.selectNodeContents(node);
        var rect = range.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        blocks.push({ top: rect.top + window.scrollY, bottom: rect.bottom + window.scrollY, chars: chars });
        total += chars;
      }
    });
    dirty = false;
  }
  function position(line) {
    return blocks.reduce(function (sum, block) {
      return sum + block.chars * Math.max(0, Math.min(1, (line - block.top) / (block.bottom - block.top)));
    }, 0);
  }
  function tick() {
    if (dirty) measure();
    var now = performance.now(), y = window.scrollY;
    var chars = position(y + window.innerHeight * 0.35);
    var inText = blocks.length && y + window.innerHeight > blocks[0].top && y < blocks[blocks.length - 1].bottom;
    pace.observe({ at: now, chars: chars, y: y, viewport: window.innerHeight,
      active: !document.hidden && document.hasFocus() && now - lastInput < 90000 && !!inText });
    var end = document.documentElement.scrollHeight - window.innerHeight;
    var atEnd = y >= end - 2 && chars > 0;
    var next = label(atEnd ? 0 : Math.max(0, total - chars), pace.rate());
    if (output.textContent !== next) output.textContent = next;
  }
  function input() { lastInput = performance.now(); }
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (name) {
    window.addEventListener(name, input, { passive: true });
  });
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (Math.abs(y - lastY) > window.innerHeight * 1.25) pace.reset();
    lastY = y;
    input();
  }, { passive: true });
  window.addEventListener('hashchange', function () { pace.reset(); tick(); });
  window.addEventListener('resize', invalidate);
  window.addEventListener('blur', function () { pace.reset(); });
  window.addEventListener('focus', function () { input(); pace.reset(); });
  document.addEventListener('visibilitychange', function () { input(); pace.reset(); });
  var observer = new MutationObserver(invalidate);
  sections.forEach(function (section) {
    observer.observe(section, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['open', 'class', 'style', 'hidden'] });
  });
  if (typeof ResizeObserver !== 'undefined') {
    var resize = new ResizeObserver(invalidate);
    sections.forEach(function (section) { resize.observe(section); });
  }
  if (document.fonts) document.fonts.ready.then(invalidate);
  tick();
  setInterval(tick, 1000);
})(typeof window !== 'undefined' ? window : globalThis);
