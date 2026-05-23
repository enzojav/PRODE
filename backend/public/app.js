// ============================================================
//  APP.JS — Con sistema de autenticación y roles
//  Roles: "admin" (acceso total) | "player" (solo Prode)
// ============================================================

const AVATAR_COLORS = ['#6CACE4','#FFB81C','#85bde8','#002470','#3ae8d0','#ff8c42','#a8d8ea','#43e8b0'];
const avc = i => AVATAR_COLORS[i % AVATAR_COLORS.length];
const ini = n => n.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

let localMembers    = JSON.parse(JSON.stringify(DB_MEMBERS));
let localNews       = JSON.parse(JSON.stringify(DB_NEWS));
let localStandings  = [];
let scorePeriod     = 'Abr 2026';
let newsFilter      = '';
let editingMemberId = null;
let currentUser     = null;

// Grupo activo en el prode
let activeDate = null; // fecha seleccionada

const LS = {
  USERS:     'qh_users',
  STANDINGS: 'qh_standings',
  PREDS:     'qh_preds_',
  SUBMITTED: 'qh_sub_',
  SESSION:   'qh_session',
  NEWS:      'qh_news',
  MEMBERS:   'qh_members',
};

function lsGet(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function getUsers() {
  const stored = lsGet(LS.USERS, null);
  if (!stored) {
    const defaults = [{ username:'admin', password:'admin123', displayName:'Admin', role:'admin', color:'#6CACE4' }];
    lsSet(LS.USERS, defaults);
    return defaults;
  }
  return stored;
}
function saveUsers(users) { lsSet(LS.USERS, users); }
function findUser(username) { return getUsers().find(u => u.username.toLowerCase() === username.toLowerCase()); }

function getStandings() { return lsGet(LS.STANDINGS, []); }
function saveStandings(s) { lsSet(LS.STANDINGS, s); }
function getUserPreds(username) { return lsGet(LS.PREDS + username, {}); }
function saveUserPreds(username, p) { lsSet(LS.PREDS + username, p); }
function getUserSubmitted(username) { return lsGet(LS.SUBMITTED + username, false); }
function saveUserSubmitted(username, v) { lsSet(LS.SUBMITTED + username, v); }

function initLocalData() {
  localNews    = lsGet(LS.NEWS,    null) || JSON.parse(JSON.stringify(DB_NEWS));
  localMembers = lsGet(LS.MEMBERS, null) || JSON.parse(JSON.stringify(DB_MEMBERS));
}
function persistNews()    { lsSet(LS.NEWS,    localNews); }
function persistMembers() { lsSet(LS.MEMBERS, localMembers); }

window.addEventListener('DOMContentLoaded', () => {
  initLocalData();
  const session = lsGet(LS.SESSION, null);
  if (session) { const user = findUser(session); if (user) { currentUser = user; bootApp(); return; } }
  showAuthScreen();
});

function showAuthScreen() {
  document.getElementById('ls').style.display          = 'none';
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

function doLogin() {
  const username = document.getElementById('l-user').value.trim();
  const password = document.getElementById('l-pass').value;
  const errEl    = document.getElementById('auth-error');
  if (!username || !password) { errEl.textContent = 'Completá todos los campos.'; return; }
  const user = findUser(username);
  if (!user || user.password !== password) { errEl.textContent = 'Usuario o contraseña incorrectos.'; return; }
  currentUser = user;
  lsSet(LS.SESSION, username);
  bootApp();
}

function doRegister() {
  const displayName = document.getElementById('r-name').value.trim();
  const username    = document.getElementById('r-user').value.trim();
  const password    = document.getElementById('r-pass').value;
  const password2   = document.getElementById('r-pass2').value;
  const errEl       = document.getElementById('auth-error');
  if (!displayName || !username || !password || !password2) { errEl.textContent = 'Completá todos los campos.'; return; }
  if (password !== password2) { errEl.textContent = 'Las contraseñas no coinciden.'; return; }
  if (password.length < 4)    { errEl.textContent = 'La contraseña debe tener al menos 4 caracteres.'; return; }
  if (findUser(username))     { errEl.textContent = 'Ese usuario ya existe.'; return; }
  const users = getUsers();
  const newUser = { username, password, displayName, role:'player', color: AVATAR_COLORS[users.length % AVATAR_COLORS.length] };
  users.push(newUser);
  saveUsers(users);
  const standings = getStandings();
  standings.push({ name: displayName, username, pts:0, ok:0, tot:0 });
  saveStandings(standings);
  currentUser = newUser;
  lsSet(LS.SESSION, username);
  bootApp();
}

function doLogout() {
  currentUser = null;
  localStorage.removeItem(LS.SESSION);
  showAuthScreen();
  document.getElementById('l-user').value = '';
  document.getElementById('l-pass').value = '';
  document.getElementById('auth-error').textContent = '';
}

function bootApp() {
  showApp();
  applyRole();
  fillTeamSelects();
  setupNav();
  updateUserBadge();
  if (currentUser.role === 'admin') { renderDashboard(); navigateTo('dashboard'); }
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
  document.querySelector('.uavs').textContent      = ini(u.displayName);
  document.querySelector('.uavs').style.background = u.color || '#6CACE4';
  document.querySelector('.uin .un').textContent   = u.displayName;
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
  ({ dashboard:renderDashboard, score:renderScore, training:renderTraining, news:renderNews, prode:renderProde, members:renderMembers })[sec]?.();
}

function setupNav() {
  document.querySelectorAll('.ni').forEach(el => el.addEventListener('click', () => navigateTo(el.dataset.s)));
}

// ── DASHBOARD ──────────────────────────────────────────────────
function renderDashboard() {
  document.getElementById('d-members').textContent  = localMembers.length;
  document.getElementById('d-courses').textContent  = DB_COURSES.filter(c => c.status === 'Activo').length;
  document.getElementById('d-approved').textContent = DB_TRAINING_PROGRESS.filter(p => p.status === 'Aprobado').length;
  const aprScores = DB_SCORES.filter(s => s.period === 'Abr 2026');
  document.getElementById('d-avg').textContent = aprScores.length ? (aprScores.reduce((a,s) => a+s.value,0)/aprScores.length).toFixed(1) : '—';
  document.getElementById('act-list').innerHTML = DB_ACTIVITY.map(a => `
    <li class="ai"><span class="adot dot-${a.color}"></span><div><div class="at">${a.message}</div><div class="atm">${a.time}</div></div></li>`).join('');
  const topList = getScoreRanking('Abr 2026').slice(0,5);
  document.getElementById('top-list').innerHTML = topList.map((m,i) => {
    const pkc = i===0?'rk1':i===1?'rk2':i===2?'rk3':'rkn';
    const team = DB_TEAMS.find(t => t.id === m.teamId);
    return `<div class="rank-item"><div class="rank-pos ${pkc}">${i+1}</div><div class="av" style="width:30px;height:30px;font-size:.68rem;background:${avc(m.id)}">${ini(m.name)}</div><div class="rank-name">${m.name}<div class="rank-team">${team?.name||''}</div></div><div class="rank-score">${m.avg}</div></div>`;
  }).join('');
}

// ── SCORE BALANCE ──────────────────────────────────────────────
function calcWeightedScore(memberId, period) {
  const ms = DB_SCORES.filter(s => s.memberId===memberId && s.period===period);
  if (!ms.length) return null;
  let tw=0, ws=0;
  ms.forEach(s => { const cat=DB_SCORE_CATEGORIES.find(c=>c.id===s.categoryId); if(cat){ws+=s.value*cat.weight;tw+=cat.weight;} });
  return tw ? Math.round(ws/tw*10)/10 : null;
}
function getScoreRanking(period) {
  return localMembers.map(m=>({...m,avg:calcWeightedScore(m.id,period)})).filter(m=>m.avg!==null).sort((a,b)=>b.avg-a.avg);
}
function renderScore() {
  const periods = [...new Set(DB_SCORES.map(s=>s.period))];
  document.getElementById('period-btns').innerHTML = periods.map(p =>
    `<button class="pbtn${p===scorePeriod?' active':''}" onclick="setPeriod('${p}')">${p}</button>`).join('');
  const BC = ['#6CACE4','#FFB81C','#85bde8','#E8334A','#3ae8d0'];
  document.getElementById('score-grid').innerHTML = localMembers.map(m => {
    const scores = DB_SCORES.filter(s=>s.memberId===m.id&&s.period===scorePeriod);
    const avg    = calcWeightedScore(m.id,scorePeriod)??'—';
    const color  = avg>=8.5?'#6CACE4':avg>=7?'#FFB81C':'#E8334A';
    const team   = DB_TEAMS.find(t=>t.id===m.teamId);
    return `<div class="smc"><div class="smc-hdr"><div class="av" style="width:36px;height:36px;font-size:.78rem;background:${avc(m.id)}">${ini(m.name)}</div><div><div class="smc-name">${m.name}</div><div class="smc-role">${team?.name||''} · ${m.role}</div></div><div class="smc-score"><div class="smc-val" style="color:${color}">${avg}</div><div class="smc-lbl">Score</div></div></div>${scores.map((s,i)=>{const cat=DB_SCORE_CATEGORIES.find(c=>c.id===s.categoryId);return `<div class="bar-wrap"><div class="bar-lbl"><span>${cat?.icon||''} ${cat?.name||''}</span><span>${s.value}</span></div><div class="bar-bg"><div class="bar-fill" style="width:${s.value*10}%;background:${BC[i%BC.length]}"></div></div></div>`;}).join('')}</div>`;
  }).join('');
  const ranking = getScoreRanking(scorePeriod);
  document.getElementById('ranking-list').innerHTML = ranking.map((m,i) => {
    const pkc=i===0?'rk1':i===1?'rk2':i===2?'rk3':'rkn';
    const team=DB_TEAMS.find(t=>t.id===m.teamId);
    return `<div class="rank-item"><div class="rank-pos ${pkc}">${i+1}</div><div class="av" style="width:28px;height:28px;font-size:.66rem;background:${avc(m.id)}">${ini(m.name)}</div><div class="rank-name">${m.name}<div class="rank-team">${team?.name||''}</div></div><div class="rank-score">${m.avg}</div></div>`;
  }).join('');
}
function setPeriod(p) { scorePeriod=p; renderScore(); }

// ── CAPACITACIONES ─────────────────────────────────────────────
function renderTraining() {
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

// ── NOTICIAS ───────────────────────────────────────────────────
function renderNews() {
  document.getElementById('tick-inner').innerHTML = [...localNews,...localNews].map(n=>`<span>${n.title}</span>`).join('');
  const cats=['Todos',...new Set(localNews.map(n=>n.category))];
  document.getElementById('news-filter').innerHTML = cats.map(c =>
    `<button class="nftag${(!newsFilter&&c==='Todos')||newsFilter===c?' active':''}" onclick="setNewsFilter('${c}')">${c}</button>`).join('');
  const filtered=newsFilter?localNews.filter(n=>n.category===newsFilter):localNews;
  const sorted=[...filtered].sort((a,b)=>b.id-a.id);
  const hero=sorted[0];
  if(hero) document.getElementById('news-hero').innerHTML=`<div class="hero-emoji">${hero.emoji}</div><span class="hero-tag">${hero.category}</span><div class="hero-title">${hero.title}</div><div class="hero-body">${hero.body}</div><div class="hero-meta">Por ${hero.author} · ${hero.date}</div>`;
  document.getElementById('news-cards').innerHTML=sorted.slice(1).map(n=>`<div class="ncard"><div class="ncard-top"><span class="ncard-emoji">${n.emoji}</span><span class="ncard-tag">${n.category}</span></div><div class="ncard-title">${n.title}</div><div class="ncard-meta">Por ${n.author} · ${n.date}</div></div>`).join('');
}
function setNewsFilter(cat) { newsFilter=cat==='Todos'?'':cat; renderNews(); }
function openNewsModal() {
  ['n-title','n-body','n-author'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('n-emoji').value='📋';
  document.getElementById('n-modal').classList.add('open');
}
function saveNews() {
  const title=document.getElementById('n-title').value.trim();
  const body=document.getElementById('n-body').value.trim();
  const cat=document.getElementById('n-cat').value;
  const emoji=document.getElementById('n-emoji').value||'📋';
  const author=document.getElementById('n-author').value.trim()||'Admin';
  if(!title||!body){toast('Completá título y contenido','e');return;}
  const now=new Date().toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'});
  localNews.push({id:Math.max(...localNews.map(n=>n.id),0)+1,title,body,category:cat,emoji,author,date:now});
  persistNews(); closeM('n-modal'); renderNews(); toast('Noticia publicada','s');
}

// ══════════════════════════════════════════════════════════════
//  PRODE — Selector de fechas + tarjetas estilo FIFA
// ══════════════════════════════════════════════════════════════

function renderProde() {
  if (!currentUser) return;
  const username       = currentUser.username;
  const predictions    = getUserPreds(username);
  const prodeSubmitted = getUserSubmitted(username);

  // ── Calcular mis puntos ──
  const myPts = DB_MATCHES.reduce((s,m) => {
    const pred = predictions[m.id];
    if (!pred || !m.result) return s;
    const pWinner = pred.winner !== undefined ? pred.winner : pred;
    const pGH = pred.goalsHome !== undefined ? pred.goalsHome : null;
    const pGA = pred.goalsAway !== undefined ? pred.goalsAway : null;
    const exactHome = pGH !== null && pGH === m.goalsHome;
    const exactAway = pGA !== null && pGA === m.goalsAway;
    if (exactHome && exactAway) return s + 10;
    if (pWinner === m.result)   return s + 5;
    return s;
  }, 0);
  document.getElementById('my-pts').textContent = myPts;

  // ── Panel admin ──
  const adminPanel = document.getElementById('admin-prode-panel');
  if (adminPanel) {
    adminPanel.style.display = currentUser.role === 'admin' ? '' : 'none';
    if (currentUser.role === 'admin') renderAdminProdePanel();
  }

  // ── Strip de fechas ──
  const allDates = [...new Set(DB_MATCHES.map(m => m.date))];
  // Ordenar por id del primer partido de cada fecha
  allDates.sort((a,b) => DB_MATCHES.find(m=>m.date===a).id - DB_MATCHES.find(m=>m.date===b).id);
  if (!activeDate || !allDates.includes(activeDate)) activeDate = allDates[0];

  const strip = document.getElementById('date-strip');
  strip.innerHTML = allDates.map(d => {
    const dayMatches = DB_MATCHES.filter(m => m.date === d);
    const hasResult  = dayMatches.some(m => m.result !== '');
    const parts = d.split(' '); // ["Jue","11","Jun"]
    return `
      <button class="date-chip${d === activeDate ? ' active' : ''}${hasResult ? ' has-result' : ''}"
              onclick="setDate('${d}')">
        <span class="dc-day">${parts[0]}</span>
        <span class="dc-num">${parts[1]}</span>
        <span class="dc-mon">${parts[2]}</span>
        ${hasResult ? '<span class="dc-dot"></span>' : ''}
      </button>`;
  }).join('');

  // ── Partidos del día ──
  const dayMatches = DB_MATCHES.filter(m => m.date === activeDate);
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
        ${dayMatches.map(m => renderMatchCard(m, predictions, prodeSubmitted)).join('')}
      </div>`;
  }

  // ── Status bar ──
  const statusEl = document.getElementById('prode-status');
  const totalFilled = Object.keys(predictions).filter(k => {
    const p = predictions[k]; return p && (p.winner || typeof p === 'string');
  }).length;
  const totalMatches = DB_MATCHES.length;
  if (prodeSubmitted) {
    statusEl.innerHTML = `
      <div class="status-bar submitted">
        ✅ Pronóstico enviado · <strong>${myPts} puntos</strong> · ${totalFilled}/${totalMatches} partidos cargados
      </div>`;
  } else {
    const canSend = totalFilled >= 1;
    statusEl.innerHTML = `
      <div class="status-bar">
        <span>${totalFilled}/${totalMatches} partidos completados</span>
        <button class="btn btn-a" onclick="submitProde()" ${canSend ? '' : 'disabled'} style="${canSend ? '' : 'opacity:.4'}">
          🚀 Enviar pronóstico
        </button>
      </div>`;
  }

  // ── Tabla de posiciones ──
  recalcAllStandings();
  localStandings = getStandings();
  const sorted = [...localStandings].sort((a,b) => b.pts - a.pts);
  document.getElementById('standings').innerHTML = sorted.length
    ? sorted.map((s,i) => {
        const pkc = i===0?'rk1':i===1?'rk2':i===2?'rk3':'rkn';
        const isMe = s.username === username;
        return `
          <div class="sr">
            <div class="srp ${pkc}">${i+1}</div>
            <div class="srname">
              ${isMe ? `<strong>${s.name}</strong> <span class="me-tag">← vos</span>` : s.name}
              <div class="srdet">${s.ok}/${s.tot} aciertos</div>
            </div>
            <div class="srpts">${s.pts} pts</div>
          </div>`;
      }).join('')
    : '<div class="no-standings">Nadie envió pronóstico todavía.</div>';
}

function setDate(d) {
  activeDate = d;
  renderProde();
}


// ── Render de una tarjeta de partido ──────────────────────────
function renderMatchCard(m, predictions, submitted) {
  const pred    = predictions[m.id] || {};
  const pWinner = pred.winner || null;
  const pGH     = pred.goalsHome !== undefined ? pred.goalsHome : null;
  const pGA     = pred.goalsAway !== undefined ? pred.goalsAway : null;
  const res     = m.result;
  const played  = res !== '';

  function flagOrGray(team) {
    if (team.known) return `<span class="team-flag">${team.flag}</span>`;
    return `<span class="team-flag unknown">?</span>`;
  }

  function btnCls(val, sel) {
    if (!submitted) return pWinner === val ? sel : '';
    if (!played)    return pWinner === val ? sel : '';
    return pWinner === val ? (pWinner === res ? 'ok' : 'fail') : '';
  }

  let matchPts = -1, ptsLabel = '';
  if (submitted && played && pWinner) {
    const exactHome = pGH !== null && pGH === m.goalsHome;
    const exactAway = pGA !== null && pGA === m.goalsAway;
    if (exactHome && exactAway) { matchPts = 10; ptsLabel = '🎯 +10 exacto'; }
    else if (pWinner === res)   { matchPts = 5;  ptsLabel = '✓ +5 ganador'; }
    else                        { matchPts = 0;  ptsLabel = '✗ 0'; }
  }

  const disabledAttr = submitted ? 'disabled' : '';
  const showGoals = pWinner || submitted;
  const goalsSection = showGoals ? `
    <div class="pred-goals">
      <input class="goals-input" type="number" min="0" max="20" placeholder="?"
        value="${pGH !== null && pGH !== undefined ? pGH : ''}"
        ${submitted ? 'disabled' : ''}
        onchange="setPredGoals(${m.id},'home',this.value)"
        oninput="if(this.value<0)this.value=0"
        title="Goles ${m.home.name}">
      <span class="goals-sep">:</span>
      <input class="goals-input" type="number" min="0" max="20" placeholder="?"
        value="${pGA !== null && pGA !== undefined ? pGA : ''}"
        ${submitted ? 'disabled' : ''}
        onchange="setPredGoals(${m.id},'away',this.value)"
        oninput="if(this.value<0)this.value=0"
        title="Goles ${m.away.name}">
    </div>` : '<div class="pred-goals-hint">Elegí 1·X·2 para ingresar goles</div>';

  const resultBadge = played
    ? `<span class="match-result-badge">${m.goalsHome !== null ? m.goalsHome+' - '+m.goalsAway : '? - ?'}</span>`
    : `<span class="match-vs">VS</span>`;

  return `
    <div class="match-card${played ? ' played' : ''}">
      <div class="match-meta">
        <span class="match-date">${m.time} hs · ${m.venue}</span>
      </div>
      <div class="match-body">
        <div class="match-team home">
          ${flagOrGray(m.home)}
          <span class="team-name">${m.home.name}</span>
        </div>
        <div class="match-center">
          ${resultBadge}
          <div class="pred-btns">
            <button class="pb ${btnCls('1','sel1')}" onclick="setPred(${m.id},'1')" ${disabledAttr} title="Gana ${m.home.name}">1</button>
            <button class="pb ${btnCls('x','selx')}" onclick="setPred(${m.id},'x')" ${disabledAttr} title="Empate">X</button>
            <button class="pb ${btnCls('2','sel2')}" onclick="setPred(${m.id},'2')" ${disabledAttr} title="Gana ${m.away.name}">2</button>
          </div>
          ${goalsSection}
          ${submitted && played && matchPts >= 0
            ? `<div class="match-result-row ${matchPts===10?'exact':matchPts===5?'ok':'fail'}">${ptsLabel}</div>`
            : ''}
        </div>
        <div class="match-team away">
          <span class="team-name">${m.away.name}</span>
          ${flagOrGray(m.away)}
        </div>
      </div>
    </div>`;
}

// ── Panel admin resultados ────────────────────────────────────
function renderAdminProdePanel() {
  const panel = document.getElementById('admin-match-list');
  if (!panel) return;
  const groupMatches = activeDate ? DB_MATCHES.filter(m => m.date === activeDate) : DB_MATCHES;
  panel.innerHTML = `
    <p style="font-size:.75rem;color:var(--text3);margin-bottom:10px">
      Cargá resultados del día <strong>${activeDate || 'seleccionado'}</strong>. Ingresá los goles y el resultado se calcula solo.<br>
      <span style="color:var(--accent);font-weight:600">🎯 Exacto = 10 pts · ✓ Ganador/Empate = 5 pts</span>
    </p>
    ${groupMatches.map(m => `
      <div class="admin-match-row">
        <span class="admin-match-name">${m.home.flag} ${m.home.name} vs ${m.away.flag} ${m.away.name}</span>
        <span style="font-size:.7rem;color:var(--text3)">${m.date}</span>
        <div class="admin-goals-row">
          <span class="admin-goals-label">${m.home.flag} Goles:</span>
          <input class="goals-input admin-goals-input" type="number" min="0" max="20"
            value="${m.goalsHome !== null ? m.goalsHome : ''}"
            placeholder="—"
            onchange="setMatchGoals(${m.id}, 'home', this.value)"
            oninput="if(this.value<0)this.value=0">
          <span class="goals-sep">:</span>
          <input class="goals-input admin-goals-input" type="number" min="0" max="20"
            value="${m.goalsAway !== null ? m.goalsAway : ''}"
            placeholder="—"
            onchange="setMatchGoals(${m.id}, 'away', this.value)"
            oninput="if(this.value<0)this.value=0">
          <span class="admin-goals-label">${m.away.flag} Goles</span>
          <span class="admin-result-preview ${m.result ? 'has-result' : ''}">
            ${m.result === '1' ? '→ Gana '+m.home.name : m.result === 'x' ? '→ Empate' : m.result === '2' ? '→ Gana '+m.away.name : '(sin resultado)'}
          </span>
        </div>
      </div>`).join('')}`;
}

function setMatchGoals(matchId, side, value) {
  const m = DB_MATCHES.find(x => x.id === matchId);
  if (!m) return;
  const v = value === '' ? null : Number(value);
  if (side === 'home') m.goalsHome = v;
  else                 m.goalsAway = v;
  // Auto-calcular resultado según goles
  if (m.goalsHome !== null && m.goalsAway !== null) {
    if      (m.goalsHome > m.goalsAway)  m.result = '1';
    else if (m.goalsHome < m.goalsAway)  m.result = '2';
    else                                  m.result = 'x';
  } else {
    m.result = '';
  }
  recalcAllStandings();
  renderProde();
  toast('Resultado actualizado','s');
}

function setMatchResult(matchId, result) {
  const m = DB_MATCHES.find(x => x.id === matchId);
  if (m) { m.result = result; recalcAllStandings(); renderProde(); toast('Resultado guardado','s'); }
}

function recalcAllStandings() {
  const users = getUsers();
  const standings = [];
  users.forEach(u => {
    const preds = getUserPreds(u.username);
    let pts = 0, ok = 0, tot = 0;
    DB_MATCHES.forEach(m => {
      if (!m.result) return;
      const pred = preds[m.id];
      if (!pred) return;
      const pWinner = pred.winner || pred;
      const pGH = pred.goalsHome !== undefined ? pred.goalsHome : null;
      const pGA = pred.goalsAway !== undefined ? pred.goalsAway : null;
      tot++;
      const exactHome = pGH !== null && pGH === m.goalsHome;
      const exactAway = pGA !== null && pGA === m.goalsAway;
      if (exactHome && exactAway) { pts += 10; ok++; }
      else if (pWinner === m.result) { pts += 5; ok++; }
    });
    if (getUserSubmitted(u.username)) {
      standings.push({ name: u.displayName, username: u.username, pts, ok, tot });
    }
  });
  saveStandings(standings);
}

function setPred(matchId, val) {
  if (getUserSubmitted(currentUser.username)) return;
  const preds = getUserPreds(currentUser.username);
  // val is a winner string: '1','x','2'
  const existing = preds[matchId] || {};
  preds[matchId] = {
    winner: val,
    goalsHome: existing.goalsHome !== undefined ? existing.goalsHome : null,
    goalsAway: existing.goalsAway !== undefined ? existing.goalsAway : null,
  };
  saveUserPreds(currentUser.username, preds);
  renderProde();
}

function setPredGoals(matchId, side, value) {
  if (getUserSubmitted(currentUser.username)) return;
  const preds = getUserPreds(currentUser.username);
  const existing = preds[matchId] || {};
  preds[matchId] = {
    winner: existing.winner || null,
    goalsHome: side === 'home' ? Number(value) : (existing.goalsHome !== undefined ? existing.goalsHome : null),
    goalsAway: side === 'away' ? Number(value) : (existing.goalsAway !== undefined ? existing.goalsAway : null),
  };
  saveUserPreds(currentUser.username, preds);
}

function submitProde() {
  const username = currentUser.username;
  const preds    = getUserPreds(username);
  const filled   = Object.keys(preds).filter(k => preds[k] && preds[k].winner).length;
  if (filled < 1) {
    toast('Votá al menos un partido para enviar','e'); return;
  }
  saveUserSubmitted(username, true);
  const standings = getStandings();
  if (!standings.find(s => s.username === username)) {
    standings.push({ name: currentUser.displayName, username, pts:0, ok:0, tot:0 });
    saveStandings(standings);
  }
  recalcAllStandings();
  renderProde();
  toast(`¡Pronóstico enviado! 🎉 (${filled} partido${filled!==1?'s':''} votado${filled!==1?'s':''})`, 's');
}

// ── MIEMBROS ───────────────────────────────────────────────────
function fillTeamSelects() {
  const opts = DB_TEAMS.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
  const mTeam  = document.getElementById('m-team');
  const mTeamF = document.getElementById('mteam');
  if (mTeam)  mTeam.innerHTML  = '<option value="">Seleccionar…</option>' + opts;
  if (mTeamF) mTeamF.innerHTML = '<option value="">Todos los equipos</option>' + opts;
}

function renderMembers() {
  const search = (document.getElementById('msearch').value || '').toLowerCase();
  const teamId = document.getElementById('mteam').value;
  const list   = localMembers.filter(m =>
    (!teamId || m.teamId == teamId) &&
    (!search || m.name.toLowerCase().includes(search) || m.role.toLowerCase().includes(search)));
  document.getElementById('mcnt').textContent = `${list.length} miembro${list.length!==1?'s':''}`;
  document.getElementById('members-tb').innerHTML = list.map(m => {
    const team  = DB_TEAMS.find(t => t.id === m.teamId);
    const avg   = calcWeightedScore(m.id, 'Abr 2026');
    const color = avg >= 8.5 ? 'var(--accent)' : avg >= 7 ? 'var(--amber)' : 'var(--accent2)';
    const aprov = DB_TRAINING_PROGRESS.filter(p => p.memberId === m.id && p.status === 'Aprobado').length;
    return `
      <tr>
        <td><div class="enc"><div class="av" style="width:30px;height:30px;font-size:.68rem;background:${avc(m.id)}">${ini(m.name)}</div><span class="enm">${m.name}</span></div></td>
        <td>${team?.name||'—'}</td>
        <td>${m.role}</td>
        <td><span style="font-family:'Syne',sans-serif;font-weight:700;color:${color}">${avg??'—'}</span></td>
        <td>${aprov} curso${aprov!==1?'s':''}</td>
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
document.getElementById('mteam')?.addEventListener('change', renderMembers);

function openMemberModal() {
  editingMemberId = null;
  document.getElementById('m-mtit').textContent = 'Nuevo miembro';
  ['m-name','m-role'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('m-team').value = '';
  document.getElementById('m-modal').classList.add('open');
}
function openEditMember(id) {
  const m = localMembers.find(x => x.id === id);
  if (!m) return;
  editingMemberId = id;
  document.getElementById('m-mtit').textContent = 'Editar miembro';
  document.getElementById('m-name').value  = m.name;
  document.getElementById('m-role').value  = m.role;
  document.getElementById('m-team').value  = m.teamId;
  document.getElementById('m-modal').classList.add('open');
}
function saveMember() {
  const name   = document.getElementById('m-name').value.trim();
  const role   = document.getElementById('m-role').value.trim();
  const teamId = parseInt(document.getElementById('m-team').value) || null;
  if (!name || !role || !teamId) { toast('Completá todos los campos','e'); return; }
  if (editingMemberId) {
    const m = localMembers.find(x => x.id === editingMemberId);
    m.name = name; m.role = role; m.teamId = teamId;
    toast(name + ' actualizado','s');
  } else {
    localMembers.push({ id: Math.max(...localMembers.map(m=>m.id),0)+1, name, role, teamId });
    toast(name + ' agregado','s');
  }
  persistMembers(); closeM('m-modal'); renderMembers(); renderDashboard();
}
function deleteMember(id, name) {
  if (!confirm(`¿Eliminás a ${name}?`)) return;
  localMembers = localMembers.filter(m => m.id !== id);
  persistMembers(); toast(name + ' eliminado','e'); renderMembers(); renderDashboard();
}

// ── UTILS ──────────────────────────────────────────────────────
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