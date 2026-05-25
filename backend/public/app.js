// ============================================================
//  APP.JS — Conectado al backend real (JWT + PostgreSQL)
//  Roles: "admin" (acceso total) | "player" (solo Prode)
//  PUNTOS: exacto (goles) = 10pts · resultado (1/x/2) = 5pts
// ============================================================

const AVATAR_COLORS = ['#6CACE4','#FFB81C','#85bde8','#002470','#3ae8d0','#ff8c42','#a8d8ea','#43e8b0'];
const avc = i => AVATAR_COLORS[i % AVATAR_COLORS.length];
const ini = n => n.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

let currentUser    = null;
let localMatches   = [];
let localPreds     = {};
let activeDate     = null;
let scorePeriod    = 'Abr 2026';
let newsFilter     = '';
let editingMemberId = null;

// ── API helper ────────────────────────────────────────────────
async function api(method, path, body) {
  const token = sessionStorage.getItem('qh_token');
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {})
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch('/api' + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

// ── Lock de partidos por hora ─────────────────────────────────
const MONTH_MAP = {
  'Ene':0,'Feb':1,'Mar':2,'Abr':3,'May':4,'Jun':5,
  'Jul':6,'Ago':7,'Sep':8,'Oct':9,'Nov':10,'Dic':11,
  'Jan':0,'Aug':7,'Dec':11
};

function isMatchLocked(m) {
  try {
    const parts   = (m.match_date || m.date || '').split(' ');
    const dayIdx  = parts.length === 3 ? 1 : 0;
    const monIdx  = parts.length === 3 ? 2 : 1;
    const day     = parseInt(parts[dayIdx]);
    const month   = MONTH_MAP[parts[monIdx]];
    const [hh,mm] = (m.time || '00:00').split(':').map(Number);
    return new Date() >= new Date(2026, month, day, hh, mm, 0);
  } catch { return false; }
}

// ── Calcular resultado a partir de goles ─────────────────────
function goalsToResult(h, a) {
  if (h === null || a === null || h === undefined || a === undefined) return null;
  const hN = Number(h), aN = Number(a);
  if (isNaN(hN) || isNaN(aN)) return null;
  return hN > aN ? '1' : hN < aN ? '2' : 'x';
}

// ── Calcular puntos de un partido ────────────────────────────
function calcMatchPoints(pred, match) {
  const mH = match.home_score !== null && match.home_score !== undefined ? Number(match.home_score) : null;
  const mA = match.away_score !== null && match.away_score !== undefined ? Number(match.away_score) : null;
  if (mH === null || mA === null || isNaN(mH) || isNaN(mA)) return -1; // partido no jugado

  const pResult = pred.result || null;
  const pH = pred.home_score !== null && pred.home_score !== undefined ? Number(pred.home_score) : null;
  const pA = pred.away_score !== null && pred.away_score !== undefined ? Number(pred.away_score) : null;

  const realResult = goalsToResult(mH, mA);

  // Exacto: goles correctos (vale 10)
  if (pH !== null && pA !== null && !isNaN(pH) && !isNaN(pA) && pH === mH && pA === mA) return 10;

  // Resultado correcto (vale 5): compara result guardado o infiere de goles
  const predResult = pResult || goalsToResult(pH, pA);
  if (predResult && predResult === realResult) return 5;

  return 0;
}

// ══════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', async () => {
  const token = sessionStorage.getItem('qh_token');
  if (token) {
    try {
      const data = await api('GET', '/auth/me');
      currentUser = data.user;
      bootApp();
      return;
    } catch { sessionStorage.removeItem('qh_token'); }
  }
  showAuthScreen();
});

function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-shell').style.display   = 'none';
}
function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-shell').style.display   = 'flex';
}

function switchAuthTab(tab) {
  ['login','register'].forEach(t => {
    document.getElementById('auth-' + t).style.display = t === tab ? 'block' : 'none';
    document.getElementById('tab-' + t).classList.toggle('active', t === tab);
  });
  document.getElementById('auth-error').textContent = '';
}

async function doLogin() {
  const username = document.getElementById('l-user').value.trim();
  const password = document.getElementById('l-pass').value;
  const errEl    = document.getElementById('auth-error');
  if (!username || !password) { errEl.textContent = 'Completá todos los campos.'; return; }
  try {
    const data = await api('POST', '/auth/login', { username, password });
    sessionStorage.setItem('qh_token', data.token);
    currentUser = data.user;
    bootApp();
  } catch (e) { errEl.textContent = e.message || 'Error al iniciar sesión.'; }
}

async function doRegister() {
  const displayName = document.getElementById('r-name').value.trim();
  const username    = document.getElementById('r-user').value.trim();
  const password    = document.getElementById('r-pass').value;
  const password2   = document.getElementById('r-pass2').value;
  const errEl       = document.getElementById('auth-error');
  if (!displayName || !username || !password || !password2) { errEl.textContent = 'Completá todos los campos.'; return; }
  if (password !== password2) { errEl.textContent = 'Las contraseñas no coinciden.'; return; }
  if (password.length < 4)    { errEl.textContent = 'La contraseña debe tener al menos 4 caracteres.'; return; }
  try {
    const data = await api('POST', '/auth/register', { username, password, displayName });
    // YA NO hace login automático — espera aprobación
    errEl.style.color = 'var(--accent)';
    errEl.textContent = data.message || 'Cuenta creada. Esperá la aprobación del administrador.';
    // Limpiar form después de 3 segundos y volver al login
    setTimeout(() => {
      switchAuthTab('login');
      errEl.textContent = '';
      errEl.style.color = '';
    }, 3500);
  } catch (e) { errEl.textContent = e.message || 'Error al registrarse.'; }
}

function doLogout() {
  currentUser = null;
  sessionStorage.removeItem('qh_token');
  showAuthScreen();
  document.getElementById('l-user').value = '';
  document.getElementById('l-pass').value = '';
  document.getElementById('auth-error').textContent = '';
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const collapsed = sb.classList.toggle('collapsed');
  localStorage.setItem('sb_collapsed', collapsed ? '1' : '0');
}

function applySidebarState() {
  if (localStorage.getItem('sb_collapsed') === '1') {
    document.getElementById('sidebar')?.classList.add('collapsed');
  }
}

function showIntro(callback) {
  const intro = document.getElementById('intro-screen');
  const audio = document.getElementById('login-audio');
  intro.style.display = 'flex';
  audio?.play().catch(() => {});
  setTimeout(() => {
    intro.style.opacity = '0';
    intro.style.transition = 'opacity .5s';
    setTimeout(() => {
      intro.style.display = 'none';
      intro.style.opacity = '';
      intro.style.transition = '';
      callback();
    }, 500);
  }, 6000);
}

function bootApp() {
  showIntro(() => {
    showApp();
    applyRole();
    applySidebarState();
    setupNav();
    updateUserBadge();
    if (currentUser.role === 'admin') navigateTo('dashboard');
    else navigateTo('prode');
  });
}

function applyRole() {
  const isAdmin = currentUser.role === 'admin';
  document.querySelectorAll('.ni[data-s]').forEach(el => {
    const s = el.dataset.s;
    if (s === 'prode' || s === 'news') { el.style.display = ''; return; }
    el.style.display = isAdmin ? '' : 'none';
  });
  document.querySelectorAll('.sb-grp').forEach(g => { if (!isAdmin) g.style.display = 'none'; });
  document.getElementById('addbtn').style.display = 'none';
  const ap = document.getElementById('admin-prode-panel');
  if (ap) ap.style.display = isAdmin ? '' : 'none';
}

function updateUserBadge() {
  const u = currentUser;
  document.querySelector('.uavs').textContent      = ini(u.displayName || u.username);
  document.querySelector('.uavs').style.background = avc(u.id);
  document.querySelector('.uin .un').textContent   = u.displayName || u.username;
  document.querySelector('.uin .ur').textContent   = u.role === 'admin' ? '⚙ Administrador' : '⚽ Jugador';
}

const SECTION_TITLES = { dashboard:'Dashboard', score:'Score Balance', training:'Capacitaciones', news:'Noticias', prode:'Prode ⚽', members:'Miembros', users:'Usuarios' };
const ADD_ACTIONS    = { news: () => openNewsModal(), members: () => openMemberModal() };

function navigateTo(sec) {
  document.querySelectorAll('.ni').forEach(n => n.classList.toggle('active', n.dataset.s === sec));
  document.querySelectorAll('.sec').forEach(x => x.classList.remove('active'));
  document.getElementById('s-' + sec)?.classList.add('active');
  document.getElementById('tbtit').textContent = SECTION_TITLES[sec] || sec;
  const addBtn = document.getElementById('addbtn');
  if (currentUser.role === 'admin' && ADD_ACTIONS[sec]) { addBtn.style.display = ''; addBtn.onclick = ADD_ACTIONS[sec]; }
  else { addBtn.style.display = 'none'; }
  ({ dashboard:renderDashboard, score:renderScore, training:renderTraining, news:renderNews, prode:renderProde, members:renderMembers, users:renderUsers })[sec]?.();
}

function setupNav() {
  document.querySelectorAll('.ni').forEach(el => el.addEventListener('click', () => navigateTo(el.dataset.s)));
}

// ══════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════
async function renderDashboard() {
  try {
    const members = await api('GET', '/members');
    document.getElementById('d-members').textContent = members.length;
  } catch { document.getElementById('d-members').textContent = '—'; }

  document.getElementById('d-courses').textContent  = typeof DB_COURSES !== 'undefined' ? DB_COURSES.filter(c => c.status === 'Activo').length : '—';
  document.getElementById('d-approved').textContent = typeof DB_TRAINING_PROGRESS !== 'undefined' ? DB_TRAINING_PROGRESS.filter(p => p.status === 'Aprobado').length : '—';
  document.getElementById('d-avg').textContent      = '—';

  if (typeof DB_ACTIVITY !== 'undefined') {
    document.getElementById('act-list').innerHTML = DB_ACTIVITY.map(a =>
      `<li class="ai"><span class="adot dot-${a.color}"></span><div><div class="at">${a.message}</div><div class="atm">${a.time}</div></div></li>`
    ).join('');
  }
}

// ══════════════════════════════════════════════════════════════
//  SCORE BALANCE
// ══════════════════════════════════════════════════════════════
function calcWeightedScore(memberId, period) {
  if (typeof DB_SCORES === 'undefined') return null;
  const ms = DB_SCORES.filter(s => s.memberId === memberId && s.period === period);
  if (!ms.length) return null;
  let tw = 0, ws = 0;
  ms.forEach(s => {
    const cat = DB_SCORE_CATEGORIES.find(c => c.id === s.categoryId);
    if (cat) { ws += s.value * cat.weight; tw += cat.weight; }
  });
  return tw ? Math.round(ws / tw * 10) / 10 : null;
}

async function renderScore() {
  try {
    const members = await api('GET', '/members');
    if (typeof DB_SCORES === 'undefined') return;
    const periods = [...new Set(DB_SCORES.map(s => s.period))];
    document.getElementById('period-btns').innerHTML = periods.map(p =>
      `<button class="pbtn${p === scorePeriod ? ' active' : ''}" onclick="setPeriod('${p}')">${p}</button>`
    ).join('');
    const BC = ['#6CACE4','#FFB81C','#85bde8','#E8334A','#3ae8d0'];
    document.getElementById('score-grid').innerHTML = members.map(m => {
      const scores = DB_SCORES.filter(s => s.memberId === m.id && s.period === scorePeriod);
      const avg    = calcWeightedScore(m.id, scorePeriod) ?? '—';
      const color  = avg >= 8.5 ? '#6CACE4' : avg >= 7 ? '#FFB81C' : '#E8334A';
      return `<div class="smc">
        <div class="smc-hdr">
          <div class="av" style="width:36px;height:36px;font-size:.78rem;background:${avc(m.id)}">${ini(m.name)}</div>
          <div><div class="smc-name">${m.name}</div><div class="smc-role">${m.team || ''} · ${m.role || ''}</div></div>
          <div class="smc-score"><div class="smc-val" style="color:${color}">${avg}</div><div class="smc-lbl">Score</div></div>
        </div>
        ${scores.map((s, i) => {
          const cat = DB_SCORE_CATEGORIES.find(c => c.id === s.categoryId);
          return `<div class="bar-wrap">
            <div class="bar-lbl"><span>${cat?.icon || ''} ${cat?.name || ''}</span><span>${s.value}</span></div>
            <div class="bar-bg"><div class="bar-fill" style="width:${s.value * 10}%;background:${BC[i % BC.length]}"></div></div>
          </div>`;
        }).join('')}
      </div>`;
    }).join('');
  } catch(e) { console.error(e); }
}

function setPeriod(p) { scorePeriod = p; renderScore(); }

// ══════════════════════════════════════════════════════════════
//  CAPACITACIONES
// ══════════════════════════════════════════════════════════════
function renderTraining() {
  if (typeof DB_COURSES === 'undefined') return;
  document.getElementById('t-total').textContent = DB_COURSES.filter(c => c.status === 'Activo').length;
  const total    = DB_TRAINING_PROGRESS.length;
  const approved = DB_TRAINING_PROGRESS.filter(p => p.status === 'Aprobado').length;
  document.getElementById('t-prog').textContent = total ? Math.round(approved / total * 100) + '%' : '—';
  const catBadge = { Calidad:'ba', Herramientas:'bb', Habilidades:'bc' };
  document.getElementById('training-tb').innerHTML = DB_COURSES.map(c => {
    const enrolled = DB_TRAINING_PROGRESS.filter(p => p.courseId === c.id).length;
    const done     = DB_TRAINING_PROGRESS.filter(p => p.courseId === c.id && p.status === 'Aprobado').length;
    return `<tr>
      <td><span style="font-weight:500;color:var(--text)">${c.title}</span></td>
      <td><span class="badge ${catBadge[c.category] || 'bb'}">${c.category}</span></td>
      <td>${c.hours}h</td>
      <td>${c.instructor}</td>
      <td>${done}/${enrolled} aprobados</td>
      <td><span class="badge ${c.status === 'Activo' ? 'ba' : 'bd'}">${c.status}</span></td>
    </tr>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
//  NOTICIAS
// ══════════════════════════════════════════════════════════════
let localNews = [];

async function renderNews() {
  try { localNews = await api('GET', '/news'); }
  catch { localNews = []; }

  if (!localNews.length) {
    document.getElementById('news-hero').innerHTML    = '<p style="color:var(--text3)">No hay noticias todavía.</p>';
    document.getElementById('news-cards').innerHTML   = '';
    document.getElementById('news-filter').innerHTML  = '';
    document.getElementById('tick-inner').innerHTML   = '';
    return;
  }

  document.getElementById('tick-inner').innerHTML = [...localNews, ...localNews].map(n => `<span>${n.title}</span>`).join('');
  const cats = ['Todos', ...new Set(localNews.map(n => n.category))];
  document.getElementById('news-filter').innerHTML = cats.map(c =>
    `<button class="nftag${(!newsFilter && c === 'Todos') || newsFilter === c ? ' active' : ''}" onclick="setNewsFilter('${c}')">${c}</button>`
  ).join('');

  const filtered = newsFilter ? localNews.filter(n => n.category === newsFilter) : localNews;
  const sorted   = [...filtered].sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const hero     = sorted[0];

  if (hero) {
    document.getElementById('news-hero').innerHTML = `
      ${newsMediaHTML(hero.image_url)}
      <div class="hero-emoji">${hero.emoji || '📋'}</div>
      <span class="hero-tag">${hero.category}</span>
      <div class="hero-title">${hero.title}</div>
      <div class="hero-body">${hero.body}</div>
      <div class="hero-meta">Por ${hero.author}
        ${currentUser.role === 'admin' ? `<button class="ib dr" onclick="deleteNews(${hero.id})" style="margin-left:8px">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h8M5 3V2h2v1M4 3v7h4V3"/></svg>
        </button>` : ''}
      </div>`;
  }

  document.getElementById('news-cards').innerHTML = sorted.slice(1).map(n => `
    <div class="ncard">
      ${newsMediaHTML(n.image_url)}
      <div class="ncard-top"><span class="ncard-emoji">${n.emoji || '📋'}</span><span class="ncard-tag">${n.category}</span></div>
      <div class="ncard-title">${n.title}</div>
      <div class="ncard-meta">Por ${n.author}
        ${currentUser.role === 'admin' ? `<button class="ib dr" onclick="deleteNews(${n.id})" style="margin-left:8px">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h8M5 3V2h2v1M4 3v7h4V3"/></svg>
        </button>` : ''}
      </div>
    </div>`).join('');
}

function newsMediaHTML(url) {
  if (!url) return '';
  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (yt) return `<div class="news-media"><iframe src="https://www.youtube.com/embed/${yt[1]}" frameborder="0" allowfullscreen></iframe></div>`;
  // Vimeo
  const vi = url.match(/vimeo\.com\/(\d+)/);
  if (vi) return `<div class="news-media"><iframe src="https://player.vimeo.com/video/${vi[1]}" frameborder="0" allowfullscreen></iframe></div>`;
  // Imagen o gif
  return `<div class="news-media"><img src="${url}" alt="" onerror="this.parentElement.style.display='none'"></div>`;
}

function openNewsModal() {
  ['n-title','n-body','n-author','n-image'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('n-emoji').value = '📋';
  document.getElementById('n-modal').classList.add('open');
}

async function saveNews() {
  const title     = document.getElementById('n-title').value.trim();
  const body      = document.getElementById('n-body').value.trim();
  const cat       = document.getElementById('n-cat').value;
  const emoji     = document.getElementById('n-emoji').value || '📋';
  const author    = document.getElementById('n-author').value.trim() || currentUser.displayName;
  const image_url = document.getElementById('n-image').value.trim() || null;
  if (!title || !body) { toast('Completá título y contenido', 'e'); return; }
  try {
    await api('POST', '/news', { title, body, category: cat, emoji, author, image_url });
    closeM('n-modal'); renderNews(); toast('Noticia publicada', 's');
  } catch(e) { toast(e.message, 'e'); }
}

async function deleteNews(id) {
  if (!confirm('¿Eliminás esta noticia?')) return;
  try {
    await api('DELETE', '/news/' + id);
    renderNews(); toast('Noticia eliminada', 'e');
  } catch(e) { toast(e.message, 'e'); }
}

// ══════════════════════════════════════════════════════════════
//  PRODE
// ══════════════════════════════════════════════════════════════
async function renderProde() {
  if (!currentUser) return;
  try {
    localMatches   = await api('GET', '/prode/matches');
    const predsArr = await api('GET', '/prode/predictions');
    // Indexar por match_id
    localPreds = {};
    predsArr.forEach(p => { localPreds[p.match_id] = p; });
  } catch(e) {
    console.error('Error cargando prode:', e);
    return;
  }

  // Panel admin
  const adminPanel = document.getElementById('admin-prode-panel');
  if (adminPanel) {
    adminPanel.style.display = currentUser.role === 'admin' ? '' : 'none';
    if (currentUser.role === 'admin') renderAdminProdePanel();
  }

  // Strip de fechas
  const allDates = [...new Set(localMatches.map(m => m.match_date))];
  allDates.sort((a,b) => localMatches.find(m => m.match_date === a).id - localMatches.find(m => m.match_date === b).id);
  if (!activeDate || !allDates.includes(activeDate)) activeDate = allDates[0];

  document.getElementById('date-strip').innerHTML = allDates.map(d => {
    const dayM      = localMatches.filter(m => m.match_date === d);
    const hasResult = dayM.some(m => m.home_score !== null);
    const parts     = d.split(' ');
    return `<button class="date-chip${d === activeDate ? ' active' : ''}${hasResult ? ' has-result' : ''}" onclick="setDate('${d}')">
      <span class="dc-day">${parts[0]}</span>
      <span class="dc-num">${parts[1]}</span>
      <span class="dc-mon">${parts[2]}</span>
      ${hasResult ? '<span class="dc-dot"></span>' : ''}
    </button>`;
  }).join('');

  // Partidos del día
  const dayMatches = localMatches.filter(m => m.match_date === activeDate);
  const dayEl = document.getElementById('matches-day');
  if (!dayMatches.length) {
    dayEl.innerHTML = '<div class="no-matches">No hay partidos este día.</div>';
  } else {
    dayEl.innerHTML = `
      <div class="day-matches-header">
        <span class="day-matches-date">${activeDate}</span>
        <span class="day-matches-count">${dayMatches.length} partido${dayMatches.length > 1 ? 's' : ''}</span>
      </div>
      <div class="day-matches-grid">
        ${dayMatches.map(m => renderMatchCard(m)).join('')}
      </div>`;
  }

  // Mis puntos totales — calculados DESPUÉS de llenar localPreds
  const myPts = calcMyPoints();
  document.getElementById('my-pts').textContent = myPts;

  // Status bar
  const totalFilled  = Object.values(localPreds).filter(p => p.result || (p.home_score !== null && p.away_score !== null)).length;
  const totalMatches = localMatches.length;
  document.getElementById('prode-status').innerHTML = `
    <div class="status-bar">
      <span>⚽ ${totalFilled}/${totalMatches} partidos votados · <strong>${myPts} pts</strong></span>
      <span style="font-size:.75rem;color:var(--text3)">Se guarda automáticamente</span>
    </div>`;

  // Tabla de posiciones
  await renderStandings();
}

// Calcular mis puntos totales usando la lógica unificada
function calcMyPoints() {
  let pts = 0;
  localMatches.forEach(m => {
    const pred = localPreds[m.id];
    if (!pred) return;
    const p = calcMatchPoints(pred, m);
    if (p > 0) pts += p;
  });
  return pts;
}

async function renderStandings() {
  try {
    const standings = await api('GET', '/prode/standings');
    const sorted    = [...standings].sort((a,b) => b.pts - a.pts);
    document.getElementById('standings').innerHTML = sorted.length
      ? sorted.map((s,i) => {
          const pkc  = i===0?'rk1':i===1?'rk2':i===2?'rk3':'rkn';
          const isMe = s.username === currentUser.username;
          return `<div class="sr">
            <div class="srp ${pkc}">${i+1}</div>
            <div class="srname">
              ${isMe ? `<strong>${s.displayName}</strong> <span class="me-tag">← vos</span>` : s.displayName}
              <div class="srdet">${s.exact || s.ok || 0}/${s.total || s.tot || 0} aciertos</div>
            </div>
            <div class="srpts">${s.pts} pts</div>
          </div>`;
        }).join('')
      : '<div class="no-standings">Nadie cargó pronósticos todavía.</div>';
  } catch { }
}

function setDate(d) { activeDate = d; renderProde(); }

// ── Tarjeta de partido ────────────────────────────────────────
function renderMatchCard(m) {
  const pred   = localPreds[m.id] || {};
  const locked = isMatchLocked(m);

  const mH = m.home_score !== null && m.home_score !== undefined ? Number(m.home_score) : null;
  const mA = m.away_score !== null && m.away_score !== undefined ? Number(m.away_score) : null;
  const played = mH !== null && mA !== null;

  const pH = pred.home_score !== null && pred.home_score !== undefined ? Number(pred.home_score) : null;
  const pA = pred.away_score !== null && pred.away_score !== undefined ? Number(pred.away_score) : null;

  // Resultado predicho: primero el campo result guardado, sino se infiere de goles
  const predResult = pred.result || goalsToResult(pH, pA);
  const realResult = goalsToResult(mH, mA);

  // Puntos de este partido
  const matchPts = calcMatchPoints(pred, m);

  let ptsLabel = '';
  if (matchPts === 10) ptsLabel = '🎯 +10 exacto';
  else if (matchPts === 5) ptsLabel = '✓ +5 ganador';
  else if (matchPts === 0) ptsLabel = '✗ 0 pts';

  // Clase de los botones 1/X/2
  function btnCls(val) {
    const sel = 'sel' + (val === '1' ? '1' : val === 'x' ? 'x' : '2');
    if (!predResult) return '';
    if (predResult !== val) return '';
    if (!played) return sel;
    return predResult === realResult ? 'ok' : 'fail';
  }

  const disabledAttr = locked ? 'disabled' : '';
  const lockIcon     = locked ? '<span style="font-size:.7rem;color:var(--text3)">🔒</span>' : '';
  const resultBadge  = played
    ? `<span class="match-result-badge">${mH} - ${mA}</span>`
    : `<span class="match-vs">VS</span>`;

  return `
    <div class="match-card${played ? ' played' : ''}${locked ? ' locked' : ''}">
      <div class="match-meta">
        <span class="match-date">${m.time || ''} hs · ${m.venue || ''}</span>
        ${lockIcon}
      </div>
      <div class="match-body">
        <div class="match-team home">
          <span class="team-flag">${m.home_flag || '🏳️'}</span>
          <span class="team-name">${m.home}</span>
        </div>
        <div class="match-center">
          ${resultBadge}
          <div class="pred-btns">
            <button class="pb ${btnCls('1')}" onclick="setPred(${m.id},'1')" ${disabledAttr} title="Gana ${m.home}">1</button>
            <button class="pb ${btnCls('x')}" onclick="setPred(${m.id},'x')" ${disabledAttr} title="Empate">X</button>
            <button class="pb ${btnCls('2')}" onclick="setPred(${m.id},'2')" ${disabledAttr} title="Gana ${m.away}">2</button>
          </div>
          <div class="pred-goals">
            <input class="goals-input" type="number" min="0" max="20" placeholder="?"
              value="${pH !== null ? pH : ''}"
              ${disabledAttr}
              onchange="setPredGoals(${m.id},'home',this.value)"
              oninput="if(this.value<0)this.value=0"
              title="Goles ${m.home}">
            <span class="goals-sep">:</span>
            <input class="goals-input" type="number" min="0" max="20" placeholder="?"
              value="${pA !== null ? pA : ''}"
              ${disabledAttr}
              onchange="setPredGoals(${m.id},'away',this.value)"
              oninput="if(this.value<0)this.value=0"
              title="Goles ${m.away}">
          </div>
          ${played && matchPts >= 0
            ? `<div class="match-result-row ${matchPts === 10 ? 'exact' : matchPts === 5 ? 'ok' : 'fail'}">${ptsLabel}</div>`
            : ''}
        </div>
        <div class="match-team away">
          <span class="team-name">${m.away}</span>
          <span class="team-flag">${m.away_flag || '🏳️'}</span>
        </div>
      </div>
    </div>`;
}

// ── Panel admin resultados ────────────────────────────────────
function renderAdminProdePanel() {
  const panel = document.getElementById('admin-match-list');
  if (!panel) return;
  const groupMatches = activeDate ? localMatches.filter(m => m.match_date === activeDate) : localMatches;
  panel.innerHTML = `
    <p style="font-size:.75rem;color:var(--text3);margin-bottom:10px">
      Cargá resultados del día <strong>${activeDate || 'seleccionado'}</strong>.
      <span style="color:var(--accent);font-weight:600">🎯 Exacto = 10 pts · ✓ Ganador/Empate = 5 pts</span>
    </p>
    ${groupMatches.map(m => `
      <div class="admin-match-row">
        <span class="admin-match-name">${m.home_flag || ''} ${m.home} vs ${m.away_flag || ''} ${m.away}</span>
        <span style="font-size:.7rem;color:var(--text3)">${m.match_date}</span>
        <div class="admin-goals-row">
          <input class="goals-input admin-goals-input" type="number" min="0" max="20"
            value="${m.home_score !== null && m.home_score !== undefined ? m.home_score : ''}"
            placeholder="—"
            onchange="setMatchResult(${m.id}, 'home', this.value)"
            oninput="if(this.value<0)this.value=0">
          <span class="goals-sep">:</span>
          <input class="goals-input admin-goals-input" type="number" min="0" max="20"
            value="${m.away_score !== null && m.away_score !== undefined ? m.away_score : ''}"
            placeholder="—"
            onchange="setMatchResult(${m.id}, 'away', this.value)"
            oninput="if(this.value<0)this.value=0">
          <span class="admin-result-preview ${m.home_score !== null ? 'has-result' : ''}">
            ${m.home_score !== null
              ? (Number(m.home_score) > Number(m.away_score) ? '→ Gana ' + m.home
                : Number(m.home_score) < Number(m.away_score) ? '→ Gana ' + m.away
                : '→ Empate')
              : '(sin resultado)'}
          </span>
          <button class="btn btn-o" style="font-size:.7rem;padding:4px 8px;color:var(--accent2)"
            onclick="resetMatchResult(${m.id})" title="Borrar resultado">✕</button>
        </div>
      </div>`).join('')}`;
}

async function resetMatchResult(matchId) {
  if (!confirm('¿Borrás el resultado de este partido?')) return;
  try {
    await api('DELETE', '/prode/matches/' + matchId + '/result');
    toast('Resultado borrado', 's');
    renderProde();
  } catch(e) { toast(e.message, 'e'); }
}

async function setMatchResult(matchId, side, value) {
  const m = localMatches.find(x => x.id === matchId);
  if (!m) return;
  const v = value === '' ? null : Number(value);
  if (side === 'home') m.home_score = v;
  else                 m.away_score = v;
  // Solo guardar cuando ambos goles están cargados
  if (m.home_score === null || m.away_score === null) return;
  try {
    await api('PUT', '/prode/matches/' + matchId + '/result', {
      home_score: m.home_score,
      away_score: m.away_score
    });
    toast('Resultado guardado', 's');
    renderProde();
  } catch(e) { toast(e.message, 'e'); }
}

// ── Predicciones ──────────────────────────────────────────────
async function setPred(matchId, val) {
  const match = localMatches.find(m => m.id === matchId);
  if (!match || isMatchLocked(match)) return;

  const existing = localPreds[matchId] || {};
  const pH = existing.home_score !== null && existing.home_score !== undefined ? Number(existing.home_score) : null;
  const pA = existing.away_score !== null && existing.away_score !== undefined ? Number(existing.away_score) : null;

  // Guardar el resultado explícito; si ya tenía goles que coincidan con ese resultado, mantenerlos
  // Si los goles existentes contradicen el nuevo resultado, limpiarlos
  const currentGoalResult = goalsToResult(pH, pA);
  let newHome = pH;
  let newAway = pA;
  if (currentGoalResult !== val) {
    // Los goles no coinciden con el nuevo resultado: limpiar
    newHome = null;
    newAway = null;
  }

  await savePrediction(matchId, val, newHome, newAway);
}

async function setPredGoals(matchId, side, value) {
  const match = localMatches.find(m => m.id === matchId);
  if (!match || isMatchLocked(match)) return;

  const existing = localPreds[matchId] || {};
  const newHome  = side === 'home' ? (value === '' ? null : Number(value)) : (existing.home_score !== null && existing.home_score !== undefined ? Number(existing.home_score) : null);
  const newAway  = side === 'away' ? (value === '' ? null : Number(value)) : (existing.away_score !== null && existing.away_score !== undefined ? Number(existing.away_score) : null);

  // Inferir resultado de los goles si ambos están cargados
  const inferredResult = goalsToResult(newHome, newAway) || existing.result || null;

  await savePrediction(matchId, inferredResult, newHome, newAway);
}

async function savePrediction(matchId, result, homeScore, awayScore) {
  try {
    const saved = await api('POST', '/prode/predictions', {
      match_id:   matchId,
      result:     result,
      home_score: homeScore,
      away_score: awayScore,
    });
    localPreds[matchId] = saved;
    renderProde();
  } catch(e) { toast(e.message, 'e'); }
}

// ══════════════════════════════════════════════════════════════
//  USUARIOS (solo admin)
// ══════════════════════════════════════════════════════════════

async function renderUsers() {
  try {
    const users = await api('GET', '/auth/users');

    const pending = users.filter(u => u.status === 'pending');
    const active  = users.filter(u => u.status === 'active');
    const banned  = users.filter(u => u.status === 'banned');

    const userSection = document.getElementById('s-users');
    if (!userSection) return;

    userSection.innerHTML = `

      <!-- Pendientes -->
      <div class="card" style="margin-bottom:16px">
        <div class="ctit" style="display:flex;align-items:center;gap:8px">
          ⏳ Pendientes de aprobación
          ${pending.length ? `<span style="background:var(--accent);color:#fff;font-size:.7rem;padding:2px 8px;border-radius:99px;font-weight:600">${pending.length}</span>` : ''}
        </div>
        ${pending.length === 0
          ? '<p style="color:var(--text3);font-size:.85rem;margin-top:8px">No hay usuarios pendientes.</p>'
          : `<div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
              ${pending.map(u => `
                <div class="user-row">
                  <div class="av" style="background:#FFB81C;width:34px;height:34px;font-size:.7rem;flex-shrink:0">${ini(u.display_name)}</div>
                  <div style="flex:1">
                    <div style="font-weight:500;font-size:.9rem">${u.display_name}</div>
                    <div style="font-size:.75rem;color:var(--text3)">@${u.username} · Registrado ${new Date(u.created_at).toLocaleDateString('es-AR')}</div>
                  </div>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-a" style="font-size:.75rem;padding:6px 12px" onclick="setUserStatus(${u.id},'active')">✓ Aprobar</button>
                    <button class="btn btn-o" style="font-size:.75rem;padding:6px 12px;color:var(--accent2)" onclick="deleteUser(${u.id},'${u.display_name.replace(/'/g,"\\'")}')">✕ Rechazar</button>
                  </div>
                </div>`).join('')}
            </div>`}
      </div>

      <!-- Activos -->
      <div class="card" style="margin-bottom:16px">
        <div class="ctit">✅ Usuarios activos</div>
        ${active.length === 0
          ? '<p style="color:var(--text3);font-size:.85rem;margin-top:8px">Sin usuarios activos.</p>'
          : `<div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
              ${active.map(u => `
                <div class="user-row">
                  <div class="av" style="background:${avc(u.id)};width:34px;height:34px;font-size:.7rem;flex-shrink:0">${ini(u.display_name)}</div>
                  <div style="flex:1">
                    <div style="font-weight:500;font-size:.9rem">${u.display_name}</div>
                    <div style="font-size:.75rem;color:var(--text3)">@${u.username}</div>
                  </div>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-o" style="font-size:.75rem;padding:6px 12px" onclick="setUserStatus(${u.id},'banned')">🚫 Banear</button>
                    <button class="btn btn-o" style="font-size:.75rem;padding:6px 12px;color:var(--accent2)" onclick="deleteUser(${u.id},'${u.display_name.replace(/'/g,"\\'")}')">🗑 Eliminar</button>
                  </div>
                </div>`).join('')}
            </div>`}
      </div>

      <!-- Baneados -->
      ${banned.length > 0 ? `
      <div class="card">
        <div class="ctit">🚫 Usuarios baneados</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
          ${banned.map(u => `
            <div class="user-row">
              <div class="av" style="background:#555;width:34px;height:34px;font-size:.7rem;flex-shrink:0">${ini(u.display_name)}</div>
              <div style="flex:1">
                <div style="font-weight:500;font-size:.9rem;color:var(--text3)">${u.display_name}</div>
                <div style="font-size:.75rem;color:var(--text3)">@${u.username}</div>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-o" style="font-size:.75rem;padding:6px 12px" onclick="setUserStatus(${u.id},'active')">↩ Reactivar</button>
                <button class="btn btn-o" style="font-size:.75rem;padding:6px 12px;color:var(--accent2)" onclick="deleteUser(${u.id},'${u.display_name.replace(/'/g,"\\'")}')">🗑 Eliminar</button>
              </div>
            </div>`).join('')}
        </div>
      </div>` : ''}`;

  } catch (e) {
    toast('Error al cargar usuarios: ' + e.message, 'e');
  }
}

async function setUserStatus(id, status) {
  try {
    await api('PUT', '/auth/users/' + id + '/status', { status });
    const msgs = { active: 'Usuario aprobado ✓', banned: 'Usuario baneado', pending: 'Usuario movido a pendiente' };
    toast(msgs[status] || 'Estado actualizado', 's');
    renderUsers();
  } catch (e) { toast(e.message, 'e'); }
}

async function deleteUser(id, name) {
  if (!confirm(`¿Eliminás a ${name}? Esta acción no se puede deshacer.`)) return;
  try {
    await api('DELETE', '/auth/users/' + id);
    toast(name + ' eliminado', 'e');
    renderUsers();
  } catch (e) { toast(e.message, 'e'); }
}

// ══════════════════════════════════════════════════════════════
//  MIEMBROS
// ══════════════════════════════════════════════════════════════
let localMembers = [];

async function renderMembers() {
  try { localMembers = await api('GET', '/members'); }
  catch { localMembers = []; }

  const search = (document.getElementById('msearch').value || '').toLowerCase();
  const list   = localMembers.filter(m =>
    (!search || m.name.toLowerCase().includes(search) || (m.role || '').toLowerCase().includes(search)));

  document.getElementById('mcnt').textContent = `${list.length} miembro${list.length !== 1 ? 's' : ''}`;
  document.getElementById('members-tb').innerHTML = list.map(m => `
    <tr>
      <td><div class="enc"><div class="av" style="width:30px;height:30px;font-size:.68rem;background:${m.avatar_color || avc(m.id)}">${ini(m.name)}</div><span class="enm">${m.name}</span></div></td>
      <td>${m.team || '—'}</td>
      <td>${m.role || '—'}</td>
      <td>—</td>
      <td>—</td>
      <td><div class="ab">
        <button class="ib" onclick="openEditMember(${m.id})">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8.5 1.5l2 2L3 11H1V9L8.5 1.5z"/></svg>
        </button>
        <button class="ib dr" onclick="deleteMember(${m.id},'${m.name.replace(/'/g,"\\'")}')">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h8M5 3V2h2v1M4 3v7h4V3"/></svg>
        </button>
      </div></td>
    </tr>`).join('');
}

document.getElementById('msearch')?.addEventListener('input', renderMembers);

function openMemberModal() {
  editingMemberId = null;
  document.getElementById('m-mtit').textContent = 'Nuevo miembro';
  ['m-name','m-role'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('m-modal').classList.add('open');
}

function openEditMember(id) {
  const m = localMembers.find(x => x.id === id);
  if (!m) return;
  editingMemberId = id;
  document.getElementById('m-mtit').textContent = 'Editar miembro';
  document.getElementById('m-name').value = m.name;
  document.getElementById('m-role').value = m.role || '';
  document.getElementById('m-modal').classList.add('open');
}

async function saveMember() {
  const name = document.getElementById('m-name').value.trim();
  const role = document.getElementById('m-role').value.trim();
  if (!name || !role) { toast('Completá todos los campos', 'e'); return; }
  try {
    if (editingMemberId) {
      await api('PUT', '/members/' + editingMemberId, { name, role, team: '', avatar_color: avc(editingMemberId) });
      toast(name + ' actualizado', 's');
    } else {
      await api('POST', '/members', { name, role, team: '', avatar_color: avc(Math.random() * 8 | 0) });
      toast(name + ' agregado', 's');
    }
    closeM('m-modal');
    renderMembers();
  } catch(e) { toast(e.message, 'e'); }
}

async function deleteMember(id, name) {
  if (!confirm(`¿Eliminás a ${name}?`)) return;
  try {
    await api('DELETE', '/members/' + id);
    toast(name + ' eliminado', 'e');
    renderMembers();
  } catch(e) { toast(e.message, 'e'); }
}

// ══════════════════════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════════════════════
function closeM(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.mb').forEach(b =>
  b.addEventListener('click', e => { if (e.target === b) b.classList.remove('open'); })
);

function toast(msg, type = '') {
  const w = document.getElementById('tw');
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  t.innerHTML = `<span>${type === 's' ? '✓' : type === 'e' ? '✕' : 'ℹ'}</span> ${msg}`;
  w.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (document.getElementById('auth-screen').style.display !== 'none') {
    const loginVisible = document.getElementById('auth-login').style.display !== 'none';
    if (loginVisible) doLogin(); else doRegister();
  }
});