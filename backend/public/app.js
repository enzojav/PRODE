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
    const matchTime = new Date(2026, month, day, hh, mm, 0);
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

  if (pH !== null && pA !== null && !isNaN(pH) && !isNaN(pA) && pH === mH && pA === mA) return 13;

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

  if (!intro) {
    callback();
    return;
  }

  intro.style.display = 'flex';

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
    document.getElementById('login-audio')?.play().catch(() => {});
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
    if (s === 'prode' || s === 'news' || s === 'mundial' || s === 'r16') { el.style.display = ''; return; }
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

const groupMatches = localMatches.filter(m => m.phase !== 'R16' && m.phase !== 'QF' && m.phase !== 'SF' && m.phase !== 'F');  const allDates = [...new Set(groupMatches.map(m => m.match_date))];
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
  twemoji.parse(document.getElementById('matches-day'));
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
          const pkc  = i===0?'rk1':i===1?'rk2':i===2?'rk3':i<10?'rk4':'rkn';
          const isMe = s.username === currentUser.username;
          return `<div class="sr">
            <div class="srp ${pkc}">${i+1}</div>
            <div class="srname">
              ${isMe ? `<strong>${s.displayName}</strong> <span class="me-tag">← vos</span>` : s.displayName}
              <div class="srdet">${s.exact || s.ok || 0}/${s.total || s.tot || 0} aciertos</div>
            </div>
                        <div class="srpts" style="color:${i===0||i===1||i===2?'var(--amber)':i<10?'#ffffff':'rgb(255, 255, 255)'}">${s.pts} pts</div
          </div>`;
        }).join('')
      : '<div class="no-standings">Tus aciertos ⚽</div>';
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
  const groupMatches = activeDate ? localMatches.filter(m => m.match_date === activeDate && m.phase !== 'R16' && m.phase !== 'QF' && m.phase !== 'SF' && m.phase !== 'F') : localMatches.filter(m => m.phase !== 'R16' && m.phase !== 'QF' && m.phase !== 'SF' && m.phase !== 'F');
  panel.innerHTML = `
    <p style="font-size:.75rem;color:var(--text3);margin-bottom:10px">
      Cargá resultados del día <strong>${activeDate || 'seleccionado'}</strong>.
      <span style="color:var(--accent);font-weight:600">🎯 Exacto = 13 pts · ✓ Ganador/Empate = 5 pts</span>
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
  if (!match) return;

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
// ══════════════════════════════════════════════════════════════
//  16AVOS DE FINAL — Bracket interactivo con votación integrada
// ══════════════════════════════════════════════════════════════
let r16Matches = [];
let r16Preds   = {};
let elimMatches = [];

async function renderR16() {
  if (!currentUser) return;
  try {
    r16Matches     = await api('GET', '/prode/matches/r16');
    elimMatches    = await api('GET', '/prode/matches/elim');  // ← AGREGAR
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
  const standings = await api('GET', '/prode/standings');
  const me = standings.find(s => s.username === currentUser.username);
  document.getElementById('r16-my-pts').textContent = me ? me.pts : myPts;

  renderR16Bracket();
  await renderR16Standings();
}

function calcR16Points(pred, match) {
  const mH = match.home_score !== null && match.home_score !== undefined ? Number(match.home_score) : null;
  const mA = match.away_score !== null && match.away_score !== undefined ? Number(match.away_score) : null;
  if (mH === null || mA === null) return -1;
  const realResult = goalsToResult(mH, mA);
  const predResult = pred.result || null;
  if (!predResult || !realResult) return 0;
  return predResult === realResult ? 10 : 0;
}

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
//  BRACKET SVG — rediseño completo
//
//  Estructura del Mundial 2026 (48 equipos, 16 grupos A–L):
//  16 partidos R16 con IDs 200–215, organizados en 8 llaves:
//
//  Llave izquierda (IDs por posición en bracket):
//    [0] P200  vs  [1] P201  → QF-L1
//    [2] P202  vs  [3] P203  → QF-L2
//    QF-L1 vs QF-L2          → SF-L
//
//  Llave derecha (espejo):
//    [8] P208  vs  [9] P209  → QF-R1
//   [10] P210  vs [11] P211  → QF-R2
//    QF-R1 vs QF-R2          → SF-R
//
//  Llave inferior izquierda:
//    [4] P204  vs  [5] P205  → QF-L3
//    [6] P206  vs  [7] P207  → QF-L4
//    QF-L3 vs QF-L4          → SF-L2
//
//  Llave inferior derecha:
//   [12] P212  vs [13] P213  → QF-R3
//   [14] P214  vs [15] P215  → QF-R4
//    QF-R3 vs QF-R4          → SF-R2
//
//  SF-L vs SF-R  → FINAL (lado izq)
//  SF-L2 vs SF-R2 → FINfAL (lado der)  — luego ambas semis → Gran Final
//
//  SIMPLIFICADO para esta implementación:
//  Mostramos los 16 partidos en 8 llaves de 2, con slots de avance.
//  Los ganadores de cada llave avanzan al slot siguiente.
// ══════════════════════════════════════════════════════════════

function renderR16Bracket() {
  const container = document.getElementById('r16-bracket');
  if (!container) return;

  // ── Constantes visuales ───────────────────────────────────────
  const AMBER   = '#FFB81C';
  const GREEN   = '#3ae8b0';
  const RED     = '#ff5050';
  const LINE1   = 'rgba(108,172,228,.25)';
  const LINE2   = 'rgba(108,172,228,.15)';
  const LINE3   = 'rgba(108,172,228,.08)';
  const FONT    = "'Inter', system-ui, sans-serif";
  const CW      = 190;  // card width
  const CH      = 58;   // card height
  const SW      = 130;  // slot width
  const SH      = 32;   // slot height
  const FW      = 150;  // final width
  const FH      = 56;   // final height
  const GAP_V   = 18;   // gap between match cards in a pair
  const GAP_P   = 48;   // gap between pairs (vertical)
  const CONN    = 20;   // connector horizontal extension

  // ── Orden de los 16 partidos en el bracket ────────────────────
  // El Mundial 2026 tiene 8 llaves de 2 partidos cada una.
  // Orden real del fixture (ids 200-215):
  // Llave 1: P200, P201 → QF slot A
  // Llave 2: P202, P203 → QF slot B  — QF-A vs QF-B → SF slot 1
  // Llave 3: P204, P205 → QF slot C
  // Llave 4: P206, P207 → QF slot D  — QF-C vs QF-D → SF slot 2
  //   SF1 vs SF2 → GRAN FINAL (izquierda)
  //
  // Llave 5: P208, P209 → QF slot E
  // Llave 6: P210, P211 → QF slot F  — QF-E vs QF-F → SF slot 3
  // Llave 7: P212, P213 → QF slot G
  // Llave 8: P214, P215 → QF slot H  — QF-G vs QF-H → SF slot 4
  //   SF3 vs SF4 → GRAN FINAL (derecha)

  // Los partidos ordenados por su bracket position
  // r16Matches viene ordenado por id (200..215) del backend
  const byId = {};
  r16Matches.forEach(m => { byId[m.id] = m; });

  const BRACKET = [
  // LADO IZQUIERDO (4 llaves)
  { pair: [byId[200], byId[201]], side: 'left',  qfIdx: 0 },
  { pair: [byId[202], byId[203]], side: 'left',  qfIdx: 1 },
  { pair: [byId[204], byId[205]], side: 'left',  qfIdx: 2 },
  { pair: [byId[206], byId[207]], side: 'left',  qfIdx: 3 },
  // LADO DERECHO (4 llaves, espejo)
  { pair: [byId[208], byId[209]], side: 'right', qfIdx: 0 },
  { pair: [byId[210], byId[211]], side: 'right', qfIdx: 1 },
  { pair: [byId[212], byId[213]], side: 'right', qfIdx: 2 },
  { pair: [byId[214], byId[215]], side: 'right', qfIdx: 3 },
];

  // ── Helpers SVG ───────────────────────────────────────────────
  function el(tag, attrs, parent) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k,v]) => e.setAttribute(k, v));
    parent?.appendChild(e);
    return e;
  }
  function txt(svg, x, y, text, opts={}) {
    const t = el('text', {
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
  function trunc(s, max) {
    const str = (s || '?');
    return str.length > max ? str.slice(0, max-1) + '…' : str;
  }

  
  function matchWinner(m) {
    if (!m) return null;
    const h = m.home_score, a = m.away_score;
    if (h === null || h === undefined || a === null || a === undefined) return null;
    const hN = Number(h), aN = Number(a);
    if (hN > aN) return { flag: m.home_flag || '🏳️', name: m.home || '?', side: 'home' };
    if (aN > hN) return { flag: m.away_flag || '🏳️', name: m.away || '?', side: 'away' };
    return null; // empate no válido en eliminatoria (penales decidirían, pero no tenemos esa info)
  }
  function hline(svg, x1, y, x2, color, w) {
    el('line', { x1, y1: y, x2, y2: y, stroke: color || LINE1, 'stroke-width': w || '1' }, svg);
  }
  function vline(svg, x, y1, y2, color, w) {
    el('line', { x1: x, y1, x2: x, y2, stroke: color || LINE1, 'stroke-width': w || '1' }, svg);
  }

  // ── Tarjeta de partido ────────────────────────────────────────
  // Retorna { midY, rightX, leftX }
  function drawMatchCard(svg, m, x, y) {
    if (!m) {
      el('rect', { x, y, width: CW, height: CH, rx: '7',
        fill: 'rgba(255,255,255,.02)',
        stroke: 'rgba(255,255,255,.06)', 'stroke-width': '1',
        'stroke-dasharray': '4 3' }, svg);
      txt(svg, x + CW/2, y + CH/2 + 4, '?', { anchor: 'middle', color: 'rgba(255,255,255,.15)' });
      return { midY: y + CH/2, rightX: x + CW, leftX: x };
    }

    const pred    = r16Preds[m.id] || {};
    const locked  = isMatchLocked(m);
    const mH      = m.home_score !== null && m.home_score !== undefined ? Number(m.home_score) : null;
    const mA      = m.away_score !== null && m.away_score !== undefined ? Number(m.away_score) : null;
    const played  = mH !== null && mA !== null;
    const winSide = played ? (mH > mA ? 'home' : mA > mH ? 'away' : null) : null;
    const predRes = pred.result || null;
    const pts     = played ? calcR16Points(pred, m) : -1;
    const hasPred = !!predRes;

    // borde según estado
    const borderColor = played
      ? 'rgba(255,184,28,.4)'
      : hasPred ? 'rgba(58,232,176,.4)' : 'rgba(255,255,255,.1)';

    // sombra
    el('rect', { x: x+1, y: y+2, width: CW, height: CH, rx: '7', fill: 'rgba(0,0,0,.4)' }, svg);
    // fondo
    el('rect', { x, y, width: CW, height: CH, rx: '7',
      fill: '#0d1b38', stroke: borderColor, 'stroke-width': '1' }, svg);
    // divisor horizontal
    el('line', { x1: x+1, y1: y + CH/2, x2: x + CW - 1, y2: y + CH/2,
      stroke: 'rgba(255,255,255,.05)', 'stroke-width': '1' }, svg);

    // barra lateral ganador (amarilla) o predicción (verde)
    if (played && winSide === 'home')
      el('rect', { x, y,      width: 3, height: CH/2, rx: '2', fill: 'rgba(255,184,28,.8)' }, svg);
    if (played && winSide === 'away')
      el('rect', { x, y: y + CH/2, width: 3, height: CH/2, rx: '2', fill: 'rgba(255,184,28,.8)' }, svg);
    if (!played && predRes === '1')
      el('rect', { x, y,      width: 3, height: CH/2, rx: '2', fill: 'rgba(58,232,176,.8)' }, svg);
    if (!played && predRes === '2')
      el('rect', { x, y: y + CH/2, width: 3, height: CH/2, rx: '2', fill: 'rgba(58,232,176,.8)' }, svg);

    // Filas de equipos
    const rows = [
      { flag: m.home_flag || '🏳️', name: m.home || '?', score: mH, isW: winSide === 'home', isL: played && winSide !== 'home' && winSide !== null, oy: y + CH/4, side: '1' },
      { flag: m.away_flag || '🏳️', name: m.away || '?', score: mA, isW: winSide === 'away', isL: played && winSide !== 'away' && winSide !== null, oy: y + 3*CH/4, side: '2' },
    ];

    rows.forEach(({ flag, name, score, isW, isL, oy, side }) => {
      // flag emoji
      const ft = el('text', { x: x + 10, y: oy + 4, 'font-size': '13', 'font-family': FONT }, svg);
      ft.textContent = flag;

      // nombre
      const nameColor = isW ? AMBER : isL ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.82)';
      const nt = el('text', { x: x + 30, y: oy + 5,
        'font-size': '10', 'font-family': FONT,
        'font-weight': isW ? '700' : '400', fill: nameColor }, svg);
      nt.textContent = trunc(name, 14);

      // resultado (admin inputs o badge)
      if (currentUser.role === 'admin') {
        // Badge clickeable que abre modal de resultado
        const badgeBg = el('rect', { x: x + CW - 28, y: oy - 10, width: 24, height: 20, rx: '4',
          fill: score !== null ? (isW ? 'rgba(255,184,28,.2)' : 'rgba(255,255,255,.08)') : 'rgba(108,172,228,.15)',
          stroke: score !== null ? (isW ? 'rgba(255,184,28,.4)' : 'rgba(255,255,255,.1)') : 'rgba(108,172,228,.3)',
          'stroke-width': '1', style: 'cursor:pointer' }, svg);
        const badgeTxt = el('text', { x: x + CW - 16, y: oy + 5,
          'font-size': '10', 'font-family': FONT, 'font-weight': '800',
          fill: score !== null ? (isW ? AMBER : 'rgba(255,255,255,.5)') : 'rgba(108,172,228,.8)',
          'text-anchor': 'middle', style: 'cursor:pointer' }, svg);
        badgeTxt.textContent = score !== null ? score : '✎';
        badgeBg.addEventListener('click', e => { e.stopPropagation(); openR16AdminModal(m.id); });
        badgeTxt.addEventListener('click', e => { e.stopPropagation(); openR16AdminModal(m.id); });
      } else if (score !== null && score !== undefined) {
        // badge de resultado
        el('rect', { x: x + CW - 26, y: oy - 9, width: 22, height: 18, rx: '4',
          fill:   isW ? 'rgba(255,184,28,.18)' : 'rgba(255,255,255,.05)',
          stroke: isW ? 'rgba(255,184,28,.4)'  : 'rgba(255,255,255,.08)',
          'stroke-width': '1' }, svg);
        const st = el('text', { x: x + CW - 15, y: oy + 5,
          'font-size': '11', 'font-family': FONT, 'font-weight': '800',
          fill: isW ? AMBER : 'rgba(255,255,255,.38)', 'text-anchor': 'middle' }, svg);
        st.textContent = score;
      }

      // highlight predicción seleccionada
      if (!played && !locked && predRes === side) {
        el('rect', { x: x + 1, y: side === '1' ? y + 1 : y + CH/2,
          width: CW - 2, height: CH/2 - 1,
          rx: side === '1' ? '6' : '0',
          fill: 'rgba(58,232,176,.07)' }, svg);
      }
      
      if (!played && !locked && currentUser.role !== 'admin') {
        const zone = el('rect', {
          x, y: side === '1' ? y : y + CH/2,
          width: CW, height: CH/2,
          fill: 'transparent',
          rx: side === '1' ? '7' : '0',
        }, svg);
        zone.style.cursor = 'pointer';
        zone.addEventListener('click', () => setR16Pred(m.id, side));
      }
    });

    // pts bajo la card
    if (played && pts >= 0) {
      const ptColor = pts >= 10 ? GREEN : 'rgba(255,80,80,.7)';
      const ptTxt   = pts >= 10 ? '✓ +10 pts' : '✗ 0 pts';
      const pte = el('text', { x: x + CW/2, y: y + CH + 13,
        'font-size': '8', 'text-anchor': 'middle',
        fill: ptColor, 'font-family': FONT, 'font-weight': '700' }, svg);
      pte.textContent = ptTxt;
    }

    // fecha y estado de voto
    const subY = y + CH + (played && pts >= 0 ? 24 : 13);
    if (m.match_date) {
      const de = el('text', { x: x + CW/2, y: subY,
        'font-size': '7', 'text-anchor': 'middle',
        fill: 'rgba(255,255,255,.16)', 'font-family': FONT }, svg);
      de.textContent = (m.match_date || '') + (m.time ? ' · ' + m.time + 'hs' : '');
    }

    // ícono de candado si está bloqueado
    if (locked && !played) {
      const le = el('text', { x: x + CW - 5, y: y - 3,
        'font-size': '9', 'text-anchor': 'end',
        fill: 'rgba(255,255,255,.25)', 'font-family': FONT }, svg);
      le.textContent = '🔒';
    }

    return { midY: y + CH/2, rightX: x + CW, leftX: x };
  }

  // ── Slot de avance (QF/SF) ────────────────────────────────────
  function drawSlot(svg, teamA, teamB, x, y, label, matchId) {
  if (teamA || teamB) {
    el('rect', { x: x+1, y: y+2, width: SW, height: SH*2+1, rx: '6', fill: 'rgba(0,0,0,.35)' }, svg);
    el('rect', { x, y, width: SW, height: SH*2+1, rx: '6',
      fill: '#0d1b38', stroke: 'rgba(255,184,28,.45)', 'stroke-width': '1' }, svg);
    el('line', { x1: x+1, y1: y+SH, x2: x+SW-1, y2: y+SH,
      stroke: 'rgba(255,255,255,.05)', 'stroke-width': '1' }, svg);
    [teamA, teamB].forEach((team, i) => {
      const oy = y + SH/2 + i*SH;
      if (team) {
        el('rect', { x, y: y + i*SH, width: 3, height: SH, rx: '2', fill: 'rgba(255,184,28,.7)' }, svg);
        const ft = el('text', { x: x+10, y: oy+4, 'font-size': '12', 'font-family': FONT }, svg);
        ft.textContent = team.flag || '🏳️';
        const nt = el('text', { x: x+28, y: oy+5,
          'font-size': '10', 'font-family': FONT, 'font-weight': '700', fill: AMBER }, svg);
        nt.textContent = trunc(team.name, 11);
      } else {
        const lt = el('text', { x: x+SW/2, y: oy+5,
          'font-size': '8', 'text-anchor': 'middle',
          fill: 'rgba(255,255,255,.18)', 'font-family': FONT }, svg);
        lt.textContent = '?';
      }
    });
  } else {
    el('rect', { x, y, width: SW, height: SH*2+1, rx: '6',
      fill: 'rgba(255,255,255,.02)',
      stroke: 'rgba(255,255,255,.07)', 'stroke-width': '1',
      'stroke-dasharray': '4 3' }, svg);
    if (label) {
      const lt = el('text', { x: x+SW/2, y: y+SH+4,
        'font-size': '8', 'text-anchor': 'middle',
        fill: 'rgba(255,255,255,.18)', 'font-family': FONT }, svg);
      lt.textContent = label;
    }
  }

  // Badge admin ✎
  if (currentUser.role === 'admin' && matchId) {
    const bg = el('rect', { x: x+SW-22, y: y+2, width: 18, height: 16, rx: '4',
      fill: 'rgba(108,172,228,.15)', stroke: 'rgba(108,172,228,.3)', 'stroke-width': '1',
      style: 'cursor:pointer' }, svg);
    const bt = el('text', { x: x+SW-13, y: y+13, 'font-size': '10', 'font-family': FONT,
      fill: 'rgba(108,172,228,.8)', 'text-anchor': 'middle', style: 'cursor:pointer' }, svg);
    bt.textContent = '✎';
    bg.addEventListener('click', e => { e.stopPropagation(); openR16AdminModal(matchId); });
    bt.addEventListener('click', e => { e.stopPropagation(); openR16AdminModal(matchId); });
  }

  // Badge admin ✎ — siempre al final
  if (currentUser.role === 'admin' && matchId) {
    const bg = el('rect', { x: x+SW-22, y: y+2, width: 18, height: 16, rx: '4',
      fill: 'rgba(108,172,228,.15)', stroke: 'rgba(108,172,228,.3)', 'stroke-width': '1',
      style: 'cursor:pointer' }, svg);
    const bt = el('text', { x: x+SW-13, y: y+13, 'font-size': '10', 'font-family': FONT,
      fill: 'rgba(108,172,228,.8)', 'text-anchor': 'middle', style: 'cursor:pointer' }, svg);
    bt.textContent = '✎';
    bg.addEventListener('click', e => { e.stopPropagation(); openR16AdminModal(matchId); });
    bt.addEventListener('click', e => { e.stopPropagation(); openR16AdminModal(matchId); });
  }

  return { midY: y + SH, rightX: x + SW, leftX: x };
}
  // ── Final central ─────────────────────────────────────────────
  function drawFinal(svg, x, y) {
    el('rect', { x: x+1, y: y+2, width: FW, height: FH, rx: '9', fill: 'rgba(0,0,0,.4)' }, svg);
    el('rect', { x, y, width: FW, height: FH, rx: '9',
      fill: '#0a1226',
      stroke: 'rgba(255,184,28,.3)', 'stroke-width': '1.5',
      'stroke-dasharray': '6 3' }, svg);
    const lt = el('text', { x: x + FW/2, y: y + 20,
      'font-size': '8', 'text-anchor': 'middle',
      fill: 'rgba(255,255,255,.2)', 'font-family': FONT, 'letter-spacing': '2' }, svg);
    lt.textContent = 'GRAN FINAL';
    const vt = el('text', { x: x + FW/2, y: y + 40,
      'font-size': '12', 'text-anchor': 'middle',
      fill: 'rgba(255,255,255,.12)', 'font-family': FONT }, svg);
    vt.textContent = '? vs ?';

    // Badge admin ✎
    if (currentUser.role === 'admin') {
      const bg = el('rect', { x: x+FW-22, y: y+4, width: 18, height: 16, rx: '4',
        fill: 'rgba(108,172,228,.15)', stroke: 'rgba(108,172,228,.3)', 'stroke-width': '1',
        style: 'cursor:pointer' }, svg);
      const bt = el('text', { x: x+FW-13, y: y+15, 'font-size': '10', 'font-family': FONT,
        fill: 'rgba(108,172,228,.8)', 'text-anchor': 'middle', style: 'cursor:pointer' }, svg);
      bt.textContent = '✎';
      bg.addEventListener('click', e => { e.stopPropagation(); openR16AdminModal(228); });
      bt.addEventListener('click', e => { e.stopPropagation(); openR16AdminModal(228); });
    }

    return { midY: y + FH/2 };
  }

  // ── Llave (conecta dos midY al slot) ─────────────────────────
  // fromX: borde de las cards
  // y0, y1: midY de las dos cards
  // toX: borde del slot
  // slotMidY: midY del slot
  // dir: 'right' (cards a la izq, slot a la der) | 'left' (cards a la der, slot a la izq)
  function drawBracketConnector(svg, fromX, y0, y1, toX, slotMidY, color, dir) {
    const midX = dir === 'right'
      ? fromX + (toX - fromX) / 2
      : toX  + (fromX - toX) / 2;

    // horizontales desde cards
    hline(svg, fromX, y0, midX, color);
    hline(svg, fromX, y1, midX, color);
    // vertical en el medio
    vline(svg, midX, y0, y1, color);
    // horizontal al slot
    if (dir === 'right') hline(svg, midX, slotMidY, toX, color);
    else                 hline(svg, toX,  slotMidY, midX, color);
  }

  // ══════════════════════════════════════════════════════════════
  //  LAYOUT
  //
  //  Dividimos el bracket en 4 cuadrantes:
  //  TL (top-left):  llaves 0,1   → SF izq superior
  //  BL (bot-left):  llaves 2,3   → SF izq inferior
  //  TR (top-right): llaves 4,5   → SF der superior
  //  BR (bot-right): llaves 6,7   → SF der inferior
  //
  //  Layout horizontal (de izq a der):
  //  [Cards TL] → [QF-TL] → [SF-L] → [FINAL] ← [SF-R] ← [QF-TR] ← [Cards TR]
  //
  //  Mismo espejo vertical para BL/BR
  // ══════════════════════════════════════════════════════════════

  // Dimensiones
  const PAIR_H   = CH * 2 + GAP_V;     // altura de un par de cards
  const GROUP_H  = PAIR_H * 2 + GAP_P; // altura de 2 pares (1 cuadrante)
  const TOP      = 40;
  const SVG_H    = TOP + GROUP_H * 2 + GAP_P + 80; // dos cuadrantes + copa

  // Columnas (de izquierda a derecha)
  const L_CARD   = 12;
  const L_QF     = L_CARD + CW + CONN;
  const L_SF     = L_QF   + SW + CONN * 2;
  const L_FIN    = L_SF   + SW + CONN * 2;
  const SVG_W    = L_FIN * 2 + FW;

  // Espejo derecho
  const R_CARD   = SVG_W - L_CARD - CW;
  const R_QF     = SVG_W - L_QF  - SW;
  const R_SF     = SVG_W - L_SF  - SW;

  // Y-positions de las cards por cuadrante y par dentro del cuadrante
  // cuad: 0=TL, 1=BL  (izq); 2=TR, 3=BR (der)
  // pair: 0 o 1 dentro del cuadrante
  // row:  0 o 1 dentro del par
  function cardY(cuad, pair, row) {
    const cuadY = TOP + cuad * (GROUP_H + GAP_P);
    return cuadY + pair * (PAIR_H + GAP_P/2) + row * (CH + GAP_V);
  }

  // ── Crear SVG ─────────────────────────────────────────────────
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', SVG_W);
  svg.setAttribute('height', SVG_H);
  svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
  svg.style.display  = 'block';
  svg.style.minWidth = SVG_W + 'px';

  // fondo
  el('rect', { x: 0, y: 0, width: SVG_W, height: SVG_H, fill: '#070d1e', rx: '10' }, svg);

  // etiquetas de ronda
  const roundLabels = [
    { x: L_CARD + CW/2,   label: '16AVOS' },
    { x: L_QF   + SW/2,   label: 'CUARTOS' },
    { x: L_SF   + SW/2,   label: 'SEMIS' },
    { x: L_FIN  + FW/2,   label: 'FINAL' },
  ];
  roundLabels.forEach(r => {
    [r.x, SVG_W - r.x].forEach(rx => {
      const t = el('text', {
  x: rx,
  y: 30,
  'font-size': '14',
  'text-anchor': 'middle',
  fill: '#ffffff',
  'font-family': FONT,
  'letter-spacing': '1.5'
}, svg);

t.textContent = r.label;
    });
  });

  // ── Dibujar los 4 cuadrantes ──────────────────────────────────
  // BRACKET[0..3] = lado izquierdo (cuads 0,1)
  // BRACKET[4..7] = lado derecho   (cuads 2,3)

  // Cuadrante top-left (BRACKET 0,1)
  // Cuadrante bot-left (BRACKET 2,3)
  // Cuadrante top-right (BRACKET 4,5)
  // Cuadrante bot-right (BRACKET 6,7)

  // Vamos a construir los 4 cuadrantes y recolectar los midY de SF
  const sfMidYs = []; // [0]=SF-L-top, [1]=SF-L-bot, [2]=SF-R-top, [3]=SF-R-bot

  // Función para dibujar un cuadrante completo (2 llaves + QF slot + SF connector)
  // cuadIdx: 0..3
  // dir: 'left' | 'right'
  // bIdx: índice de inicio en BRACKET[]
  function drawQuadrant(cuadIdx, dir, bIdx) {
    const isLeft  = dir === 'left';
    const cardX   = isLeft ? L_CARD : R_CARD;
    const qfX     = isLeft ? L_QF   : R_QF;
    const sfX     = isLeft ? L_SF   : R_SF;
    const cuadTopY = TOP + cuadIdx * (GROUP_H + GAP_P);

    const qfMidYs = []; // midY de los 2 QF slots de este cuadrante

    for (let p = 0; p < 2; p++) {
      const matchA = BRACKET[bIdx + p]?.pair[0];
      const matchB = BRACKET[bIdx + p]?.pair[1];

      const yA = cuadTopY + p * (PAIR_H + GAP_P/2);
      const yB = yA + CH + GAP_V;

      const cA = drawMatchCard(svg, matchA, cardX, yA);
      const cB = drawMatchCard(svg, matchB, cardX, yB);

      const pairMidY = (cA.midY + cB.midY) / 2;

      // ganador de cada partido para el slot QF
      const wA = matchWinner(matchA);
      const wB = matchWinner(matchB);

      // QF slot: muestra el ganador del match superior si lo hay,
      // o el del inferior, para representar quién avanza de cada partido.
      // En realidad QF enfrenta al ganador de matchA con el de matchB,
      // pero como el QF no tiene fila en la BD, mostramos ambos ganadores
      // en el slot stacked (o vacío si ninguno ganó).
      // Simplificado: slot muestra wA encima, wB abajo
      const qfSlotY = pairMidY - SH/2;
      const fromX   = isLeft ? cA.rightX : cA.leftX;
      const toX     = isLeft ? qfX       : qfX + SW;

      // connectors de las cards al QF slot
      // connectors de las cards al QF slot
      drawBracketConnector(svg, fromX, cA.midY, cB.midY, toX, pairMidY, LINE1, dir);

      // QF slot — muestra los dos ganadores enfrentados
    // connectors de las cards al QF slot
      drawBracketConnector(svg, fromX, cA.midY, cB.midY, toX, pairMidY, LINE1, dir);

      // QF slot — muestra los dos ganadores enfrentados
      const qfMatchId = 216 + (bIdx + p);
      const qfMatch = elimMatches.find(m => m.id === qfMatchId);
      const qfTeamA = wA || (qfMatch?.home && qfMatch.home !== 'Por definir' ? { name: qfMatch.home, flag: qfMatch.home_flag || '🏳️' } : null);
      const qfTeamB = wB || (qfMatch?.away && qfMatch.away !== 'Por definir' ? { name: qfMatch.away, flag: qfMatch.away_flag || '🏳️' } : null);
      const qfSlot = drawSlot(svg, qfTeamA, qfTeamB, isLeft ? qfX : R_QF, qfSlotY, 'Por definir', qfMatchId);

      qfMidYs.push(qfSlot.midY);
    }

    // SF connector: junta los 2 QF slots en el SF slot
    const sfMidY = (qfMidYs[0] + qfMidYs[1]) / 2;
    const sfSlotY = sfMidY - SH/2;

    const qfFromX = isLeft ? qfX + SW : R_QF;
    const sfToX   = isLeft ? sfX      : R_SF + SW;

    drawBracketConnector(svg, qfFromX, qfMidYs[0], qfMidYs[1], sfToX, sfMidY, LINE2, dir);

const sfMatchId = 224 + cuadIdx;
const sfMatch = elimMatches.find(m => m.id === sfMatchId);
const sfTeamA = sfMatch?.home && sfMatch.home !== 'Por definir' ? { name: sfMatch.home, flag: sfMatch.home_flag||'🏳️' } : null;
const sfTeamB = sfMatch?.away && sfMatch.away !== 'Por definir' ? { name: sfMatch.away, flag: sfMatch.away_flag||'🏳️' } : null;
drawSlot(svg, sfTeamA, sfTeamB, isLeft ? sfX : R_SF, sfSlotY, 'SF', sfMatchId);
    // Guardar sfMidY para el conector a la final
    return sfMidY;
  }

  // Dibujar los 4 cuadrantes
  const sfL0 = drawQuadrant(0, 'left',  0); // llaves 0,1
  const sfL1 = drawQuadrant(1, 'left',  2); // llaves 2,3
  const sfR0 = drawQuadrant(0, 'right', 4); // llaves 4,5
  const sfR1 = drawQuadrant(1, 'right', 6); // llaves 6,7

  // ── Final ─────────────────────────────────────────────────────
  const finMidY = (sfL0 + sfL1) / 2;
  const finY    = finMidY - FH/2;

  // Connectors semis → final
  const sfLfromX = L_SF + SW;
  const sfRfromX = R_SF;

  drawBracketConnector(svg, sfLfromX, sfL0, sfL1, L_FIN, finMidY, LINE3, 'left');
  drawBracketConnector(svg, sfRfromX, sfR0, sfR1, L_FIN + FW, finMidY, LINE3, 'right');

  drawFinal(svg, L_FIN, finY);

  // Copa
  const cupSize = 130;
  el('image', {
    href: 'copa.png',
    x: SVG_W/2 - cupSize/2,
    y: finY + FH + 16,
    width: cupSize, height: cupSize,
  }, svg);

  container.innerHTML = '';
  twemoji.parse(container);
  container.appendChild(svg);
}


// ── Predicción R16 ────────────────────────────────────────────
async function setR16Pred(matchId, val) {
  const match = r16Matches.find(m => m.id === matchId);
  if (!match) return;
  if (isMatchLocked(match)) { toast('Este partido ya está cerrado para pronósticos', 'e'); return; }
  try {
    const saved = await api('POST', '/prode/predictions', {
      match_id: matchId, result: val, home_score: null, away_score: null,
    });
    r16Preds[matchId] = saved;
    renderR16Bracket();
    // actualizar puntos
    let myPts = 0;
    r16Matches.forEach(m => {
      const pred = r16Preds[m.id];
      if (!pred) return;
      const p = calcR16Points(pred, m);
      if (p > 0) myPts += p;
    });
    document.getElementById('r16-my-pts').textContent = myPts;
  } catch(e) { toast(e.message, 'e'); }
}

// ── Resultado admin R16 ───────────────────────────────────────
async function setR16Result(matchId, side, value) {
  const m = r16Matches.find(x => x.id === matchId) || elimMatches.find(x => x.id === matchId);
  if (!m) return;
  const v = value === '' ? null : Number(value);
  if (side === 'home') m.home_score = v;
  else                 m.away_score = v;
  if (m.home_score === null || m.away_score === null) return;
  try {
    await api('PUT', '/prode/matches/' + matchId + '/result', {
      home_score: m.home_score, away_score: m.away_score,
    });
    toast('Resultado guardado', 's');
    renderR16();
  } catch(e) { toast(e.message, 'e'); }
}

// ── Modal admin resultado R16 ────────────────────────────────
function openR16AdminModal(matchId) {
  const m = r16Matches.find(x => x.id === matchId) || elimMatches.find(x => x.id === matchId);
  if (!m) return;

  // Crear modal si no existe
  let modal = document.getElementById('r16-admin-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'r16-admin-modal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);z-index:9999;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:#131724;border:1px solid rgba(108,172,228,.2);border-radius:14px;padding:22px;width:300px;animation:slideUp .18s ease">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div id="r16-modal-title" style="font-size:.92rem;font-weight:700;color:#fff"></div>
          <button onclick="closeR16AdminModal()" style="width:24px;height:24px;background:rgba(255,255,255,.07);border:none;border-radius:6px;color:rgba(255,255,255,.5);cursor:pointer;font-size:14px">✕</button>
        </div>
        <div style="font-size:.62rem;color:rgba(255,184,28,.6);letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px">⚙ Cargar resultado</div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:16px">
          <span id="r16-modal-home" style="font-size:.75rem;color:rgba(255,255,255,.5);flex:1"></span>
          <input id="r16-inp-home" type="number" min="0" max="20" placeholder="0"
            style="width:50px;background:#1a1f30;border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:8px;color:#fff;font-size:1rem;font-weight:800;text-align:center;outline:none;font-family:inherit">
          <span style="color:rgba(255,255,255,.3);font-weight:700">–</span>
          <input id="r16-inp-away" type="number" min="0" max="20" placeholder="0"
            style="width:50px;background:#1a1f30;border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:8px;color:#fff;font-size:1rem;font-weight:800;text-align:center;outline:none;font-family:inherit">
          <span id="r16-modal-away" style="font-size:.75rem;color:rgba(255,255,255,.5);flex:1;text-align:right"></span>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button onclick="closeR16AdminModal()" style="padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.07);color:rgba(255,255,255,.5);font-size:.8rem;font-weight:600;cursor:pointer;font-family:inherit">Cancelar</button>
          <button id="r16-btn-del" onclick="deleteR16Result()" style="padding:8px 16px;border-radius:8px;border:1px solid rgba(255,91,106,.2);background:rgba(255,91,106,.1);color:#ff5b6a;font-size:.8rem;font-weight:600;cursor:pointer;font-family:inherit">Borrar</button>
          <button onclick="saveR16AdminModal()" style="padding:8px 16px;border-radius:8px;border:none;background:#FFB81C;color:#000;font-size:.8rem;font-weight:700;cursor:pointer;font-family:inherit">Guardar</button>
        </div>
      </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) closeR16AdminModal(); });
    document.body.appendChild(modal);
  }

  // Rellenar datos
  const hasResult = m.home_score !== null && m.home_score !== undefined;
  document.getElementById('r16-modal-title').textContent = (m.home_flag||'🏳️') + ' ' + (m.home||'?') + ' vs ' + (m.away_flag||'🏳️') + ' ' + (m.away||'?');
  document.getElementById('r16-modal-home').textContent = m.home || '?';
  document.getElementById('r16-modal-away').textContent = m.away || '?';
  document.getElementById('r16-inp-home').value = hasResult ? m.home_score : '';
  document.getElementById('r16-inp-away').value = hasResult ? m.away_score : '';
  document.getElementById('r16-btn-del').style.display = hasResult ? '' : 'none';
  modal._matchId = matchId;

  modal.style.display = 'flex';
  document.getElementById('r16-inp-home').focus();
}

function closeR16AdminModal() {
  const modal = document.getElementById('r16-admin-modal');
  if (modal) modal.style.display = 'none';
}

async function saveR16AdminModal() {
  const modal = document.getElementById('r16-admin-modal');
  const matchId = modal._matchId;
  const h = document.getElementById('r16-inp-home').value;
  const a = document.getElementById('r16-inp-away').value;
  if (h === '' || a === '') { toast('Completá ambos goles', 'e'); return; }
  try {
    await api('PUT', '/prode/matches/' + matchId + '/result', {
      home_score: Number(h), away_score: Number(a)
    });
    toast('Resultado guardado', 's');
    closeR16AdminModal();
    renderR16();
  } catch(e) { toast(e.message, 'e'); }
}

async function deleteR16Result() {
  const modal = document.getElementById('r16-admin-modal');
  const matchId = modal._matchId;
  try {
    await api('DELETE', '/prode/matches/' + matchId + '/result');
    toast('Resultado borrado', 's');
    closeR16AdminModal();
    renderR16();
  } catch(e) { toast(e.message, 'e'); }
}

// ── Mundial 2026 — redirige a r16 ─────────────────────────────
function renderMundial() {
  navigateTo('r16');
}

function toggleSidebar() {
  document.querySelector('.sb').classList.toggle('sb-collapsed');
}
