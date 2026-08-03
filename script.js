/* ============================================================
   LIFEQUEST — script.js
   Logica completa dell'applicazione
   Struttura:
     1. Costanti & configurazione
     2. Database (localStorage)
     3. Utilità
     4. Sistema XP & livelli
     5. Effetti visivi
     6. Autenticazione
     7. Navigazione
     8. Dashboard
     9. Quest (con Calendario integrato)
    10. Libri
    11. Trofei
    12. Esami / Capitoli / Concetti
    13. Vita / Attività
    14. Sfide PvP
    15. Statistiche
    16. Export / Import
    17. Modali
    18. Avvio
   ============================================================ */

/* ── 1. COSTANTI ── */

const API_URL = "https://script.google.com/macros/s/AKfycbyL88AM7Pdtyl81VZxGPW2lOBS4npG72kLrdxygGUvVDjzPwUHlViwJ-6en4pNn-7uvLA/exec";

const DB_KEY = 'lq_db_v2';

const RANK_TITLES = [
  'Novizio', 'Apprendista', 'Studioso', 'Veterano', 'Esperto',
  'Maestro', 'Gran Maestro', 'Leggenda', 'Semidio', 'Dio degli Eroi'
];

const XP_BOOK_PER_PAGE = 3;
const BOOK_DIFF_BONUS  = [0, 50, 150, 300, 500, 800];

const BOOK_GENRE_STAT = {
  saggistica: 'cultura',
  filosofia:  'mente',
  scienza:    'mente',
  storia:     'cultura',
  economia:   'mente',
  narrativa:  'cultura',
  'self-help':'mente',
  tecnico:    'mente',
  altro:      'cultura'
};

const DIFF_MULT = [1, 1, 1.15, 1.3, 1.5, 1.7];

const CAT_STAT = {
  mente:          'mente',
  corpo:          'corpo',
  cultura:        'cultura',
  sociale:        'sociale',
  'produttività': 'produttività',
  athletic:       'corpo',
  mental:         'mente',
  mixed:          'mente'
};

const STAT_COLORS = {
  mente:        '#7c6af7',
  corpo:        '#3de89a',
  cultura:      '#f5c842',
  sociale:      '#ff6eb4',
  produttività: '#3dcff5',
  sfide:        '#ff5e7a'
};

const MOTIVS = [
  'Ogni grande impresa inizia con un primo passo. 🚀',
  'La costanza batte il talento quando il talento non si impegna.',
  'Un giorno da guerriero vale più di mille da spettatore. ⚔️',
  'Non contare i giorni — fai contare i giorni.',
  'La disciplina è scegliere tra ciò che vuoi adesso e ciò che vuoi di più.',
  'Il successo è la somma di piccoli sforzi ripetuti ogni giorno.',
  'Il momento perfetto per iniziare era ieri. Il secondo migliore è adesso.',
  'Allenati come se nessuno guardasse, studia come se la vita dipendesse da questo.',
  'Non esiste talento, solo dedizione mascherata da genio. 🧠',
  'Un capitolo al giorno tiene l\'ignoranza lontano. 📖'
];

const ACTIVITIES = [
  { type: 'gym',      name: 'Palestra',        emoji: '🏋️', stat: 'corpo',        extra: 'workout', xp_base: 120 },
  { type: 'run',      name: 'Corsa',           emoji: '🏃', stat: 'corpo',        extra: null,      xp_base: 80  },
  { type: 'sport',    name: 'Sport',           emoji: '⚽', stat: 'corpo',        extra: null,      xp_base: 70  },
  { type: 'social',   name: 'Uscita sociale',  emoji: '🤝', stat: 'sociale',      extra: null,      xp_base: 35  },
  { type: 'meditate', name: 'Meditazione',     emoji: '🧘', stat: 'mente',        extra: 'mins',    xp_base: 30  },
  { type: 'cook',     name: 'Cucinare sano',   emoji: '🍳', stat: 'corpo',        extra: null,      xp_base: 20  },
  { type: 'creative', name: 'Creatività',      emoji: '🎨', stat: 'cultura',      extra: 'mins',    xp_base: 25  },
  { type: 'nature',   name: 'Escursione',      emoji: '🌲', stat: 'corpo',        extra: null,      xp_base: 60  },
  { type: 'custom',   name: 'Attività custom', emoji: '⭐', stat: 'produttività', extra: 'custom',  xp_base: 25  }
];


/* ── 2. DATABASE ── */

function mkDB() {
  return {
    users:               [],
    quests:              [],
    exams:               [],
    chapters:            [],
    concepts:            [],
    sessions:            [],
    books:               [],
    book_sessions:       [],
    activities:          [],
    challenges:          [],
    challenge_templates: []
  };
}

function loadDB() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY)) || mkDB();
  } catch (e) {
    return mkDB();
  }
}

function saveDB() {
  localStorage.setItem(DB_KEY, JSON.stringify(DB));
}

let DB  = loadDB();
let CUR = null;

try {
  CUR = JSON.parse(localStorage.getItem('lq_cur_v2') || 'null');
} catch (e) {}


/* ── 3. UTILITÀ ── */

function uid() {
  return Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 5);
}

function ts() { return Date.now(); }

function today() { return new Date().toISOString().split('T')[0]; }

async function hashStr(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function deviceFP() {
  try {
    return btoa([
      navigator.userAgent.length,
      screen.width,
      screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      navigator.language
    ].join('|'));
  } catch (e) {
    return 'fp_' + Date.now();
  }
}

function randCode() {
  return 'LQ-' + Math.floor(1000 + Math.random() * 9000);
}

function diffStars(d) {
  return '⭐'.repeat(d);
}


/* ── 4. SISTEMA XP & LIVELLI ── */

function xpForLevel(l) {
  return Math.round(500 * l * l);
}

function calcLevel(xp) {
  let l = 1;
  while (xpForLevel(l + 1) <= xp) l++;
  return l;
}

function rankTitle(l) {
  return RANK_TITLES[Math.min(Math.floor((l - 1) / 5), RANK_TITLES.length - 1)];
}

function streakMult(u) {
  const d = u.streak_days || 0;
  if (d >= 30) return 1.5;
  if (d >= 14) return 1.3;
  if (d >= 7)  return 1.15;
  if (d >= 3)  return 1.05;
  return 1;
}

function awardXP(amount, stat, note, skipUpdate) {
  if (!CUR) return 0;
  const u = getUser(CUR.id);
  if (!u) return 0;

  const mult = streakMult(u);
  const xp   = Math.max(1, Math.round(amount * mult));

  u.xp_total = (u.xp_total || 0) + xp;
  u.level    = calcLevel(u.xp_total);

  if (stat && u.stats) {
    u.stats[stat] = (u.stats[stat] || 0) + xp;
  }

  const td = today();
  if (u.last_active !== td) {
    const yd = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    u.streak_days = (u.last_active === yd) ? (u.streak_days || 0) + 1 : 1;
    u.last_active = td;
  }

  saveDB();
  syncCUR(u);
  showToast(`+${xp} XP ✨ ${note || ''}`);
  spawnXPFloat(xp);

  if (!skipUpdate) updateDashboard();
  return xp;
}

function getUser(id) {
  return DB.users.find(u => u.id === id);
}

function syncCUR(u) {
  CUR = u;
  localStorage.setItem('lq_cur_v2', JSON.stringify(u));
}


/* ── 5. EFFETTI VISIVI ── */

function spawnXPFloat(xp) {
  const el = document.createElement('div');
  el.className   = 'xp-float';
  el.textContent = '+' + xp + ' XP';
  el.style.top   = (70 + Math.random() * 80) + 'px';
  el.style.left  = (60 + Math.random() * 200) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

let toastTimer;

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}


/* ── 6. AUTENTICAZIONE ── */

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((b, i) =>
    b.classList.toggle('active', i === (tab === 'login' ? 0 : 1))
  );
  document.getElementById('login-form').style.display    = tab === 'login'    ? '' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? '' : 'none';
  document.getElementById('auth-error').textContent = '';
}

async function doRegister() {
  const user = document.getElementById('r-user').value.trim();
  const pass = document.getElementById('r-pass').value;
  const pin  = document.getElementById('r-pin').value.trim();
  const err  = document.getElementById('auth-error');

  if (user.length < 3)       { err.textContent = 'Username: min 3 caratteri'; return; }
  if (pass.length < 6)       { err.textContent = 'Password: min 6 caratteri'; return; }
  if (!/^\d{4}$/.test(pin))  { err.textContent = 'PIN: esattamente 4 cifre';  return; }

  const password_hash = await hashStr(pass + 'lq_salt_v2');
  const pin_hash      = await hashStr(pin  + 'lq_pin_v2');

  err.textContent = 'Registrazione in corso sul Cloud...';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'REGISTER_USER',
        payload: { username: user, password_hash, pin_hash }
      })
    });

    const result = await response.json();

    if (result.success) {
      const u = {
        id:           result.user_id,
        username:     user,
        password_hash,
        pin_hash,
        xp_total:     0,
        level:        1,
        streak_days:  0,
        last_active:  today(),
        stats:        { mente: 0, corpo: 0, cultura: 0, sociale: 0, produttività: 0, sfide: 0 }
      };
      DB.users.push(u);
      saveDB();
      syncCUR(u);
      bootApp();
    } else {
      err.textContent = result.message || 'Errore durante la registrazione';
    }
  } catch (e) {
    err.textContent = 'Errore di connessione al database.';
  }
}

async function doLogin() {
  const user = document.getElementById('l-user').value.trim();
  const pass = document.getElementById('l-pass').value;
  const err  = document.getElementById('auth-error');

  if (!user || !pass) { err.textContent = 'Inserisci username e password'; return; }

  const password_hash = await hashStr(pass + 'lq_salt_v2');
  err.textContent = 'Accesso al Cloud in corso...';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'LOGIN_USER',
        payload: { username: user, password_hash }
      })
    });

    const result = await response.json();

    if (result.success && result.user) {
      let existing = DB.users.find(u => u.id === result.user.id);
      if (!existing) {
        DB.users.push(result.user);
      } else {
        Object.assign(existing, result.user);
      }
      saveDB();
      syncCUR(result.user);
      bootApp();
    } else {
      err.textContent = result.message || 'Credenziali errate o account non trovato';
    }
  } catch (ex) {
    let u = DB.users.find(u => u.username.toLowerCase() === user.toLowerCase() && u.password_hash === password_hash);
    if (u) {
      syncCUR(u);
      bootApp();
    } else {
      err.textContent = 'Errore di connessione al Cloud e utente non trovato in locale.';
    }
  }
}

/* ── 7. NAVIGAZIONE ── */

function gotoTab(tab) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('screen-' + tab).classList.add('active');
  document.getElementById('nav-' + tab).classList.add('active');
  renderTab(tab);
  window.scrollTo(0, 0);
}

function renderTab(t) {
  const renderers = {
    home:  renderHome,
    quest: renderQuests,
    study: renderStudy,
    life:  renderLife,
    pvp:   renderPvP,
    stats: renderStats
  };
  (renderers[t] || function() {})();
}


/* ── 8. DASHBOARD ── */

function updateDashboard() {
  if (!CUR) return;
  const u   = getUser(CUR.id) || CUR;
  const lvl = u.level || 1;
  const xpCur  = u.xp_total || 0;
  const xpThis = xpForLevel(lvl);
  const xpNxt  = xpForLevel(lvl + 1);
  const pct    = Math.min(100, Math.round((xpCur - xpThis) / (xpNxt - xpThis) * 100));

  document.getElementById('hd-level').textContent  = lvl;
  document.getElementById('hd-name').textContent   = u.username;
  document.getElementById('hd-rank').textContent   = rankTitle(lvl) + ' · Lv.' + lvl;
  document.getElementById('hd-streak').innerHTML   = '🔥 ' + (u.streak_days || 0) + ' gg';
  document.getElementById('xp-bar').style.width    = pct + '%';
  document.getElementById('xp-cur').textContent    = xpCur.toLocaleString() + ' XP';
  document.getElementById('xp-next').textContent   = '→ Lv.' + (lvl + 1) + ' (' + xpNxt.toLocaleString() + ' XP)';

  const s = u.stats || {};
  ['mente', 'corpo', 'cultura', 'sociale', 'sfide'].forEach(k => {
    const el = document.getElementById('ds-' + k);
    if (el) el.textContent = s[k] || 0;
  });
}

function renderHome() {
  updateDashboard();
  document.getElementById('motiv-text').textContent = MOTIVS[new Date().getDay() % MOTIVS.length];

  const myQ = DB.quests.filter(q => q.user_id === CUR.id && !q.completed).slice(0, 3);
  const ql  = document.getElementById('home-quests-list');
  ql.innerHTML = myQ.length
    ? myQ.map(q => `
        <div class="quest-card">
          <div class="quest-check" onclick="toggleQuest('${q.id}', event)"></div>
          <div class="quest-body">
            <div class="quest-name">${q.name}</div>
            <div class="quest-meta">
              <span class="tag tag-xp">⚡${q.xp_base} XP</span>
              <span class="tag tag-cat">${q.category}</span>
            </div>
          </div>
        </div>`).join('')
    : '<div class="empty" style="padding:16px 0"><div class="empty-emoji">🌟</div><div class="empty-text">Nessuna quest attiva.</div></div>';

  const acts = DB.activities
    .filter(a => a.user_id === CUR.id)
    .sort((a, b) => b.date - a.date)
    .slice(0, 4);

  document.getElementById('home-activity-list').innerHTML = acts.map(a => `
    <div class="session-row">
      <div class="session-dot"></div>
      <div class="session-info">
        <div class="session-name">${a.name}</div>
        <div class="session-time">${new Date(a.date).toLocaleDateString('it')}</div>
      </div>
      <div class="session-xp">+${a.xp} XP</div>
    </div>`).join('')
    || '<div style="color:var(--text3);font-size:12px;padding:8px 0">Nessuna attività recente.</div>';
}


/* ── 9. QUEST (con Calendario integrato) ── */

let qTab = 'todo';
let selectedCalDate = new Date().toISOString().split('T')[0];

/** Cambia il sotto-tab delle Quest — gestisce anche 'calendar'. */
function switchQuestTab(t) {
  qTab = t;
  document.querySelectorAll('#screen-quest .tab').forEach((b, i) =>
    b.classList.toggle('active', ['todo', 'active', 'done', 'calendar'][i] === t)
  );
  renderQuests();
}

/** Rendering della lista quest (o del calendario se tab === 'calendar'). */
function renderQuests() {
  const c = document.getElementById('quest-list-container');

  if (qTab === 'calendar') {
    renderQuestCalendar(c);
    return;
  }

  const myQ  = DB.quests.filter(q => q.user_id === CUR.id);
  const list = qTab === 'todo'
    ? myQ.filter(q => !q.completed && q.type === 'todo')
    : qTab === 'active'
    ? myQ.filter(q => !q.completed && q.type === 'quest')
    : myQ.filter(q => q.completed);

  c.innerHTML = list.length
    ? list.map(q => `
        <div class="quest-card">
          <div class="quest-check ${q.completed ? 'done' : ''}"
               onclick="toggleQuest('${q.id}', event)"></div>
          <div class="quest-body">
            <div class="quest-name ${q.completed ? 'done' : ''}">${q.name}</div>
            <div class="quest-meta">
              <span class="tag tag-xp">⚡${q.xp_base} XP</span>
              <span class="tag tag-cat">${q.category}</span>
              ${q.public ? '<span class="tag tag-cyan">🌐</span>' : ''}
              ${q.completed ? '<span class="tag tag-green">✅</span>' : ''}
            </div>
            ${q.notes ? `<div style="font-size:11px;color:var(--text3);margin-top:4px">${q.notes}</div>` : ''}
          </div>
        </div>`).join('')
    : `<div class="empty">
         <div class="empty-emoji">${qTab === 'done' ? '🏆' : '⚔️'}</div>
         <div class="empty-text">${qTab === 'done' ? 'Nessuna quest completata.' : 'Aggiungi la tua prima quest!'}</div>
       </div>`;
}

/** Rendering del calendario quest del mese corrente. */
function renderQuestCalendar(container) {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();
  const dim = new Date(y, m + 1, 0).getDate();
  const fd  = (new Date(y, m, 1).getDay() + 6) % 7;

  const completedQuests = DB.quests.filter(q => q.user_id === CUR.id && q.completed);
  const questDates = {};

  completedQuests.forEach(q => {
    const dStr = q.completed_at ? new Date(q.completed_at).toISOString().split('T')[0] : '';
    if (dStr) questDates[dStr] = (questDates[dStr] || 0) + 1;
  });

  let html = `
    <div style="text-align:center;font-size:15px;font-weight:700;margin-bottom:10px">
      📅 Registro Quest — ${new Date(y, m).toLocaleString('it', { month: 'long', year: 'numeric' })}
    </div>
    <div class="cal-grid">`;

  ['Lu','Ma','Me','Gi','Ve','Sa','Do'].forEach(d => html += `<div class="cal-day-label">${d}</div>`);
  for (let i = 0; i < fd; i++) html += '<div></div>';

  for (let d = 1; d <= dim; d++) {
    const dayStr  = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const count   = questDates[dayStr] || 0;
    const isSel   = selectedCalDate === dayStr ? 'today' : '';
    const hasQuest= count > 0 ? 'has-session' : '';

    html += `
      <div class="cal-day ${isSel} ${hasQuest}" onclick="selectQuestDate('${dayStr}')">
        ${d}
        ${count > 0 ? `<span style="font-size:9px;display:block;color:var(--accent)">• ${count}</span>` : ''}
      </div>`;
  }
  html += '</div>';

  const dayQuests = completedQuests.filter(q => {
    const dStr = q.completed_at ? new Date(q.completed_at).toISOString().split('T')[0] : '';
    return dStr === selectedCalDate;
  });

  html += `
    <div style="margin-top:16px">
      <div class="section-hd">
        <span class="section-title">Quest del ${selectedCalDate} (${dayQuests.length})</span>
      </div>
      <div id="cal-quest-list">
        ${dayQuests.length ? dayQuests.map(q => `
          <div class="quest-card" style="margin-bottom:8px">
            <div class="quest-body">
              <div class="quest-name done">${q.name}</div>
              <div class="quest-meta">
                <span class="tag tag-xp">⚡${q.xp_base} XP</span>
                <span class="tag tag-cat">${q.category}</span>
              </div>
              ${q.notes ? `<div style="font-size:11px;color:var(--text3);margin-top:4px">${q.notes}</div>` : ''}
            </div>
            <button class="btn-sm btn-sm-ghost" onclick="openEditQuest('${q.id}')">✏️ Edit</button>
          </div>
        `).join('') : '<div style="color:var(--text3);font-size:12px;padding:8px 0">Nessuna quest completata in questa data.</div>'}
      </div>
    </div>`;

  container.innerHTML = html;
}

/** Seleziona una data nel calendario quest. */
function selectQuestDate(dateStr) {
  selectedCalDate = dateStr;
  renderQuestCalendar(document.getElementById('quest-list-container'));
}

/** Apre la modal per modificare una quest dal calendario. */
function openEditQuest(id) {
  const q = DB.quests.find(q => q.id === id);
  if (!q) return;

  document.getElementById('eq-id').value    = q.id;
  document.getElementById('eq-name').value  = q.name;
  document.getElementById('eq-notes').value = q.notes || '';
  document.getElementById('eq-date').value  = q.completed_at
    ? new Date(q.completed_at).toISOString().split('T')[0]
    : today();
  openModal('modal-edit-quest');
}

/** Salva le modifiche a una quest dal calendario. */
function saveEditedQuest() {
  const id = document.getElementById('eq-id').value;
  const q  = DB.quests.find(q => q.id === id);
  if (!q) return;

  q.name  = document.getElementById('eq-name').value.trim();
  q.notes = document.getElementById('eq-notes').value.trim();
  const dateInput = document.getElementById('eq-date').value;
  if (dateInput) q.completed_at = new Date(dateInput).getTime();

  saveDB();
  closeModal('modal-edit-quest');
  renderQuests();
  showToast('✅ Quest aggiornata!');
}

/** Elimina una quest dal calendario. */
function deleteQuestFromCal() {
  const id = document.getElementById('eq-id').value;
  DB.quests = DB.quests.filter(q => q.id !== id);
  saveDB();
  closeModal('modal-edit-quest');
  renderQuests();
  showToast('🗑️ Quest eliminata');
}

/** Aggiunge una nuova quest al DB. */
function addQuest() {
  const name = document.getElementById('q-name').value.trim();
  if (!name) { showToast('⚠️ Inserisci un nome'); return; }

  const cat  = document.getElementById('q-cat').value;
  const diff = parseInt(document.getElementById('q-diff').value);
  const type = document.getElementById('q-type').value;
  const pub  = document.getElementById('q-vis-toggle').classList.contains('on');
  const base = Math.round((type === 'todo' ? 15 : 50) * DIFF_MULT[diff]);

  DB.quests.push({
    id:         uid(),
    user_id:    CUR.id,
    name,
    category:   cat,
    difficulty: diff,
    type,
    notes:      document.getElementById('q-notes').value.trim(),
    xp_base:    base,
    public:     pub,
    completed:  false,
    created_at: ts()
  });

  saveDB();
  closeModal('modal-add-quest');
  document.getElementById('q-name').value  = '';
  document.getElementById('q-notes').value = '';
  renderQuests();
  showToast('⚔️ Quest aggiunta!');
}

/**
 * Segna una quest come completata, assegna XP localmente
 * e sincronizza con Google Sheets in background.
 */
async function toggleQuest(id, e) {
  if (e) e.stopPropagation();
  const q = DB.quests.find(q => q.id === id);
  if (!q || q.completed) return;

  q.completed    = true;
  q.completed_at = ts();
  saveDB();

  const stat = CAT_STAT[q.category] || 'produttività';
  awardXP(q.xp_base, stat, '— ' + q.name);
  checkTrophies();
  renderQuests();

  // Sincronizzazione con Google Sheets in background (non blocca l'UI)
  try {
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'COMPLETE_QUEST',
        payload: {
          user_id:    CUR.id,
          name:       q.name,
          category:   q.category,
          difficulty: q.difficulty || 1,
          type:       q.type || 'quest',
          notes:      q.notes || '',
          xp_base:    q.xp_base,
          public:     q.public || false
        }
      })
    });
  } catch (err) {
    console.warn('Sync quest fallita (offline?):', err);
  }
}

/** Esporta le quest in CSV compatibile con Excel/Google Sheets. */
function exportToExcelCSV() {
  let csv = 'ID,User_ID,Nome_Quest,Categoria,XP,Completata,Data_Completamento,Note\n';

  DB.quests.forEach(q => {
    const cDate = q.completed_at ? new Date(q.completed_at).toISOString().split('T')[0] : '';
    csv += `"${q.id}","${q.user_id}","${q.name}","${q.category}",${q.xp_base},${q.completed},"${cDate}","${q.notes || ''}"\n`;
  });

  const link = document.createElement('a');
  link.href     = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  link.download = 'LifeQuest_Quest.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('📊 CSV esportato!');
}


/* ── 10. LIBRI ── */

function renderBooks(c) {
  const books = DB.books.filter(b => b.user_id === CUR.id);
  if (!books.length) {
    c.innerHTML = '<div class="empty"><div class="empty-emoji">📚</div><div class="empty-text">Aggiungi il tuo primo libro!</div></div>';
    return;
  }

  c.innerHTML = books.map(b => {
    const pct      = b.total_pages ? Math.round((b.current_page || 0) / b.total_pages * 100) : 0;
    const done     = b.current_page >= b.total_pages && b.total_pages > 0;
    const sessions = DB.book_sessions.filter(s => s.book_id === b.id).length;

    return `<div class="book-card">
      <div class="book-head">
        <div class="book-cover">${b.emoji || '📖'}</div>
        <div class="book-meta">
          <div class="book-title">${b.title}</div>
          <div class="book-author">${b.author || '—'}</div>
          <div class="book-tags">
            <span class="tag tag-cat">${b.genre || '—'}</span>
            <span class="tag tag-orange">${diffStars(b.difficulty)}</span>
            ${done ? '<span class="tag tag-green">✅ Completato</span>' : ''}
            ${b.public ? '<span class="tag tag-cyan">🌐</span>' : ''}
          </div>
          <div class="book-progress-wrap">
            <div class="book-progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="book-progress-nums">
            <span>${b.current_page || 0} / ${b.total_pages || '?'} pag.</span>
            <span>${pct}% · ${sessions} sessioni</span>
          </div>
        </div>
      </div>
      ${!done
        ? `<div class="book-actions">
             <button class="btn-sm btn-sm-primary" style="font-size:11px;flex:1"
                     onclick="openReadingModal('${b.id}')">📖 +Pagine</button>
             <button class="btn-sm btn-sm-ghost" style="font-size:11px"
                     onclick="markBookDone('${b.id}')">✅ Finito</button>
           </div>`
        : `<div style="font-size:11px;color:var(--green);padding-top:8px;text-align:center;font-weight:700">
             🏆 Bonus ${BOOK_DIFF_BONUS[b.difficulty]} XP sbloccato!
           </div>`
      }
    </div>`;
  }).join('');
}

function addBook() {
  const title = document.getElementById('bk-title').value.trim();
  if (!title) { showToast('⚠️ Inserisci il titolo'); return; }

  const diff = parseInt(document.getElementById('bk-diff').value) || 3;
  const pub  = document.getElementById('bk-vis-toggle').classList.contains('on');

  DB.books.push({
    id:           uid(),
    user_id:      CUR.id,
    title,
    author:       document.getElementById('bk-author').value.trim(),
    genre:        document.getElementById('bk-genre').value,
    difficulty:   diff,
    total_pages:  parseInt(document.getElementById('bk-pages').value) || 0,
    current_page: 0,
    emoji:        document.getElementById('bk-emoji').value || '📖',
    public:       pub,
    completed:    false,
    created_at:   ts()
  });

  saveDB();
  closeModal('modal-add-book');
  ['bk-title', 'bk-author', 'bk-pages', 'bk-emoji'].forEach(id => {
    document.getElementById(id).value = '';
  });
  renderStudy();
  showToast('📚 Libro aggiunto!');
}

function openReadingModal(bookId) {
  const b = DB.books.find(b => b.id === bookId);
  if (!b) return;

  document.getElementById('rd-book-id').value           = bookId;
  document.getElementById('reading-modal-title').textContent = '📖 ' + b.title;
  document.getElementById('rd-pages').value             = '';
  document.getElementById('rd-current').value           = b.current_page || '';
  document.getElementById('rd-notes').value             = '';
  openModal('modal-log-reading');
}

function logReading() {
  const bookId  = document.getElementById('rd-book-id').value;
  const b       = DB.books.find(b => b.id === bookId);
  if (!b) return;

  const pages   = parseInt(document.getElementById('rd-pages').value)   || 0;
  const current = parseInt(document.getElementById('rd-current').value) || b.current_page;

  if (pages < 1) { showToast('⚠️ Inserisci le pagine lette'); return; }

  b.current_page = Math.max(b.current_page || 0, current);

  const xp   = pages * XP_BOOK_PER_PAGE;
  const stat = BOOK_GENRE_STAT[b.genre] || 'cultura';

  DB.book_sessions.push({
    id:           uid(),
    user_id:      CUR.id,
    book_id:      bookId,
    date:         ts(),
    pages,
    current_page: b.current_page,
    notes:        document.getElementById('rd-notes').value,
    xp
  });

  DB.activities.push({
    id:      uid(),
    user_id: CUR.id,
    name:    '📖 ' + b.title + ' (' + pages + 'pp)',
    date:    ts(),
    xp,
    stat,
    type:    'reading'
  });

  saveDB();
  closeModal('modal-log-reading');
  awardXP(xp, stat, '— Lettura: ' + b.title);

  if (b.total_pages && b.current_page >= b.total_pages && !b.completed) {
    markBookDone(bookId, true);
  } else {
    renderStudy();
  }
}

function markBookDone(bookId, silent) {
  const b = DB.books.find(b => b.id === bookId);
  if (!b || b.completed) return;

  b.completed    = true;
  b.completed_at = ts();
  if (!silent) b.current_page = b.total_pages || b.current_page;

  saveDB();

  const bonus = BOOK_DIFF_BONUS[b.difficulty] || 0;
  const stat  = BOOK_GENRE_STAT[b.genre] || 'cultura';
  awardXP(bonus, stat, '— 🏆 Libro completato: ' + b.title);
  checkTrophies();
  renderStudy();
}


/* ── 11. TROFEI ── */

const TROPHY_DEFS = [
  { id: 'first_quest', name: 'Prima quest',         emoji: '⚔️', check: () => DB.quests.filter(q => q.user_id === CUR.id && q.completed).length >= 1 },
  { id: 'quest_10',    name: '10 quest',             emoji: '🌟', check: () => DB.quests.filter(q => q.user_id === CUR.id && q.completed).length >= 10 },
  { id: 'quest_50',    name: '50 quest',             emoji: '🎖️', check: () => DB.quests.filter(q => q.user_id === CUR.id && q.completed).length >= 50 },
  { id: 'first_book',  name: 'Primo libro',          emoji: '📚', check: () => DB.books.filter(b => b.user_id === CUR.id && b.completed).length >= 1 },
  { id: 'books_5',     name: '5 libri',              emoji: '📖', check: () => DB.books.filter(b => b.user_id === CUR.id && b.completed).length >= 5 },
  { id: 'books_hard',  name: 'Libro difficile',      emoji: '🧠', check: () => DB.books.filter(b => b.user_id === CUR.id && b.completed && b.difficulty >= 4).length >= 1 },
  { id: 'streak_7',    name: 'Streak 7 giorni',      emoji: '🔥', check: () => (getUser(CUR.id)?.streak_days || 0) >= 7 },
  { id: 'streak_30',   name: 'Streak 30 giorni',     emoji: '🌙', check: () => (getUser(CUR.id)?.streak_days || 0) >= 30 },
  { id: 'level_5',     name: 'Livello 5',            emoji: '⭐', check: () => (getUser(CUR.id)?.level || 0) >= 5 },
  { id: 'level_10',    name: 'Livello 10',           emoji: '🌍', check: () => (getUser(CUR.id)?.level || 0) >= 10 },
  { id: 'pvp_win',     name: 'Prima vittoria',       emoji: '🏆', check: () => DB.challenges.filter(c => c.winner_id === CUR.id).length >= 1 },
  { id: 'sessions_20', name: '20 sessioni studio',   emoji: '📝', check: () => DB.sessions.filter(s => s.user_id === CUR.id).length >= 20 },
  { id: 'gym_10',      name: '10 sessioni palestra', emoji: '💪', check: () => DB.activities.filter(a => a.user_id === CUR.id && a.type === 'gym').length >= 10 }
];

function checkTrophies() {
  const u = getUser(CUR.id);
  if (!u) return;
  if (!u.trophies) u.trophies = [];

  let newOnes = false;
  TROPHY_DEFS.forEach(def => {
    if (!u.trophies.find(t => t.id === def.id) && def.check()) {
      u.trophies.push({ id: def.id, earned_at: ts() });
      newOnes = true;
      showToast('🏆 Trofeo sbloccato: ' + def.name + '  ' + def.emoji);
    }
  });

  if (newOnes) { saveDB(); syncCUR(u); }
}


/* ── 12. ESAMI / CAPITOLI / CONCETTI ── */

let studyTab = 'exams';

function switchStudyTab(t) {
  studyTab = t;
  document.querySelectorAll('#screen-study .tab').forEach((b, i) =>
    b.classList.toggle('active', ['exams', 'books', 'sessions', 'calendar'][i] === t)
  );
  renderStudy();
}

function renderStudy() {
  const c = document.getElementById('study-container');
  if      (studyTab === 'exams')    renderExams(c);
  else if (studyTab === 'books')    renderBooks(c);
  else if (studyTab === 'sessions') renderSessions(c);
  else                               renderCalendar(c);
}

function masteryPct(examId) {
  const chs = DB.chapters.filter(c => c.exam_id === examId);
  if (!chs.length) return 0;

  const allCo  = chs.flatMap(c => DB.concepts.filter(co => co.chapter_id === c.id));
  const doneCo = allCo.filter(c => c.completed).length;
  const chP    = chs.filter(c => c.completed).length / chs.length;
  const coP    = allCo.length ? doneCo / allCo.length : 0;

  return Math.round((chP * 0.4 + coP * 0.6) * 100);
}

function renderExams(c) {
  const exams = DB.exams.filter(e => e.user_id === CUR.id);
  if (!exams.length) {
    c.innerHTML = '<div class="empty"><div class="empty-emoji">📘</div><div class="empty-text">Aggiungi il tuo primo esame!</div></div>';
    return;
  }

  c.innerHTML = exams.map(exam => {
    const chs   = DB.chapters.filter(ch => ch.exam_id === exam.id);
    const mp    = masteryPct(exam.id);
    const dl    = exam.exam_date ? Math.ceil((new Date(exam.exam_date) - new Date()) / 86400000) : null;
    const dlStr = dl !== null ? (dl > 0 ? dl + 'gg' : dl === 0 ? 'Oggi!' : 'Passato') : '';
    const mpColor = mp > 75 ? 'var(--green)' : mp > 40 ? 'var(--accent2)' : 'var(--red)';

    return `<div class="exam-card">
      <div class="exam-head" onclick="toggleExamBody('${exam.id}')">
        <div class="exam-icon">${exam.emoji || '📘'}</div>
        <div class="exam-info">
          <div class="exam-name">${exam.title}</div>
          <div class="exam-date">
            ${exam.exam_date ? '📅 ' + exam.exam_date + ' (' + dlStr + ')' : ''}
            · Mastery <b style="color:${mpColor}">${mp}%</b>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <button class="btn-sm btn-sm-primary" style="font-size:10px;padding:4px 8px"
                  onclick="event.stopPropagation();openLogSession('${exam.id}')">+Sessione</button>
          <button class="btn-sm btn-sm-ghost"   style="font-size:10px;padding:4px 8px"
                  onclick="event.stopPropagation();openAddChapter('${exam.id}')">+Cap.</button>
        </div>
      </div>
      <div class="mastery-bar">
        <div class="mastery-fill" style="width:${mp}%"></div>
      </div>
      <div class="exam-body" id="exam-body-${exam.id}">
        ${chs.length
          ? chs.map(renderChRow).join('')
          : '<div style="font-size:12px;color:var(--text3);padding:4px 0">Nessun capitolo ancora.</div>'
        }
      </div>
    </div>`;
  }).join('');
}

function renderChRow(ch) {
  const cos  = DB.concepts.filter(c => c.chapter_id === ch.id);
  const done = cos.filter(c => c.completed).length;

  return `<div class="chapter-row">
    <div class="ch-check ${ch.completed ? 'done' : ''}" onclick="toggleChapter('${ch.id}')"></div>
    <div class="ch-info">
      <div class="ch-name" style="${ch.completed ? 'text-decoration:line-through;color:var(--text3)' : ''}">${ch.title}</div>
      <div class="ch-concepts">${diffStars(ch.difficulty || 2)} · ${done}/${cos.length} concetti</div>
    </div>
    <div class="ch-btns">
      <span class="ch-expand" onclick="toggleConcepts('${ch.id}')">concetti ▾</span>
      <span class="ch-expand" onclick="openAddConcept('${ch.id}')">+</span>
    </div>
  </div>
  <div id="concepts-${ch.id}" style="display:none">
    ${cos.map(co => `
      <div class="concept-row">
        <div class="concept-check ${co.completed ? 'done' : ''}" onclick="toggleConcept('${co.id}')"></div>
        <span class="concept-name ${co.completed ? 'done' : ''}">${co.title}</span>
      </div>`).join('')}
    ${!cos.length ? '<div style="font-size:11px;color:var(--text3);padding:4px 8px">Nessun concetto. Clicca + per aggiungere.</div>' : ''}
  </div>`;
}

function toggleExamBody(id) {
  document.getElementById('exam-body-' + id)?.classList.toggle('open');
}

function toggleConcepts(id) {
  const el = document.getElementById('concepts-' + id);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function addExam() {
  const title = document.getElementById('ex-name').value.trim();
  if (!title) { showToast('⚠️ Nome materia richiesto'); return; }

  DB.exams.push({
    id:           uid(),
    user_id:      CUR.id,
    title,
    exam_date:    document.getElementById('ex-date').value,
    target_hours: parseInt(document.getElementById('ex-hours').value) || 40,
    emoji:        document.getElementById('ex-emoji').value || '📘',
    created_at:   ts()
  });

  saveDB();
  closeModal('modal-add-exam');
  document.getElementById('ex-name').value = '';
  renderStudy();
  showToast('📘 Esame aggiunto!');
}

function openAddChapter(examId) {
  document.getElementById('ch-exam-id').value = examId;
  document.getElementById('ch-name').value    = '';
  openModal('modal-add-chapter');
}

function addChapter() {
  const name = document.getElementById('ch-name').value.trim();
  if (!name) { showToast('⚠️ Nome capitolo richiesto'); return; }

  DB.chapters.push({
    id:         uid(),
    exam_id:    document.getElementById('ch-exam-id').value,
    title:      name,
    difficulty: parseInt(document.getElementById('ch-diff').value) || 3,
    completed:  false,
    created_at: ts()
  });

  saveDB();
  closeModal('modal-add-chapter');
  renderStudy();
  showToast('📚 Capitolo aggiunto!');
}

function toggleChapter(id) {
  const ch = DB.chapters.find(c => c.id === id);
  if (!ch || ch.completed) return;

  ch.completed    = true;
  ch.completed_at = ts();
  saveDB();

  awardXP(Math.round(80 * DIFF_MULT[ch.difficulty || 2]), 'mente', '— Capitolo: ' + ch.title);
  checkTrophies();
  renderStudy();
}

function openAddConcept(chId) {
  document.getElementById('co-chapter-id').value = chId;
  document.getElementById('co-name').value       = '';
  document.getElementById('co-notes').value      = '';
  openModal('modal-add-concept');
}

function addConcept() {
  const name = document.getElementById('co-name').value.trim();
  if (!name) { showToast('⚠️ Nome concetto richiesto'); return; }

  DB.concepts.push({
    id:         uid(),
    chapter_id: document.getElementById('co-chapter-id').value,
    title:      name,
    notes:      document.getElementById('co-notes').value,
    completed:  false,
    created_at: ts()
  });

  saveDB();
  closeModal('modal-add-concept');
  renderStudy();
  showToast('🔵 Concetto aggiunto!');
}

function toggleConcept(id) {
  const co = DB.concepts.find(c => c.id === id);
  if (!co || co.completed) return;

  co.completed    = true;
  co.completed_at = ts();
  saveDB();

  awardXP(25, 'mente', '— Concetto: ' + co.title);
  renderStudy();
}

function openLogSession(examId) {
  document.getElementById('ss-exam-id').value = examId;
  document.getElementById('ss-mins').value    = '';
  document.getElementById('ss-notes').value   = '';
  openModal('modal-log-session');
}

function logSession() {
  const mins = parseInt(document.getElementById('ss-mins').value);
  if (!mins || mins < 1) { showToast('⚠️ Inserisci i minuti'); return; }

  const examId = document.getElementById('ss-exam-id').value;
  const focus  = parseInt(document.getElementById('ss-focus').value) || 3;
  const exam   = DB.exams.find(e => e.id === examId);
  const xp     = Math.round((mins / 30) * 40 * (0.7 + focus * 0.1));

  const sess = {
    id:           uid(),
    user_id:      CUR.id,
    exam_id:      examId,
    exam_name:    exam?.title || 'Studio',
    date:         ts(),
    duration_min: mins,
    focus_score:  focus,
    notes:        document.getElementById('ss-notes').value,
    xp
  };

  DB.sessions.push(sess);
  DB.activities.push({
    id:      uid(),
    user_id: CUR.id,
    name:    '📝 Studio: ' + (exam?.title || 'Generico') + ' (' + mins + 'min)',
    date:    ts(),
    xp,
    stat:    'mente',
    type:    'study'
  });

  saveDB();
  closeModal('modal-log-session');
  awardXP(xp, 'mente', '— Sessione ' + mins + 'min');
  checkTrophies();
  renderStudy();
}

function renderSessions(c) {
  const sss = DB.sessions
    .filter(s => s.user_id === CUR.id)
    .sort((a, b) => b.date - a.date);

  c.innerHTML = '<div style="padding:0 20px">' + (sss.length
    ? sss.map(s => `
        <div class="session-row">
          <div class="session-dot"></div>
          <div class="session-info">
            <div class="session-name">${s.exam_name} — ${s.duration_min}min</div>
            <div class="session-time">${new Date(s.date).toLocaleString('it')} · Focus: ${'⭐'.repeat(s.focus_score)}</div>
            ${s.notes ? `<div style="font-size:10px;color:var(--text3);margin-top:2px">${s.notes}</div>` : ''}
          </div>
          <div class="session-xp">+${s.xp} XP</div>
        </div>`).join('')
    : '<div class="empty"><div class="empty-emoji">📝</div><div class="empty-text">Nessuna sessione ancora.</div></div>'
  ) + '</div>';
}

function renderCalendar(c) {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();
  const fd  = (new Date(y, m, 1).getDay() + 6) % 7;
  const dim = new Date(y, m + 1, 0).getDate();
  const MN  = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

  const sDates = new Set(
    DB.sessions.filter(s => s.user_id === CUR.id).map(s => {
      const d = new Date(s.date);
      return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    })
  );
  const bDates = new Set(
    DB.book_sessions.filter(s => s.user_id === CUR.id).map(s => {
      const d = new Date(s.date);
      return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    })
  );

  let html = `<div style="text-align:center;font-size:14px;font-weight:700;color:var(--text);padding:12px 20px 8px">${MN[m]} ${y}</div>
    <div class="cal-grid">`;

  ['Lu','Ma','Me','Gi','Ve','Sa','Do'].forEach(d =>
    html += `<div class="cal-day-label">${d}</div>`
  );

  for (let i = 0; i < fd; i++) html += '<div></div>';

  for (let d = 1; d <= dim; d++) {
    const isT = d === now.getDate();
    const k   = y + '-' + (m + 1) + '-' + d;
    const cls = [
      isT           ? 'today'       : '',
      sDates.has(k) ? 'has-session' : '',
      bDates.has(k) ? 'has-book'   : ''
    ].filter(Boolean).join(' ');

    html += `<div class="cal-day ${cls}">${d}</div>`;
  }

  html += '</div><div style="padding:10px 20px;font-size:11px;color:var(--text3)">🔵 Studio · 🟠 Lettura</div>';
  c.innerHTML = html;
}


/* ── 13. VITA / ATTIVITÀ ── */

function renderLife() {
  const ag = document.getElementById('activity-grid');
  ag.innerHTML = ACTIVITIES.map(a => `
    <div class="activity-tile" onclick="openActivityModal('${a.type}')">
      <div class="activity-emoji">${a.emoji}</div>
      <div class="activity-name">${a.name}</div>
      <div class="activity-xp">+${a.xp_base}+ XP → ${a.stat}</div>
    </div>`).join('');

  const acts = DB.activities
    .filter(a => a.user_id === CUR.id && a.type !== 'study')
    .sort((a, b) => b.date - a.date)
    .slice(0, 10);

  document.getElementById('life-log-list').innerHTML = acts.map(a => `
    <div class="session-row">
      <div class="session-dot" style="background:var(--green)"></div>
      <div class="session-info">
        <div class="session-name">${a.name}</div>
        <div class="session-time">${new Date(a.date).toLocaleString('it')}</div>
      </div>
      <div class="session-xp">+${a.xp} XP</div>
    </div>`).join('')
    || '<div style="color:var(--text3);font-size:12px;padding:8px 0">Nessuna attività registrata.</div>';
}

function openActivityModal(type) {
  const act = ACTIVITIES.find(a => a.type === type);
  if (!act) return;

  document.getElementById('act-type').value              = type;
  document.getElementById('act-stat').value              = act.stat;
  document.getElementById('act-modal-title').textContent = act.emoji + ' ' + act.name;

  let extra = '';
  if (act.extra === 'workout') {
    extra = `<label class="input-label">TIPO ALLENAMENTO</label>
      <select class="sm sm-mb" id="act-workout-type">
        <option value="forza">💪 Forza/Pesi</option>
        <option value="cardio">🏃 Cardio</option>
        <option value="corpo">🤸 Corpo libero</option>
        <option value="sport">⚽ Sport</option>
      </select>
      <label class="input-label">MINUTI</label>
      <input class="sm sm-mb" id="act-mins" type="number" placeholder="es. 60" min="10">`;
  } else if (act.extra === 'mins') {
    extra = `<label class="input-label">MINUTI</label>
      <input class="sm sm-mb" id="act-mins" type="number" placeholder="es. 30" min="5">`;
  } else if (act.extra === 'custom') {
    extra = `<label class="input-label">NOME ATTIVITÀ</label>
      <input class="sm sm-mb" id="act-custom-name" placeholder="es. Passeggiata in montagna">
      <label class="input-label">MINUTI</label>
      <input class="sm sm-mb" id="act-mins" type="number" placeholder="es. 45" min="5">
      <label class="input-label">CATEGORIA</label>
      <select class="sm sm-mb" id="act-custom-stat">
        <option value="mente">🧠 Mente</option>
        <option value="corpo">💪 Corpo</option>
        <option value="cultura">📚 Cultura</option>
        <option value="sociale">🤝 Sociale</option>
        <option value="produttività">✅ Produttività</option>
      </select>`;
  }

  document.getElementById('act-extra-fields').innerHTML = extra;
  document.getElementById('act-notes').value = '';
  openModal('modal-log-activity');
}

function logActivity() {
  const type  = document.getElementById('act-type').value;
  let   stat  = document.getElementById('act-stat').value;
  const act   = ACTIVITIES.find(a => a.type === type);
  const notes = document.getElementById('act-notes').value;

  let xp   = act.xp_base;
  let name = act.emoji + ' ' + act.name;

  if (act.extra === 'workout') {
    const mins = parseInt(document.getElementById('act-mins')?.value) || 60;
    const wt   = document.getElementById('act-workout-type')?.value || 'corpo';
    xp   = Math.round(act.xp_base * (mins / 60));
    name += ` (${mins}min ${wt})`;
    if (wt === 'forza') stat = 'corpo';
  } else if (act.extra === 'mins') {
    const mins = parseInt(document.getElementById('act-mins')?.value) || 30;
    xp   = Math.round(act.xp_base * (mins / 30));
    name += ` (${mins}min)`;
  } else if (act.extra === 'custom') {
    const mins       = parseInt(document.getElementById('act-mins')?.value)        || 30;
    const customName = document.getElementById('act-custom-name')?.value || name;
    stat = document.getElementById('act-custom-stat')?.value || stat;
    xp   = Math.round(act.xp_base * (mins / 30));
    name = '⭐ ' + customName + ` (${mins}min)`;
  }

  const actRecord = { id: uid(), user_id: CUR.id, name, date: ts(), xp, stat, type, notes };
  DB.activities.push(actRecord);
  saveDB();
  closeModal('modal-log-activity');
  awardXP(xp, stat, '— ' + name);
  checkTrophies();
  renderLife();

  // Sync con Google Sheets in background
  fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'LOG_ACTIVITY',
      payload: { user_id: CUR.id, type, stat, xp, notes, name }
    })
  }).catch(err => console.warn('Sync attività fallita:', err));
}


/* ── 14. SFIDE PVP ── */

let pvpTab       = 'active';
let pendingRules = [];

function switchPvpTab(t) {
  pvpTab = t;
  document.querySelectorAll('#screen-pvp .tab').forEach((b, i) =>
    b.classList.toggle('active', ['active', 'pending', 'history'][i] === t)
  );
  renderPvP();
}

function renderPvP() {
  const myC  = DB.challenges.filter(c => c.creator_id === CUR.id || c.joiner_id === CUR.id);
  const list = pvpTab === 'active'  ? myC.filter(c => c.status === 'active')
             : pvpTab === 'pending' ? myC.filter(c => c.status === 'pending')
             :                        myC.filter(c => c.status === 'done');

  const c = document.getElementById('pvp-container');
  c.innerHTML = list.length
    ? list.map(ch => renderChallengeCard(ch)).join('')
    : `<div class="empty">
         <div class="empty-emoji">${pvpTab === 'done' ? '🏆' : '⚔️'}</div>
         <div class="empty-text">Nessuna sfida ${pvpTab === 'active' ? 'attiva' : pvpTab === 'pending' ? 'in attesa' : 'conclusa'}.</div>
       </div>`;
}

function renderChallengeCard(ch) {
  const isCreator = ch.creator_id === CUR.id;
  const iWon      = ch.winner_id  === CUR.id;
  const typeLabel = { athletic: '🏋️ Atletica', mental: '🧠 Mentale', mixed: '🎯 Mista' }[ch.type] || ch.type;
  const typeClass = { athletic: 'ch-type-ath', mental: 'ch-type-men', mixed: 'ch-type-mix' }[ch.type] || 'ch-type-men';
  const rulesSummary = ch.rules?.length
    ? ch.rules.map(r => `<div class="challenge-rule-row"><span class="challenge-rule-key">${r.type}</span><span>${r.value}</span></div>`).join('')
    : '';

  return `<div class="challenge-card" onclick="viewChallenge('${ch.id}')">
    <div class="challenge-head">
      <span class="ch-type-badge ${typeClass}">${typeLabel}</span>
      <span class="challenge-title">${ch.title}</span>
    </div>
    <div class="challenge-meta">
      ${ch.description || ch.conditions || ''}
      <br>${isCreator ? 'Tu vs avversario' : 'Sfida di ' + ch.creator_username}
      · Scad. ${ch.deadline || '—'}
    </div>
    ${rulesSummary ? `<div class="challenge-rules">${rulesSummary}</div>` : ''}
    <div class="challenge-footer">
      <span class="challenge-stake">⚡ ${ch.stake} XP</span>
      <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
        ${ch.status === 'done' ? `<span class="tag ${iWon ? 'tag-green' : 'tag-red'}">${iWon ? '🏆 Vinta' : '❌ Persa'}</span>` : ''}
        ${ch.status === 'active' ? `<button class="btn-sm btn-sm-primary" style="font-size:10px;padding:5px 10px"
            onclick="event.stopPropagation();openDeclareWinner('${ch.id}')">Dichiara vincitore</button>` : ''}
        ${ch.replicable ? `<button class="btn-sm btn-sm-ghost" style="font-size:10px;padding:5px 10px"
            onclick="event.stopPropagation();replicateChallenge('${ch.id}')">🔁 Replica</button>` : ''}
        <span class="challenge-code"
              onclick="event.stopPropagation();navigator.clipboard.writeText('${ch.code}')
                .then(()=>showToast('🔁 Codice copiato!'))
                .catch(()=>showToast('Codice: ${ch.code}'))">${ch.code}</span>
      </div>
    </div>
  </div>`;
}

function viewChallenge(id) {
  const ch = DB.challenges.find(c => c.id === id);
  if (!ch) return;

  const typeLabel = { athletic: '🏋️ Atletica', mental: '🧠 Mentale', mixed: '🎯 Mista' }[ch.type] || ch.type;
  const rulesHtml = ch.rules?.length
    ? ch.rules.map(r => `<div class="challenge-rule-row"><span class="challenge-rule-key">${r.type}</span><span style="font-size:12px">${r.value}</span></div>`).join('')
    : '<div style="color:var(--text3);font-size:12px">Nessuna regola strutturata.</div>';

  document.getElementById('challenge-detail-content').innerHTML = `
    <div class="modal-handle" style="margin:16px auto 14px"></div>
    <div style="padding:0 22px 6px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span class="ch-type-badge ch-type-${ch.type}">${typeLabel}</span>
        <span style="font-size:17px;font-weight:800;flex:1">${ch.title}</span>
      </div>
      <div style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:14px">${ch.description || ch.conditions || '—'}</div>
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Regole</div>
      <div class="challenge-rules">${rulesHtml}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0">
        <div class="card2"><div style="font-size:18px;font-weight:900;color:var(--gold)">${ch.stake}</div><div style="font-size:10px;color:var(--text3)">XP in palio</div></div>
        <div class="card2"><div style="font-size:14px;font-weight:700">${ch.deadline || '—'}</div><div style="font-size:10px;color:var(--text3)">Scadenza</div></div>
        <div class="card2"><div style="font-size:14px;font-weight:700">${ch.creator_username}</div><div style="font-size:10px;color:var(--text3)">Creatore</div></div>
        <div class="card2"><div style="font-size:14px;font-weight:700">${ch.joiner_username || 'In attesa...'}</div><div style="font-size:10px;color:var(--text3)">Avversario</div></div>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:8px">
        ${ch.status === 'active' ? `<button class="btn-sm btn-sm-primary" style="flex:1"
            onclick="closeModal('modal-challenge-detail');openDeclareWinner('${ch.id}')">🏆 Dichiara vincitore</button>` : ''}
        ${ch.replicable ? `<button class="btn-sm btn-sm-ghost" style="flex:1"
            onclick="replicateChallenge('${ch.id}')">🔁 Replica sfida</button>` : ''}
      </div>
      <div style="text-align:center;margin-top:4px">
        <span class="challenge-code"
              onclick="navigator.clipboard.writeText('${ch.code}').then(()=>showToast('Copiato!')).catch(()=>showToast('${ch.code}'))">
          Codice: ${ch.code} — tocca per copiare
        </span>
      </div>
    </div>`;

  openModal('modal-challenge-detail');
}

/* --- Rule Builder --- */

function addRule(type) {
  pendingRules = pendingRules || [];
  document.getElementById('rule-type').value = type;

  const titles = {
    metrica:    '📊 Aggiungi Metrica',
    durata:     '⏱️ Aggiungi Durata',
    condizione: '🔁 Aggiungi Condizione',
    penalita:   '⚠️ Aggiungi Penalità'
  };
  document.getElementById('rule-modal-title').textContent = titles[type] || 'Aggiungi Regola';

  const fields = {
    metrica:    `<label class="input-label">COSA SI MISURA</label>
      <input class="sm sm-mb" id="rf-what"   placeholder="es. pagine lette, ore in palestra, km corsi">
      <label class="input-label">OBIETTIVO (chi vince)</label>
      <input class="sm sm-mb" id="rf-target" placeholder="es. Chi arriva a 200 pagine">`,
    durata:     `<label class="input-label">DURATA SFIDA</label>
      <input class="sm sm-mb" id="rf-duration" placeholder="es. 7 giorni, 2 settimane">
      <label class="input-label">DATA INIZIO</label>
      <input class="sm sm-mb" id="rf-start" type="date">
      <label class="input-label">DATA FINE</label>
      <input class="sm sm-mb" id="rf-end"   type="date">`,
    condizione: `<label class="input-label">REGOLA / CONDIZIONE</label>
      <textarea class="sm sm-mb" id="rf-cond" placeholder="es. Ogni giorno almeno 30 min..."></textarea>`,
    penalita:   `<label class="input-label">PENALITÀ IN CASO DI PERDITA</label>
      <input class="sm sm-mb" id="rf-pen" placeholder="es. -50 XP extra, il perdente paga il pranzo">`
  };
  document.getElementById('rule-fields').innerHTML = fields[type] || '';
  openModal('modal-add-rule');
}

function saveRule() {
  const type = document.getElementById('rule-type').value;
  let value  = '';

  if (type === 'metrica') {
    const what   = document.getElementById('rf-what')?.value   || '';
    const target = document.getElementById('rf-target')?.value || '';
    value = `${what} — Obiettivo: ${target}`;
  } else if (type === 'durata') {
    const dur = document.getElementById('rf-duration')?.value || '';
    const s   = document.getElementById('rf-start')?.value    || '';
    const e   = document.getElementById('rf-end')?.value      || '';
    value = `${dur}${s ? ' · dal ' + s : ''}${e ? ' al ' + e : ''}`;
  } else if (type === 'condizione') {
    value = document.getElementById('rf-cond')?.value || '';
  } else if (type === 'penalita') {
    value = document.getElementById('rf-pen')?.value  || '';
  }

  if (!value.trim()) { showToast('⚠️ Compila i campi'); return; }

  pendingRules = pendingRules || [];
  pendingRules.push({ type, value });
  renderPendingRules();
  closeModal('modal-add-rule');
}

function renderPendingRules() {
  const list = document.getElementById('pvp-rules-list');
  if (!list) return;
  list.innerHTML = (pendingRules || []).map((r, i) => `
    <div class="rule-item">
      <div class="rule-item-type">${r.type}</div>
      <div class="rule-item-value">${r.value}</div>
      <button class="rule-item-remove" onclick="removeRule(${i})">✕</button>
    </div>`).join('');
}

function removeRule(i) {
  pendingRules.splice(i, 1);
  renderPendingRules();
}

function createChallenge() {
  const title = document.getElementById('pvp-title').value.trim();
  if (!title) { showToast('⚠️ Inserisci il titolo della sfida'); return; }

  const stake = parseInt(document.getElementById('pvp-stake').value) || 100;
  const rep   = document.getElementById('pvp-rep-toggle').classList.contains('on');
  const code  = randCode();

  const ch = {
    id:               uid(),
    creator_id:       CUR.id,
    creator_username: CUR.username,
    joiner_id:        null,
    joiner_username:  null,
    type:             document.getElementById('pvp-type').value,
    title,
    description:      document.getElementById('pvp-desc').value,
    rules:            [...(pendingRules || [])],
    stake,
    deadline:         document.getElementById('pvp-deadline').value,
    code,
    replicable:       rep,
    status:           'pending',
    created_at:       ts()
  };

  DB.challenges.push(ch);
  if (rep) DB.challenge_templates.push({ ...ch, template_id: uid(), template_by: CUR.username });

  saveDB();
  pendingRules = [];
  renderPendingRules();
  closeModal('modal-create-challenge');
  showToast('⚔️ Sfida creata! Codice: ' + code);
  renderPvP();

  ['pvp-title', 'pvp-desc', 'pvp-stake', 'pvp-deadline'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function joinChallenge() {
  const code = document.getElementById('join-code-input').value.trim().toUpperCase();
  const ch   = DB.challenges.find(c => c.code === code);

  if (!ch)                      { showToast('⚠️ Codice non trovato');              return; }
  if (ch.creator_id === CUR.id) { showToast('⚠️ Non puoi unirti alla tua sfida'); return; }
  if (ch.joiner_id)             { showToast('⚠️ Sfida già occupata');              return; }

  ch.joiner_id       = CUR.id;
  ch.joiner_username = CUR.username;
  ch.status          = 'active';

  saveDB();
  document.getElementById('join-code-input').value = '';
  showToast('⚔️ Sfida accettata! Che vinca il migliore.');
  renderPvP();
}

function openDeclareWinner(id) {
  document.getElementById('win-challenge-id').value = id;
  openModal('modal-declare-winner');
}

function declareWinner(who) {
  const id = document.getElementById('win-challenge-id').value;
  const ch = DB.challenges.find(c => c.id === id);
  if (!ch) return;

  ch.status = 'done';

  if (who === 'me') {
    ch.winner_id = CUR.id;
    awardXP(ch.stake, 'sfide', '🏆 Sfida vinta: ' + ch.title);
  } else if (who === 'draw') {
    ch.winner_id = 'draw';
    awardXP(Math.floor(ch.stake / 2), 'sfide', '🤝 Pareggio: ' + ch.title);
  } else {
    ch.winner_id = (ch.creator_id === CUR.id) ? (ch.joiner_id || 'opp') : ch.creator_id;
  }

  saveDB();
  closeModal('modal-declare-winner');
  closeModal('modal-challenge-detail');
  checkTrophies();
  renderPvP();
}

function replicateChallenge(id) {
  const orig = DB.challenges.find(c => c.id === id);
  if (!orig) return;

  const code = randCode();
  const ch   = {
    ...orig,
    id:               uid(),
    creator_id:       CUR.id,
    creator_username: CUR.username,
    joiner_id:        null,
    joiner_username:  null,
    code,
    status:           'pending',
    created_at:       ts(),
    winner_id:        null
  };

  DB.challenges.push(ch);
  saveDB();
  showToast('🔁 Sfida replicata! Codice: ' + code);
  closeModal('modal-challenge-detail');
  renderPvP();
}


/* ── 15. STATISTICHE ── */

let statsTab = 'stats';

function switchStatsTab(t) {
  statsTab = t;
  document.querySelectorAll('#screen-stats .tab').forEach((b, i) =>
    b.classList.toggle('active', ['stats', 'leaderboard'][i] === t)
  );
  renderStats();
}

function renderStats() {
  statsTab === 'stats' ? renderMyStats() : renderLeaderboard();
}

function renderMyStats() {
  const u       = getUser(CUR.id) || CUR;
  const stats   = u.stats || {};
  const maxVal  = Math.max(1, ...Object.values(stats).map(Number));
  const trophies= u.trophies || [];

  let html = `<div style="padding:14px 20px 6px">
    <canvas id="stats-canvas" width="260" height="260"></canvas>
  </div>
  <div style="padding:0 20px 14px">`;

  Object.entries(STAT_COLORS).forEach(([k, col]) => {
    const v = stats[k] || 0;
    const p = Math.round((v / maxVal) * 100);
    html += `<div class="stat-bar-row">
      <div class="stat-bar-label" style="color:${col}">${k}</div>
      <div class="stat-bar-bg"><div class="stat-bar-fg" style="width:${p}%;background:${col}"></div></div>
      <div class="stat-bar-val" style="color:${col}">${v}</div>
    </div>`;
  });

  html += `</div>
  <div style="padding:0 20px">
    <div class="section-hd" style="margin-bottom:8px"><span class="section-title">Riepilogo</span></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:14px">
      <div class="card2" style="text-align:center"><div style="font-size:20px;font-weight:900;color:var(--accent2)">${(u.xp_total||0).toLocaleString()}</div><div style="font-size:10px;color:var(--text3)">XP totali</div></div>
      <div class="card2" style="text-align:center"><div style="font-size:20px;font-weight:900;color:var(--gold)">${u.level||1}</div><div style="font-size:10px;color:var(--text3)">Livello</div></div>
      <div class="card2" style="text-align:center"><div style="font-size:20px;font-weight:900;color:var(--green)">${u.streak_days||0}</div><div style="font-size:10px;color:var(--text3)">Streak</div></div>
      <div class="card2" style="text-align:center"><div style="font-size:20px;font-weight:900;color:var(--pink)">${trophies.length}</div><div style="font-size:10px;color:var(--text3)">Trofei</div></div>
    </div>
    <div class="section-hd" style="margin-bottom:8px"><span class="section-title">Trofei (${trophies.length}/${TROPHY_DEFS.length})</span></div>
    <div class="trophy-grid" style="grid-template-columns:repeat(3,1fr);padding:0;margin-bottom:14px">`;

  TROPHY_DEFS.forEach(def => {
    const earned = trophies.find(t => t.id === def.id);
    html += `<div class="trophy-item" style="${!earned ? 'opacity:.35' : ''}">
      <div class="trophy-emoji">${def.emoji}</div>
      <div class="trophy-name">${def.name}</div>
      ${earned ? `<div class="trophy-date">${new Date(earned.earned_at).toLocaleDateString('it')}</div>` : ''}
    </div>`;
  });

  html += `</div>
    <div class="visibility-toggle">
      <div class="toggle-track ${getUser(CUR.id)?.public_profile ? 'on' : ''}"
           id="profile-vis-toggle" onclick="toggleProfileVis()">
        <div class="toggle-knob"></div>
      </div>
      <span class="toggle-label" style="font-size:12px">Profilo pubblico in leaderboard</span>
    </div>
    <div style="display:flex;gap:8px;margin:10px 0 20px">
      <button class="btn-sm btn-sm-ghost" style="flex:1" onclick="exportData()">📤 Esporta JSON</button>
      <button class="btn-sm btn-sm-ghost" style="flex:1" onclick="exportToExcelCSV()">📊 Esporta CSV</button>
      <button class="btn-sm btn-sm-ghost" style="flex:1" onclick="document.getElementById('import-file').click()">📥 Importa</button>
      <input type="file" id="import-file" style="display:none" accept=".json" onchange="importData(this)">
    </div>
  </div>`;

  document.getElementById('stats-container').innerHTML = html;
  setTimeout(() => drawRadar(stats, maxVal), 50);
}

function toggleProfileVis() {
  const u = getUser(CUR.id);
  if (!u) return;
  u.public_profile = !u.public_profile;
  saveDB();
  syncCUR(u);
  document.getElementById('profile-vis-toggle').classList.toggle('on', u.public_profile);
  showToast(u.public_profile ? '🌐 Profilo pubblico' : '🔒 Profilo privato');
}

function drawRadar(stats, maxVal) {
  const canvas = document.getElementById('stats-canvas');
  if (!canvas) return;

  const ctx  = canvas.getContext('2d');
  const W    = 260, H = 260, cx = 130, cy = 130, r = 90;
  const keys = Object.keys(STAT_COLORS);
  const n    = keys.length;

  ctx.clearRect(0, 0, W, H);

  for (let g = 1; g <= 4; g++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i / n) - Math.PI / 2;
      i === 0
        ? ctx.moveTo(cx + Math.cos(a) * r * (g / 4), cy + Math.sin(a) * r * (g / 4))
        : ctx.lineTo(cx + Math.cos(a) * r * (g / 4), cy + Math.sin(a) * r * (g / 4));
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth   = 1;
    ctx.stroke();
  }

  for (let i = 0; i < n; i++) {
    const a  = (Math.PI * 2 * i / n) - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.stroke();

    const lx = cx + Math.cos(a) * (r + 18);
    const ly = cy + Math.sin(a) * (r + 18);
    ctx.fillStyle    = '#8080a0';
    ctx.font         = '10px -apple-system,sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(keys[i], lx, ly);
  }

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const v = Math.min(1, (stats[keys[i]] || 0) / maxVal);
    const a = (Math.PI * 2 * i / n) - Math.PI / 2;
    i === 0
      ? ctx.moveTo(cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v)
      : ctx.lineTo(cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v);
  }
  ctx.closePath();
  ctx.fillStyle   = 'rgba(124,106,247,.22)';
  ctx.fill();
  ctx.strokeStyle = '#7c6af7';
  ctx.lineWidth   = 2;
  ctx.stroke();

  for (let i = 0; i < n; i++) {
    const v = Math.min(1, (stats[keys[i]] || 0) / maxVal);
    const a = (Math.PI * 2 * i / n) - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v, 4, 0, Math.PI * 2);
    ctx.fillStyle = Object.values(STAT_COLORS)[i];
    ctx.fill();
  }
}

function renderLeaderboard() {
  const users = DB.users
    .filter(u => u.public_profile !== false)
    .sort((a, b) => (b.xp_total || 0) - (a.xp_total || 0));

  if (!users.length) {
    document.getElementById('stats-container').innerHTML =
      '<div class="empty"><div class="empty-emoji">🏆</div><div class="empty-text">Sii il primo in leaderboard!</div></div>';
    return;
  }

  const rankCls = ['gold', 'silver', 'bronze'];

  document.getElementById('stats-container').innerHTML =
    '<div style="padding:0 20px 20px">' +
    users.map((u, i) => {
      const isMe        = u.id === CUR.id;
      const trophyCount = (u.trophies || []).length;
      return `<div class="lb-row" style="${isMe ? 'border-color:var(--accent)' : ''}" onclick="viewProfile('${u.id}')">
        <div class="lb-rank ${rankCls[i] || ''}">${i + 1}</div>
        <div class="lb-avatar">${u.username[0].toUpperCase()}</div>
        <div class="lb-info">
          <div class="lb-name">${u.username}${isMe ? ' 👈' : ''} ${trophyCount ? `<span style="font-size:10px;color:var(--gold)">🏆×${trophyCount}</span>` : ''}</div>
          <div class="lb-xp">${(u.xp_total || 0).toLocaleString()} XP · ${u.streak_days || 0}🔥 streak</div>
        </div>
        <div class="lb-level">Lv.${u.level || 1}</div>
      </div>`;
    }).join('') + '</div>';
}

function viewProfile(userId) {
  const u = DB.users.find(u => u.id === userId);
  if (!u) return;

  const trophies  = u.trophies || [];
  const stats     = u.stats    || {};
  const pubQuests = DB.quests.filter(q => q.user_id === userId && q.completed && q.public).slice(0, 5);
  const pubBooks  = DB.books.filter(b => b.user_id === userId && b.completed && b.public).slice(0, 5);
  const wins      = DB.challenges.filter(c => c.winner_id === userId).length;

  let html = `<div class="profile-header">
    <div class="profile-avatar">${u.username[0].toUpperCase()}</div>
    <div class="profile-username">${u.username}</div>
    <div class="profile-rank">${rankTitle(u.level || 1)} · Lv.${u.level || 1}</div>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      <span class="tag tag-xp">⚡ ${(u.xp_total || 0).toLocaleString()} XP</span>
      <span class="streak-badge">🔥 ${u.streak_days || 0} gg</span>
      <span class="tag tag-green">🏆 ${wins} vittorie</span>
      <span class="tag tag-cyan">📚 ${DB.books.filter(b => b.user_id === userId && b.completed).length} libri</span>
    </div>
  </div>
  <div style="padding:14px 20px">
    <div class="section-hd"><span class="section-title">Statistiche</span></div>
    <div style="margin-bottom:14px">`;

  const maxV = Math.max(1, ...Object.values(stats).map(Number));
  Object.entries(STAT_COLORS).forEach(([k, col]) => {
    const v = stats[k] || 0;
    const p = Math.round((v / maxV) * 100);
    html += `<div class="stat-bar-row">
      <div class="stat-bar-label" style="color:${col}">${k}</div>
      <div class="stat-bar-bg"><div class="stat-bar-fg" style="width:${p}%;background:${col}"></div></div>
      <div class="stat-bar-val" style="color:${col}">${v}</div>
    </div>`;
  });

  html += '</div>';

  if (trophies.length) {
    html += `<div class="section-hd"><span class="section-title">Trofei (${trophies.length})</span></div>
      <div class="trophy-grid" style="padding:0;margin-bottom:14px">`;
    trophies.forEach(t => {
      const def = TROPHY_DEFS.find(d => d.id === t.id);
      if (!def) return;
      html += `<div class="trophy-item">
        <div class="trophy-emoji">${def.emoji}</div>
        <div class="trophy-name">${def.name}</div>
        <div class="trophy-date">${new Date(t.earned_at).toLocaleDateString('it')}</div>
      </div>`;
    });
    html += '</div>';
  }

  if (pubBooks.length) {
    html += `<div class="section-hd"><span class="section-title">Libri completati</span></div>`;
    pubBooks.forEach(b => {
      html += `<div class="session-row">
        <div class="session-dot" style="background:var(--orange)"></div>
        <div class="session-info">
          <div class="session-name">${b.emoji || '📖'} ${b.title}</div>
          <div class="session-time">${b.author || ''} · ${diffStars(b.difficulty)} · ${b.total_pages || '?'}pp</div>
        </div>
      </div>`;
    });
  }

  if (pubQuests.length) {
    html += `<div class="section-hd" style="margin-top:10px"><span class="section-title">Quest completate</span></div>`;
    pubQuests.forEach(q => {
      html += `<div class="session-row">
        <div class="session-dot"></div>
        <div class="session-info">
          <div class="session-name">${q.name}</div>
          <div class="session-time">${q.category} · ${q.xp_base} XP</div>
        </div>
      </div>`;
    });
  }

  if (!pubBooks.length && !pubQuests.length && !trophies.length) {
    html += '<div style="color:var(--text3);font-size:13px;padding:8px 0">Questo utente non ha ancora condiviso contenuti pubblici.</div>';
  }

  html += '</div>';

  document.getElementById('profile-content').innerHTML = html;
  openModal('modal-profile');
}


/* ── 16. EXPORT / IMPORT ── */

function exportData() {
  const data = {
    exported_at:   new Date().toISOString(),
    version:       2,
    user:          getUser(CUR.id),
    quests:        DB.quests.filter(q => q.user_id === CUR.id),
    exams:         DB.exams.filter(e => e.user_id === CUR.id),
    chapters:      DB.chapters,
    concepts:      DB.concepts,
    sessions:      DB.sessions.filter(s => s.user_id === CUR.id),
    books:         DB.books.filter(b => b.user_id === CUR.id),
    book_sessions: DB.book_sessions.filter(s => s.user_id === CUR.id),
    activities:    DB.activities.filter(a => a.user_id === CUR.id),
    challenges:    DB.challenges.filter(c => c.creator_id === CUR.id || c.joiner_id === CUR.id)
  };

  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = 'lifequest_v2_' + today() + '.json';
  a.click();
  showToast('📤 Backup esportato!');
}

function importData(input) {
  const file = input.files[0];
  if (!file) return;

  const r = new FileReader();
  r.onload = e => {
    try {
      const d = JSON.parse(e.target.result);

      if (d.user) {
        const ei = DB.users.findIndex(u => u.id === d.user.id);
        if (ei >= 0) DB.users[ei] = d.user;
        else         DB.users.push(d.user);
      }

      const merge = (arr, items) => {
        if (!items) return;
        items.forEach(item => { if (!arr.find(i => i.id === item.id)) arr.push(item); });
      };

      merge(DB.quests,        d.quests);
      merge(DB.exams,         d.exams);
      merge(DB.chapters,      d.chapters);
      merge(DB.concepts,      d.concepts);
      merge(DB.sessions,      d.sessions);
      merge(DB.books,         d.books);
      merge(DB.book_sessions, d.book_sessions);
      merge(DB.activities,    d.activities);
      merge(DB.challenges,    d.challenges);

      saveDB();
      showToast('📥 Dati importati!');
      renderStats();
    } catch (e) {
      showToast('⚠️ File non valido');
    }
  };

  r.readAsText(file);
  input.value = '';
}


/* ── 17. MODALI ── */

function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}


/* ── 18. AVVIO ── */

function bootApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display         = 'flex';

  updateDashboard();
  renderHome();
  checkTrophies();

  document.getElementById('motiv-text').textContent = MOTIVS[new Date().getDay() % MOTIVS.length];

  pendingRules = [];
  renderPendingRules();
}

// Auto-login se già autenticato
window.addEventListener('load', () => {
  if (CUR) {
    const u = getUser(CUR.id);
    if (u) { syncCUR(u); bootApp(); }
  }
});
