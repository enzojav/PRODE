// ============================================================
//  APP.JS — Conectado al backend real (JWT + PostgreSQL)
//  Roles: "admin" (acceso total) | "player" (solo Prode)
// ============================================================
 
const AVATAR_COLORS = ['#6CACE4','#FFB81C','#85bde8','#002470','#3ae8d0','#ff8c42','#a8d8ea','#43e8b0'];
const avc = i => AVATAR_COLORS[i % AVATAR_COLORS.length];
const ini = n => n.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
 
let currentUser   = null;
let localMatches  = [];
let localPreds    = {};
let localStandings = [];
let activeDate    = null;
let scorePeriod   = 'Abr 2026';
let newsFilter    = '';
let editingMemberId = null;
 
// ── API helper ────────────────────────────────────────────────
async function api(method, path, body) {
  const token = sessionStorage.getItem('qh_token');
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res  = await fetch('/api' + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error del servidor');
    return data;
  } catch (e) {
    throw e;
  }
}
 
// ── Helpers de tiempo para lockear partidos ───────────────────
const MONTH_MAP = {
  'Jan':0,'Feb':1,'Mar':2,'Apr':3,'May':4,'Jun':5,
  'Jul':6,'Aug':7,'Sep':8,'Oct':9,'Nov':10,'Dec':11,
  'Ene':0,'Feb':1,'Mar':2,'Abr':3,'May':4,'Jun':5,
  'Jul':6,'Ago':7,'Sep':8,'Oct':9,'Nov':10,'Dic':11
};
 
function isMatchLocked(m) {
  try {
    const parts = m.match_date ? m.match_date.split(' ') : (m.date || '').split(' ');
    // format: "Jue 11 Jun" or "11 Jun"
    const dayIdx  = parts.length === 3 ? 1 : 0;
    const monIdx  = parts.length === 3 ? 2 : 1;
    const day     = parseInt(parts[dayIdx]);
    const month   = MONTH_MAP[parts[monIdx]];
    const timeStr = m.time || '00:00';
    const [hh, mm] = timeStr.split(':').map(Number);
    const matchDate = new Date(2026, month, day, hh, mm, 0);
    return new Date() >= matchDate;
  } catch { return false; }
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
  } catch (e) {
    errEl.textContent = e.message || 'Error al iniciar sesión.';
  }
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
    sessionStorage.setItem('qh_token', data.token);
    currentUser = data.user;
    bootApp();
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
 
function bootApp() {
  showApp();
  applyRole();
  setupNav();
  updateUserBadge();
  if (currentUser.role === 'admin') { navigateTo('dashboard'); }
  else { navigateTo('prode'); }
}
 
function applyRole() {
  const isAdmin = currentUser.role === 'admin';
  document.querySelectorAll('.ni[data-s]').forEach(el => {
    const s = el.dataset.s;
    if (s === 'prode') { el.style.display = ''; return; }
    el.style.display = isAdmin ? '' : 'none';
  });
  document.querySelectorAll('.sb-grp').forEach(g => { if (!isAdmin) g.style.display = 'none'; });
  document.getElementById('addbtn').style.display = 'none';
  const ap = document.getElementById('admin-prode-panel');
  if (ap) ap.style.display = isAdmin ? '' : 'none';
}
 
function updateUserBadge() {
  const u = currentUser;
  const color = AVATAR_COLORS[u.id % AVATAR_COLORS.length];
  document.querySelector('.uavs').textContent      = ini(u.displayName || u.username);
  document.querySelector('.uavs').style.background = color;
  document.querySelector('.uin .un').textContent   = u.displayName || u.username;
  document.querySelector('.uin .ur').textContent   = u.role === 'admin' ? '⚙ Administrador' : '⚽ Jugador';
}
 
const SECTION_TITLES = { dashboard:'Dashboard', score:'Score Balance', training:'Capacitaciones', news:'Noticias', prode:'Prode ⚽', members:'Miembros' };
const ADD_ACTIONS    = { news: () => openNewsModal(), members: () => openMemberModal() };
 
function navigateTo(sec) {
  document.querySelectorAll('.ni').forEach(n => n.classList.toggle('active', n.dataset.s === sec));
  document.querySelectorAll('.sec').forEach(x => x.classList.remove('active'));
  document.getElementById('s-' + sec)?.classList.add('active');
  document.getElementById('tbtit').textContent = SECTION_TITLES[sec] || sec;
  const addBtn = document.getElementById('addbtn');
  if (currentUser.role === 'admin' && ADD_ACTIONS[sec]) { addBtn.style.display = ''; addBtn.onclick = ADD_ACTIONS[sec]; }
  else { addBtn.style.display = 'none'; }
  const fns = { dashboard:renderDashboard, score:renderScore, training:renderTraining, news:renderNews, prode:renderProde, members:renderMembers };
  fns[sec]?.();
}
 
function setupNav() {
  document.querySelectorAll('.ni').forEach(el => el.addEventListener('click', () => navigateTo(el.dataset.s)));
}
 
// ══════════════════════════════════════════════════════════════
//  DASHBOARD — usa DB_* del database.js para datos estáticos
// ══════════════════════════════════════════════════════════════
async function renderDashboard() {
  try {
    const members = await api('GET', '/members');
    document.getElementById('d-members').textContent = members.length;
  } catch { document.getElementById('d-members').textContent = '—'; }
 
  document.getElementById('d-courses').textContent  = (typeof DB_COURSES !== 'undefined') ? DB_COURSES.filter(c => c.status === 'Activo').length : '—';
  document.getElementById('d-approved').textContent = (typeof DB_TRAINING_PROGRESS !== 'undefined') ? DB_TRAINING_PROGRESS.filter(p => p.status === 'Aprobado').length : '—';
  document.getElementById('d-avg').textContent = '—';
 
  if (typeof DB_ACTIVITY !== 'undefined') {
    document.getElementById('act-list').innerHTML = DB_ACTIVITY.map(a => `
      <li class="ai"><span class="adot dot-${a.color}"></span><div><div class="at">${a.message}</div><div class="atm">${a.time}</div></div></li>`).join('');
  }
}
 
// ══════════════════════════════════════════════════════════════
//  SCORE BALANCE — datos estáticos del database.js
// ══════════════════════════════════════════════════════════════
function calcWeightedScore(memberId, period) {
  if (typeof DB_SCORES === 'undefined') return null;
  const ms = DB_SCORES.filter(s => s.memberId===memberId && s.period===period);
  if (!ms.length) return null;
  let tw=0, ws=0;
  ms.forEach(s => { const cat=DB_SCORE_CATEGORIES.find(c=>c.id===s.categoryId); if(cat){ws+=s.value*cat.weight;tw+=cat.weight;} });
  return tw ? Math.round(ws/tw*10)/10 : null;
}
 
async function renderScore() {
  try {
    const members = await api('GET', '/members');
    if (typeof DB_SCORES === 'undefined') return;
    const periods = [...new Set(DB_SCORES.map(s=>s.period))];
    document.getElementById('period-btns').innerHTML = periods.map(p =>
      `<button class="pbtn${p===scorePeriod?' active':''}" onclick="setPeriod('${p}')">${p}</button>`).join('');
    const BC = ['#6CACE4','#FFB81C','#85bde8','#E8334A','#3ae8d0'];
    document.getElementById('score-grid').innerHTML = members.map(m => {
      const scores = DB_SCORES.filter(s=>s.memberId===m.id&&s.period===scorePeriod);
      const avg    = calcWeightedScore(m.id,scorePeriod)??'—';
      const color  = avg>=8.5?'#6CACE4':avg>=7?'#FFB81C':'#E8334A';
      return `<div class="smc"><div class="smc-hdr"><div class="av" style="width:36px;height:36px;font-size:.78rem;background:${avc(m.id)}">${ini(m.name)}</div><div><div class="smc-name">${m.name}</div><div class="smc-role">${m.team||''} · ${m.role||''}</div></div><div class="smc-score"><div class="smc-val" style="color:${color}">${avg}</div><div class="smc-lbl">Score</div></div></div>${scores.map((s,i)=>{const cat=DB_SCORE_CATEGORIES.find(c=>c.id===s.categoryId);return `<div class="bar-wrap"><div class="bar-lbl"><span>${cat?.icon||''} ${cat?.name||''}</span><span>${s.value}</span></div><div class="bar-bg"><div class="bar-fill" style="width:${s.value*10}%;background:${BC[i%BC.length]}"></div></div></div>`;}).join('')}</div>`;
    }).join('');
  } catch(e) { console.error(e); }
}
function setPeriod(p) { scorePeriod=p; renderScore(); }
 
// ══════════════════════════════════════════════════════════════
//  CAPACITACIONES — datos estáticos
// ══════════════════════════════════════════════════════════════
function renderTraining() {
  if (typeof DB_COURSES === 'undefined') return;
  document.getElementById('t-total').textContent = DB_COURSES.filter(c=>c.status==='Activo').length;
  const total=DB_TRAINING_PROGRESS.length, approved=DB_TRAINING_PROGRESS.filter(p=>p.status==='Aprobado').length;
  document.getElementById('t-prog').textContent = total ? Math.round(approved/total*100)+'%' : '—';
  const catBadge={Calidad:'ba',Herramientas:'bb',Habilidades:'bc'};
  document.getElementById('training-tb').innerHTML = DB_COURSES.map(c => {
    const enrolled=DB_TRAINING_PROGRESS.filter(p=>p.courseId===c.id).length;
    const done=DB_TRAINING_PROGRESS.filter(p=>p.courseId===c.id&&p.status==='Aprobado').length;
    return `<tr><td><span style="font-weight:500;color:var(--text)">${c.title}</span></td><td><span class="badge ${catBadge[c.category]||'bb'}">${c.category}</span></td><td>${c.hours}h</td><td>${c.instructor}</td><td>${done}/${enrolled} aprobados</td><td><span class="badge ${c.status==='Activo'?'ba':'bd'}">${c.status}</span></td></tr>`;
  }).join('');
}
 
// ══════════════════════════════════════════════════════════════
//  NOTICIAS — conectado al backend
// ══════════════════════════════════════════════════════════════
let localNews = [];
 
async function renderNews() {
  try {
    localNews = await api('GET', '/news');
  } catch { localNews = []; }
 
  if (!localNews.length) {
    document.getElementById('news-hero').innerHTML = '<p style="color:var(--text3)">No hay noticias todavía.</p>';
    document.getElementById('news-cards').innerHTML = '';
    document.getElementById('news-filter').innerHTML = '';
    document.getElementById('tick-inner').innerHTML = '';
    return;
  }
 
  document.getElementById('tick-inner').innerHTML = [...localNews,...localNews].map(n=>`<span>${n.title}</span>`).join('');
  const cats=['Todos',...new Set(localNews.map(n=>n.category))];
  document.getElementById('news-filter').innerHTML = cats.map(c =>
    `<button class="nftag${(!newsFilter&&c==='Todos')||newsFilter===c?' active':''}" onclick="setNewsFilter('${c}')">${c}</button>`).join('');
  const filtered = newsFilter ? localNews.filter(n=>n.category===newsFilter) : localNews;
  const sorted   = [...filtered].sort((a,b) => new Date(b.created_at||0) - new Date(a.created_at||0));
  const hero = sorted[0];
  if (hero) document.getElementById('news-hero').innerHTML=`<div class="hero-emoji">${hero.emoji||'📋'}</div><span class="hero-tag">${hero.category}</span><div class="hero-title">${hero.title}</div><div class="hero-body">${hero.body}</div><div class="hero-meta">Por ${hero.author}</div>`;
  document.getElementById('news-cards').innerHTML=sorted.slice(1).map(n=>`<div class="ncard"><div class="ncard-top"><span class="ncard-emoji">${n.emoji||'📋'}</span><span class="ncard-tag">${n.category}</span></div><div class="ncard-title">${n.title}</div><div class="ncard-meta">Por ${n.author}</div></div>`).join('');
}
 
function setNewsFilter(cat) { newsFilter=cat==='Todos'?'':cat; renderNews(); }
 
function openNewsModal() {
  ['n-title','n-body','n-author'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('n-emoji').value='📋';
  document.getElementById('n-modal').classList.add('open');
}
 
async function saveNews() {
  const title  = document.getElementById('n-title').value.trim();
  const body   = document.getElementById('n-body').value.trim();
  const cat    = document.getElementById('n-cat').value;
  const emoji  = document.getElementById('n-emoji').value||'📋';
  const author = document.getElementById('n-author').value.trim() || currentUser.displayName;
  if (!title||!body) { toast('Completá título y contenido','e'); return; }
  try {
    await api('POST', '/news', { title, body, category:cat, emoji, author });
    closeM('n-modal');
    renderNews();
    toast('Noticia publicada','s');
  } catch(e) { toast(e.message,'e'); }
}
 
async function deleteNews(id) {
  if (!confirm('¿Eliminás esta noticia?')) return;
  try {
    await api('DELETE', '/news/' + id);
    renderNews();
    toast('Noticia eliminada','e');
  } catch(e) { toast(e.message,'e'); }
}
 
// ══════════════════════════════════════════════════════════════
//  PRODE — conectado al backend, lock por hora de partido
// ══════════════════════════════════════════════════════════════
async function renderProde() {
  if (!currentUser) return;
 
  try {
    // Cargar partidos y predicciones del backend
    localMatches = await api('GET', '/prode/matches');
    const predsArr = await api('GET', '/prode/predictions');
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
  allDates.sort((a,b) => localMatches.find(m=>m.match_date===a).id - localMatches.find(m=>m.match_date===b).id);
  if (!activeDate || !allDates.includes(activeDate)) activeDate = allDates[0];
 
  const strip = document.getElementById('date-strip');
  strip.innerHTML = allDates.map(d => {
    const dayMatches = localMatches.filter(m => m.match_date === d);
    const hasResult  = dayMatches.some(m => m.home_score !== null);
    const parts = d.split(' ');
    return `
      <button class="date-chip${d === activeDate ? ' active' : ''}${hasResult ? ' has-result' : ''}"
              onclick="setDate('${d}')">
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
        <span class="day-matches-count">${dayMatches.length} partido${dayMatches.length>1?'s':''}</span>
      </div>
      <div class="day-matches-grid">
        ${dayMatches.map(m => renderMatchCard(m)).join('')}
      </div>`;
  }
 
  // Status bar — sin botón de enviar, se guarda automáticamente
  const statusEl = document.getElementById('prode-status');
  const totalFilled = Object.values(localPreds).filter(p => p.home_score !== null || p.away_score !== null).length;
  const totalMatches = localMatches.length;
  const myPts = calcMyPoints();
  statusEl.innerHTML = `
    <div class="status-bar">
      <span>⚽ ${totalFilled}/${totalMatches} partidos votados · <strong>${myPts} pts</strong></span>
      <span style="font-size:.75rem;color:var(--text3)">Se guarda automáticamente</span>
    </div>`;
 
  // Tabla de posiciones
  await renderStandings();
}
 
function calcMyPoints() {
  let pts = 0;
  localMatches.forEach(m => {
    const pred = localPreds[m.id];
    if (!pred || m.home_score === null) return;
    const result = m.home_score > m.away_score ? '1' : m.home_score < m.away_score ? '2' : 'x';
    const predResult = pred.home_score > pred.away_score ? '1' : pred.home_score < pred.away_score ? '2' : 'x';
    if (pred.home_score === m.home_score && pred.away_score === m.away_score) pts += 10;
    else if (predResult === result) pts += 5;
  });
  return pts;
}
 
async function renderStandings() {
  try {
    const standings = await api('GET', '/prode/standings');
    const sorted = [...standings].sort((a,b) => b.pts - a.pts);
    document.getElementById('standings').innerHTML = sorted.length
      ? sorted.map((s,i) => {
          const pkc = i===0?'rk1':i===1?'rk2':i===2?'rk3':'rkn';
          const isMe = s.username === currentUser.username;
          return `
            <div class="sr">
              <div class="srp ${pkc}">${i+1}</div>
              <div class="srname">
                ${isMe ? `<strong>${s.displayName}</strong> <span class="me-tag">← vos</span>` : s.displayName}
                <div class="srdet">${s.exact}/${s.total} aciertos</div>
              </div>
              <div class="srpts">${s.pts} pts</div>
            </div>`;
        }).join('')
      : '<div class="no-standings">Nadie cargó pronósticos todavía.</div>';
  } catch { }
}
 
function setDate(d) { activeDate = d; renderProde(); }
 
function renderMatchCard(m) {
  const pred    = localPreds[m.id] || {};
  const locked  = isMatchLocked(m);
  const played  = m.home_score !== null && m.away_score !== null;
  const pGH     = pred.home_score !== undefined ? pred.home_score : null;
  const pGA     = pred.away_score !== undefined ? pred.away_score : null;
 
  // Resultado real
  const realResult = played ? (m.home_score > m.away_score ? '1' : m.home_score < m.away_score ? '2' : 'x') : null;
  const predResult = (pGH !== null && pGA !== null) ? (pGH > pGA ? '1' : pGH < pGA ? '2' : 'x') : null;
 
  // Puntos
  let matchPts = -1, ptsLabel = '';
  if (played && predResult !== null) {
    if (pGH === m.home_score && pGA === m.away_score) { matchPts = 10; ptsLabel = '🎯 +10 exacto'; }
    else if (predResult === realResult)                { matchPts = 5;  ptsLabel = '✓ +5 ganador'; }
    else                                               { matchPts = 0;  ptsLabel = '✗ 0 pts'; }
  }
 
  function btnCls(val) {
    if (!predResult) return '';
    if (played) return predResult === val ? (predResult === realResult ? 'ok' : 'fail') : '';
    return predResult === val ? 'sel' + (val==='1'?'1':val==='x'?'x':'2') : '';
  }
 
  const disabledAttr = locked ? 'disabled' : '';
  const lockIcon = locked ? '<span style="font-size:.7rem;color:var(--text3)">🔒</span>' : '';
 
  const resultBadge = played
    ? `<span class="match-result-badge">${m.home_score} - ${m.away_score}</span>`
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
              value="${pGH !== null ? pGH : ''}"
              ${disabledAttr}
              onchange="setPredGoals(${m.id},'home',this.value)"
              oninput="if(this.value<0)this.value=0"
              title="Goles ${m.home}">
            <span class="goals-sep">:</span>
            <input class="goals-input" type="number" min="0" max="20" placeholder="?"
              value="${pGA !== null ? pGA : ''}"
              ${disabledAttr}
              onchange="setPredGoals(${m.id},'away',this.value)"
              oninput="if(this.value<0)this.value=0"
              title="Goles ${m.away}">
          </div>
          ${played && matchPts >= 0
            ? `<div class="match-result-row ${matchPts===10?'exact':matchPts===5?'ok':'fail'}">${ptsLabel}</div>`
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
        <span class="admin-match-name">${m.home} vs ${m.away}</span>
        <span style="font-size:.7rem;color:var(--text3)">${m.match_date}</span>
        <div class="admin-goals-row">
          <input class="goals-input admin-goals-input" type="number" min="0" max="20"
            value="${m.home_score !== null ? m.home_score : ''}"
            placeholder="—"
            onchange="setMatchResult(${m.id}, 'home', this.value)"
            oninput="if(this.value<0)this.value=0">
          <span class="goals-sep">:</span>
          <input class="goals-input admin-goals-input" type="number" min="0" max="20"
            value="${m.away_score !== null ? m.away_score : ''}"
            placeholder="—"
            onchange="setMatchResult(${m.id}, 'away', this.value)"
            oninput="if(this.value<0)this.value=0">
        </div>
      </div>`).join('')}`;
}
 
async function setMatchResult(matchId, side, value) {
  const m = localMatches.find(x => x.id === matchId);
  if (!m) return;
  const v = value === '' ? null : Number(value);
  if (side === 'home') m.home_score = v;
  else                 m.away_score = v;
  try {
    await api('PUT', '/prode/matches/' + matchId + '/result', {
      home_score: m.home_score,
      away_score: m.away_score
    });
    toast('Resultado guardado','s');
    renderProde();
  } catch(e) { toast(e.message,'e'); }
}
 
// ── Guardar predicción automáticamente ───────────────────────
async function setPred(matchId, val) {
  const locked = isMatchLocked(localMatches.find(m => m.id === matchId));
  if (locked) return;
 
  const existing = localPreds[matchId] || {};
  // Interpretar val como resultado para calcular goles si ya los tenía
  let homeScore = existing.home_score !== undefined ? existing.home_score : null;
  let awayScore = existing.away_score !== undefined ? existing.away_score : null;
 
  // Si no tiene goles cargados, poner placeholders según 1/x/2
  if (homeScore === null && awayScore === null) {
    if (val === '1') { homeScore = 1; awayScore = 0; }
    else if (val === 'x') { homeScore = 0; awayScore = 0; }
    else if (val === '2') { homeScore = 0; awayScore = 1; }
  }
 
  await savePrediction(matchId, homeScore, awayScore);
}
 
async function setPredGoals(matchId, side, value) {
  const locked = isMatchLocked(localMatches.find(m => m.id === matchId));
  if (locked) return;
  const existing = localPreds[matchId] || {};
  const homeScore = side === 'home' ? Number(value) : (existing.home_score !== undefined ? existing.home_score : null);
  const awayScore = side === 'away' ? Number(value) : (existing.away_score !== undefined ? existing.away_score : null);
  await savePrediction(matchId, homeScore, awayScore);
}
 
async function savePrediction(matchId, homeScore, awayScore) {
  try {
    const result = await api('POST', '/prode/predictions', { match_id: matchId, home_score: homeScore, away_score: awayScore });
    localPreds[matchId] = result;
    // Re-render solo la tarjeta del partido
    renderProde();
  } catch(e) { toast(e.message,'e'); }
}
 
// ══════════════════════════════════════════════════════════════
//  MIEMBROS — conectado al backend
// ══════════════════════════════════════════════════════════════
let localMembers = [];
 
async function renderMembers() {
  try {
    localMembers = await api('GET', '/members');
  } catch { localMembers = []; }
 
  const search = (document.getElementById('msearch').value || '').toLowerCase();
  const list   = localMembers.filter(m =>
    (!search || m.name.toLowerCase().includes(search) || (m.role||'').toLowerCase().includes(search)));
 
  document.getElementById('mcnt').textContent = `${list.length} miembro${list.length!==1?'s':''}`;
  document.getElementById('members-tb').innerHTML = list.map(m => {
    return `
      <tr>
        <td><div class="enc"><div class="av" style="width:30px;height:30px;font-size:.68rem;background:${m.avatar_color||avc(m.id)}">${ini(m.name)}</div><span class="enm">${m.name}</span></div></td>
        <td>${m.team||'—'}</td>
        <td>${m.role||'—'}</td>
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
      </tr>`;
  }).join('');
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
  if (!name || !role) { toast('Completá todos los campos','e'); return; }
  try {
    if (editingMemberId) {
      await api('PUT', '/members/' + editingMemberId, { name, role, team: '', avatar_color: avc(editingMemberId) });
      toast(name + ' actualizado','s');
    } else {
      await api('POST', '/members', { name, role, team: '', avatar_color: avc(Math.random()*8|0) });
      toast(name + ' agregado','s');
    }
    closeM('m-modal');
    renderMembers();
  } catch(e) { toast(e.message,'e'); }
}
 
async function deleteMember(id, name) {
  if (!confirm(`¿Eliminás a ${name}?`)) return;
  try {
    await api('DELETE', '/members/' + id);
    toast(name + ' eliminado','e');
    renderMembers();
  } catch(e) { toast(e.message,'e'); }
}
 
// ══════════════════════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════════════════════
function closeM(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.mb').forEach(b => b.addEventListener('click', e => { if(e.target===b) b.classList.remove('open'); }));
 
function toast(msg, type='') {
  const w = document.getElementById('tw');
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' '+type : '');
  t.innerHTML = `<span>${type==='s'?'✓':type==='e'?'✕':'ℹ'}</span> ${msg}`;
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
