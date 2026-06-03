// ============================================================
//  APP.JS — Conectado al backend real (JWT + PostgreSQL)
//  Roles: "admin" (acceso total) | "player" (solo Prode)
//  PUNTOS: exacto (goles) = 10pts · resultado (1/x/2) = 5pts
// ============================================================

const AVATAR_COLORS = ['#6CACE4','#FFB81C','#85bde8','#002470','#3ae8d0','#ff8c42','#a8d8ea','#43e8b0'];
const avc = i => AVATAR_COLORS[i % AVATAR_COLORS.length];
const ini = n => n.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

let currentUser     = null;
let localMatches    = [];
let localPreds      = {};
let activeDate      = null;
let scorePeriod     = 'Abr 2026';
let newsFilter      = '';
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
    const matchTime = new Date(Date.UTC(2026, month, day, hh + 3, mm, 0));
    return new Date() >= new Date(matchTime.getTime() - 60 * 60 * 1000);
  } catch { return false; }
}

// ── Ordenar fechas cronológicamente ──────────────────────────
function parseDateToSort(dateStr) {
  try {
    const parts = dateStr.split(' ');
    const day   = parseInt(parts[1]);
    const month = MONTH_MAP[parts[2]] ?? 5;
    return new Date(2026, month, day).getTime();
  } catch { return 0; }
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
  if (mH === null || mA === null || isNaN(mH) || isNaN(mA)) return -1;

  const pResult = pred.result || null;
  const pH = pred.home_score !== null && pred.home_score !== undefined ? Number(pred.home_score) : null;
  const pA = pred.away_score !== null && pred.away_score !== undefined ? Number(pred.away_score) : null;

  const realResult = goalsToResult(mH, mA);

  if (pH !== null && pA !== null && !isNaN(pH) && !isNaN(pA) && pH === mH && pA === mA) return 10;

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
  const legajo      = document.getElementById('r-legajo').value.trim();
  const dni         = document.getElementById('r-dni').value.trim();
  const errEl       = document.getElementById('auth-error');
  errEl.style.color = '';
  errEl.textContent = '';

  if (!displayName || !username || !password || !legajo || !dni) {
    errEl.textContent = 'Completá todos los campos.'; return;
  }

  try {
    const data = await api('POST', '/auth/register', { username, password, displayName, legajo, dni });
    if (data.token) {
      errEl.style.color = '#4caf50';
      errEl.textContent = '✓ Cuenta creada. Iniciando sesión...';
      setTimeout(() => {
        sessionStorage.setItem('qh_token', data.token);
        currentUser = data.user;
        bootApp();
      }, 1000);
    }
  } catch (e) {
    errEl.textContent = e.message || 'Error al registrarse.';
  }
}

function doLogout() {
  currentUser = null;
  sessionStorage.removeItem('qh_token');
  showAuthScreen();
  document.getElementById('l-user').value = '';
  document.getElementById('l-pass').value = '';
  document.getElementById('auth-error').textContent = '';
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
  }, 2500);
}

function launchConfetti() {
  const colors = ['#6CACE4','#ffffff','#FFB81C','#4a90d9','#85bde8'];
  for (let i = 0; i < 150; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.width  = (Math.random() * 8 + 5) + 'px';
    el.style.height = (Math.random() * 8 + 5) + 'px';
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    el.style.animationDuration = (Math.random() * 2 + 2) + 's';
    el.style.animationDelay = (Math.random() * 1.5) + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
}

function bootApp() {
  showIntro(() => {
    showApp();
    applyRole();
    setupNav();
    updateUserBadge();
    launchConfetti();
    if (currentUser.role === 'admin') navigateTo('dashboard');
    else navigateTo('prode');
  });
}

function applyRole() {
  const isAdmin = currentUser.role === 'admin';
  document.querySelectorAll('.ni[data-s]').forEach(el => {
    const s = el.dataset.s;
    if (s === 'prode' || s === 'news' || s === 'mundial') { el.style.display = ''; return; }
    el.style.display = isAdmin ? '' : 'none';
  });
  document.querySelectorAll('.sb-grp').forEach(g => { if (!isAdmin) g.style.display = 'none'; });
  document.getElementById('addbtn').style.display = 'none';
  const ap = document.getElementById('admin-prode-panel');
  if (ap) ap.style.display = isAdmin ? '' : 'none';

  // Badge de usuarios pendientes
  if (isAdmin) {
    api('GET', '/auth/users').then(users => {
      const pending = users.filter(u => u.status === 'pending').length;
      const pip = document.querySelector('.ni[data-s="users"] .pip');
      if (pip) pip.style.display = pending > 0 ? '' : 'none';
    }).catch(() => {});
  }
}



function updateUserBadge() {
  const u = currentUser;
  document.querySelector('.uavs').textContent      = ini(u.displayName || u.username);
  document.querySelector('.uavs').style.background = avc(u.id);
  document.querySelector('.uin .un').textContent   = u.displayName || u.username;
  document.querySelector('.uin .ur').textContent   = u.role === 'admin' ? '⚙ Administrador' : '⚽ Jugador';
}

const SECTION_TITLES = { dashboard:'Dashboard', r16:'16avos ⚽', score:'Score Balance', training:'Capacitaciones', news:'Noticias', mundial:'Mundial 2026 🏆', prode:'Prode ⚽', members:'Miembros', users:'Usuarios' };
const ADD_ACTIONS    = { news: () => openNewsModal(), members: () => openMemberModal() };

function navigateTo(sec) {
  document.querySelectorAll('.ni').forEach(n => n.classList.toggle('active', n.dataset.s === sec));
  document.querySelectorAll('.sec').forEach(x => x.classList.remove('active'));
  document.getElementById('s-' + sec)?.classList.add('active');
  document.getElementById('tbtit').textContent = SECTION_TITLES[sec] || sec;
  const addBtn = document.getElementById('addbtn');
  if (currentUser.role === 'admin' && ADD_ACTIONS[sec]) { addBtn.style.display = ''; addBtn.onclick = ADD_ACTIONS[sec]; }
  else { addBtn.style.display = 'none'; }
  ({ dashboard:renderDashboard, r16:renderR16, score:renderScore, training:renderTraining, news:renderNews, mundial:renderMundial, prode:renderProde, members:renderMembers, users:renderUsers })[sec]?.();
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
        ${hero.image_url ? `<a href="${hero.image_url}" target="_blank" style="margin-left:12px;color:var(--accent);font-size:.75rem;font-weight:600;">Leer más →</a>` : ''}
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
  setTimeout(loadPreviews, 100);
}

function setNewsFilter(c) {
  newsFilter = c === 'Todos' ? '' : c;
  renderNews();
}

function newsMediaHTML(url) {
  if (!url) return '';
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (yt) return `<div class="news-media"><iframe src="https://www.youtube.com/embed/${yt[1]}" frameborder="0" allowfullscreen></iframe></div>`;
  const vi = url.match(/vimeo\.com\/(\d+)/);
  if (vi) return `<div class="news-media"><iframe src="https://player.vimeo.com/video/${vi[1]}" frameborder="0" allowfullscreen></iframe></div>`;
  if (url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
    return `<div class="news-media"><img src="${url}" alt="" onerror="this.parentElement.style.display='none'"></div>`;
  }
  return `<div class="news-media" id="preview-${btoa(url).substring(0,10)}">
    <a href="${url}" target="_blank" class="nlp-url">🔗 Cargando preview...</a>
  </div>`;
}

async function loadPreviews() {
  document.querySelectorAll('.news-media[id^="preview-"]').forEach(async el => {
    const link = el.querySelector('a');
    const url = link?.href;
    if (!url) return;
    try {
      const preview = await api('GET', '/news/preview?url=' + encodeURIComponent(url));
      el.innerHTML = `<a href="${url}" target="_blank" class="news-link-preview">
        ${preview.image ? `<img src="${preview.image}" alt="" onerror="this.style.display='none'">` : ''}
        <div class="nlp-content">
          ${preview.siteName ? `<div class="nlp-site">${preview.siteName}</div>` : ''}
          ${preview.title ? `<div class="nlp-title">${preview.title}</div>` : ''}
          ${preview.description ? `<div class="nlp-desc">${preview.description}</div>` : ''}
          <div class="nlp-url">🔗 Leer artículo completo</div>
        </div>
      </a>`;
    } catch { }
  });
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
    localPreds = {};
    predsArr.forEach(p => { localPreds[p.match_id] = p; });
  } catch(e) {
    console.error('Error cargando prode:', e);
    return;
  }

  const adminPanel = document.getElementById('admin-prode-panel');
  if (adminPanel) {
    adminPanel.style.display = currentUser.role === 'admin' ? '' : 'none';
    if (currentUser.role === 'admin') renderAdminProdePanel();
  }

  const groupMatches = localMatches.filter(m => m.phase !== 'R16');
  const allDates = [...new Set(groupMatches.map(m => m.match_date))];
  allDates.sort((a, b) => parseDateToSort(a) - parseDateToSort(b));
  if (!activeDate || !allDates.includes(activeDate)) activeDate = allDates[0];

  document.getElementById('date-strip').innerHTML = allDates.map(d => {
    const dayM      = groupMatches.filter(m => m.match_date === d);
    const hasResult = dayM.some(m => m.home_score !== null);
    const parts     = d.split(' ');
    return `<button class="date-chip${d === activeDate ? ' active' : ''}${hasResult ? ' has-result' : ''}" onclick="setDate('${d}')">
      <span class="dc-day">${parts[0]}</span>
      <span class="dc-num">${parts[1]}</span>
      <span class="dc-mon">${parts[2]}</span>
      ${hasResult ? '<span class="dc-dot"></span>' : ''}
    </button>`;
  }).join('');

  const dayMatches = groupMatches.filter(m => m.match_date === activeDate);
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

  const myPts = calcMyPoints();
  document.getElementById('my-pts').textContent = myPts;

  const totalFilled  = Object.values(localPreds).filter(p => p.result || (p.home_score !== null && p.away_score !== null)).length;
  const totalMatches = localMatches.length;
  document.getElementById('prode-status').innerHTML = `
    <div class="status-bar">
      <span>⚽ ${totalFilled}/${totalMatches} partidos votados · <strong>${myPts} pts</strong></span>
      <span style="font-size:.75rem;color:var(--text3)">Se guarda automáticamente</span>
    </div>`;

  await renderStandings();
}

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

  const predResult = pred.result || goalsToResult(pH, pA);
  const realResult = goalsToResult(mH, mA);
  const matchPts   = calcMatchPoints(pred, m);

  let ptsLabel = '';
  if (matchPts === 10) ptsLabel = '🎯 +10 exacto';
  else if (matchPts === 5) ptsLabel = '✓ +5 ganador';
  else if (matchPts === 0) ptsLabel = '✗ 0 pts';

  function btnCls(val) {
    const sel = 'sel' + (val === '1' ? '1' : val === 'x' ? 'x' : '2');
    if (!predResult) return '';
    if (predResult !== val) return '';
    if (!played) return sel;
    return predResult === realResult ? 'ok' : 'fail';
  }

  const btn1Icon = `<svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 10V2M2 6l4-4 4 4"/></svg>`;
  const btnXIcon = `<span style="font-size:1rem;font-weight:700">X</span>`;
  const btn2Icon = `<svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 2v8M2 6l4 4 4-4"/></svg>`;

  const disabledAttr = locked ? 'disabled' : '';
  const lockIcon     = locked ? '<span style="font-size:.7rem;color:var(--text3)">🔒</span>' : '';
  const votedIcon    = (predResult || (pH !== null && pA !== null))
    ? '<span style="font-size:.7rem;color:#3ae8b0;font-weight:600">✓ Votado</span>'
    : '<span style="font-size:.7rem;color:rgba(255,255,255,.25)">Sin voto</span>';
  const resultBadge  = played
    ? `<span class="match-result-badge">${mH} - ${mA}</span>`
    : `<span class="match-vs">VS</span>`;

  return `
    <div class="match-card${played ? ' played' : ''}${locked ? ' locked' : ''}">
      <div class="match-meta">
        <span class="match-date">${m.time || ''} hs · ${m.venue || ''}</span>
        ${votedIcon}
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
            <button class="pb ${btnCls('1')}" onclick="setPred(${m.id},'1')" ${disabledAttr} title="Gana ${m.home}">${btn1Icon}</button>
            <button class="pb ${btnCls('x')}" onclick="setPred(${m.id},'x')" ${disabledAttr} title="Empate">${btnXIcon}</button>
            <button class="pb ${btnCls('2')}" onclick="setPred(${m.id},'2')" ${disabledAttr} title="Gana ${m.away}">${btn2Icon}</button>
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
  const groupMatches = activeDate ? localMatches.filter(m => m.match_date === activeDate && m.phase !== 'R16') : localMatches.filter(m => m.phase !== 'R16');
  panel.innerHTML = `
    <p style="font-size:.75rem;color:var(--text3);margin-bottom:10px">
      Cargá resultados del día <strong>${activeDate || 'seleccionado'}</strong>.
      <span style="color:var(--accent);font-weight:600">🎯 Exacto = 10 pts · ✓ Ganador/Empate = 5 pts</span>
    </p>
    ${groupMatches.map(m => `
      <div class="admin-match-row">
        <span class="admin-match-name"><span style="color:var(--amber);font-size:.68rem;font-weight:700">${m.group_name || ''}</span> · ${m.home_flag || ''} ${m.home} vs ${m.away_flag || ''} ${m.away}</span>
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
          ${m.home_score !== null
            ? `<button class="btn btn-o" style="font-size:.7rem;padding:4px 10px;color:var(--accent2)" onclick="clearMatchResult(${m.id})" title="Borrar resultado">🗑 Borrar</button>`
            : ''}
        </div>
      </div>`).join('')}`;
}

async function setMatchResult(matchId, side, value) {
  const m = localMatches.find(x => x.id === matchId);
  if (!m) return;
  const v = value === '' ? null : Number(value);
  if (side === 'home') m.home_score = v;
  else                 m.away_score = v;
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

async function clearMatchResult(matchId) {
  if (!confirm('¿Borrás el resultado de este partido?')) return;
  try {
    await api('DELETE', '/prode/matches/' + matchId + '/result');
    toast('Resultado borrado', 'e');
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

  const currentGoalResult = goalsToResult(pH, pA);
  let newHome = pH;
  let newAway = pA;
  if (currentGoalResult !== val) { newHome = null; newAway = null; }

  await savePrediction(matchId, val, newHome, newAway);
}

async function setPredGoals(matchId, side, value) {
  const match = localMatches.find(m => m.id === matchId);
  if (!match || isMatchLocked(match)) return;

  const existing = localPreds[matchId] || {};
  const newHome  = side === 'home' ? (value === '' ? null : Number(value)) : (existing.home_score !== null && existing.home_score !== undefined ? Number(existing.home_score) : null);
  const newAway  = side === 'away' ? (value === '' ? null : Number(value)) : (existing.away_score !== null && existing.away_score !== undefined ? Number(existing.away_score) : null);

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
                  <div>
                    <div style="display:flex; gap:20px;">
                    <button class="ib">🚫</button>
                    <button class="ib dr">🗑️</button>
                    </div>
                   </div>
                </div>`).join('')}
            </div>`}
      </div>

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
                <button class="btn btn-o" style="font-size:.75rem;padding:6px 12px;color:var(--accent2)" onclick="deleteUser(${u.id},'${u.display_name.replace(/'/g,"\\'")}')">🗑️</button>
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
    applyRole(); // refresca el badge de pendientes
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
  let users = [];
  try { users = await api('GET', '/auth/users'); }
  catch { users = []; }

  const active = users.filter(u => u.status === 'active');
  const banned = users.filter(u => u.status === 'banned');
  const search = (document.getElementById('msearch')?.value || '').toLowerCase();

  const filterList = list => !search
    ? list
    : list.filter(u => (u.display_name || '').toLowerCase().includes(search) || (u.username || '').toLowerCase().includes(search) || (u.legajo || '').includes(search));

  const activeFiltered = filterList(active);
  const bannedFiltered = filterList(banned);
  const total = activeFiltered.length + bannedFiltered.length;

  document.getElementById('mcnt').textContent = `${total} miembro${total !== 1 ? 's' : ''}`;

  document.getElementById('members-tb').innerHTML = [
    ...activeFiltered.map(u => `
    <tr>
      <td><div class="enc"><div class="av" style="width:30px;height:30px;font-size:.68rem;background:${u.color || avc(u.id)}">${ini(u.display_name || u.username)}</div><span class="enm">${u.display_name || u.username}</span></div></td>
      <td style="font-size:.8rem;color:var(--text3)">@${u.username}</td>
      <td style="font-size:.8rem;color:var(--text3)">${u.legajo || '—'}</td>
      <td><span style="font-size:.75rem;padding:2px 8px;border-radius:99px;background:rgba(58,232,208,.15);color:#3ae8d0">Activo</span></td>
      <td><div class="ab">
        <button class="ib" style="padding:4px 10px;font-size:.72rem;white-space:nowrap" onclick="setUserStatus(${u.id},'banned')">🚫</button>
        <button class="ib" style="padding:4px 10px;font-size:.72rem;white-space:nowrap" onclick="setUserRole(${u.id}, '${u.role}', '${(u.display_name||u.username).replace(/'/g,"\\'")}')">
  ${u.role === 'admin' ? '👤' : '⚙'}
</button>
        <button class="ib dr" onclick="deleteUser(${u.id},'${(u.display_name||u.username).replace(/'/g,"\\'")}')">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h8M5 3V2h2v1M4 3v7h4V3"/></svg>
        </button>
      </div></td>
    </tr>`),
    ...bannedFiltered.map(u => `
    <tr style="opacity:.6">
      <td><div class="enc"><div class="av" style="width:30px;height:30px;font-size:.68rem;background:#555">${ini(u.display_name || u.username)}</div><span class="enm" style="color:var(--text3)">${u.display_name || u.username}</span></div></td>
      <td style="font-size:.8rem;color:var(--text3)">@${u.username}</td>
      <td style="font-size:.8rem;color:var(--text3)">${u.legajo || '—'}</td>
      <td><span style="font-size:.75rem;padding:2px 8px;border-radius:99px;background:rgba(232,51,74,.15);color:#E8334A">Baneado</span></td>
      <td><div class="ab">
        <button class="ib" style="padding:4px 10px;font-size:.72rem;white-space:nowrap" onclick="setUserStatus(${u.id},'active')">↩ Reactivar</button>
        <button class="ib dr" onclick="deleteUser(${u.id},'${(u.display_name||u.username).replace(/'/g,"\\'")}')">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h8M5 3V2h2v1M4 3v7h4V3"/></svg>
        </button>
      </div></td>
    </tr>`)
  ].join('');
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


async function setUserRole(id, currentRole, name) {
  const newRole = currentRole === 'admin' ? 'player' : 'admin';
  const msg = newRole === 'admin'
    ? `¿Dar rol de administrador a ${name}?`
    : `¿Quitarle el rol de administrador a ${name}?`;
  if (!confirm(msg)) return;
  try {
    await api('PUT', '/auth/users/' + id + '/role', { role: newRole });
    toast(newRole === 'admin' ? `${name} ahora es admin ⚙` : `${name} volvió a ser jugador`, 's');
    renderMembers();
  } catch (e) { toast(e.message, 'e'); }
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

// ══════════════════════════════════════════════════════════════
//  16AVOS DE FINAL x|— Bracket + Votación
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
//  16AVOS DE FINAL — Bracket interactivo con votación integrada
// ══════════════════════════════════════════════════════════════
let r16Matches = [];
let r16Preds   = {};

async function renderR16() {
  if (!currentUser) return;
  try {
    r16Matches     = await api('GET', '/prode/matches/r16');
    const predsArr = await api('GET', '/prode/predictions');
    r16Preds = {};
    predsArr.forEach(p => {
      if (r16Matches.find(m => m.id === p.match_id)) r16Preds[p.match_id] = p;
    });
  } catch(e) { console.error('Error cargando R16:', e); return; }

  let myPts = 0;
  r16Matches.forEach(m => {
    const pred = r16Preds[m.id];
    if (!pred) return;
    const p = calcR16Points(pred, m);
    if (p > 0) myPts += p;
  });
  document.getElementById('r16-my-pts').textContent = myPts;

  renderR16Bracket();
  await renderR16Standings();
}

// ── Puntos R16 ────────────────────────────────────────────────
function calcR16Points(pred, match) {
  const mH = match.home_score !== null && match.home_score !== undefined ? Number(match.home_score) : null;
  const mA = match.away_score !== null && match.away_score !== undefined ? Number(match.away_score) : null;
  if (mH === null || mA === null) return -1;
  const realResult = goalsToResult(mH, mA);
  const predResult = pred.result || null;
  if (!predResult || !realResult) return 0;
  return predResult === realResult ? 5 : 0;
}

// ── Standings R16 ─────────────────────────────────────────────
async function renderR16Standings() {
  try {
    const standings = await api('GET', '/prode/standings');
    const sorted = [...standings].sort((a,b) => b.pts - a.pts);
    document.getElementById('r16-standings').innerHTML = sorted.length
      ? sorted.map((s,i) => {
          const pkc  = i===0?'rk1':i===1?'rk2':i===2?'rk3':'rkn';
          const isMe = s.username === currentUser.username;
          return `<div class="sr">
            <div class="srp ${pkc}">${i+1}</div>
            <div class="srname">
              ${isMe ? `<strong>${s.displayName}</strong> <span class="me-tag">← vos</span>` : s.displayName}
            </div>
            <div class="srpts">${s.pts} pts</div>
          </div>`;
        }).join('')
      : '<div class="no-standings">Sin pronósticos todavía.</div>';
  } catch { }
}

// ══════════════════════════════════════════════════════════════
//  BRACKET SVG
// ══════════════════════════════════════════════════════════════
function renderR16Bracket() {
  const container = document.getElementById('r16-bracket');
  if (!container) return;

  const AMBER     = '#FFB81C';
  const LINE      = 'rgba(108,172,228,.2)';
  const LINE2     = 'rgba(108,172,228,.14)';
  const LINE3     = 'rgba(108,172,228,.09)';
  const FONT      = "'Inter', system-ui, sans-serif";
  const CARD_W    = 195;
  const CARD_H    = 56;
  const SLOT_W    = 138;
  const SLOT_H    = 34;
  const FINAL_W   = 148;
  const FINAL_H   = 52;

  // ── helpers ─────────────────────────────────────────────────
  function svgEl(tag, attrs, parent) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k,v]) => e.setAttribute(k, v));
    parent?.appendChild(e);
    return e;
  }
  function hline(svg, x1, y, x2, color, w) {
    svgEl('line', { x1, y1: y, x2, y2: y, stroke: color||LINE, 'stroke-width': w||'1.2' }, svg);
  }
  function vline(svg, x, y1, y2, color, w) {
    svgEl('line', { x1: x, y1, x2: x, y2, stroke: color||LINE, 'stroke-width': w||'1.2' }, svg);
  }
  function label(svg, x, y, text, opts={}) {
    const t = svgEl('text', {
      x, y,
      'font-size':   opts.size   || '10',
      'font-family': FONT,
      'font-weight': opts.bold   ? '700' : '400',
      fill:          opts.color  || 'rgba(255,255,255,.75)',
      'text-anchor': opts.anchor || 'start',
    }, svg);
    t.textContent = text;
    return t;
  }
  function truncate(s, max) {
    return (s||'?').length > max ? (s||'?').slice(0, max-1)+'…' : (s||'?');
  }
  function winner(m) {
    if (!m) return null;
    const h = m.home_score, a = m.away_score;
    if (h===null||h===undefined||a===null||a===undefined) return null;
    if (Number(h) > Number(a)) return { flag: m.home_flag||'🏳️', name: m.home||'?', side:'home' };
    if (Number(a) > Number(h)) return { flag: m.away_flag||'🏳️', name: m.away||'?', side:'away' };
    return null;
  }

  // ── Tarjeta de partido (clicable para votar) ─────────────────
  // Retorna el midY y el borde de conexión (rightX para izq, leftX para der)
  function drawCard(svg, m, x, y, connectSide) {
    if (!m) {
      // partido vacío / placeholder
      svgEl('rect', { x, y, width: CARD_W, height: CARD_H, rx: '7',
        fill: 'rgba(255,255,255,.02)',
        stroke: 'rgba(255,255,255,.06)', 'stroke-width': '1',
        'stroke-dasharray': '4 3' }, svg);
      label(svg, x + CARD_W/2, y + CARD_H/2 + 4, '?', { anchor:'middle', color:'rgba(255,255,255,.18)' });
      return { midY: y + CARD_H/2, connX: connectSide==='right' ? x+CARD_W : x };
    }

    const pred    = r16Preds[m.id] || {};
    const locked = false; //isMatchLocked(m); si quiero activar bloqueo por fecha/hora, lo vuelvo true/false según corresponda
    const mH      = m.home_score !== null && m.home_score !== undefined ? Number(m.home_score) : null;
    const mA      = m.away_score !== null && m.away_score !== undefined ? Number(m.away_score) : null;
    const played  = mH !== null && mA !== null;
    const winSide = played ? (mH>mA?'home':mA>mH?'away':null) : null;
    const predRes = pred.result || null;
    const pts     = calcR16Points(pred, m);

    const hasPred = !!predRes;
    const borderColor = played
      ? 'rgba(255,184,28,.35)'
      : hasPred ? 'rgba(58,232,176,.4)' : 'rgba(255,255,255,.1)';

    // sombra
    svgEl('rect', { x: x+1, y: y+2, width: CARD_W, height: CARD_H, rx:'7', fill:'rgba(0,0,0,.4)' }, svg);
    // fondo
    svgEl('rect', { x, y, width: CARD_W, height: CARD_H, rx:'7',
      fill: '#0d1b38', stroke: borderColor, 'stroke-width':'1' }, svg);
    // divisor
    svgEl('line', { x1:x+1, y1:y+CARD_H/2, x2:x+CARD_W-1, y2:y+CARD_H/2,
      stroke:'rgba(255,255,255,.05)', 'stroke-width':'1' }, svg);

    // barra lateral ganador
    if (winSide==='home')
      svgEl('rect', { x, y, width:3, height:CARD_H/2, rx:'2', fill:'rgba(255,184,28,.75)' }, svg);
    if (winSide==='away')
      svgEl('rect', { x, y:y+CARD_H/2, width:3, height:CARD_H/2, rx:'2', fill:'rgba(255,184,28,.75)' }, svg);

    // predicción seleccionada (barra verde)
    if (!played && predRes) {
      const barY = predRes==='1' ? y : y+CARD_H/2;
      svgEl('rect', { x, y:barY, width:3, height:CARD_H/2, rx:'2', fill:'rgba(58,232,176,.8)' }, svg);
    }

    const rows = [
      { flag: m.home_flag||'🏳️', name: m.home||'?', score: mH, isW: winSide==='home', isL: winSide==='away', oy: y+CARD_H/4, side:'1' },
      { flag: m.away_flag||'🏳️', name: m.away||'?', score: mA, isW: winSide==='away', isL: winSide==='home', oy: y+3*CARD_H/4, side:'2' },
    ];

    rows.forEach(({ flag, name, score, isW, isL, oy, side }) => {
      // flag
      const ft = svgEl('text', { x:x+10, y:oy+4, 'font-size':'12', 'font-family':FONT }, svg);
      ft.textContent = flag;

      // name
      const nameColor = isW ? AMBER : isL ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.82)';
      const nt = svgEl('text', { x:x+29, y:oy+5,
        'font-size':'10', 'font-family':FONT,
        'font-weight': isW ? '700' : '400', fill: nameColor }, svg);
      nt.textContent = truncate(name, 13);

      // score badge
      if (score !== null && score !== undefined) {
        svgEl('rect', { x:x+CARD_W-25, y:oy-9, width:21, height:17, rx:'4',
          fill:   isW ? 'rgba(255,184,28,.18)' : 'rgba(255,255,255,.05)',
          stroke: isW ? 'rgba(255,184,28,.4)'  : 'rgba(255,255,255,.08)',
          'stroke-width':'1' }, svg);
        const st = svgEl('text', { x:x+CARD_W-14, y:oy+5,
          'font-size':'10', 'font-family':FONT, 'font-weight':'800',
          fill: isW ? AMBER : 'rgba(255,255,255,.35)', 'text-anchor':'middle' }, svg);
        st.textContent = score;
      }

      // zona clickeable para votar (si no está jugado y no bloqueado)
      if (!played && !locked) {
        const isPredicted = predRes === side;
        // highlight si está seleccionado
        if (isPredicted) {
          svgEl('rect', { x:x+1, y: side==='1'?y+1:y+CARD_H/2,
            width:CARD_W-2, height:CARD_H/2-1,
            rx: side==='1'?'6':'0',
            fill:'rgba(58,232,176,.07)' }, svg);
        }
        // overlay clickeable
        const clickZone = svgEl('rect', {
          x, y: side==='1' ? y : y+CARD_H/2,
          width:CARD_W, height:CARD_H/2,
          fill:'transparent', cursor:'pointer',
          rx: side==='1'?'7':'0',
        }, svg);
        clickZone.style.cursor = 'pointer';
        clickZone.addEventListener('click', () => setR16Pred(m.id, side));
      }
    });

    // admin score inputs (superpuestos, solo admin)
    if (currentUser.role === 'admin') {
      // Usamos foreignObject para los inputs
      const fo = svgEl('foreignObject', { x:x+CARD_W-25, y:y+4, width:22, height:22 }, svg);
      const inp1 = document.createElement('input');
      inp1.type='number'; inp1.min=0; inp1.max=20;
      inp1.value = mH !== null ? mH : '';
      inp1.placeholder='—';
      inp1.style.cssText='width:22px;background:transparent;border:none;color:#FFB81C;font-size:10px;font-weight:800;text-align:center;padding:0;outline:none';
      inp1.addEventListener('change', e => setR16Result(m.id, 'home', e.target.value));
      fo.appendChild(inp1);

      const fo2 = svgEl('foreignObject', { x:x+CARD_W-25, y:y+CARD_H/2+4, width:22, height:22 }, svg);
      const inp2 = document.createElement('input');
      inp2.type='number'; inp2.min=0; inp2.max=20;
      inp2.value = mA !== null ? mA : '';
      inp2.placeholder='—';
      inp2.style.cssText='width:22px;background:transparent;border:none;color:rgba(255,255,255,.4);font-size:10px;font-weight:800;text-align:center;padding:0;outline:none';
      inp2.addEventListener('change', e => setR16Result(m.id, 'away', e.target.value));
      fo2.appendChild(inp2);
    }

    // pts label bajo la card
    if (played && pts >= 0) {
      const ptColor = pts===5 ? '#3ae8b0' : 'rgba(255,80,80,.7)';
      const ptTxt = pts===5 ? '✓ +5' : '✗ 0';
      const ptEl = svgEl('text', {
        x: x + CARD_W/2, y: y + CARD_H + 12,
        'font-size':'8', 'text-anchor':'middle',
        fill: ptColor, 'font-family':FONT, 'font-weight':'700'
      }, svg);
      ptEl.textContent = ptTxt;
    }

    // fecha bajo la card
    if (m.match_date) {
      const dtEl = svgEl('text', {
        x: x + CARD_W/2, y: y + CARD_H + (played ? 22 : 12),
        'font-size':'7', 'text-anchor':'middle',
        fill:'rgba(255,255,255,.17)', 'font-family':FONT
      }, svg);
      dtEl.textContent = (m.match_date||'') + (m.time ? ' · '+m.time+'hs' : '');
    }

    return {
      midY:  y + CARD_H/2,
      connX: connectSide==='right' ? x+CARD_W : x
    };
  }

  // ── Slot de ronda siguiente ───────────────────────────────────
  function drawSlot(svg, team, x, y, connectSide) {
    if (team) {
      svgEl('rect', { x:x+1, y:y+2, width:SLOT_W, height:SLOT_H, rx:'6', fill:'rgba(0,0,0,.35)' }, svg);
      svgEl('rect', { x, y, width:SLOT_W, height:SLOT_H, rx:'6',
        fill:'#0d1b38', stroke:'rgba(255,184,28,.45)', 'stroke-width':'1' }, svg);
      // barra dorada
      svgEl('rect', { x, y, width:3, height:SLOT_H, rx:'2', fill:'rgba(255,184,28,.7)' }, svg);
      const ft = svgEl('text', { x:x+10, y:y+SLOT_H/2+4, 'font-size':'11', 'font-family':FONT }, svg);
      ft.textContent = team.flag||'🏳️';
      const nt = svgEl('text', { x:x+28, y:y+SLOT_H/2+5,
        'font-size':'10', 'font-family':FONT, 'font-weight':'700', fill:AMBER }, svg);
      nt.textContent = truncate(team.name, 11);
    } else {
      svgEl('rect', { x, y, width:SLOT_W, height:SLOT_H, rx:'6',
        fill:'rgba(255,255,255,.02)',
        stroke:'rgba(255,255,255,.07)', 'stroke-width':'1',
        'stroke-dasharray':'4 3' }, svg);
      const qt = svgEl('text', { x:x+SLOT_W/2, y:y+SLOT_H/2+4,
        'font-size':'9', 'text-anchor':'middle',
        fill:'rgba(255,255,255,.18)', 'font-family':FONT }, svg);
      qt.textContent = '?';
    }
    return {
      midY:  y + SLOT_H/2,
      connX: connectSide==='right' ? x+SLOT_W : x
    };
  }

  // ── Conector L-shaped ────────────────────────────────────────
  // Conecta dos puntos con una línea horizontal + vertical + horizontal
  function lConn(svg, x1, y1, x2, y2, color, w) {
    const midX = (x1 + x2) / 2;
    svgEl('polyline', {
      points: `${x1},${y1} ${midX},${y1} ${midX},${y2} ${x2},${y2}`,
      fill:'none', stroke:color||LINE, 'stroke-width':w||'1.2'
    }, svg);
  }
  // Conector desde dos midY hasta un punto central → slot
  function bracketConn(svg, fromX, y0, y1, toX, jY, color) {
    // líneas horizontales de cada tarjeta al junction
    hline(svg, fromX, y0, fromX + (toX-fromX)/2, color);
    hline(svg, fromX, y1, fromX + (toX-fromX)/2, color);
    // línea vertical en el medio
    vline(svg, fromX + (toX-fromX)/2, y0, y1, color);
    // línea horizontal al slot
    hline(svg, fromX + (toX-fromX)/2, jY, toX, color);
  }
  function bracketConnRight(svg, fromX, y0, y1, toX, jY, color) {
    hline(svg, toX + (fromX-toX)/2, y0, fromX, color);
    hline(svg, toX + (fromX-toX)/2, y1, fromX, color);
    vline(svg, toX + (fromX-toX)/2, y0, y1, color);
    hline(svg, toX, jY, toX + (fromX-toX)/2, color);
  }

  // ── Layout ───────────────────────────────────────────────────
  // 8 pares de partidos izquierda (índices 0-7) + 8 derecha (8-15)
  // Si hay menos de 16 partidos rellenamos con null
  const ms = Array.from({ length: 16 }, (_, i) => r16Matches[i] || null);

  const ROW_H    = 100;  // distancia vertical entre centros de pares
  const PAIR_GAP = 24;   // espacio entre el par 1-2 y 3-4
  const TOP      = 32;
  const CONN_GAP = 18;   // espacio horizontal entre tarjeta y junction

  // y-center del partido i (0-7 izquierda)
  function cardY(i) {
    const pair  = Math.floor(i / 2); // 0,1,2,3
    const inner = i % 2;             // 0 ó 1
    return TOP + pair * (ROW_H * 2 + PAIR_GAP) + inner * ROW_H;
  }

  // Columnas izquierda
  const L16_X  = 16;
  const CONN1  = L16_X + CARD_W + CONN_GAP;          // junction R1 → QF
  const LQF_X  = CONN1 + CONN_GAP;                    // slot cuartos izq
  const CONN2  = LQF_X + SLOT_W + CONN_GAP;          // junction QF → SF
  const LSF_X  = CONN2 + CONN_GAP;                    // slot semis izq
  const CONN3  = LSF_X + SLOT_W + CONN_GAP;          // junction SF → FIN
  const LFIN_X = CONN3 + CONN_GAP;                    // final

  // SVG total width (espejo)
  const SVG_W  = LFIN_X * 2 + FINAL_W;
  // Columnas derecha (espejo)
  const R16_X  = SVG_W - L16_X  - CARD_W;
  const RQF_X  = SVG_W - LQF_X  - SLOT_W;
  const RSF_X  = SVG_W - LSF_X  - SLOT_W;

  const SVG_H  = TOP + 4 * (ROW_H * 2 + PAIR_GAP) + 60;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', SVG_W);
  svg.setAttribute('height', SVG_H);
  svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
  svg.style.display  = 'block';
  svg.style.minWidth = SVG_W + 'px';

  // Fondo
  svgEl('rect', { x:0, y:0, width:SVG_W, height:SVG_H, fill:'#070d1e', rx:'10' }, svg);

  // Etiquetas de ronda
  const rounds = [
    { x: L16_X + CARD_W/2,     label:'16AVOS' },
    { x: LQF_X + SLOT_W/2,     label:'CUARTOS' },
    { x: LSF_X + SLOT_W/2,     label:'SEMIS' },
    { x: LFIN_X + FINAL_W/2,   label:'FINAL' },
  ];
  rounds.forEach(r => {
    [r.x, SVG_W - r.x].forEach(rx => {
      const t = svgEl('text', { x:rx, y:18,
        'font-size':'7', 'text-anchor':'middle',
        fill:'rgba(255,255,255,.22)', 'font-family':FONT, 'letter-spacing':'1.8' }, svg);
      t.textContent = r.label;
    });
  });

  // ── Dibujar pares + conectores ────────────────────────────────
  const lQF = [], rQF = [];

  for (let pair = 0; pair < 4; pair++) {
    const i0 = pair * 2;
    const i1 = pair * 2 + 1;
    const y0 = cardY(i0);
    const y1 = cardY(i1);
    const mid01 = (y0 + CARD_H/2 + y1 + CARD_H/2) / 2;

    // --- IZQUIERDA ---
    const lc0 = drawCard(svg, ms[i0],   L16_X, y0, 'right');
    const lc1 = drawCard(svg, ms[i1],   L16_X, y1, 'right');

    // Llave L
    const jX_L = L16_X + CARD_W + CONN_GAP;
    hline(svg, lc0.connX, lc0.midY, jX_L, LINE);
    hline(svg, lc1.connX, lc1.midY, jX_L, LINE);
    vline(svg, jX_L, lc0.midY, lc1.midY, LINE);
    hline(svg, jX_L, mid01, LQF_X, LINE);

    // Slot cuartos izquierda
    const w0 = winner(ms[i0]), w1 = winner(ms[i1]);
    // Si ambos del par tienen ganador podríamos resolverlo, por ahora mostramos quien ganó su partido
    const qfTeam = w0 || w1 || null; // cuando ambos existan, habrá un partido de QF
    // Para la primera ronda solo mostramos el ganador del par si hay exactamente uno
    const showQF = w0 && !w1 ? w0 : !w0 && w1 ? w1 : null;
    const lqf = drawSlot(svg, showQF, LQF_X, mid01 - SLOT_H/2, 'right');
    lQF.push(lqf);

    // --- DERECHA ---
    const ri0 = 8 + i0, ri1 = 8 + i1;
    const rc0 = drawCard(svg, ms[ri0], R16_X, y0, 'left');
    const rc1 = drawCard(svg, ms[ri1], R16_X, y1, 'left');

    const jX_R = SVG_W - jX_L;
    hline(svg, jX_R, lc0.midY, rc0.connX, LINE);
    hline(svg, jX_R, lc1.midY, rc1.connX, LINE);
    vline(svg, jX_R, lc0.midY, lc1.midY, LINE);
    hline(svg, RQF_X + SLOT_W, mid01, jX_R, LINE);

    const rw0 = winner(ms[ri0]), rw1 = winner(ms[ri1]);
    const showRQF = rw0 && !rw1 ? rw0 : !rw0 && rw1 ? rw1 : null;
    const rqf = drawSlot(svg, showRQF, RQF_X, mid01 - SLOT_H/2, 'left');
    rQF.push(rqf);
  }

  // ── Cuartos → Semis ───────────────────────────────────────────
  const lSF = [], rSF = [];
  for (let s = 0; s < 2; s++) {
    const q0 = lQF[s*2], q1 = lQF[s*2+1];
    const sfMid = (q0.midY + q1.midY) / 2;
    const jX2 = LQF_X + SLOT_W + CONN_GAP;
    hline(svg, q0.connX, q0.midY, jX2, LINE2);
    hline(svg, q1.connX, q1.midY, jX2, LINE2);
    vline(svg, jX2, q0.midY, q1.midY, LINE2);
    hline(svg, jX2, sfMid, LSF_X, LINE2);
    const lsf = drawSlot(svg, null, LSF_X, sfMid - SLOT_H/2, 'right');
    lSF.push(lsf);

    const rq0 = rQF[s*2], rq1 = rQF[s*2+1];
    const rsfMid = (rq0.midY + rq1.midY) / 2;
    const jX2R = RQF_X - CONN_GAP;
    hline(svg, jX2R, rq0.midY, rq0.connX, LINE2);
    hline(svg, jX2R, rq1.midY, rq1.connX, LINE2);
    vline(svg, jX2R, rq0.midY, rq1.midY, LINE2);
    hline(svg, RSF_X + SLOT_W, rsfMid, jX2R, LINE2);
    const rsf = drawSlot(svg, null, RSF_X, rsfMid - SLOT_H/2, 'left');
    rSF.push(rsf);
  }

  // ── Semis → Final ─────────────────────────────────────────────
  const finMid = (lSF[0].midY + lSF[1].midY) / 2;
  const jX3L = LSF_X + SLOT_W + CONN_GAP;
  hline(svg, lSF[0].connX, lSF[0].midY, jX3L, LINE3);
  hline(svg, lSF[1].connX, lSF[1].midY, jX3L, LINE3);
  vline(svg, jX3L, lSF[0].midY, lSF[1].midY, LINE3);
  hline(svg, jX3L, finMid, LFIN_X, LINE3);

  const jX3R = RSF_X - CONN_GAP;
  hline(svg, jX3R, rSF[0].midY, rSF[0].connX, LINE3);
  hline(svg, jX3R, rSF[1].midY, rSF[1].connX, LINE3);
  vline(svg, jX3R, rSF[0].midY, rSF[1].midY, LINE3);
  hline(svg, LFIN_X + FINAL_W, finMid, jX3R, LINE3);

  // ── Final (centro) ────────────────────────────────────────────
  const finY = finMid - FINAL_H/2;
  svgEl('rect', { x:LFIN_X+1, y:finY+2, width:FINAL_W, height:FINAL_H, rx:'9', fill:'rgba(0,0,0,.4)' }, svg);
  svgEl('rect', { x:LFIN_X, y:finY, width:FINAL_W, height:FINAL_H, rx:'9',
    fill:'#0a1226',
    stroke:'rgba(255,184,28,.3)', 'stroke-width':'1.5',
    'stroke-dasharray':'6 3' }, svg);
  const ft = svgEl('text', { x:LFIN_X+FINAL_W/2, y:finY+18,
    'font-size':'8', 'text-anchor':'middle',
    fill:'rgba(255,255,255,.2)', 'font-family':FONT, 'letter-spacing':'2' }, svg);
  ft.textContent = 'FINAL';
  const fs = svgEl('text', { x:LFIN_X+FINAL_W/2, y:finY+36,
    'font-size':'11', 'text-anchor':'middle',
    fill:'rgba(255,255,255,.15)', 'font-family':FONT }, svg);
  fs.textContent = '? vs ?';

  // Copa
  const tSz = 140;
  svgEl('image', {
    href:'copa.png',
    x:LFIN_X + FINAL_W/2 - tSz/2,
    y:finY + FINAL_H + 10,
    width:tSz, height:tSz
  }, svg);

  container.innerHTML = '';
  container.appendChild(svg);
}

// ── Predicción R16 ────────────────────────────────────────────
async function setR16Pred(matchId, val) {
  const match = r16Matches.find(m => m.id === matchId);
  if (!match || isMatchLocked(match)) return;
  try {
    const saved = await api('POST', '/prode/predictions', {
      match_id: matchId, result: val, home_score: null, away_score: null
    });
    r16Preds[matchId] = saved;
    renderR16Bracket();
  } catch(e) { toast(e.message, 'e'); }
}

// ── Resultado admin R16 ───────────────────────────────────────
async function setR16Result(matchId, side, value) {
  const m = r16Matches.find(x => x.id === matchId);
  if (!m) return;
  const v = value === '' ? null : Number(value);
  if (side === 'home') m.home_score = v;
  else                 m.away_score = v;
  if (m.home_score === null || m.away_score === null) return;
  try {
    await api('PUT', '/prode/matches/' + matchId + '/result', {
      home_score: m.home_score, away_score: m.away_score
    });
    toast('Resultado guardado', 's');
    renderR16();
  } catch(e) { toast(e.message, 'e'); }
}

// ── Mundial 2026 — redirige a r16 ─────────────────────────────
function renderMundial() {
  navigateTo('r16');
}