const $ = s => document.querySelector(s);
const A = window.Android;
let games = [], selected = null, query = '', apps = null, modal = null; // modal: {mode:'form'|'picker', d, edit}
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = s => (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const bg = g => g.avatar ? `style="background-image:url('${g.avatar}')"` : '';
const letter = g => g.avatar ? '' : esc((g.name || '?')[0]).toUpperCase();
const fmtTime = s => { if (!s) return '0 мин'; const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? `${h} ч ${m} мин` : `${Math.max(m, 1)} мин`; };
const persist = () => A.save(JSON.stringify(games));
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.remove('hidden'); setTimeout(() => el.classList.add('hidden'), 3500); }
function updBack() { A.setCanBack(!!modal || !!selected); }

function render() {
  const m = $('#main');
  const g = games.find(x => x.id === selected);
  $('header').classList.toggle('hidden', !!g);
  m.style.top = g ? '0' : '112px';
  $('#fab').classList.toggle('hidden', !!g || !!modal);
  if (g) {
    m.innerHTML = `<div style="height:14px"></div>
    <div class="hero"><div class="cover" ${bg(g)}>${letter(g)}</div><h1>${esc(g.name)}</h1><p>${esc(g.pkg)}</p>
      <button class="btn play" id="playBtn">▶ ИГРАТЬ</button></div>
    <div class="stats">
      <div class="stat"><small>ВРЕМЯ</small><b>${fmtTime(g.playtime)}</b></div>
      <div class="stat"><small>ЗАПУСКОВ</small><b>${g.launches || 0}</b></div>
      <div class="stat"><small>ПОСЛЕДНИЙ</small><b>${g.last ? new Date(g.last).toLocaleDateString('ru-RU') : '—'}</b></div></div>
    <div class="notes"><b>Параметры запуска:</b>\n${esc(g.extras) || '—'}\n\n<b>Заметки:</b>\n${esc(g.notes) || '—'}</div>
    <div class="row" style="margin-top:14px"><button class="btn" id="homeBtn">← Назад</button><button class="btn" id="setBtn">⚙ Настройки</button></div>`;
    $('#playBtn').onclick = () => launchGame(g);
    $('#setBtn').onclick = () => openForm(g);
    $('#homeBtn').onclick = () => { selected = null; render(); };
  } else if (!games.length) {
    m.innerHTML = `<div class="empty"><div class="big">🐜</div><h1>Библиотека пуста</h1><p class="sub">Нажми ＋ и добавь первую игру</p></div>`;
  } else {
    const f = games.filter(x => x.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
    m.innerHTML = `<h1>Библиотека</h1><p class="sub">${games.length} игр</p><div class="grid">${f.map(x =>
      `<div class="tile" data-id="${x.id}"><div class="cover" ${bg(x)}>${letter(x)}</div><div class="t">${esc(x.name)}</div><div class="m">${fmtTime(x.playtime)}</div></div>`).join('')}</div>`;
    document.querySelectorAll('.tile').forEach(t => t.onclick = () => { selected = t.dataset.id; render(); });
  }
  updBack();
}

function openForm(game) {
  modal = { mode: 'form', edit: !!game, d: game ? { ...game } : { id: uid(), name: '', pkg: '', avatar: '', extras: '', notes: '' } };
  renderSheet();
}
function openPicker() {
  modal.mode = 'picker';
  if (!apps) A.loadApps();
  renderSheet();
}
function closeModal() { modal = null; $('#sheet').classList.add('hidden'); render(); }

function renderSheet() {
  const s = $('#sheet'); s.classList.remove('hidden'); $('#fab').classList.add('hidden'); updBack();
  if (modal.mode === 'picker') return renderPicker();
  const { d, edit } = modal;
  s.innerHTML = `<div class="sh-head"><button class="icon" id="x">✕</button><h2>${edit ? 'Настройки игры' : 'Новая игра'}</h2></div>
  <div class="avrow"><div class="avprev" id="av"></div><div class="col">
    <button class="btn" id="pickImg">🖼 Своя аватарка</button>
    <button class="btn primary" id="pickApp">📱 Выбрать из приложений</button></div></div>
  <div class="field"><label>Название</label><input id="fName" value="${esc(d.name)}" placeholder="Например: Minecraft"></div>
  <div class="field"><label>Пакет приложения</label><input id="fPkg" value="${esc(d.pkg)}" placeholder="com.example.game" autocapitalize="none">
    <div class="hint">Проще всего выбрать игру кнопкой «Выбрать из приложений»</div></div>
  <div class="field"><label>Параметры запуска (по одному на строку: ключ=значение)</label><textarea id="fExtras" rows="3" autocapitalize="none">${esc(d.extras)}</textarea>
    <div class="hint">Передаются игре как extras при запуске</div></div>
  <div class="field"><label>Заметки</label><textarea id="fNotes" rows="3">${esc(d.notes)}</textarea></div>
  <div class="row" style="margin-top:6px">${edit ? '<button class="btn danger" id="del">Удалить</button>' : ''}<button class="btn primary" id="save">${edit ? 'Сохранить' : 'Добавить'}</button></div>`;
  const av = () => { const e = $('#av'); e.style.backgroundImage = d.avatar ? `url('${d.avatar}')` : ''; e.textContent = d.avatar ? '' : ((d.name || '?')[0] || '?').toUpperCase(); };
  av();
  $('#fName').oninput = e => { d.name = e.target.value; if (!d.avatar) av(); };
  $('#fPkg').oninput = e => d.pkg = e.target.value.trim();
  $('#fExtras').oninput = e => d.extras = e.target.value;
  $('#fNotes').oninput = e => d.notes = e.target.value;
  $('#x').onclick = closeModal;
  $('#pickImg').onclick = () => A.pickImage();
  $('#pickApp').onclick = openPicker;
  if (edit) $('#del').onclick = () => { if (confirm('Удалить игру из библиотеки? (сама игра не удалится)')) { games = games.filter(x => x.id !== d.id); selected = null; persist(); closeModal(); } };
  $('#save').onclick = () => {
    d.name = d.name.trim();
    if (!d.name || !d.pkg) return toast('Укажи название и выбери приложение');
    if (edit) games = games.map(x => x.id === d.id ? d : x); else { games.push(d); selected = d.id; }
    persist(); closeModal();
  };
}

function renderPicker(filter = '') {
  const s = $('#sheet');
  s.innerHTML = `<div class="sh-head"><button class="icon" id="x">←</button><h2>Установленные приложения</h2></div>
  <div class="field"><input id="pq" placeholder="🔍 Поиск" value="${esc(filter)}"></div><div id="apps">${apps ? '' : '<p class="sub">Загрузка…</p>'}</div>`;
  const list = () => {
    if (!apps) return;
    const q = $('#pq').value.toLowerCase();
    $('#apps').innerHTML = apps.filter(a => a.name.toLowerCase().includes(q)).map(a =>
      `<div class="app" data-p="${esc(a.pkg)}"><img src="${a.icon}"><div><b>${esc(a.name)}</b><small>${esc(a.pkg)}</small></div></div>`).join('');
    document.querySelectorAll('.app').forEach(el => el.onclick = () => {
      const a = apps.find(x => x.pkg === el.dataset.p), d = modal.d;
      d.pkg = a.pkg; if (!d.name) d.name = a.name; if (!d.avatar) d.avatar = a.icon;
      modal.mode = 'form'; renderSheet();
    });
  };
  $('#pq').oninput = list; $('#x').onclick = () => { modal.mode = 'form'; renderSheet(); }; list();
}
window.onApps = list => { apps = list; if (modal && modal.mode === 'picker') renderPicker($('#pq') ? $('#pq').value : ''); };
window.onImage = url => { if (modal && modal.mode === 'form') { modal.d.avatar = url; renderSheet(); } };
window.onBack = () => {
  if (modal && modal.mode === 'picker') { modal.mode = 'form'; renderSheet(); }
  else if (modal) closeModal();
  else if (selected) { selected = null; render(); }
};
window.onExit = (pkg, sec) => {
  const g = games.find(x => x.pkg === pkg);
  if (g && sec >= 5) { g.playtime = (g.playtime || 0) + sec; persist(); render(); }
};

// ---- Анимация запуска GORODOT ----
let raf;
function startNet() {
  const cv = $('#net'), ctx = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight;
  const pts = Array.from({ length: 45 }, () => ({ x: Math.random() * cv.width, y: Math.random() * cv.height, vx: (Math.random() - .5) * .9, vy: (Math.random() - .5) * .9 }));
  const hub = { x: cv.width / 2, y: cv.height / 2 };
  (function loop() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    pts.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > cv.width) p.vx *= -1; if (p.y < 0 || p.y > cv.height) p.vy *= -1; });
    pts.forEach((a, i) => {
      for (let j = i + 1; j < pts.length; j++) { const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y); if (d < 110) { ctx.strokeStyle = `rgba(255,138,31,${(1 - d / 110) * .35})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
      const dh = Math.hypot(a.x - hub.x, a.y - hub.y); if (dh < 220) { ctx.strokeStyle = `rgba(255,180,87,${(1 - dh / 220) * .6})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(hub.x, hub.y); ctx.stroke(); }
      ctx.fillStyle = '#ff8a1f'; ctx.beginPath(); ctx.arc(a.x, a.y, 2, 0, 7); ctx.fill();
    });
    raf = requestAnimationFrame(loop);
  })();
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
let launching = false;
async function launchGame(g) {
  if (launching) return; launching = true;
  const L = $('#launch');
  $('#lName').textContent = g.name;
  const a = $('#lAvatar'); a.style.backgroundImage = g.avatar ? `url('${g.avatar}')` : ''; a.textContent = g.avatar ? '' : (g.name[0] || '?').toUpperCase();
  L.classList.remove('hidden'); startNet();
  const steps = [['Соединение с GORODOT…', 15], ['Авторизация Filipp game service…', 38], ['Оптимизация движка…', 65], ['Применение параметров запуска…', 85], ['Запуск игры…', 100]];
  for (const [t, p] of steps) { $('#lStatus').textContent = t; $('#lBar').style.width = p + '%'; await sleep(600 + Math.random() * 400); }
  const res = A.launch(g.pkg, g.extras || '');
  cancelAnimationFrame(raf); L.classList.add('hidden'); $('#lBar').style.width = '0'; launching = false;
  if (res !== 'ok') return toast(res);
  g.launches = (g.launches || 0) + 1; g.last = Date.now(); persist(); render();
}

$('#fab').onclick = () => openForm();
$('#search').oninput = e => { query = e.target.value; render(); };
try { games = JSON.parse(A.load()); } catch { games = []; }
render();
