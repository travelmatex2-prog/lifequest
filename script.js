/* ============================================================
   LIFEQUEST — script.js v4.0 FIXED
   Architettura: local-first + cloud sync via GAS POST.
   FIX: rimosso GET_FULL_USER_DATA (non implementato lato GAS),
   renderTab ora gestisce life/stats, profile-container presente,
   tutte le azioni cloud ora usano solo endpoint esistenti.
   ============================================================ */

/* ── 1. COSTANTI ── */
const API_URL = "https://script.google.com/macros/s/AKfycbxzw2MQ7Xhpz90e6QB56FNYXbo16IZH0os90BnWqafzS27BE9dLw6k9LR3QJcNEZF6B/exec";
const DB_KEY  = 'lq_db_v4';

const RANK_TITLES = [
  'Novizio','Apprendista','Studioso','Veterano','Esperto',
  'Maestro','Gran Maestro','Leggenda','Semidio','Dio degli Eroi'
];

const XP_BOOK_PER_PAGE = 3;
const BOOK_DIFF_BONUS  = [0,50,150,300,500,800];

const BOOK_GENRE_STAT = {
  saggistica:'cultura', filosofia:'mente', scienza:'mente',
  storia:'cultura', economia:'mente', narrativa:'cultura',
  'self-help':'mente', tecnico:'mente', altro:'cultura'
};

const DIFF_MULT = [1,1,1.15,1.3,1.5,1.7];

const CAT_STAT = {
  mente:'mente', corpo:'corpo', cultura:'cultura', sociale:'sociale',
  'produttività':'produttività', athletic:'corpo', mental:'mente', mixed:'mente',
  altro:'produttività', sfide:'sfide'
};

const STAT_COLORS = {
  mente:'#7c6af7', corpo:'#3de89a', cultura:'#f5c842',
  sociale:'#ff6eb4', produttività:'#3dcff5', sfide:'#ff5e7a'
};

const MOTIVS = [
  'Ogni grande impresa inizia con un primo passo. 🚀',
  'La costanza batte il talento quando il talento non si impegna.',
  'Un giorno da guerriero vale più di mille da spettatore. ⚔️',
  'Non contare i giorni — fai contare i giorni.',
  'La disciplina è scegliere tra ciò che vuoi adesso e ciò che vuoi di più.',
  'Il successo è la somma di piccoli sforzi ripetuti ogni giorno.',
  'Il momento perfetto per iniziare era ieri. Il secondo migliore è adesso.',
  'Non esiste talento, solo dedizione mascherata da genio. 🧠',
  'Un capitolo al giorno tiene l\'ignoranza lontano. 📖',
  'La sofferenza di oggi è la forza di domani. 💪'
];

const ACTIVITIES = [
  { type:'gym',      name:'Palestra',       emoji:'🏋️', stat:'corpo',        extra:'workout', xp_base:120 },
  { type:'run',      name:'Corsa',          emoji:'🏃', stat:'corpo',        extra:'mins',    xp_base:80  },
  { type:'sport',    name:'Sport',          emoji:'⚽', stat:'corpo',        extra:null,      xp_base:70  },
  { type:'social',   name:'Uscita sociale', emoji:'🤝', stat:'sociale',      extra:null,      xp_base:35  },
  { type:'meditate', name:'Meditazione',    emoji:'🧘', stat:'mente',        extra:'mins',    xp_base:30  },
  { type:'cook',     name:'Cucinare sano',  emoji:'🍳', stat:'corpo',        extra:null,      xp_base:20  },
  { type:'creative', name:'Creatività',     emoji:'🎨', stat:'cultura',      extra:'mins',    xp_base:25  },
  { type:'nature',   name:'Escursione',     emoji:'🌲', stat:'corpo',        extra:null,      xp_base:60  },
  { type:'custom',   name:'Attività custom',emoji:'⭐', stat:'produttività', extra:'custom',  xp_base:25  }
];

/* ── 2. DATABASE ── */
function mkDB() {
  return {
    users:[], quests:[], exams:[], chapters:[], concepts:[],
    sessions:[], books:[], book_sessions:[], activities:[],
    challenges:[], challenge_templates:[]
  };
}

function loadDB() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) || mkDB(); }
  catch(e) { return mkDB(); }
}

function saveDB() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch(e) {}
}

let DB  = loadDB();
let CUR = null;
try { CUR = JSON.parse(localStorage.getItem('lq_cur_v4') || 'null'); } catch(e) {}

/* ── 3. UTILITÀ ── */
function uid() { return Math.random().toString(36).substr(2,9) + Date.now().toString(36); }
function ts()  { return Date.now(); }
function today(){ return new Date().toISOString().split('T')[0]; }

async function hashStr(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

function randCode() { return 'LQ-'+Math.floor(1000+Math.random()*9000); }
function diffStars(d){ return '⭐'.repeat(Math.max(1,d||1)); }

/* ── API: usa GET con ?action=&p= per evitare CORS preflight ── */
async function apiCall(action, payload) {
  try {
    const p = encodeURIComponent(JSON.stringify(payload || {}));
    const res = await fetch(`${API_URL}?action=${action}&p=${p}`, {
      method: 'GET',
      redirect: 'follow'
    });
    const text = await res.text();
    return JSON.parse(text);
  } catch(e) {
    console.warn('API call failed:', action, e);
    return { success: false, error: e.toString() };
  }
}

/* ── 4. SISTEMA XP & LIVELLI ── */
function xpForLevel(l)  { return Math.round(500*l*l); }
function calcLevel(xp)  { let l=1; while(xpForLevel(l+1)<=xp) l++; return l; }
function rankTitle(l)   { return RANK_TITLES[Math.min(Math.floor((l-1)/5),RANK_TITLES.length-1)]; }

function streakMult(u) {
  const d = u.streak_days||0;
  if(d>=30) return 1.5; if(d>=14) return 1.3;
  if(d>=7)  return 1.15; if(d>=3) return 1.05;
  return 1;
}

function awardXP(amount, stat, note, skipUpdate) {
  if(!CUR) return 0;
  const u = getUser(CUR.id);
  if(!u) return 0;
  const mult = streakMult(u);
  const xp   = Math.max(1, Math.round(amount*mult));
  u.xp_total = (u.xp_total||0)+xp;
  u.level    = calcLevel(u.xp_total);
  if(stat && u.stats) u.stats[stat] = (u.stats[stat]||0)+xp;
  const td = today();
  if(u.last_active!==td) {
    const yd = new Date(Date.now()-86400000).toISOString().split('T')[0];
    u.streak_days = (u.last_active===yd) ? (u.streak_days||0)+1 : 1;
    u.last_active = td;
  }
  saveDB(); syncCUR(u);
  showToast(`+${xp} XP ✨ ${note||''}`);
  spawnXPFloat(xp);
  apiCall('SYNC_USER_DATA', buildUserPayload(u));
  if(!skipUpdate) updateDashboard();
  return xp;
}

function buildUserPayload(u) {
  return {
    user_id:u.id, username:u.username,
    xp_total:u.xp_total||0, level:u.level||1,
    streak_days:u.streak_days||0, last_active:u.last_active||today(),
    public_profile:u.public_profile||false,
    stats:u.stats||{}
  };
}

function getUser(id) { return DB.users.find(u=>u.id===id); }
function syncCUR(u)  { CUR=u; localStorage.setItem('lq_cur_v4',JSON.stringify(u)); }

/* ── 5. EFFETTI VISIVI ── */
function spawnXPFloat(xp) {
  const el=document.createElement('div');
  el.className='xp-float'; el.textContent='+'+xp+' XP';
  el.style.top=(70+Math.random()*80)+'px';
  el.style.left=(60+Math.random()*200)+'px';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),950);
}

let toastTimer;
function showToast(msg) {
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),2800);
}

function showLoading(msg) {
  let el=document.getElementById('loading-overlay');
  if(!el){ el=document.createElement('div'); el.id='loading-overlay'; document.body.appendChild(el); }
  el.innerHTML=`<div class="loading-box"><div class="loading-spinner"></div><div>${msg||'Caricamento...'}</div></div>`;
  el.style.display='flex';
}
function hideLoading() {
  const el=document.getElementById('loading-overlay');
  if(el) el.style.display='none';
}

/* ── 6. AUTENTICAZIONE ── */
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((b,i)=>
    b.classList.toggle('active', i===(tab==='login'?0:1))
  );
  document.getElementById('login-form').style.display    = tab==='login'?'':'none';
  document.getElementById('register-form').style.display = tab==='register'?'':'none';
  document.getElementById('auth-error').textContent='';
}

async function doRegister() {
  const user=document.getElementById('r-user').value.trim();
  const pass=document.getElementById('r-pass').value;
  const pin =document.getElementById('r-pin').value.trim();
  const err =document.getElementById('auth-error');
  if(user.length<3)       {err.textContent='Username: min 3 caratteri';return;}
  if(pass.length<6)       {err.textContent='Password: min 6 caratteri';return;}
  if(!/^\d{4}$/.test(pin)){err.textContent='PIN: 4 cifre numeriche';return;}
  const password_hash=await hashStr(pass+'lq_salt_v2');
  const pin_hash     =await hashStr(pin +'lq_pin_v2');
  err.textContent='Registrazione in corso...';
  const result=await apiCall('REGISTER_USER',{username:user,password_hash,pin_hash});
  if(result.success) {
    const u={
      id:result.user_id, username:user, password_hash, pin_hash,
      xp_total:0, level:1, streak_days:0, last_active:today(),
      public_profile:false, avatar:'',
      stats:{mente:0,corpo:0,cultura:0,sociale:0,'produttività':0,sfide:0},
      trophies:[], privacy:{}, friends:[], friend_names:{}
    };
    DB.users.push(u); saveDB(); syncCUR(u); bootApp();
  } else { err.textContent=result.message||'Errore registrazione'; }
}

async function doLogin() {
  const user=document.getElementById('l-user').value.trim();
  const pass=document.getElementById('l-pass').value;
  const err =document.getElementById('auth-error');
  if(!user||!pass){err.textContent='Inserisci username e password';return;}
  const password_hash=await hashStr(pass+'lq_salt_v2');
  err.textContent='Accesso in corso...';
  showLoading('Accesso in corso...');
  try {
    const result=await apiCall('LOGIN_USER',{username:user,password_hash});
    hideLoading();
    if(result.success && result.user) {
      const cloudUser=result.user;
      // Merge con dati locali se esistono
      let localUser=DB.users.find(u=>u.id===cloudUser.id);
      if(localUser) {
        cloudUser.xp_total    = Math.max(localUser.xp_total||0, cloudUser.xp_total||0);
        cloudUser.level       = Math.max(localUser.level||1,    cloudUser.level||1);
        cloudUser.streak_days = Math.max(localUser.streak_days||0, cloudUser.streak_days||0);
        // Mantieni dati solo-locali
        cloudUser.trophies     = localUser.trophies||[];
        cloudUser.privacy      = localUser.privacy||{};
        cloudUser.friends      = localUser.friends||[];
        cloudUser.friend_names = localUser.friend_names||{};
        cloudUser.avatar       = localUser.avatar||'';
        if(cloudUser.stats) {
          Object.keys(localUser.stats||{}).forEach(k=>{
            cloudUser.stats[k]=Math.max(cloudUser.stats[k]||0, localUser.stats[k]||0);
          });
        }
        DB.users[DB.users.indexOf(localUser)]=cloudUser;
      } else {
        cloudUser.trophies=[]; cloudUser.privacy={}; cloudUser.friends=[]; cloudUser.friend_names={}; cloudUser.avatar='';
        DB.users.push(cloudUser);
      }
      saveDB(); syncCUR(cloudUser); bootApp(); err.textContent='';
    } else {
      // Fallback offline
      const local=DB.users.find(u=>u.username.toLowerCase()===user.toLowerCase() && u.password_hash===password_hash);
      if(local){ syncCUR(local); bootApp(); showToast('⚠️ Offline: dati locali'); }
      else err.textContent=result.message||'Credenziali errate';
    }
  } catch(e) {
    hideLoading();
    err.textContent='Errore di connessione.';
  }
}

/* ── 7. NAVIGAZIONE ── */
function gotoTab(tab) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('screen-'+tab).classList.add('active');
  document.getElementById('nav-'+tab).classList.add('active');
  renderTab(tab); window.scrollTo(0,0);
}

function renderTab(t) {
  const map = {
    home:   renderHome,
    quest:  renderQuests,
    study:  renderStudy,
    life:   renderLife,
    pvp:    renderPvP,
    stats:  renderStats
  };
  if(map[t]) map[t]();
}

/* ── 8. DASHBOARD ── */
function updateDashboard() {
  if(!CUR) return;
  const u=getUser(CUR.id)||CUR;
  const lvl=u.level||1;
  const xpCur=u.xp_total||0;
  const xpThis=xpForLevel(lvl), xpNxt=xpForLevel(lvl+1);
  const pct=Math.min(100,Math.round((xpCur-xpThis)/(xpNxt-xpThis)*100));
  document.getElementById('hd-level').textContent=lvl;
  document.getElementById('hd-name').textContent=u.username;
  document.getElementById('hd-rank').textContent=rankTitle(lvl)+' · Lv.'+lvl;
  document.getElementById('hd-streak').innerHTML='🔥 '+(u.streak_days||0)+' gg';
  document.getElementById('xp-bar').style.width=pct+'%';
  document.getElementById('xp-cur').textContent=xpCur.toLocaleString()+' XP';
  document.getElementById('xp-next').textContent='→ Lv.'+(lvl+1)+' ('+xpNxt.toLocaleString()+' XP)';
  const s=u.stats||{};
  ['mente','corpo','cultura','sociale','sfide'].forEach(k=>{
    const el=document.getElementById('ds-'+k);
    if(el) el.textContent=s[k]||0;
  });
}

function renderHome() {
  updateDashboard();
  document.getElementById('motiv-text').textContent=MOTIVS[new Date().getDay()%MOTIVS.length];
  const myQ=DB.quests.filter(q=>q.user_id===CUR.id&&!q.completed).slice(0,3);
  const ql=document.getElementById('home-quests-list');
  ql.innerHTML=myQ.length
    ? myQ.map(q=>`
      <div class="quest-card">
        <div class="quest-check" onclick="toggleQuest('${q.id}',event)"></div>
        <div class="quest-body">
          <div class="quest-name">${escHtml(q.name)}</div>
          <div class="quest-meta">
            <span class="tag tag-xp">⚡${q.xp_base} XP</span>
            <span class="tag tag-cat">${q.category}</span>
          </div>
        </div>
      </div>`).join('')
    : '<div class="empty" style="padding:16px 0"><div class="empty-emoji">🌟</div><div class="empty-text">Nessuna quest attiva.</div></div>';

  const acts=DB.activities.filter(a=>a.user_id===CUR.id).sort((a,b)=>b.date-a.date).slice(0,4);
  document.getElementById('home-activity-list').innerHTML=acts.map(a=>`
    <div class="session-row">
      <div class="session-dot"></div>
      <div class="session-info">
        <div class="session-name">${escHtml(a.name)}</div>
        <div class="session-time">${new Date(a.date).toLocaleDateString('it')}</div>
      </div>
      <div class="session-xp">+${a.xp} XP</div>
    </div>`).join('')
    || '<div style="color:var(--text3);font-size:12px;padding:8px 0">Nessuna attività recente.</div>';
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── 9. QUEST ── */
let qTab='todo';
let selectedCalDate=new Date().toISOString().split('T')[0];

function switchQuestTab(t) {
  qTab=t;
  document.querySelectorAll('#screen-quest .tab').forEach((b,i)=>
    b.classList.toggle('active',['todo','active','done','calendar'][i]===t)
  );
  renderQuests();
}

function renderQuests() {
  const c=document.getElementById('quest-list-container');
  if(qTab==='calendar'){ renderQuestCalendar(c); return; }
  const myQ=DB.quests.filter(q=>q.user_id===CUR.id);
  const list=qTab==='todo' ? myQ.filter(q=>!q.completed&&q.type==='todo')
    : qTab==='active' ? myQ.filter(q=>!q.completed&&q.type==='quest')
    : myQ.filter(q=>q.completed).sort((a,b)=>(b.completed_at||0)-(a.completed_at||0));
  c.innerHTML=list.length ? list.map(q=>`
    <div class="quest-card">
      <div class="quest-check ${q.completed?'done':''}" onclick="toggleQuest('${q.id}',event)"></div>
      <div class="quest-body">
        <div class="quest-name ${q.completed?'done':''}">${escHtml(q.name)}</div>
        <div class="quest-meta">
          <span class="tag tag-xp">⚡${q.xp_base} XP</span>
          <span class="tag tag-cat">${q.category}</span>
          ${q.completed?'<span class="tag tag-green">✅</span>':''}
        </div>
        ${q.notes?`<div style="font-size:11px;color:var(--text3);margin-top:4px">${escHtml(q.notes)}</div>`:''}
        ${q.completed&&q.completed_at?`<div style="font-size:10px;color:var(--text3);margin-top:2px">📅 ${new Date(q.completed_at).toLocaleDateString('it')}</div>`:''}
      </div>
      ${!q.completed?`<button class="btn-sm btn-sm-red" style="font-size:10px;padding:4px 8px" onclick="deleteQuest('${q.id}',event)">✕</button>`:''}
    </div>`).join('')
    : `<div class="empty"><div class="empty-emoji">${qTab==='done'?'🏆':'⚔️'}</div><div class="empty-text">${qTab==='done'?'Nessuna quest completata.':'Aggiungi la tua prima quest!'}</div></div>`;
}

function renderQuestCalendar(container) {
  const now=new Date(); const y=now.getFullYear(); const m=now.getMonth();
  const dim=new Date(y,m+1,0).getDate(); const fd=(new Date(y,m,1).getDay()+6)%7;
  const completedQ=DB.quests.filter(q=>q.user_id===CUR.id&&q.completed);
  const questDates={};
  completedQ.forEach(q=>{
    const dStr=q.completed_at?new Date(q.completed_at).toISOString().split('T')[0]:'';
    if(dStr) questDates[dStr]=(questDates[dStr]||0)+1;
  });
  let html=`<div style="text-align:center;font-size:15px;font-weight:700;margin-bottom:10px">📅 Registro Quest — ${new Date(y,m).toLocaleString('it',{month:'long',year:'numeric'})}</div><div class="cal-grid">`;
  ['Lu','Ma','Me','Gi','Ve','Sa','Do'].forEach(d=>html+=`<div class="cal-day-label">${d}</div>`);
  for(let i=0;i<fd;i++) html+='<div></div>';
  for(let d=1;d<=dim;d++) {
    const dayStr=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const count=questDates[dayStr]||0;
    const isSel=selectedCalDate===dayStr?'today':'';
    const hasQ=count>0?'has-session':'';
    html+=`<div class="cal-day ${isSel} ${hasQ}" onclick="selectQuestDate('${dayStr}')">${d}${count>0?`<span style="font-size:9px;display:block;color:var(--accent)">•${count}</span>`:''}
    </div>`;
  }
  html+='</div>';
  const dayQ=completedQ.filter(q=>{ const d=q.completed_at?new Date(q.completed_at).toISOString().split('T')[0]:''; return d===selectedCalDate; });
  html+=`<div style="margin-top:16px"><div class="section-hd"><span class="section-title">Quest del ${selectedCalDate} (${dayQ.length})</span></div>
  ${dayQ.length?dayQ.map(q=>`<div class="quest-card"><div class="quest-body"><div class="quest-name done">${escHtml(q.name)}</div><div class="quest-meta"><span class="tag tag-xp">⚡${q.xp_base} XP</span><span class="tag tag-cat">${q.category}</span></div></div></div>`).join('')
  :'<div style="color:var(--text3);font-size:12px;padding:8px 0">Nessuna quest completata in questa data.</div>'}</div>`;
  container.innerHTML=html;
}

function selectQuestDate(dateStr) { selectedCalDate=dateStr; renderQuestCalendar(document.getElementById('quest-list-container')); }

function addQuest() {
  const name=document.getElementById('q-name').value.trim();
  if(!name){showToast('⚠️ Inserisci un nome');return;}
  const cat=document.getElementById('q-cat').value;
  const diff=parseInt(document.getElementById('q-diff').value);
  const type=document.getElementById('q-type').value;
  const base=Math.round((type==='todo'?15:50)*DIFF_MULT[diff]);
  const q={
    id:uid(), user_id:CUR.id, name, category:cat, difficulty:diff,
    type, notes:document.getElementById('q-notes').value.trim(),
    xp_base:base, completed:false, created_at:ts()
  };
  DB.quests.push(q); saveDB();
  closeModal('modal-add-quest');
  document.getElementById('q-name').value=''; document.getElementById('q-notes').value='';
  renderQuests(); showToast('⚔️ Quest aggiunta!');
}

function deleteQuest(id, e) {
  if(e) e.stopPropagation();
  DB.quests=DB.quests.filter(q=>q.id!==id); saveDB(); renderQuests();
}

async function toggleQuest(id,e) {
  if(e) e.stopPropagation();
  const q=DB.quests.find(q=>q.id===id);
  if(!q||q.completed) return;
  q.completed=true; q.completed_at=ts(); saveDB();
  const stat=CAT_STAT[q.category]||'produttività';
  awardXP(q.xp_base,stat,'— '+q.name);
  checkTrophies(); renderQuests();
  await apiCall('COMPLETE_QUEST',{
    user_id:CUR.id, name:q.name, category:q.category,
    difficulty:q.difficulty||1, type:q.type||'quest',
    notes:q.notes||'', xp_base:q.xp_base
  });
}

/* ── 10. VITA (ACTIVITIES) ── */
function renderLife() {
  const grid=document.getElementById('activity-grid');
  grid.innerHTML=ACTIVITIES.map(a=>`
    <div class="activity-tile" onclick="openActivityModal('${a.type}')">
      <div class="activity-emoji">${a.emoji}</div>
      <div class="activity-name">${a.name}</div>
      <div class="activity-xp">+${a.xp_base} XP base</div>
    </div>`).join('');
  const log=DB.activities.filter(a=>a.user_id===CUR.id).sort((a,b)=>b.date-a.date).slice(0,12);
  document.getElementById('life-log-list').innerHTML=log.map(a=>`
    <div class="session-row">
      <div class="session-dot" style="background:${STAT_COLORS[a.stat]||'var(--accent)'}"></div>
      <div class="session-info">
        <div class="session-name">${escHtml(a.name)}</div>
        <div class="session-time">${new Date(a.date).toLocaleString('it')}</div>
      </div>
      <div class="session-xp">+${a.xp} XP</div>
    </div>`).join('')
    || '<div style="color:var(--text3);font-size:12px;padding:8px 20px">Nessuna attività ancora.</div>';
}

function openActivityModal(type) {
  const act=ACTIVITIES.find(a=>a.type===type); if(!act) return;
  document.getElementById('act-type').value=type;
  document.getElementById('act-stat').value=act.stat;
  document.getElementById('act-modal-title').textContent=act.emoji+' '+act.name;
  document.getElementById('act-notes').value='';
  let extra='';
  if(act.extra==='mins') extra=`<label class="input-label">MINUTI</label><input class="sm" id="act-mins" type="number" placeholder="es. 45" min="1" style="margin-bottom:10px">`;
  else if(act.extra==='workout') extra=`<label class="input-label">ESERCIZI FATTI</label><input class="sm" id="act-workout" placeholder="es. Petto + Tricipiti" style="margin-bottom:10px">`;
  else if(act.extra==='custom') {
    extra=`<label class="input-label">NOME ATTIVITÀ</label><input class="sm" id="act-custom-name" placeholder="es. Meditazione" style="margin-bottom:10px">
    <label class="input-label">XP GUADAGNATI</label><input class="sm" id="act-custom-xp" type="number" placeholder="es. 30" min="1" style="margin-bottom:10px">`;
  }
  document.getElementById('act-extra-fields').innerHTML=extra;
  openModal('modal-log-activity');
}

async function logActivity() {
  const type=document.getElementById('act-type').value;
  const stat=document.getElementById('act-stat').value;
  const act=ACTIVITIES.find(a=>a.type===type);
  if(!act) return;
  const notes=document.getElementById('act-notes').value;
  let xp=act.xp_base, name=act.name;
  if(act.extra==='mins') {
    const mins=parseInt(document.getElementById('act-mins')?.value)||0;
    xp=Math.round(act.xp_base*(mins/30)); if(xp<5) xp=5;
    name=act.emoji+' '+act.name+' ('+mins+' min)';
  } else if(act.extra==='workout') {
    const w=document.getElementById('act-workout')?.value||'';
    name=act.emoji+' Palestra'+( w?' — '+w:'');
  } else if(act.extra==='custom') {
    const cn=document.getElementById('act-custom-name')?.value||'Custom';
    xp=parseInt(document.getElementById('act-custom-xp')?.value)||25;
    name='⭐ '+cn;
  }
  const a={id:uid(),user_id:CUR.id,name,date:ts(),xp,stat,type,notes};
  DB.activities.push(a); saveDB();
  closeModal('modal-log-activity');
  awardXP(xp,stat,'— '+act.name); checkTrophies(); renderLife();
  await apiCall('LOG_ACTIVITY',{user_id:CUR.id,type,name,xp,stat,notes});
}

/* ── 11. LIBRI ── */
function renderBooks(c) {
  const books=DB.books.filter(b=>b.user_id===CUR.id);
  if(!books.length){ c.innerHTML='<div class="empty"><div class="empty-emoji">📚</div><div class="empty-text">Aggiungi il tuo primo libro!</div></div>'; return; }
  c.innerHTML=books.map(b=>{
    const pct=b.total_pages?Math.round((b.current_page||0)/b.total_pages*100):0;
    const done=(b.current_page||0)>=(b.total_pages||Infinity)&&b.total_pages>0;
    const sessions=DB.book_sessions.filter(s=>s.book_id===b.id).length;
    return `<div class="book-card">
      <div class="book-head">
        <div class="book-cover">${b.emoji||'📖'}</div>
        <div class="book-meta">
          <div class="book-title">${escHtml(b.title)}</div>
          <div class="book-author">${escHtml(b.author||'—')}</div>
          <div class="book-tags"><span class="tag tag-cat">${b.genre||'—'}</span><span class="tag tag-orange">${diffStars(b.difficulty)}</span>${done?'<span class="tag tag-green">✅</span>':''}</div>
          <div class="book-progress-wrap"><div class="book-progress-fill" style="width:${pct}%"></div></div>
          <div class="book-progress-nums"><span>${b.current_page||0} / ${b.total_pages||'?'} pag.</span><span>${pct}% · ${sessions} sessioni</span></div>
        </div>
      </div>
      ${!done?`<div class="book-actions">
        <button class="btn-sm btn-sm-primary" style="font-size:11px;flex:1" onclick="openReadingModal('${b.id}')">📖 +Pagine</button>
        <button class="btn-sm btn-sm-ghost" style="font-size:11px" onclick="markBookDone('${b.id}')">✅ Finito</button>
      </div>`:`<div style="font-size:11px;color:var(--green);padding-top:8px;text-align:center;font-weight:700">🏆 Bonus ${BOOK_DIFF_BONUS[b.difficulty]||0} XP!</div>`}
    </div>`;
  }).join('');
}

function addBook() {
  const title=document.getElementById('bk-title').value.trim();
  if(!title){showToast('⚠️ Inserisci il titolo');return;}
  const diff=parseInt(document.getElementById('bk-diff').value)||3;
  const b={
    id:uid(), user_id:CUR.id, title,
    author:document.getElementById('bk-author').value.trim(),
    genre:document.getElementById('bk-genre').value, difficulty:diff,
    total_pages:parseInt(document.getElementById('bk-pages').value)||0,
    current_page:0, emoji:document.getElementById('bk-emoji').value||'📖',
    completed:false, created_at:ts()
  };
  DB.books.push(b); saveDB();
  closeModal('modal-add-book');
  ['bk-title','bk-author','bk-pages','bk-emoji'].forEach(id=>{ document.getElementById(id).value=''; });
  renderStudy(); showToast('📚 Libro aggiunto!');
}

function openReadingModal(bookId) {
  const b=DB.books.find(b=>b.id===bookId); if(!b) return;
  document.getElementById('rd-book-id').value=bookId;
  document.getElementById('reading-modal-title').textContent='📖 '+b.title;
  document.getElementById('rd-pages').value='';
  document.getElementById('rd-current').value=b.current_page||'';
  document.getElementById('rd-notes').value='';
  openModal('modal-log-reading');
}

async function logReading() {
  const bookId=document.getElementById('rd-book-id').value;
  const b=DB.books.find(b=>b.id===bookId); if(!b) return;
  const pages=parseInt(document.getElementById('rd-pages').value)||0;
  const current=parseInt(document.getElementById('rd-current').value)||b.current_page;
  if(pages<1){showToast('⚠️ Inserisci le pagine lette');return;}
  b.current_page=Math.max(b.current_page||0,current);
  const xp=pages*XP_BOOK_PER_PAGE;
  const stat=BOOK_GENRE_STAT[b.genre]||'cultura';
  const sess={id:uid(),user_id:CUR.id,book_id:bookId,date:ts(),pages,current_page:b.current_page,notes:document.getElementById('rd-notes').value,xp};
  DB.book_sessions.push(sess);
  DB.activities.push({id:uid(),user_id:CUR.id,name:'📖 '+b.title+' ('+pages+'pp)',date:ts(),xp,stat,type:'reading'});
  saveDB(); closeModal('modal-log-reading');
  awardXP(xp,stat,'— Lettura: '+b.title);
  if(b.total_pages&&b.current_page>=b.total_pages&&!b.completed) markBookDone(bookId,true);
  else renderStudy();
}

async function markBookDone(bookId,silent) {
  const b=DB.books.find(b=>b.id===bookId); if(!b||b.completed) return;
  b.completed=true; b.completed_at=ts();
  if(!silent) b.current_page=b.total_pages||b.current_page;
  saveDB();
  const bonus=BOOK_DIFF_BONUS[b.difficulty]||0;
  const stat=BOOK_GENRE_STAT[b.genre]||'cultura';
  awardXP(bonus,stat,'— 🏆 Libro completato: '+b.title);
  checkTrophies(); renderStudy();
}

/* ── 12. TROFEI ── */
const TROPHY_DEFS = [
  {id:'first_quest', name:'Prima quest',       emoji:'⚔️', cat:'Quest',   check:()=>DB.quests.filter(q=>q.user_id===CUR.id&&q.completed).length>=1},
  {id:'quest_5',     name:'5 quest',            emoji:'🗡️', cat:'Quest',   check:()=>DB.quests.filter(q=>q.user_id===CUR.id&&q.completed).length>=5},
  {id:'quest_10',    name:'10 quest',           emoji:'🌟', cat:'Quest',   check:()=>DB.quests.filter(q=>q.user_id===CUR.id&&q.completed).length>=10},
  {id:'quest_25',    name:'25 quest',           emoji:'💫', cat:'Quest',   check:()=>DB.quests.filter(q=>q.user_id===CUR.id&&q.completed).length>=25},
  {id:'streak_3',    name:'Streak 3 giorni',    emoji:'🔥', cat:'Streak',  check:()=>(getUser(CUR.id)?.streak_days||0)>=3},
  {id:'streak_7',    name:'Streak 7 giorni',    emoji:'🔥', cat:'Streak',  check:()=>(getUser(CUR.id)?.streak_days||0)>=7},
  {id:'streak_14',   name:'Streak 2 settimane', emoji:'🌙', cat:'Streak',  check:()=>(getUser(CUR.id)?.streak_days||0)>=14},
  {id:'streak_30',   name:'Streak 30 giorni',   emoji:'⚡', cat:'Streak',  check:()=>(getUser(CUR.id)?.streak_days||0)>=30},
  {id:'level_5',     name:'Livello 5',          emoji:'⭐', cat:'Livello', check:()=>(getUser(CUR.id)?.level||0)>=5},
  {id:'level_10',    name:'Livello 10',         emoji:'🌍', cat:'Livello', check:()=>(getUser(CUR.id)?.level||0)>=10},
  {id:'xp_1000',     name:'1.000 XP',           emoji:'💎', cat:'XP',      check:()=>(getUser(CUR.id)?.xp_total||0)>=1000},
  {id:'xp_5000',     name:'5.000 XP',           emoji:'💍', cat:'XP',      check:()=>(getUser(CUR.id)?.xp_total||0)>=5000},
  {id:'first_book',  name:'Primo libro',        emoji:'📚', cat:'Lettura', check:()=>DB.books.filter(b=>b.user_id===CUR.id&&b.completed).length>=1},
  {id:'books_3',     name:'3 libri',            emoji:'📖', cat:'Lettura', check:()=>DB.books.filter(b=>b.user_id===CUR.id&&b.completed).length>=3},
  {id:'gym_3',       name:'3 sessioni palestra', emoji:'🏋️',cat:'Vita',    check:()=>DB.activities.filter(a=>a.user_id===CUR.id&&a.type==='gym').length>=3},
  {id:'gym_10',      name:'10 sessioni palestra',emoji:'💪', cat:'Vita',    check:()=>DB.activities.filter(a=>a.user_id===CUR.id&&a.type==='gym').length>=10},
  {id:'pvp_first',   name:'Prima sfida',        emoji:'⚔️', cat:'Sfide',   check:()=>DB.challenges.filter(c=>c.creator_id===CUR.id||c.joiner_id===CUR.id).length>=1},
  {id:'pvp_win',     name:'Prima vittoria',     emoji:'🏆', cat:'Sfide',   check:()=>DB.challenges.filter(c=>c.winner_id===CUR.id).length>=1},
];

function checkTrophies() {
  const u=getUser(CUR.id); if(!u) return;
  if(!u.trophies) u.trophies=[];
  let newOnes=false;
  TROPHY_DEFS.forEach(def=>{
    if(!u.trophies.find(t=>t.id===def.id) && def.check()) {
      u.trophies.push({id:def.id,earned_at:ts()});
      newOnes=true;
      setTimeout(()=>showToast('🏆 Trofeo: '+def.name+' '+def.emoji),500);
    }
  });
  if(newOnes){ saveDB(); syncCUR(u); apiCall('SYNC_USER_DATA',buildUserPayload(u)); }
}

/* ── 13. STUDIO ── */
let studyTab='exams';
function switchStudyTab(t) {
  studyTab=t;
  document.querySelectorAll('#screen-study .tab').forEach((b,i)=>
    b.classList.toggle('active',['exams','books','sessions','calendar'][i]===t)
  );
  renderStudy();
}

function renderStudy() {
  const c=document.getElementById('study-container');
  if(studyTab==='exams') renderExams(c);
  else if(studyTab==='books') renderBooks(c);
  else if(studyTab==='sessions') renderSessions(c);
  else renderCalendar(c);
}

function masteryPct(examId) {
  const chs=DB.chapters.filter(c=>c.exam_id===examId);
  if(!chs.length) return 0;
  const allCo=chs.flatMap(c=>DB.concepts.filter(co=>co.chapter_id===c.id));
  const doneCo=allCo.filter(c=>c.completed).length;
  return Math.round(((chs.filter(c=>c.completed).length/chs.length)*0.4+(allCo.length?doneCo/allCo.length:0)*0.6)*100);
}

function renderExams(c) {
  const exams=DB.exams.filter(e=>e.user_id===CUR.id);
  if(!exams.length){ c.innerHTML='<div class="empty"><div class="empty-emoji">📘</div><div class="empty-text">Aggiungi il tuo primo esame!</div></div>'; return; }
  c.innerHTML=exams.map(exam=>{
    const chs=DB.chapters.filter(ch=>ch.exam_id===exam.id);
    const mp=masteryPct(exam.id);
    const dl=exam.exam_date?Math.ceil((new Date(exam.exam_date)-new Date())/86400000):null;
    const dlStr=dl!==null?(dl>0?dl+'gg':dl===0?'Oggi!':'Passato'):'';
    const mpColor=mp>75?'var(--green)':mp>40?'var(--accent2)':'var(--red)';
    return `<div class="exam-card">
      <div class="exam-head" onclick="toggleExamBody('${exam.id}')">
        <div class="exam-icon">${exam.emoji||'📘'}</div>
        <div class="exam-info">
          <div class="exam-name">${escHtml(exam.title)}</div>
          <div class="exam-date">${exam.exam_date?'📅 '+exam.exam_date+' ('+dlStr+')':''} · Mastery <b style="color:${mpColor}">${mp}%</b></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <button class="btn-sm btn-sm-primary" style="font-size:10px;padding:4px 8px" onclick="event.stopPropagation();openLogSession('${exam.id}')">+Sessione</button>
          <button class="btn-sm btn-sm-ghost" style="font-size:10px;padding:4px 8px" onclick="event.stopPropagation();openAddChapter('${exam.id}')">+Cap.</button>
        </div>
      </div>
      <div class="mastery-bar"><div class="mastery-fill" style="width:${mp}%"></div></div>
      <div class="exam-body" id="exam-body-${exam.id}">${chs.length?chs.map(renderChRow).join(''):'<div style="font-size:12px;color:var(--text3);padding:4px 0">Nessun capitolo ancora.</div>'}</div>
    </div>`;
  }).join('');
}

function renderChRow(ch) {
  const cos=DB.concepts.filter(c=>c.chapter_id===ch.id);
  const done=cos.filter(c=>c.completed).length;
  return `<div class="chapter-row">
    <div class="ch-check ${ch.completed?'done':''}" onclick="toggleChapter('${ch.id}')"></div>
    <div class="ch-info">
      <div class="ch-name" style="${ch.completed?'text-decoration:line-through;color:var(--text3)':''}">${escHtml(ch.title)}</div>
      <div class="ch-concepts">${diffStars(ch.difficulty||2)} · ${done}/${cos.length} concetti</div>
    </div>
    <div class="ch-btns">
      <span class="ch-expand" onclick="toggleConcepts('${ch.id}')">concetti ▾</span>
      <span class="ch-expand" onclick="openAddConcept('${ch.id}')">+</span>
    </div>
  </div>
  <div id="concepts-${ch.id}" style="display:none">
    ${cos.map(co=>`<div class="concept-row"><div class="concept-check ${co.completed?'done':''}" onclick="toggleConcept('${co.id}')"></div><span class="concept-name ${co.completed?'done':''}">${escHtml(co.title)}</span></div>`).join('')}
    ${!cos.length?'<div style="font-size:11px;color:var(--text3);padding:4px 8px">Nessun concetto. Clicca + per aggiungere.</div>':''}
  </div>`;
}

function toggleExamBody(id){ document.getElementById('exam-body-'+id)?.classList.toggle('open'); }
function toggleConcepts(id){ const el=document.getElementById('concepts-'+id); if(el) el.style.display=el.style.display==='none'?'block':'none'; }

async function addExam() {
  const title=document.getElementById('ex-name').value.trim();
  if(!title){showToast('⚠️ Nome materia richiesto');return;}
  const e={id:uid(),user_id:CUR.id,title,exam_date:document.getElementById('ex-date').value,target_hours:parseInt(document.getElementById('ex-hours').value)||40,emoji:document.getElementById('ex-emoji').value||'📘',created_at:ts()};
  DB.exams.push(e); saveDB(); closeModal('modal-add-exam');
  document.getElementById('ex-name').value='';
  renderStudy(); showToast('📘 Esame aggiunto!');
}

function openAddChapter(examId){ document.getElementById('ch-exam-id').value=examId; document.getElementById('ch-name').value=''; openModal('modal-add-chapter'); }

async function addChapter() {
  const name=document.getElementById('ch-name').value.trim();
  if(!name){showToast('⚠️ Nome capitolo richiesto');return;}
  const ch={id:uid(),exam_id:document.getElementById('ch-exam-id').value,title:name,difficulty:parseInt(document.getElementById('ch-diff').value)||3,completed:false,created_at:ts()};
  DB.chapters.push(ch); saveDB(); closeModal('modal-add-chapter'); renderStudy(); showToast('📚 Capitolo aggiunto!');
}

async function toggleChapter(id) {
  const ch=DB.chapters.find(c=>c.id===id); if(!ch||ch.completed) return;
  ch.completed=true; ch.completed_at=ts(); saveDB();
  awardXP(Math.round(80*DIFF_MULT[ch.difficulty||2]),'mente','— Capitolo: '+ch.title);
  checkTrophies(); renderStudy();
}

function openAddConcept(chId){ document.getElementById('co-chapter-id').value=chId; document.getElementById('co-name').value=''; document.getElementById('co-notes').value=''; openModal('modal-add-concept'); }

async function addConcept() {
  const name=document.getElementById('co-name').value.trim();
  if(!name){showToast('⚠️ Nome concetto richiesto');return;}
  const co={id:uid(),chapter_id:document.getElementById('co-chapter-id').value,title:name,notes:document.getElementById('co-notes').value,completed:false,created_at:ts()};
  DB.concepts.push(co); saveDB(); closeModal('modal-add-concept'); renderStudy(); showToast('🔵 Concetto aggiunto!');
}

async function toggleConcept(id) {
  const co=DB.concepts.find(c=>c.id===id); if(!co||co.completed) return;
  co.completed=true; co.completed_at=ts(); saveDB();
  awardXP(25,'mente','— Concetto: '+co.title); renderStudy();
}

function openLogSession(examId){ document.getElementById('ss-exam-id').value=examId; document.getElementById('ss-mins').value=''; document.getElementById('ss-notes').value=''; openModal('modal-log-session'); }

async function logSession() {
  const mins=parseInt(document.getElementById('ss-mins').value);
  if(!mins||mins<1){showToast('⚠️ Inserisci i minuti');return;}
  const examId=document.getElementById('ss-exam-id').value;
  const focus=parseInt(document.getElementById('ss-focus').value)||3;
  const exam=DB.exams.find(e=>e.id===examId);
  const xp=Math.round((mins/30)*40*(0.7+focus*0.1));
  const sess={id:uid(),user_id:CUR.id,exam_id:examId,exam_name:exam?.title||'Studio',date:ts(),duration_min:mins,focus_score:focus,notes:document.getElementById('ss-notes').value,xp};
  DB.sessions.push(sess);
  DB.activities.push({id:uid(),user_id:CUR.id,name:'📝 Studio: '+(exam?.title||'Generico')+' ('+mins+'min)',date:ts(),xp,stat:'mente',type:'study'});
  saveDB(); closeModal('modal-log-session');
  awardXP(xp,'mente','— Sessione '+mins+'min'); checkTrophies(); renderStudy();
}

function renderSessions(c) {
  const sss=DB.sessions.filter(s=>s.user_id===CUR.id).sort((a,b)=>b.date-a.date);
  c.innerHTML='<div style="padding:0 20px">'+(sss.length?sss.map(s=>`
    <div class="session-row">
      <div class="session-dot"></div>
      <div class="session-info">
        <div class="session-name">${escHtml(s.exam_name)} — ${s.duration_min}min</div>
        <div class="session-time">${new Date(s.date).toLocaleString('it')} · Focus: ${'⭐'.repeat(s.focus_score)}</div>
        ${s.notes?`<div style="font-size:10px;color:var(--text3);margin-top:2px">${escHtml(s.notes)}</div>`:''}
      </div>
      <div class="session-xp">+${s.xp} XP</div>
    </div>`).join('')
    :'<div class="empty"><div class="empty-emoji">📝</div><div class="empty-text">Nessuna sessione ancora.</div></div>')+'</div>';
}

function renderCalendar(c) {
  const now=new Date(); const y=now.getFullYear(); const m=now.getMonth();
  const fd=(new Date(y,m,1).getDay()+6)%7; const dim=new Date(y,m+1,0).getDate();
  const MN=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const sDates=new Set(DB.sessions.filter(s=>s.user_id===CUR.id).map(s=>{const d=new Date(s.date);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}));
  const bDates=new Set(DB.book_sessions.filter(s=>s.user_id===CUR.id).map(s=>{const d=new Date(s.date);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}));
  let html=`<div style="text-align:center;font-size:14px;font-weight:700;color:var(--text);padding:12px 20px 8px">${MN[m]} ${y}</div><div class="cal-grid">`;
  ['Lu','Ma','Me','Gi','Ve','Sa','Do'].forEach(d=>html+=`<div class="cal-day-label">${d}</div>`);
  for(let i=0;i<fd;i++) html+='<div></div>';
  for(let d=1;d<=dim;d++) {
    const isT=d===now.getDate(); const k=y+'-'+(m+1)+'-'+d;
    const cls=[isT?'today':'',sDates.has(k)?'has-session':'',bDates.has(k)?'has-book':''].filter(Boolean).join(' ');
    html+=`<div class="cal-day ${cls}">${d}</div>`;
  }
  html+='</div><div style="padding:10px 20px;font-size:11px;color:var(--text3)">🔵 Studio · 🟠 Lettura</div>';
  c.innerHTML=html;
}

/* ── 14. SFIDE PVP ── */
let pvpTab='active', pendingRules=[];
function switchPvpTab(t) {
  pvpTab=t;
  document.querySelectorAll('#screen-pvp .tab').forEach((b,i)=>b.classList.toggle('active',['active','pending','history'][i]===t));
  renderPvP();
}

function renderPvP() {
  const myC=DB.challenges.filter(c=>c.creator_id===CUR.id||c.joiner_id===CUR.id);
  const list=pvpTab==='active'?myC.filter(c=>c.status==='active'):pvpTab==='pending'?myC.filter(c=>c.status==='pending'):myC.filter(c=>c.status==='done');
  const c=document.getElementById('pvp-container');
  c.innerHTML=list.length?list.map(ch=>renderChallengeCard(ch)).join(''):`<div class="empty"><div class="empty-emoji">${pvpTab==='done'?'🏆':'⚔️'}</div><div class="empty-text">Nessuna sfida ${pvpTab==='active'?'attiva':pvpTab==='pending'?'in attesa':'conclusa'}.</div></div>`;
}

function renderChallengeCard(ch) {
  const iWon=ch.winner_id===CUR.id;
  const typeLabel={athletic:'🏋️ Atletica',mental:'🧠 Mentale',mixed:'🎯 Mista'}[ch.type]||ch.type;
  const typeClass={athletic:'ch-type-ath',mental:'ch-type-men',mixed:'ch-type-mix'}[ch.type]||'ch-type-men';
  return `<div class="challenge-card" onclick="viewChallenge('${ch.id}')">
    <div class="challenge-head"><span class="ch-type-badge ${typeClass}">${typeLabel}</span><span class="challenge-title">${escHtml(ch.title)}</span></div>
    <div class="challenge-meta">${escHtml(ch.description||'')} · Scad. ${ch.deadline||'—'}</div>
    <div class="challenge-footer">
      <span class="challenge-stake">⚡ ${ch.stake} XP</span>
      <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
        ${ch.status==='done'?`<span class="tag ${iWon?'tag-green':'tag-red'}">${iWon?'🏆 Vinta':'❌ Persa'}</span>`:''}
        ${ch.status==='active'?`<button class="btn-sm btn-sm-primary" style="font-size:10px" onclick="event.stopPropagation();openDeclareWinner('${ch.id}')">Dichiara vincitore</button>`:''}
        <span class="challenge-code">${ch.code}</span>
      </div>
    </div>
  </div>`;
}

function viewChallenge(id) {
  const ch=DB.challenges.find(c=>c.id===id); if(!ch) return;
  const typeLabel={athletic:'🏋️ Atletica',mental:'🧠 Mentale',mixed:'🎯 Mista'}[ch.type]||ch.type;
  document.getElementById('challenge-detail-content').innerHTML=`
    <div class="modal-handle" style="margin:16px auto 14px"></div>
    <div style="padding:0 22px 6px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><span class="ch-type-badge ch-type-${ch.type}">${typeLabel}</span><span style="font-size:17px;font-weight:800;flex:1">${escHtml(ch.title)}</span></div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:14px">${escHtml(ch.description||'—')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0">
        <div class="card2"><div style="font-size:18px;font-weight:900;color:var(--gold)">${ch.stake}</div><div style="font-size:10px;color:var(--text3)">XP in palio</div></div>
        <div class="card2"><div style="font-size:14px;font-weight:700">${ch.deadline||'—'}</div><div style="font-size:10px;color:var(--text3)">Scadenza</div></div>
        <div class="card2"><div style="font-size:14px;font-weight:700">${escHtml(ch.creator_username||'—')}</div><div style="font-size:10px;color:var(--text3)">Creatore</div></div>
        <div class="card2"><div style="font-size:14px;font-weight:700">${escHtml(ch.joiner_username||'In attesa...')}</div><div style="font-size:10px;color:var(--text3)">Avversario</div></div>
      </div>
      ${ch.status==='active'?`<button class="btn-sm btn-sm-primary" style="width:100%;margin-bottom:8px" onclick="closeModal('modal-challenge-detail');openDeclareWinner('${ch.id}')">🏆 Dichiara vincitore</button>`:''}
      <div style="text-align:center;margin-top:8px"><span class="challenge-code" onclick="copyCode('${ch.code}')">Codice: ${ch.code} — tocca per copiare</span></div>
    </div>`;
  openModal('modal-challenge-detail');
}

function copyCode(code) {
  navigator.clipboard.writeText(code).then(()=>showToast('🔁 Codice copiato!')).catch(()=>showToast('Codice: '+code));
}

function addRule(type) {
  pendingRules=pendingRules||[]; document.getElementById('rule-type').value=type;
  const titles={metrica:'📊 Aggiungi Metrica',durata:'⏱️ Aggiungi Durata',condizione:'🔁 Aggiungi Condizione',penalita:'⚠️ Aggiungi Penalità'};
  document.getElementById('rule-modal-title').textContent=titles[type]||'Aggiungi Regola';
  const fields={
    metrica:`<label class="input-label">COSA SI MISURA</label><input class="sm sm-mb" id="rf-what" placeholder="es. pagine lette, km corsi"><label class="input-label">OBIETTIVO</label><input class="sm sm-mb" id="rf-target" placeholder="es. Chi arriva a 200 pagine">`,
    durata:`<label class="input-label">DURATA</label><input class="sm sm-mb" id="rf-duration" placeholder="es. 7 giorni"><label class="input-label">DATA INIZIO</label><input class="sm sm-mb" id="rf-start" type="date"><label class="input-label">DATA FINE</label><input class="sm sm-mb" id="rf-end" type="date">`,
    condizione:`<label class="input-label">REGOLA / CONDIZIONE</label><textarea class="sm sm-mb" id="rf-cond" placeholder="es. Ogni giorno almeno 30 min..."></textarea>`,
    penalita:`<label class="input-label">PENALITÀ</label><input class="sm sm-mb" id="rf-pen" placeholder="es. -50 XP extra">`
  };
  document.getElementById('rule-fields').innerHTML=fields[type]||''; openModal('modal-add-rule');
}

function saveRule() {
  const type=document.getElementById('rule-type').value; let value='';
  if(type==='metrica') value=(document.getElementById('rf-what')?.value||'')+' — Obiettivo: '+(document.getElementById('rf-target')?.value||'');
  else if(type==='durata') { const dur=document.getElementById('rf-duration')?.value||''; const s=document.getElementById('rf-start')?.value||''; const e=document.getElementById('rf-end')?.value||''; value=dur+(s?' · dal '+s:'')+(e?' al '+e:''); }
  else if(type==='condizione') value=document.getElementById('rf-cond')?.value||'';
  else if(type==='penalita') value=document.getElementById('rf-pen')?.value||'';
  if(!value.trim()){showToast('⚠️ Compila i campi');return;}
  pendingRules.push({type,value}); renderPendingRules(); closeModal('modal-add-rule');
}

function renderPendingRules() {
  const list=document.getElementById('pvp-rules-list'); if(!list) return;
  list.innerHTML=(pendingRules||[]).map((r,i)=>`<div class="rule-item"><div class="rule-item-type">${r.type}</div><div class="rule-item-value">${escHtml(r.value)}</div><button class="rule-item-remove" onclick="removeRule(${i})">✕</button></div>`).join('');
}

function removeRule(i){ pendingRules.splice(i,1); renderPendingRules(); }

async function createChallenge() {
  const title=document.getElementById('pvp-title').value.trim();
  if(!title){showToast('⚠️ Inserisci il titolo');return;}
  const stake=Math.min(20,Math.max(5,parseInt(document.getElementById('pvp-stake').value)||20));
  const code=randCode();
  const ch={id:uid(),creator_id:CUR.id,creator_username:CUR.username,joiner_id:null,joiner_username:null,type:document.getElementById('pvp-type').value,title,description:document.getElementById('pvp-desc').value,rules:[...(pendingRules||[])],stake,deadline:document.getElementById('pvp-deadline').value,code,status:'pending',created_at:ts()};
  DB.challenges.push(ch); saveDB(); pendingRules=[]; renderPendingRules(); closeModal('modal-create-challenge');
  showToast('⚔️ Sfida creata! Codice: '+code); renderPvP();
}

async function joinChallenge() {
  const code=document.getElementById('join-code-input').value.trim().toUpperCase();
  let ch=DB.challenges.find(c=>c.code===code);
  if(!ch){showToast('⚠️ Codice non trovato localmente. Chiedi il codice al creatore.');return;}
  if(ch.creator_id===CUR.id){showToast('⚠️ Non puoi unirti alla tua sfida');return;}
  if(ch.joiner_id){showToast('⚠️ Sfida già occupata');return;}
  ch.joiner_id=CUR.id; ch.joiner_username=CUR.username; ch.status='active';
  saveDB(); document.getElementById('join-code-input').value='';
  showToast('⚔️ Sfida accettata!'); renderPvP();
}

function openDeclareWinner(id){ document.getElementById('win-challenge-id').value=id; openModal('modal-declare-winner'); }

async function declareWinner(who) {
  const id=document.getElementById('win-challenge-id').value;
  const ch=DB.challenges.find(c=>c.id===id); if(!ch) return;
  ch.status='done';
  if(who==='me'){ ch.winner_id=CUR.id; awardXP(ch.stake,'sfide','🏆 Sfida vinta: '+ch.title); }
  else if(who==='draw'){ ch.winner_id='draw'; awardXP(Math.floor(ch.stake/2),'sfide','🤝 Pareggio: '+ch.title); }
  else { ch.winner_id=(ch.creator_id===CUR.id)?(ch.joiner_id||'opp'):ch.creator_id; }
  saveDB(); closeModal('modal-declare-winner'); closeModal('modal-challenge-detail');
  checkTrophies(); renderPvP();
}

/* ── 15. STATS / LEADERBOARD ── */
let statsTab='stats';
function switchStatsTab(t) {
  statsTab=t;
  document.querySelectorAll('#screen-stats .tab').forEach((b,i)=>b.classList.toggle('active',['stats','leaderboard'][i]===t));
  renderStats();
}

function renderStats() {
  if(statsTab==='stats') renderMyStats();
  else renderLeaderboard();
}

function renderMyStats() {
  const container=document.getElementById('stats-container');
  const u=getUser(CUR.id)||CUR;
  const stats=u.stats||{};
  const maxVal=Math.max(1,...Object.values(stats).map(Number));
  const trophies=u.trophies||[];
  const wins=DB.challenges.filter(c=>c.winner_id===CUR.id).length;
  const totalQuests=DB.quests.filter(q=>q.user_id===CUR.id&&q.completed).length;
  const totalBooks=DB.books.filter(b=>b.user_id===CUR.id&&b.completed).length;

  let html=`<div style="padding:0 20px 20px">
    <div style="display:flex;align-items:center;gap:16px;padding:16px 0">
      <div class="level-badge" style="width:60px;height:60px;font-size:22px">${u.level||1}</div>
      <div style="flex:1">
        <div style="font-size:20px;font-weight:900">${escHtml(u.username)}</div>
        <div style="font-size:12px;color:var(--accent2)">${rankTitle(u.level||1)} · Lv.${u.level||1}</div>
        <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
          <span class="tag tag-xp">⚡ ${(u.xp_total||0).toLocaleString()} XP</span>
          <span class="streak-badge">🔥 ${u.streak_days||0} gg</span>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:14px">
      <div class="card2" style="text-align:center"><div style="font-size:18px;font-weight:900;color:var(--green)">${wins}</div><div style="font-size:10px;color:var(--text3)">Vittorie</div></div>
      <div class="card2" style="text-align:center"><div style="font-size:18px;font-weight:900;color:var(--gold)">${totalQuests}</div><div style="font-size:10px;color:var(--text3)">Quest</div></div>
      <div class="card2" style="text-align:center"><div style="font-size:18px;font-weight:900;color:var(--cyan)">${totalBooks}</div><div style="font-size:10px;color:var(--text3)">Libri</div></div>
    </div>
    <div style="text-align:center;margin-bottom:8px"><canvas id="stats-canvas" width="240" height="240"></canvas></div>
    <div style="margin-bottom:14px">`;
  Object.entries(STAT_COLORS).forEach(([k,col])=>{
    const v=stats[k]||0; const p=Math.round((v/maxVal)*100);
    html+=`<div class="stat-bar-row"><div class="stat-bar-label" style="color:${col}">${k}</div><div class="stat-bar-bg"><div class="stat-bar-fg" style="width:${p}%;background:${col}"></div></div><div class="stat-bar-val" style="color:${col}">${v}</div></div>`;
  });
  html+=`</div>
    <div class="visibility-toggle" style="margin-bottom:12px">
      <div class="toggle-track ${u.public_profile?'on':''}" id="profile-vis-toggle" onclick="toggleProfileVis()"><div class="toggle-knob"></div></div>
      <span class="toggle-label" style="font-size:12px">Visibile in leaderboard</span>
    </div>
    <button class="btn-sm btn-sm-ghost" style="width:100%;margin-bottom:12px" onclick="openPrivacySettings()">🔒 Impostazioni privacy</button>
    <div class="section-hd" style="margin-bottom:8px"><span class="section-title">Trofei (${trophies.length}/${TROPHY_DEFS.length})</span></div>`;

  const cats=[...new Set(TROPHY_DEFS.map(d=>d.cat))];
  cats.forEach(cat=>{
    const catDefs=TROPHY_DEFS.filter(d=>d.cat===cat);
    html+=`<div style="font-size:10px;color:var(--text3);font-weight:800;text-transform:uppercase;letter-spacing:.8px;margin:10px 0 6px">${cat}</div>
    <div class="trophy-grid" style="grid-template-columns:repeat(3,1fr);padding:0;margin-bottom:8px">`;
    catDefs.forEach(def=>{
      const earned=trophies.find(t=>t.id===def.id);
      html+=`<div class="trophy-item" style="${!earned?'opacity:.3':''}">
        <div class="trophy-emoji">${def.emoji}</div>
        <div class="trophy-name">${def.name}</div>
        ${earned?`<div class="trophy-date">${new Date(earned.earned_at).toLocaleDateString('it')}</div>`:''}
      </div>`;
    });
    html+='</div>';
  });

  html+=`<button class="btn-sm btn-sm-red" style="width:100%;margin-top:16px;margin-bottom:24px" onclick="doLogout()">🚪 Esci dall'account</button></div>`;
  container.innerHTML=html;
  setTimeout(()=>drawRadar(stats,maxVal),50);
}

async function renderLeaderboard() {
  const container=document.getElementById('stats-container');
  container.innerHTML='<div style="text-align:center;padding:40px;color:var(--text3)">⏳ Caricamento leaderboard...</div>';
  let users=[];
  try {
    const result=await apiCall('GET_LEADERBOARD',{});
    if(result.success) users=result.leaderboard||[];
  } catch(e) {
    users=DB.users.filter(u=>u.public_profile).map(u=>({id:u.id,username:u.username,xp_total:u.xp_total||0,level:u.level||1,streak_days:u.streak_days||0})).sort((a,b)=>b.xp_total-a.xp_total);
    showToast('⚠️ Leaderboard offline');
  }
  if(!users.length){
    container.innerHTML='<div class="empty"><div class="empty-emoji">🏆</div><div class="empty-text">Sii il primo in leaderboard!<br><small style="color:var(--text3)">Attiva "Visibile in leaderboard"</small></div></div>';
    return;
  }
  const rankCls=['gold','silver','bronze'];
  container.innerHTML='<div style="padding:0 20px 20px">'+users.map((u,i)=>{
    const isMe=CUR&&u.id===CUR.id;
    return `<div class="lb-row" style="${isMe?'border-color:var(--accent)':''}">
      <div class="lb-rank ${rankCls[i]||''}">${i+1}</div>
      <div class="lb-avatar">${u.username[0].toUpperCase()}</div>
      <div class="lb-info"><div class="lb-name">${escHtml(u.username)}${isMe?' 👈':''}</div><div class="lb-xp">${(u.xp_total||0).toLocaleString()} XP · ${u.streak_days||0}🔥 streak</div></div>
      <div class="lb-level">Lv.${u.level||1}</div>
    </div>`;
  }).join('')+'</div>';
}

function toggleProfileVis() {
  const u=getUser(CUR.id); if(!u) return;
  u.public_profile=!u.public_profile; saveDB(); syncCUR(u);
  document.getElementById('profile-vis-toggle').classList.toggle('on',u.public_profile);
  showToast(u.public_profile?'🌐 Profilo pubblico':'🔒 Profilo privato');
  apiCall('SYNC_USER_DATA',buildUserPayload(u));
}

function drawRadar(stats,maxVal) {
  const canvas=document.getElementById('stats-canvas'); if(!canvas) return;
  const ctx=canvas.getContext('2d'); const W=240,H=240,cx=120,cy=120,r=84;
  const keys=Object.keys(STAT_COLORS); const n=keys.length;
  ctx.clearRect(0,0,W,H);
  for(let g=1;g<=4;g++) {
    ctx.beginPath();
    for(let i=0;i<n;i++) { const a=(Math.PI*2*i/n)-Math.PI/2; const x=cx+Math.cos(a)*r*(g/4); const y=cy+Math.sin(a)*r*(g/4); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }
    ctx.closePath(); ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=1; ctx.stroke();
  }
  for(let i=0;i<n;i++) {
    const a=(Math.PI*2*i/n)-Math.PI/2;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);
    ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.stroke();
    ctx.fillStyle='#8080a0'; ctx.font='9px -apple-system,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(keys[i],cx+Math.cos(a)*(r+16),cy+Math.sin(a)*(r+16));
  }
  ctx.beginPath();
  for(let i=0;i<n;i++) { const v=Math.min(1,(stats[keys[i]]||0)/maxVal); const a=(Math.PI*2*i/n)-Math.PI/2; i===0?ctx.moveTo(cx+Math.cos(a)*r*v,cy+Math.sin(a)*r*v):ctx.lineTo(cx+Math.cos(a)*r*v,cy+Math.sin(a)*r*v); }
  ctx.closePath(); ctx.fillStyle='rgba(124,106,247,.22)'; ctx.fill(); ctx.strokeStyle='#7c6af7'; ctx.lineWidth=2; ctx.stroke();
  for(let i=0;i<n;i++) {
    const v=Math.min(1,(stats[keys[i]]||0)/maxVal); const a=(Math.PI*2*i/n)-Math.PI/2;
    ctx.beginPath(); ctx.arc(cx+Math.cos(a)*r*v,cy+Math.sin(a)*r*v,4,0,Math.PI*2);
    ctx.fillStyle=Object.values(STAT_COLORS)[i]; ctx.fill();
  }
}

/* ── 16. PRIVACY ── */
function openPrivacySettings() {
  const u=getUser(CUR.id); const p=u?.privacy||{};
  const content=document.getElementById('privacy-content'); if(!content) return;
  const toggle=(key,label)=>{ const on=p[key]!==false;
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--bg3)">
      <div class="toggle-track ${on?'on':''}" id="priv-${key}" onclick="this.classList.toggle('on')" style="cursor:pointer;flex-shrink:0"><div class="toggle-knob"></div></div>
      <span style="font-size:13px;color:var(--text1)">${label}</span>
    </div>`;
  };
  content.innerHTML=`<div class="modal-title">🔒 Privacy del profilo</div>
    ${toggle('show_stats','📊 Mostra statistiche')}${toggle('show_trophies','🏆 Mostra trofei')}${toggle('show_quests','⚔️ Mostra quest')}${toggle('show_books','📚 Mostra libri')}${toggle('show_streak','🔥 Mostra streak')}${toggle('show_xp','⚡ Mostra XP')}
    <button class="btn-sm btn-sm-primary" style="width:100%;margin-top:14px" onclick="savePrivacy()">Salva</button>`;
  openModal('modal-privacy');
}

async function savePrivacy() {
  const u=getUser(CUR.id); if(!u) return;
  if(!u.privacy) u.privacy={};
  ['show_stats','show_trophies','show_quests','show_books','show_streak','show_xp'].forEach(k=>{ u.privacy[k]=!!document.getElementById('priv-'+k)?.classList.contains('on'); });
  saveDB(); syncCUR(u); closeModal('modal-privacy'); showToast('🔒 Privacy aggiornata!');
  await apiCall('SYNC_USER_DATA',buildUserPayload(u));
}

/* ── 17. CERCA UTENTI / AMICI ── */
function renderFriendsList() {
  const u=getUser(CUR.id);
  const friends=u?.friends||[];
  const names=u?.friend_names||{};
  const el=document.getElementById('friends-list'); if(!el) return;
  el.innerHTML=friends.length ? friends.map(id=>`
    <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--bg3)">
      <div class="lb-avatar">${(names[id]||'?')[0].toUpperCase()}</div>
      <div style="flex:1;font-weight:600;font-size:13px">${escHtml(names[id]||id)}</div>
      <button class="btn-sm btn-sm-red" style="font-size:11px" onclick="removeFriend('${id}')">✕</button>
    </div>`).join('')
  : '<div style="color:var(--text3);font-size:12px;padding:8px 0">Nessun amico ancora.</div>';
}

async function searchUser() {
  const query=(document.getElementById('user-search-input')?.value||'').trim();
  if(query.length<2){showToast('⚠️ Inserisci almeno 2 caratteri');return;}
  const resultEl=document.getElementById('user-search-results');
  if(!resultEl) return;
  resultEl.innerHTML='<div style="color:var(--text3);font-size:12px;padding:8px 0">Ricerca in corso...</div>';
  // Cerca localmente in DB (fallback utile quando non c'è endpoint cloud)
  const localMatches=DB.users.filter(u=>u.id!==CUR.id&&u.username.toLowerCase().includes(query.toLowerCase()));
  if(!localMatches.length){ resultEl.innerHTML='<div style="color:var(--text3);font-size:12px;padding:8px 0">Nessun utente trovato.</div>'; return; }
  const myUser=getUser(CUR.id); const friends=myUser?.friends||[];
  resultEl.innerHTML=localMatches.map(found=>{
    const isFriend=friends.includes(found.id);
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--bg3)">
      <div class="lb-avatar">${found.username[0].toUpperCase()}</div>
      <div style="flex:1"><div style="font-weight:700;font-size:14px">${escHtml(found.username)}</div><div style="font-size:11px;color:var(--text3)">${rankTitle(found.level||1)} · Lv.${found.level||1} · ${(found.xp_total||0).toLocaleString()} XP</div></div>
      <button class="btn-sm ${isFriend?'btn-sm-ghost':'btn-sm-primary'}" style="font-size:11px" onclick="${isFriend?`removeFriend('${found.id}')`:`addFriend('${found.id}','${found.username}')`}">${isFriend?'✓ Amico':'+ Aggiungi'}</button>
    </div>`;
  }).join('');
}

async function addFriend(friendId,friendUsername) {
  const u=getUser(CUR.id); if(!u) return;
  if(!u.friends) u.friends=[]; if(!u.friend_names) u.friend_names={};
  if(u.friends.includes(friendId)){showToast('Già nei tuoi amici!');return;}
  u.friends.push(friendId); u.friend_names[friendId]=friendUsername;
  saveDB(); syncCUR(u);
  showToast('✅ '+friendUsername+' aggiunto agli amici!');
  checkTrophies();
  await apiCall('SYNC_USER_DATA',buildUserPayload(u));
}

async function removeFriend(friendId) {
  const u=getUser(CUR.id); if(!u||!u.friends) return;
  u.friends=u.friends.filter(id=>id!==friendId);
  if(u.friend_names) delete u.friend_names[friendId];
  saveDB(); syncCUR(u);
  await apiCall('SYNC_USER_DATA',buildUserPayload(u));
}

/* ── 18. MODALI ── */
function openModal(id){ document.getElementById(id)?.classList.add('open'); }
function closeModal(id){ document.getElementById(id)?.classList.remove('open'); }

async function doResetPin() {
  const username=document.getElementById('pr-user').value.trim();
  const pin=document.getElementById('pr-pin').value.trim();
  const newPass=document.getElementById('pr-newpass').value;
  const errEl=document.getElementById('pr-error');
  if(!username||!/^\d{4}$/.test(pin)||newPass.length<6){errEl.textContent='Compila tutti i campi (password min. 6 caratteri).';return;}
  const pin_hash=await hashStr(pin+'lq_pin_v2');
  const new_password_hash=await hashStr(newPass+'lq_salt_v2');
  errEl.textContent='Verifica in corso...';
  const result=await apiCall('RESET_PIN',{username,pin_hash,new_password_hash});
  if(result.success){closeModal('modal-pin-reset');showToast('✅ Password reimpostata!');}
  else errEl.textContent=result.message||'PIN o username errati.';
}

function doLogout() {
  if(!confirm('Vuoi davvero uscire dall\'account?')) return;
  CUR=null; localStorage.removeItem('lq_cur_v4'); localStorage.removeItem('lq_cur_v3');
  document.getElementById('app').style.display='none';
  document.getElementById('auth-screen').style.display='';
  document.getElementById('l-user').value=''; document.getElementById('l-pass').value='';
  document.getElementById('auth-error').textContent=''; showToast('👋 Logout effettuato');
}

/* ── 19. AVVIO ── */
function bootApp() {
  document.getElementById('auth-screen').style.display='none';
  document.getElementById('app').style.display='flex';
  updateDashboard(); renderHome(); checkTrophies();
  document.getElementById('motiv-text').textContent=MOTIVS[new Date().getDay()%MOTIVS.length];
  pendingRules=[]; renderPendingRules();
}

window.addEventListener('load', ()=>{
  // Migrazione: controlla anche vecchia chiave sesione
  if(!CUR) {
    try { CUR = JSON.parse(localStorage.getItem('lq_cur_v3')||'null'); } catch(e){}
    if(CUR) localStorage.setItem('lq_cur_v4', JSON.stringify(CUR));
  }
  if(CUR) {
    let u=getUser(CUR.id);
    if(!u) { u=CUR; DB.users.push(u); saveDB(); }
    syncCUR(u); bootApp();
    // Sync silenzioso XP dal cloud
    apiCall('GET_USER_DATA',{user_id:u.id}).then(r=>{
      if(r.success&&r.user) {
        const cu=r.user;
        u.xp_total=Math.max(u.xp_total||0, cu.xp_total||0);
        u.level=Math.max(u.level||1, cu.level||1);
        u.streak_days=Math.max(u.streak_days||0, cu.streak_days||0);
        if(cu.stats) Object.keys(cu.stats).forEach(k=>{ u.stats[k]=Math.max(u.stats[k]||0,cu.stats[k]||0); });
        saveDB(); syncCUR(u); updateDashboard();
      }
    }).catch(()=>{});
  }
});
