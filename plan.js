(function () {
  'use strict';
  const intervals = [1, 3, 7, 14, 30];
  function todayISO(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en', {timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(now);
    return ['year', 'month', 'day'].map(k => parts.find(p => p.type === k).value).join('-');
  }
  function addDays(day, n) { return new Date(Date.parse(day + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10); }
  function review(card, grade, day) {
    const stage = grade === 'good' ? Math.min((card.stage || 0) + 1, 4) : 0;
    let due = addDays(day, intervals[stage]);
    if (day < '2026-11-07' && due > '2026-11-07') due = '2026-11-07';
    return {...card, stage, due, lastReview: day, lastGrade: grade};
  }
  function score(values) {
    const max = [160, 24, 60, 56];
    if (values.length !== 4 || values.some((v, i) => v === '' || v == null || !Number.isInteger(Number(v)) || Number(v) < 0 || Number(v) > max[i])) return null;
    const n = values.map(Number);
    return {total: n.reduce((a, b) => a + b, 0), legal: n[0] + n[1] + n[2], basics: n[3], nonwriting: n[0] + n[1] + n[3]};
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {todayISO, addDays, review, score};
  if (typeof document === 'undefined') return;
  const plan = JSON.parse(document.getElementById('plan-data').textContent);
  const key = 'gyosei-plan-' + plan.version;
  let state;
  function read() {
    try { state = JSON.parse(localStorage.getItem(key)) || {}; } catch (_) { state = {}; }
    if (!state || typeof state !== 'object' || Array.isArray(state)) state = {};
    for (const k of ['tasks', 'scores']) if (!state[k] || typeof state[k] !== 'object' || Array.isArray(state[k])) state[k] = {};
    if (!Array.isArray(state.memory)) state.memory = [];
    state.memory = state.memory.filter(c => c && typeof c.id === 'string' && typeof c.question === 'string' && typeof c.answer === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.due));
  }
  function save() { try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) { document.getElementById('memory-message').textContent = '保存できません。ブラウザの保存設定・空き容量を確認してください。'; } }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const el = id => document.getElementById(id);
  function tasks(day) {
    return day.tasks.map(t => `<label class="task ${state.tasks[t.id] ? 'done' : ''} ${t.reserve ? 'reserve' : ''}"><input type="checkbox" data-task="${esc(t.id)}" ${state.tasks[t.id] ? 'checked' : ''}><span>${t.minutes}分</span><span>${t.href ? `<a href="${esc(t.href)}">${esc(t.title)}</a>` : esc(t.title)}</span></label>`).join('');
  }
  function render() {
    const today = todayISO();
    const current = plan.days.find(d => d.date === today) || (today < plan.start ? plan.days[0] : null);
    el('days-left').textContent = Math.max(0, Math.round((Date.parse(plan.exam) - Date.parse(today)) / 86400000)) + '日';
    el('hours-left').textContent = (plan.days.filter(d => d.date >= today).reduce((s, d) => s + d.minutes, 0) / 60).toFixed(1) + '時間';
    const all = plan.days.flatMap(d => d.tasks);
    el('done-rate').textContent = all.filter(t => state.tasks[t.id]).length + ' / ' + all.length;
    el('today').innerHTML = current ? `<h3>${current.date}（${current.weekday}）・${current.minutes}分</h3>${tasks(current)}<p>${esc(current.outcome)}</p>` : '<p>試験日を過ぎています。この計画は2026年度用です。</p>';
    const previous = plan.days.filter(d => d.date < today).at(-1);
    el('goal').textContent = previous ? '昨日までの予定上の到達目安：' + previous.title + '。実際の習得は問題で確認します。' : '今日は開始日です。過去の未達を上乗せせず、既読部も診断して始めます。';
    el('backlog').innerHTML = plan.days.filter(d => d.date < today).map(d => ({...d, tasks: d.tasks.filter(t => !state.tasks[t.id] && !t.reserve)})).filter(d => d.tasks.length).map(d => `<h3>${d.date}</h3>${tasks(d)}`).join('') || '<p>未チェックの過去予定はありません。</p>';
    const open = new Set(Array.from(el('calendar').querySelectorAll('details[open]')).map(d => d.dataset.week));
    el('calendar').innerHTML = plan.weeks.map(w => `<details data-week="${w.n}" ${open.has(String(w.n)) || (today >= w.start && today <= w.end) ? 'open' : ''}><summary>${w.start.slice(5)}〜${w.end.slice(5)} ${esc(w.title)}</summary><p>${esc(w.check)}</p>${plan.days.filter(d => d.week === w.n).map(d => `<div class="day ${d.date === today ? 'current' : ''}"><h3>${d.date}（${d.weekday}）・${d.minutes}分</h3>${tasks(d)}<p>${esc(d.outcome)}</p></div>`).join('')}</details>`).join('');
    el('reading').innerHTML = plan.pages.map(p => {
      let readIDs = [];
      try { const saved = JSON.parse(localStorage.getItem('read:' + new URL(p.path, location.href).pathname)); if (Array.isArray(saved)) readIDs = saved; } catch (_) {}
      return `<p><a href="${esc(p.path)}">${esc(p.title)}</a>：${new Set(readIDs.filter(id => p.ids.includes(id))).size} / ${new Set(p.ids).size}</p>`;
    }).join('');
    if (!el('unfinished')) {
      const note = document.createElement('label');
      note.textContent = '未了の見出し・次に補修する単元';
      const input = document.createElement('textarea');
      input.id = 'unfinished'; input.className = 'backlog-note'; input.rows = 3;
      input.value = typeof state.note === 'string' ? state.note : '';
      input.addEventListener('input', () => { state.note = input.value; save(); });
      note.appendChild(input); el('backlog').parentElement.appendChild(note);
    }
    renderMemory();
  }
  function renderMemory() {
    const today = todayISO();
    const due = state.memory.filter(c => c.due <= today).sort((a, b) => a.due.localeCompare(b.due));
    el('memory-count').textContent = `期限到来${due.length}件 / 登録${state.memory.length}件`;
    el('memory').innerHTML = due.map(c => `<article class="memory-card"><h3>${esc(c.question)}</h3><button type="button" data-reveal="${esc(c.id)}">答えを確認</button><div hidden data-answer="${esc(c.id)}"><p style="white-space:pre-wrap">${esc(c.answer)}</p><div class="grades"><button data-grade="good" data-card="${esc(c.id)}">根拠まで正答</button><button data-grade="unsure" data-card="${esc(c.id)}">正解だが曖昧</button><button data-grade="wrong" data-card="${esc(c.id)}">誤答</button></div></div></article>`).join('') || `<p>期限の来た論点はありません。${state.memory.length ? '次回：' + esc(state.memory.map(c => c.due).sort()[0]) : '今日の重要論点を登録すると、明日から復習が始まります。'}</p>`;
  }
  function scoreSummary(id) {
    const s = state.scores[id] || {};
    const result = score(s.values || []);
    el('score-' + id).textContent = result ? `${s.unseen ? '未見模試' : '練習結果（未見未確認）'}：合計${result.total}点 / 非記述${result.nonwriting}点 / 基礎知識${result.basics}点。${result.basics < 24 ? '基礎知識を優先補修。' : ''}${result.legal < 122 ? '法令等も基準未満。' : ''}従来配点による目安。合格保証ではありません。` : '未測定：4項目すべてに配点内の整数を入力してください。';
  }
  function renderScores() {
    el('scores').innerHTML = [['A','10/11'],['B','10/25'],['C','11/1']].map(([id, date]) => {
      const s = state.scores[id] || {};
      return `<div class="score-row"><h3>${date} 模試${id}</h3><div class="score-fields">${['法令五肢','多肢','記述','基礎知識'].map((name, i) => `<label>${name}<input type="number" min="0" max="${[160,24,60,56][i]}" step="1" data-score="${id}" data-index="${i}" value="${esc((s.values || [])[i] ?? '')}"></label>`).join('')}</div><label><input type="checkbox" data-unseen="${id}" ${s.unseen ? 'checked' : ''}>解答・解説を事前に見ていない</label><p id="score-${id}" aria-live="polite"></p></div>`;
    }).join('');
    ['A','B','C'].forEach(scoreSummary);
  }
  document.addEventListener('change', e => {
    const target = e.target;
    if (target.dataset.task) { state.tasks[target.dataset.task] = target.checked; save(); render(); }
    const id = target.dataset.score || target.dataset.unseen;
    if (id) {
      const s = state.scores[id] || {values: ['', '', '', ''], unseen: false};
      if (!Array.isArray(s.values)) s.values = ['', '', '', ''];
      if (target.dataset.score) s.values[Number(target.dataset.index)] = target.value;
      else s.unseen = target.checked;
      state.scores[id] = s; save(); scoreSummary(id);
    }
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.reveal) { b.nextElementSibling.hidden = false; b.hidden = true; }
    if (b.dataset.grade) {
      state.memory = state.memory.map(c => c.id === b.dataset.card ? review(c, b.dataset.grade, todayISO()) : c);
      save(); renderMemory();
    }
  });
  el('memory-form').addEventListener('submit', e => {
    e.preventDefault();
    const today = todayISO(), form = e.target;
    if (state.memory.filter(c => c.created === today).length >= 3) { el('memory-message').textContent = '今日の新規登録は3件までです。'; return; }
    const question = form.elements.question.value.trim(), answer = form.elements.answer.value.trim();
    if (!question || !answer) return;
    state.memory.push({id: crypto.randomUUID(), question, answer, created: today, due: addDays(today, 1), stage: 0});
    save(); form.reset(); renderMemory(); el('memory-message').textContent = '登録しました。初回は明日です。';
  });
  read(); render(); renderScores();
  window.addEventListener('storage', () => { read(); render(); renderScores(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { read(); render(); renderScores(); } });
})();
