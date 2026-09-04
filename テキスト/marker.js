// 本文に自分で赤線・マーカーを引く。読んだ節に印を付ける。上端の細い帯がページのどこまで来たかを示す。
// どれもこの端末のブラウザ（localStorage）に保存する。
(function () {
  var PATH = location.pathname;
  var KEY = 'marks:' + PATH;
  var RKEY = 'read:' + PATH;
  var store = [], read = [];
  try { store = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { store = []; }
  try { read = JSON.parse(localStorage.getItem(RKEY) || '[]'); } catch (e) { read = []; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
  function saveRead() { try { localStorage.setItem(RKEY, JSON.stringify(read)); } catch (e) {} }

  // ---- 赤線・マーカー ----
  function textNodes(root) {
    var out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var n; while ((n = w.nextNode())) out.push(n);
    return out;
  }
  function sectionOf(node) {
    var el = node.nodeType === 1 ? node : node.parentNode;
    while (el && !(el.tagName === 'SECTION' && el.id)) el = el.parentNode;
    return el;
  }
  function offsetIn(sec, node, off) {
    var total = 0, nodes = textNodes(sec);
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i] === node) return total + off;
      total += nodes[i].nodeValue.length;
    }
    return -1;
  }
  function wrap(sec, s, e, kind, id) {
    var nodes = textNodes(sec), pos = 0;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i], len = n.nodeValue.length, a = pos, b = pos + len;
      pos = b;
      if (b <= s || a >= e) continue;
      var from = Math.max(s, a) - a, to = Math.min(e, b) - a;
      var mid = n.splitText(from); mid.splitText(to - from);
      var m = document.createElement('mark');
      m.className = 'm-' + kind; m.dataset.mid = id;
      mid.parentNode.insertBefore(m, mid); m.appendChild(mid);
    }
  }
  function applyAll() {
    store.forEach(function (r) {
      var sec = document.getElementById(r.sec);
      if (sec) wrap(sec, r.s, r.e, r.kind, r.id);
    });
  }
  function unwrap(id) {
    document.querySelectorAll('mark[data-mid="' + id + '"]').forEach(function (m) {
      var p = m.parentNode; while (m.firstChild) p.insertBefore(m.firstChild, m); p.removeChild(m); p.normalize();
    });
  }
  function add(kind) {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) { flash('先に文字を選んでください'); return; }
    var r = sel.getRangeAt(0);
    var sec = sectionOf(r.startContainer);
    if (!sec || sec !== sectionOf(r.endContainer)) { flash('同じ節の中で選んでください'); return; }
    var s = offsetIn(sec, r.startContainer, r.startOffset), e = offsetIn(sec, r.endContainer, r.endOffset);
    if (s < 0 || e < 0 || e <= s) { flash('選択を読み取れませんでした'); return; }
    var id = String(Date.now());
    store.push({ sec: sec.id, s: s, e: e, kind: kind, id: id }); save();
    sel.removeAllRanges();
    wrap(sec, s, e, kind, id);
  }
  function flash(msg) { var t = document.getElementById('mk-msg'); t.textContent = msg; t.style.opacity = 1; setTimeout(function () { t.style.opacity = 0; }, 1800); }

  // ---- 読んだ節の印と進み具合 ----
  var secs = Array.prototype.slice.call(document.querySelectorAll('section[id]'));
  function isRead(id) { return read.indexOf(id) >= 0; }
  function paintSection(sec) {
    var done = isRead(sec.id);
    var h = sec.querySelector('h2, h3');
    if (h) {
      var chk = h.querySelector('.rd-chk');
      if (!chk) { chk = document.createElement('span'); chk.className = 'rd-chk'; h.insertBefore(chk, h.firstChild); }
      chk.textContent = done ? '✓ ' : '';
    }
    var btn = sec.querySelector('.rd-btn');
    if (btn) { btn.textContent = done ? '✓ 読んだ（押すと取り消す）' : 'この節を読んだ'; btn.classList.toggle('on', done); }
    document.querySelectorAll('a[href="#' + sec.id + '"]').forEach(function (a) { a.classList.toggle('rd-done', done); });
  }
  function paintCount() {
    var c = document.getElementById('rd-count');
    if (!c) return;
    var n = secs.filter(function (s) { return isRead(s.id); }).length;
    c.textContent = secs.length ? '読んだ節 ' + n + ' / ' + secs.length : '';
    var t = document.getElementById('rd-total'); if (t) t.style.width = (secs.length ? Math.round(n / secs.length * 100) : 0) + '%';
  }
  function toggleRead(id) {
    var i = read.indexOf(id);
    if (i >= 0) read.splice(i, 1); else read.push(id);
    saveRead();
    paintSection(document.getElementById(id)); paintCount();
  }
  function updateScroll() {
    var h = document.scrollingElement || document.documentElement, max = h.scrollHeight - h.clientHeight;
    var p = max > 0 ? Math.min(100, Math.round((window.scrollY || h.scrollTop) / max * 100)) : 0;
    var b = document.getElementById('rd-pos'); if (b) b.style.width = p + '%';
    var l = document.getElementById('rd-pct'); if (l) l.textContent = p + '%';
  }

  var css = '.m-red{background:transparent;border-bottom:2px solid #c0392b;color:inherit;cursor:pointer}' +
    '.m-yellow{background:#fff3a0;color:inherit;cursor:pointer}' +
    '#mk-bar{position:fixed;right:1rem;bottom:1rem;display:flex;gap:.4rem;align-items:center;background:#fff;border:1px solid #cfcac0;border-radius:999px;padding:.35rem .6rem;box-shadow:0 3px 12px rgba(0,0,0,.12);font-size:.85rem;z-index:50}' +
    '#mk-bar button{border:1px solid #cfcac0;background:#faf9f6;border-radius:999px;padding:.25rem .7rem;cursor:pointer;font-size:.85rem}' +
    '#mk-bar button.red{border-bottom:3px solid #c0392b}#mk-bar button.yel{background:#fff3a0}' +
    '#mk-msg{color:#555;opacity:0;transition:opacity .3s;margin-left:.3rem}' +
    '#rd-top{position:fixed;left:0;top:0;width:100%;height:4px;background:#e5e2db;z-index:60}#rd-top i{display:block;height:100%;background:#2b6a6a;width:0;transition:width .15s}' +
    '#rd-info{position:fixed;right:1rem;top:.5rem;background:#fff;border:1px solid #cfcac0;border-radius:999px;padding:.2rem .7rem;font-size:.78rem;color:#333;box-shadow:0 2px 8px rgba(0,0,0,.1);z-index:60;display:flex;gap:.6rem;align-items:center}' +
    '#rd-info .bar{width:5rem;height:6px;background:#e5e2db;border-radius:3px;overflow:hidden}#rd-info .bar i{display:block;height:100%;background:#2b6a6a;width:0}' +
    '.rd-btn{display:block;margin:1rem 0 0;border:1px solid #cfcac0;background:#faf9f6;border-radius:999px;padding:.3rem .9rem;cursor:pointer;font-size:.85rem;color:#333}' +
    '.rd-btn.on{background:#e6f0ef;border-color:#2b6a6a;color:#2b6a6a}.rd-chk{color:#2b6a6a}a.rd-done{color:#2b6a6a}a.rd-done::before{content:"✓ "}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var top = document.createElement('div'); top.id = 'rd-top'; top.innerHTML = '<i id="rd-pos"></i>'; document.body.appendChild(top);
  if (secs.length) {
    var info = document.createElement('div'); info.id = 'rd-info';
    info.innerHTML = '<span id="rd-pct">0%</span><span id="rd-count"></span><span class="bar"><i id="rd-total"></i></span>';
    document.body.appendChild(info);
    secs.forEach(function (sec) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'rd-btn'; b.dataset.sec = sec.id;
      sec.appendChild(b);
      b.addEventListener('click', function () { toggleRead(sec.id); });
      paintSection(sec);
    });
    paintCount();
  }
  window.addEventListener('scroll', updateScroll, { passive: true }); window.addEventListener('resize', updateScroll); updateScroll();

  var bar = document.createElement('div'); bar.id = 'mk-bar';
  bar.innerHTML = '<button class="red" type="button">赤線</button><button class="yel" type="button">マーカー</button><button class="clr" type="button">線を全部消す</button><span id="mk-msg"></span>';
  document.body.appendChild(bar);
  bar.querySelector('.red').addEventListener('click', function () { add('red'); });
  bar.querySelector('.yel').addEventListener('click', function () { add('yellow'); });
  bar.querySelector('.clr').addEventListener('click', function () {
    if (!store.length) { flash('線はありません'); return; }
    if (!confirm('このページの線を全部消しますか')) return;
    store.slice().forEach(function (r) { unwrap(r.id); }); store = []; save(); flash('消しました');
  });
  document.addEventListener('click', function (e) {
    var m = e.target.closest && e.target.closest('mark[data-mid]');
    if (!m) return;
    e.preventDefault();
    var id = m.dataset.mid; unwrap(id); store = store.filter(function (r) { return r.id !== id; }); save();
  });
  applyAll();
})();
