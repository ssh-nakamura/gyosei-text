// 過去問ドリル。テキストの各節の「対応過去問」をその場で解く。ドリル.html では科目・分野・期限別に解く。
// 結果は localStorage の drill:results に保存する（端末ごと）。
(function () {
  var BASE = (function () { var s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^\/]*$/, '') : ''; })();
  var RKEY = 'drill:results';
  var results = {};
  try { results = JSON.parse(localStorage.getItem(RKEY) || '{}'); } catch (e) { results = {}; }
  function save() { try { localStorage.setItem(RKEY, JSON.stringify(results)); } catch (e) {} }
  var DAY = 86400000;
  function record(id, ok, x) {
    var r = results[id] || { n: 0, w: 0, s: 0 };
    r.n += 1; r.last = Date.now(); r.ok = ok; r.sub = x.s; r.f = x.f;
    if (ok) { r.s = (r.s || 0) + 1; r.due = Date.now() + [3, 7, 30][Math.min(r.s - 1, 2)] * DAY; }
    else { r.w += 1; r.s = 0; r.due = Date.now() + DAY; }
    results[id] = r; save();
  }
  function loadData(cb) {
    if (window.DRILL_DATA) { cb(window.DRILL_DATA); return; }
    var s = document.createElement('script'); s.src = BASE + 'drill-data.js';
    s.onload = function () { cb(window.DRILL_DATA); }; s.onerror = function () { alert('肢のデータ（drill-data.js）を読み込めませんでした'); };
    document.head.appendChild(s);
  }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function qlabel(id) { var m = id.match(/^(\d{4})-(\d+)-(.+)$/); if (!m) return id; var y = +m[1]; var era = y >= 2019 ? '令和' + (y - 2018) : '平成' + (y - 1988); return era + '年 問' + m[2] + ' 肢' + m[3]; }
  function pageHref(rel) { // rel は /テキスト/xxx.html の形。今のページからの相対にする
    var here = location.pathname; var inText = /\/%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88\//.test(here) || /\/テキスト\//.test(decodeURI(here));
    if (rel.indexOf('/テキスト/') === 0) return (inText ? '' : 'テキスト/') + rel.slice('/テキスト/'.length);
    return (inText ? '../' : '') + rel.slice(1);
  }

  var css = '.dr{border:2px solid #2b6a6a;border-radius:10px;background:#fff;padding:1rem 1.1rem;margin:1rem 0;font-size:.98rem}' +
    '.dr .hd{display:flex;justify-content:space-between;align-items:center;color:#555;font-size:.82rem;margin-bottom:.5rem}' +
    '.dr .st{font-size:1.02rem;line-height:1.9;margin:.3rem 0 .8rem}.dr .bt{display:flex;gap:.5rem;flex-wrap:wrap}' +
    '.dr button{border:1px solid #cfcac0;background:#faf9f6;border-radius:999px;padding:.4rem 1rem;cursor:pointer;font-size:.95rem}' +
    '.dr button.ok{border-color:#2b6a6a}.dr button.ng{border-color:#a33}.dr button.next{background:#2b6a6a;color:#fff;border-color:#2b6a6a}' +
    '.dr .res{margin:.7rem 0 0;padding:.7rem .9rem;border-radius:8px;background:#f3f1ec}.dr .res.good{background:#e6f0ef}.dr .res.bad{background:#fbe9e7}' +
    '.dr .res b.mark{font-size:1.1rem;margin-right:.4rem}.dr .kp{margin:.4rem 0 0;font-weight:700}.dr .ex{margin:.3rem 0 0;color:#333}.dr .tp{margin:.3rem 0 0;color:#a33;font-size:.9rem}' +
    '.dr .wh{margin:.4rem 0 0;font-size:.88rem}.dr .wh a{color:#2b6a6a;text-decoration:none;border-bottom:1px dotted #2b6a6a;margin-right:.6rem}' +
    '.dr .sum{font-size:1.05rem}.dr .bar{height:6px;background:#e5e2db;border-radius:3px;overflow:hidden;margin:.4rem 0}.dr .bar i{display:block;height:100%;background:#2b6a6a}' +
    '.dr-start{display:inline-block;margin:.6rem 0 0;border:1px solid #2b6a6a;background:#e6f0ef;color:#2b6a6a;border-radius:999px;padding:.35rem .9rem;cursor:pointer;font-size:.88rem}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // 1つの枠で肢を順に出す
  function runner(host, ids, data, opts) {
    opts = opts || {};
    var i = 0, correct = 0, wrong = [], box = document.createElement('div'); box.className = 'dr';
    host.innerHTML = ''; host.appendChild(box);
    if (!ids.length) { box.innerHTML = '<p class="sum">解く肢はありません。</p>'; return; }
    function show() {
      if (i >= ids.length) {
        box.innerHTML = '<p class="sum">' + ids.length + '肢中 ' + correct + '肢 正解（' + Math.round(correct / ids.length * 100) + '%）</p><div class="bar"><i style="width:' + Math.round(correct / ids.length * 100) + '%"></i></div>' +
          '<div class="bt">' + (wrong.length ? '<button class="next" data-act="again">間違えた' + wrong.length + '肢をもう一度</button>' : '') + '<button data-act="close">閉じる</button></div>';
        return;
      }
      var id = ids[i], x = data.stmts[id];
      var r = results[id]; var hist = r ? ('これまで' + r.n + '回、間違い' + r.w + '回') : '初めて';
      box.innerHTML = '<div class="hd"><span>' + (i + 1) + ' / ' + ids.length + '　' + esc(qlabel(id)) + '</span><span>' + esc(hist) + '</span></div>' +
        '<div class="st">' + esc(x.t) + '</div><div class="bt"><button class="ok" data-a="1">正しい</button><button class="ng" data-a="0">誤り</button><button data-a="?">わからない</button></div>';
    }
    function answer(a) {
      var id = ids[i], x = data.stmts[id]; var ok = a !== '?' && ((a === '1') === x.c);
      record(id, ok, x); if (ok) correct++; else wrong.push(id);
      // 根拠の節: まず解説に出る条文のカードがある節、次にこの肢を参照している節、最後に同じ問を参照している節
      var byArt = (data.where_art && data.where_art[id]) || [];
      var exact = data.where[id] || [];
      var byQ = data.where[x.q] || [];
      var where = byArt.length ? byArt : (exact.length ? exact : byQ);
      var seen = {}, links = where.filter(function (w) { var k = w[0] + '#' + w[1]; if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 4)
        .map(function (w) { return '<a href="' + esc(pageHref(w[0]) + '#' + w[1]) + '">' + esc(w[2]) + '</a>'; }).join('');
      if (!byArt.length && !exact.length && byQ.length) links = '<span style="color:#888">（同じ問を扱う節）</span>' + links;
      var res = '<div class="res ' + (ok ? 'good' : 'bad') + '"><b class="mark">' + (ok ? '○ 正解' : (a === '?' ? '答え' : '× 不正解')) + '</b>この肢は<b>' + (x.c ? '正しい' : '誤り') + '</b>です。' +
        '<p class="kp">' + esc(x.k) + '</p><p class="ex">' + esc(x.e) + '</p>' + (x.p ? '<p class="tp">罠の型: ' + esc(x.p) + '</p>' : '') +
        (links ? '<p class="wh">根拠の節: ' + links + '</p>' : '') + '</div><div class="bt" style="margin-top:.6rem"><button class="next" data-act="next">次へ</button></div>';
      box.querySelector('.bt').outerHTML = res;
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a !== undefined) { answer(b.dataset.a); return; }
      if (b.dataset.act === 'next') { i++; show(); }
      else if (b.dataset.act === 'again') { runner(host, wrong.slice(), data, opts); }
      else if (b.dataset.act === 'close') { host.innerHTML = ''; if (opts.onClose) opts.onClose(); }
    });
    show();
  }

  function idsForKeys(keys, data) {
    var out = [];
    keys.forEach(function (k) {
      if (data.stmts[k]) { if (out.indexOf(k) < 0) out.push(k); return; }
      data.order.forEach(function (id) { if (id.indexOf(k + '-') === 0 && out.indexOf(id) < 0) out.push(id); });
    });
    return out;
  }
  function qkey(rid) { var m = rid.match(/^([HR])(\d+)-(.+)$/); if (!m) return null; return ((m[1] === 'H' ? 1988 : 2018) + +m[2]) + '-' + m[3]; }

  // テキストのページ: 節ごとにボタンを付ける
  function setupSections() {
    var counts = window.DRILL_SECTIONS || {};
    var pagePath = decodeURI(location.pathname).replace(/^.*\/docs/, '');
    var secs = document.querySelectorAll('section[id]');
    secs.forEach(function (sec) {
      var keys = [];
      sec.querySelectorAll('.refs .rid').forEach(function (s) { var k = qkey(s.textContent); if (k && keys.indexOf(k) < 0) keys.push(k); });
      sec.querySelectorAll('[data-covers]').forEach(function (el) { el.getAttribute('data-covers').split(/\s+/).forEach(function (rid) { var k = qkey(rid); if (k && keys.indexOf(k) < 0) keys.push(k); }); });
      keys = keys.filter(function (k) { return !/-W\d+$/.test(k); });
      var n = counts[pagePath + '#' + sec.id] || 0;
      if (!keys.length && !n) return;
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dr-start'; btn.textContent = n ? 'この節の過去問を解く（' + n + '肢）' : 'この節の過去問を解く';
      var host = document.createElement('div');
      var refs = sec.querySelector('.refs'); (refs || sec).insertAdjacentElement(refs ? 'afterend' : 'beforeend', host); host.insertAdjacentElement('beforebegin', btn);
      btn.addEventListener('click', function () {
        btn.disabled = true; btn.textContent = '読み込み中';
        loadData(function (data) {
          var hereKey = decodeURI(location.pathname).replace(/^.*\/docs/, '') + '#' + sec.id;
          var ids = (data.sec_ids && data.sec_ids[hereKey] && data.sec_ids[hereKey].length) ? data.sec_ids[hereKey].slice() : idsForKeys(keys, data);
          btn.textContent = 'この節の過去問を解く（' + ids.length + '肢）'; btn.disabled = false; btn.style.display = 'none';
          runner(host, ids, data, { here: location.pathname.replace(/^.*\/docs/, '') + '#' + sec.id, onClose: function () { btn.style.display = ''; } });
          host.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    });
  }

  // ドリル.html
  function setupDrillPage() {
    var q = new URLSearchParams(location.search);
    loadData(function (data) {
      var f = document.getElementById('fields'); var html = '';
      Object.keys(data.fields).forEach(function (sub) {
        html += '<div class="sub">' + esc(sub) + '</div>';
        Object.keys(data.fields[sub]).forEach(function (fld) {
          var ids = data.order.filter(function (id) { return data.stmts[id].f === fld; });
          var done = ids.filter(function (id) { return results[id]; }).length, okc = ids.filter(function (id) { return results[id] && results[id].ok; }).length;
          html += '<a href="ドリル.html?field=' + encodeURIComponent(fld) + '">' + esc(fld) + '</a><span>' + ids.length + '肢</span><span>' + (done ? '解いた' + done + '・直近正解' + okc : '未') + '</span>';
        });
      });
      f.innerHTML = html;
      var now = Date.now(), due = data.order.filter(function (id) { return results[id] && results[id].due <= now; });
      document.getElementById('m-due').textContent = '今日解く肢（' + due.length + '）';
      var ids = null, host = document.getElementById('run');
      if (q.get('due')) ids = due;
      else if (q.get('field')) ids = data.order.filter(function (id) { return data.stmts[id].f === q.get('field'); });
      else if (q.get('subject')) ids = data.order.filter(function (id) { return data.stmts[id].s === q.get('subject'); });
      else if (q.get('q')) ids = idsForKeys([q.get('q')], data);
      else if (q.get('all')) ids = data.order.slice();
      if (ids) { if (q.get('field')) { ids = ids.filter(function (id) { return !(results[id] && results[id].due > now && results[id].s >= 2); }); } runner(host, ids, data, {}); }
    });
  }

  if (document.getElementById('run') && document.getElementById('fields')) { setupDrillPage(); }
  else {
    var sc = document.createElement('script'); sc.src = BASE + 'drill-sections.js';
    sc.onload = setupSections; sc.onerror = setupSections; document.head.appendChild(sc);
  }
})();
