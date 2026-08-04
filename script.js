/* ============================================================
   LIFEQUEST v2.0 — script.js
   Local-first + GAS cloud sync.
   NOVITÀ v2: social feed, amici, nazioni, foto profilo,
   foto attività, like/commenti, routine (max 3/die),
   suggerimenti libri condivisi, audio feedback, leaderboard
   cliccabile, scheda Amici, switch amici/tutti nel feed.
   ============================================================ */

/* ── COSTANTI ── */
const API_URL = "https://script.google.com/macros/s/AKfycbwmeYuNmAo9UMbLPbQekmiWJcta1obFm74JEj8ojsCRcVzHrWyGso86RLqsOBb0aT1z/exec";
const DB_KEY  = 'lq_db_v5';

const RANK_TITLES = ['Novizio','Apprendista','Studioso','Veterano','Esperto','Maestro','Gran Maestro','Leggenda','Semidio','Dio degli Eroi'];
const XP_BOOK_PER_PAGE = 3;
const BOOK_DIFF_BONUS  = [0,50,150,300,500,800];
const BOOK_GENRE_STAT  = { saggistica:'cultura', filosofia:'mente', scienza:'mente', storia:'cultura', economia:'mente', narrativa:'cultura', 'self-help':'mente', tecnico:'mente', altro:'cultura' };
const DIFF_MULT = [1,1,1.15,1.3,1.5,1.7];
const CAT_STAT  = { mente:'mente', corpo:'corpo', cultura:'cultura', sociale:'sociale', 'produttività':'produttività', athletic:'corpo', mental:'mente', mixed:'mente', altro:'produttività', sfide:'sfide' };
const STAT_COLORS = { mente:'#7c6af7', corpo:'#3de89a', cultura:'#f5c842', sociale:'#ff6eb4', produttività:'#3dcff5', sfide:'#ff5e7a' };
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
const ROUTINE_ITEMS = [
  { id:'meditation', name:'Meditazione',    emoji:'🧘', cat:'mente',        xp:30  },
  { id:'workout',    name:'Allenamento',    emoji:'🏋️', cat:'corpo',        xp:80  },
  { id:'run',        name:'Corsa',          emoji:'🏃', cat:'corpo',        xp:60  },
  { id:'reading',    name:'Lettura libera', emoji:'📖', cat:'cultura',      xp:20  },
  { id:'journal',    name:'Diario',         emoji:'📝', cat:'mente',        xp:15  },
  { id:'cold_shower',name:'Doccia fredda',  emoji:'🚿', cat:'corpo',        xp:25  },
  { id:'cook',       name:'Cucinare sano',  emoji:'🍳', cat:'corpo',        xp:20  },
  { id:'stretch',    name:'Stretching',     emoji:'🤸', cat:'corpo',        xp:20  },
  { id:'study',      name:'Studio 30min',   emoji:'📚', cat:'mente',        xp:40  },
  { id:'gratitude',  name:'Gratitudine',    emoji:'🙏', cat:'sociale',      xp:10  },
  { id:'social_call',name:'Chiamata amico', emoji:'📞', cat:'sociale',      xp:15  },
  { id:'custom',     name:'Custom',         emoji:'⭐', cat:'produttività', xp:20  },
];
const NATIONS = ['🇮🇹 Italia','🇺🇸 America','🇬🇧 Regno Unito','🇩🇪 Germania','🇫🇷 Francia','🇪🇸 Spagna','🇵🇹 Portogallo','🇯🇵 Giappone','🇧🇷 Brasile','🇦🇷 Argentina','🇨🇦 Canada','🇦🇺 Australia','🇳🇱 Olanda','🇸🇪 Svezia','🇨🇭 Svizzera'];

/* ── DATABASE ── */
function mkDB() {
  return { users:[], quests:[], exams:[], chapters:[], concepts:[], sessions:[], books:[], book_sessions:[], challenges:[], feed_posts:[], routines:[], comments:[], likes:[] };
}
function loadDB() { try { return JSON.parse(localStorage.getItem(DB_KEY)) || mkDB(); } catch(e) { return mkDB(); } }
function saveDB() { try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch(e) {} }
let DB  = loadDB();
let CUR = null;
try { CUR = JSON.parse(localStorage.getItem('lq_cur_v5') || localStorage.getItem('lq_cur_v4') || 'null'); } catch(e) {}

/* ── AUDIO ── */
let audioCtx = null;
function getAudioCtx() { if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } return audioCtx; }

function playSound(type) {
  const ctx = getAudioCtx(); if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  const now = ctx.currentTime;
  switch(type) {
    case 'tap':    o.frequency.setValueAtTime(600,now); g.gain.setValueAtTime(0.18,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.08); o.start(now); o.stop(now+0.08); break;
    case 'xp':     o.type='sine'; o.frequency.setValueAtTime(440,now); o.frequency.exponentialRampToValueAtTime(880,now+0.15); g.gain.setValueAtTime(0.25,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.25); o.start(now); o.stop(now+0.25); break;
    case 'trophy': o.type='sine'; [523,659,784,1047].forEach((f,i)=>{ const o2=ctx.createOscillator(); const g2=ctx.createGain(); o2.connect(g2); g2.connect(ctx.destination); o2.frequency.value=f; g2.gain.setValueAtTime(0,now+i*0.1); g2.gain.linearRampToValueAtTime(0.2,now+i*0.1+0.05); g2.gain.exponentialRampToValueAtTime(0.001,now+i*0.1+0.18); o2.start(now+i*0.1); o2.stop(now+i*0.1+0.2); }); return;
    case 'like':   o.frequency.setValueAtTime(800,now); o.frequency.exponentialRampToValueAtTime(1200,now+0.06); g.gain.setValueAtTime(0.12,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.1); o.start(now); o.stop(now+0.1); break;
    case 'error':  o.type='sawtooth'; o.frequency.setValueAtTime(200,now); g.gain.setValueAtTime(0.1,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.15); o.start(now); o.stop(now+0.15); break;
    case 'open':   o.frequency.setValueAtTime(300,now); o.frequency.exponentialRampToValueAtTime(600,now+0.1); g.gain.setValueAtTime(0.1,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.12); o.start(now); o.stop(now+0.12); break;
  }
}

/* ── UTILITÀ ── */
function uid() { return Math.random().toString(36).substr(2,9)+Date.now().toString(36); }
function ts()  { return Date.now(); }
function today(){ return new Date().toISOString().split('T')[0]; }
async function hashStr(s) { const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)); return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
function randCode() { return 'LQ-'+Math.floor(1000+Math.random()*9000); }
function diffStars(d){ return '⭐'.repeat(Math.max(1,d||1)); }
function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function relTime(ts) { const d=Math.floor((Date.now()-ts)/1000); if(d<60) return 'adesso'; if(d<3600) return Math.floor(d/60)+'min fa'; if(d<86400) return Math.floor(d/3600)+'h fa'; return Math.floor(d/86400)+'g fa'; }

async function apiCall(action, payload) {
  try {
    const p = encodeURIComponent(JSON.stringify(payload||{}));
    const res = await fetch(`${API_URL}?action=${action}&p=${p}`,{method:'GET',redirect:'follow'});
    return await res.json();
  } catch(e) { return {success:false,error:e.toString()}; }
}

/* ── XP & LIVELLI ── */
function xpForLevel(l)  { return Math.round(500*l*l); }
function calcLevel(xp)  { let l=1; while(xpForLevel(l+1)<=xp) l++; return l; }
function rankTitle(l)   { return RANK_TITLES[Math.min(Math.floor((l-1)/5),RANK_TITLES.length-1)]; }
function streakMult(u)  { const d=u.streak_days||0; if(d>=30) return 1.5; if(d>=14) return 1.3; if(d>=7) return 1.15; if(d>=3) return 1.05; return 1; }

function awardXP(amount,stat,note,skipUpdate) {
  if(!CUR) return 0;
  const u=getUser(CUR.id); if(!u) return 0;
  const xp=Math.max(1,Math.round(amount*streakMult(u)));
  u.xp_total=(u.xp_total||0)+xp; u.level=calcLevel(u.xp_total);
  if(stat&&u.stats) u.stats[stat]=(u.stats[stat]||0)+xp;
  const td=today();
  if(u.last_active!==td) { const yd=new Date(Date.now()-86400000).toISOString().split('T')[0]; u.streak_days=(u.last_active===yd)?(u.streak_days||0)+1:1; u.last_active=td; }
  saveDB(); syncCUR(u); showToast(`+${xp} XP ✨ ${note||''}`); spawnXPFloat(xp);
  playSound('xp');
  apiCall('SYNC_USER_DATA',buildUserPayload(u));
  if(!skipUpdate) updateDashboard();
  return xp;
}

function buildUserPayload(u) {
  return { user_id:u.id, username:u.username, xp_total:u.xp_total||0, level:u.level||1, streak_days:u.streak_days||0, last_active:u.last_active||today(), public_profile:u.public_profile||false, stats:u.stats||{}, nations:u.nations||[], avatar:u.avatar||'' };
}

function getUser(id) { return DB.users.find(u=>u.id===id); }
function syncCUR(u)  { CUR=u; localStorage.setItem('lq_cur_v5',JSON.stringify(u)); }

/* ── FOTO (base64 compress) ── */
function compressImage(dataUrl,maxW,maxH,quality) {
  return new Promise(resolve=>{
    const img=new Image(); img.onload=()=>{
      const canvas=document.createElement('canvas'); let w=img.width,h=img.height;
      if(w>maxW||h>maxH){if(w/h>maxW/maxH){h=Math.round(h*maxW/w);w=maxW;}else{w=Math.round(w*maxH/h);h=maxH;}}
      canvas.width=w;canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h);
      resolve(canvas.toDataURL('image/jpeg',quality||0.6));
    }; img.src=dataUrl;
  });
}

function pickImage(maxW,maxH,quality,callback) {
  const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
  inp.onchange=async e=>{
    const f=e.target.files[0]; if(!f) return;
    if(f.size>8*1024*1024){showToast('⚠️ Immagine troppo grande (max 8MB)');return;}
    const r=new FileReader(); r.onload=async ev=>{ const c=await compressImage(ev.target.result,maxW,maxH,quality); callback(c); }; r.readAsDataURL(f);
  }; inp.click();
}

/* ── EFFETTI ── */
function spawnXPFloat(xp) { const el=document.createElement('div'); el.className='xp-float'; el.textContent='+'+xp+' XP'; el.style.top=(70+Math.random()*80)+'px'; el.style.left=(60+Math.random()*200)+'px'; document.body.appendChild(el); setTimeout(()=>el.remove(),950); }
let toastTimer;
function showToast(msg) { const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),2800); }
function showLoading(msg) { let el=document.getElementById('loading-overlay'); if(!el){el=document.createElement('div');el.id='loading-overlay';document.body.appendChild(el);} el.innerHTML=`<div class="loading-box"><div class="loading-spinner"></div><div>${msg||'Caricamento...'}</div></div>`; el.style.display='flex'; }
function hideLoading() { const el=document.getElementById('loading-overlay'); if(el) el.style.display='none'; }

/* ── AUTH ── */
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((b,i)=>b.classList.toggle('active',i===(tab==='login'?0:1)));
  document.getElementById('login-form').style.display=tab==='login'?'':'none';
  document.getElementById('register-form').style.display=tab==='register'?'':'none';
  document.getElementById('auth-error').textContent='';
}

async function doRegister() {
  const user=document.getElementById('r-user').value.trim(), pass=document.getElementById('r-pass').value, pin=document.getElementById('r-pin').value.trim(), err=document.getElementById('auth-error');
  if(user.length<3){err.textContent='Username: min 3 caratteri';return;} if(pass.length<6){err.textContent='Password: min 6 caratteri';return;} if(!/^\d{4}$/.test(pin)){err.textContent='PIN: 4 cifre';return;}
  const password_hash=await hashStr(pass+'lq_salt_v2'), pin_hash=await hashStr(pin+'lq_pin_v2');
  err.textContent='Registrazione...';
  const result=await apiCall('REGISTER_USER',{username:user,password_hash,pin_hash});
  if(result.success) {
    const u={id:result.user_id,username:user,password_hash,pin_hash,xp_total:0,level:1,streak_days:0,last_active:today(),public_profile:true,avatar:'',nations:[],stats:{mente:0,corpo:0,cultura:0,sociale:0,'produttività':0,sfide:0},trophies:[],privacy:{},friends:[],friend_names:{},friend_requests:[]};
    DB.users.push(u); saveDB(); syncCUR(u); bootApp();
  } else err.textContent=result.message||'Errore';
}

async function doLogin() {
  const user=document.getElementById('l-user').value.trim(), pass=document.getElementById('l-pass').value, err=document.getElementById('auth-error');
  if(!user||!pass){err.textContent='Inserisci username e password';return;}
  const password_hash=await hashStr(pass+'lq_salt_v2');
  err.textContent='Accesso...'; showLoading('Login...');
  try {
    const result=await apiCall('LOGIN_USER',{username:user,password_hash});
    hideLoading();
    if(result.success&&result.user) {
      const cu=result.user; let local=DB.users.find(u=>u.id===cu.id);
      if(local) {
        cu.xp_total=Math.max(local.xp_total||0,cu.xp_total||0); cu.level=Math.max(local.level||1,cu.level||1); cu.streak_days=Math.max(local.streak_days||0,cu.streak_days||0);
        cu.trophies=local.trophies||[]; cu.privacy=local.privacy||{}; cu.friends=local.friends||[]; cu.friend_names=local.friend_names||{}; cu.friend_requests=local.friend_requests||[]; cu.avatar=local.avatar||''; cu.nations=local.nations||cu.nations||[];
        if(cu.stats) Object.keys(local.stats||{}).forEach(k=>{cu.stats[k]=Math.max(cu.stats[k]||0,local.stats[k]||0);});
        DB.users[DB.users.indexOf(local)]=cu;
      } else { cu.trophies=[];cu.privacy={};cu.friends=[];cu.friend_names={};cu.friend_requests=[];cu.avatar='';cu.nations=cu.nations||[]; DB.users.push(cu); }
      saveDB(); syncCUR(cu); bootApp(); err.textContent='';
    } else {
      const local=DB.users.find(u=>u.username.toLowerCase()===user.toLowerCase()&&u.password_hash===password_hash);
      if(local){syncCUR(local);bootApp();showToast('⚠️ Offline: dati locali');} else err.textContent=result.message||'Credenziali errate';
    }
  } catch(e){hideLoading();err.textContent='Errore connessione.';}
}

/* ── NAVIGAZIONE ── */
function gotoTab(tab) {
  playSound('tap');
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('screen-'+tab).classList.add('active');
  document.getElementById('nav-'+tab).classList.add('active');
  renderTab(tab); window.scrollTo(0,0);
}
function renderTab(t) { ({home:renderHome,quest:renderQuests,study:renderStudy,routine:renderRoutine,pvp:renderPvP,stats:renderStats,friends:renderFriendsScreen}[t]||function(){})(); }

/* ── DASHBOARD ── */
function updateDashboard() {
  if(!CUR) return;
  const u=getUser(CUR.id)||CUR, lvl=u.level||1, xpCur=u.xp_total||0;
  const xpThis=xpForLevel(lvl), xpNxt=xpForLevel(lvl+1);
  const pct=Math.min(100,Math.round((xpCur-xpThis)/(xpNxt-xpThis)*100));
  document.getElementById('hd-level').textContent=lvl;
  document.getElementById('hd-name').textContent=u.username;
  document.getElementById('hd-rank').textContent=rankTitle(lvl)+' · Lv.'+lvl;
  document.getElementById('hd-streak').innerHTML='🔥 '+(u.streak_days||0)+' gg';
  document.getElementById('xp-bar').style.width=pct+'%';
  document.getElementById('xp-cur').textContent=xpCur.toLocaleString()+' XP';
  document.getElementById('xp-next').textContent='→ Lv.'+(lvl+1)+' ('+xpNxt.toLocaleString()+' XP)';
  const av=document.getElementById('hd-avatar');
  if(av){ av.innerHTML=u.avatar?`<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:`<span>${u.username[0].toUpperCase()}</span>`; }
  const s=u.stats||{};
  ['mente','corpo','cultura','sociale','sfide'].forEach(k=>{const el=document.getElementById('ds-'+k);if(el)el.textContent=s[k]||0;});
}

/* ── HOME FEED ── */
let feedMode = 'friends'; // 'friends' | 'all'

function renderHome() {
  updateDashboard();
  document.getElementById('motiv-text').textContent=MOTIVS[new Date().getDay()%MOTIVS.length];
  renderFeed();
}

function toggleFeedMode() {
  playSound('tap');
  feedMode = feedMode==='friends'?'all':'friends';
  document.getElementById('feed-switch-label').textContent = feedMode==='friends'?'Amici':'Tutti';
  document.getElementById('feed-switch-track').classList.toggle('on', feedMode==='all');
  renderFeed();
}

function renderFeed() {
  const u=getUser(CUR.id)||CUR;
  const myFriends=new Set(u.friends||[]);
  const myNations=new Set(u.nations||[]);
  let posts=[...DB.feed_posts].sort((a,b)=>b.ts-a.ts);
  if(feedMode==='friends') { posts=posts.filter(p=>p.user_id===CUR.id||myFriends.has(p.user_id)); }
  else {
    if(myNations.size>0) posts=posts.filter(p=>{ const pu=getUser(p.user_id); const pn=pu?.nations||[]; return p.user_id===CUR.id||pn.some(n=>myNations.has(n)); });
  }
  const el=document.getElementById('feed-list');
  if(!posts.length){ el.innerHTML='<div class="empty" style="padding:20px 0"><div class="empty-emoji">🌍</div><div class="empty-text">Nessuna attività nel feed.<br><small>'+( feedMode==='friends'?'Aggiungi amici o passa a "Tutti"':'Imposta le tue nazioni nel profilo')+'</small></div></div>'; return; }
  el.innerHTML=posts.slice(0,30).map(p=>renderFeedPost(p)).join('');
}

function renderFeedPost(p) {
  const author=getUser(p.user_id);
  const name=author?escHtml(author.username):'Utente';
  const av=author?.avatar?`<img src="${author.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:(name[0]||'?');
  const myLike=(p.likes||[]).includes(CUR.id);
  const likeCount=(p.likes||[]).length;
  const comments=DB.comments.filter(c=>c.post_id===p.id);
  const img=p.photo?`<div class="feed-photo" onclick="openPhotoModal('${p.id}')"><img src="${p.photo}" alt="foto attività"></div>`:'';
  return `<div class="feed-card" id="post-${p.id}">
    <div class="feed-header">
      <div class="feed-avatar" onclick="viewUserProfile('${p.user_id}')">${av}</div>
      <div class="feed-meta">
        <div class="feed-author" onclick="viewUserProfile('${p.user_id}')">${name}</div>
        <div class="feed-time">${relTime(p.ts)}</div>
      </div>
      <span class="tag tag-cat" style="font-size:9px">${p.category||''}</span>
    </div>
    <div class="feed-body">
      <div class="feed-title">${escHtml(p.title||'')}</div>
      ${p.notes?`<div class="feed-notes">${escHtml(p.notes)}</div>`:''}
      ${img}
    </div>
    <div class="feed-footer">
      <button class="feed-action ${myLike?'liked':''}" onclick="toggleLike('${p.id}')">
        ${myLike?'❤️':'🤍'} <span id="like-count-${p.id}">${likeCount}</span>
      </button>
      <button class="feed-action" onclick="toggleComments('${p.id}')">💬 ${comments.length}</button>
      <span class="feed-xp">+${p.xp||0} XP</span>
    </div>
    <div class="feed-comments" id="comments-${p.id}" style="display:none">
      <div class="comments-list">${comments.map(c=>`<div class="comment-row"><b>${escHtml(getUser(c.user_id)?.username||'?')}:</b> ${escHtml(c.text)}</div>`).join('')}</div>
      <div class="comment-input-row">
        <input class="sm comment-input" id="ci-${p.id}" placeholder="Commenta..." onkeydown="if(event.key==='Enter')submitComment('${p.id}')">
        <button class="btn-sm btn-sm-primary" onclick="submitComment('${p.id}')">↑</button>
      </div>
    </div>
  </div>`;
}

function toggleLike(postId) {
  playSound('like');
  const p=DB.feed_posts.find(x=>x.id===postId); if(!p) return;
  if(!p.likes) p.likes=[];
  const idx=p.likes.indexOf(CUR.id);
  if(idx>=0) p.likes.splice(idx,1); else p.likes.push(CUR.id);
  saveDB();
  const btn=document.querySelector(`#post-${postId} .feed-action`);
  const myLike=p.likes.includes(CUR.id);
  if(btn){btn.className='feed-action '+(myLike?'liked':'');btn.innerHTML=(myLike?'❤️':'🤍')+` <span id="like-count-${postId}">${p.likes.length}</span>`;}
}

function toggleComments(postId) {
  playSound('tap');
  const el=document.getElementById('comments-'+postId);
  if(el) el.style.display=el.style.display==='none'?'block':'none';
}

function submitComment(postId) {
  const inp=document.getElementById('ci-'+postId);
  const text=(inp?.value||'').trim(); if(!text) return;
  const c={id:uid(),post_id:postId,user_id:CUR.id,text,ts:ts()};
  DB.comments.push(c); saveDB(); inp.value=''; playSound('tap');
  const cl=document.querySelector(`#comments-${postId} .comments-list`);
  if(cl) cl.innerHTML+=`<div class="comment-row"><b>${escHtml(CUR.username)}:</b> ${escHtml(text)}</div>`;
  const btn=document.querySelector(`#post-${postId} .feed-action:nth-child(2)`);
  if(btn) btn.textContent=`💬 ${DB.comments.filter(c=>c.post_id===postId).length}`;
}

function openPhotoModal(postId) {
  const p=DB.feed_posts.find(x=>x.id===postId); if(!p||!p.photo) return;
  const ov=document.createElement('div'); ov.className='photo-overlay'; ov.onclick=()=>ov.remove();
  ov.innerHTML=`<img src="${p.photo}" style="max-width:96vw;max-height:90vh;border-radius:var(--r);box-shadow:0 0 40px rgba(0,0,0,0.8)">`;
  document.body.appendChild(ov);
}

function addFeedPost(title,category,xp,notes,photo) {
  const p={id:uid(),user_id:CUR.id,title,category,xp,notes:notes||'',photo:photo||'',ts:ts(),likes:[]};
  DB.feed_posts.unshift(p); saveDB(); return p.id;
}

/* ── QUEST ── */
let qTab='todo', selectedCalDate=new Date().toISOString().split('T')[0];

function switchQuestTab(t) { playSound('tap'); qTab=t; document.querySelectorAll('#screen-quest .tab').forEach((b,i)=>b.classList.toggle('active',['todo','active','done','calendar'][i]===t)); renderQuests(); }

function renderQuests() {
  const c=document.getElementById('quest-list-container');
  if(qTab==='calendar'){renderQuestCalendar(c);return;}
  const myQ=DB.quests.filter(q=>q.user_id===CUR.id);
  const list=qTab==='todo'?myQ.filter(q=>!q.completed&&q.type==='todo'):qTab==='active'?myQ.filter(q=>!q.completed&&q.type==='quest'):myQ.filter(q=>q.completed).sort((a,b)=>(b.completed_at||0)-(a.completed_at||0));
  c.innerHTML=list.length?list.map(q=>`
    <div class="quest-card">
      <div class="quest-check ${q.completed?'done':''}" onclick="toggleQuest('${q.id}',event)"></div>
      <div class="quest-body">
        <div class="quest-name ${q.completed?'done':''}">${escHtml(q.name)}</div>
        ${q.photo?`<div style="margin:5px 0"><img src="${q.photo}" style="width:100%;border-radius:8px;max-height:140px;object-fit:cover"></div>`:''}
        <div class="quest-meta"><span class="tag tag-xp">⚡${q.xp_base} XP</span><span class="tag tag-cat">${q.category}</span>${q.completed?'<span class="tag tag-green">✅</span>':''}</div>
        ${q.notes?`<div style="font-size:11px;color:var(--text3);margin-top:4px">${escHtml(q.notes)}</div>`:''}
        ${q.completed&&q.completed_at?`<div style="font-size:10px;color:var(--text3);margin-top:2px">📅 ${new Date(q.completed_at).toLocaleDateString('it')}</div>`:''}
      </div>
      ${!q.completed?`<button class="btn-sm btn-sm-red" style="font-size:10px;padding:4px 8px" onclick="deleteQuest('${q.id}',event)">✕</button>`:''}
    </div>`).join('')
    :`<div class="empty"><div class="empty-emoji">${qTab==='done'?'🏆':'⚔️'}</div><div class="empty-text">${qTab==='done'?'Nessuna quest completata.':'Aggiungi la tua prima quest!'}</div></div>`;
}

function renderQuestCalendar(container) {
  const now=new Date(),y=now.getFullYear(),m=now.getMonth(),dim=new Date(y,m+1,0).getDate(),fd=(new Date(y,m,1).getDay()+6)%7;
  const completedQ=DB.quests.filter(q=>q.user_id===CUR.id&&q.completed);
  const questDates={};
  completedQ.forEach(q=>{const dStr=q.completed_at?new Date(q.completed_at).toISOString().split('T')[0]:'';if(dStr)questDates[dStr]=(questDates[dStr]||0)+1;});
  let html=`<div style="text-align:center;font-size:15px;font-weight:700;margin-bottom:10px">📅 ${new Date(y,m).toLocaleString('it',{month:'long',year:'numeric'})}</div><div class="cal-grid">`;
  ['Lu','Ma','Me','Gi','Ve','Sa','Do'].forEach(d=>html+=`<div class="cal-day-label">${d}</div>`);
  for(let i=0;i<fd;i++) html+='<div></div>';
  for(let d=1;d<=dim;d++){const dayStr=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;const count=questDates[dayStr]||0;const isSel=selectedCalDate===dayStr?'today':'';const hasQ=count>0?'has-session':'';html+=`<div class="cal-day ${isSel} ${hasQ}" onclick="selectQuestDate('${dayStr}')">${d}${count>0?`<span style="font-size:9px;display:block;color:var(--accent)">•${count}</span>`:''}</div>`;}
  html+='</div>';
  const dayQ=completedQ.filter(q=>{const d=q.completed_at?new Date(q.completed_at).toISOString().split('T')[0]:'';return d===selectedCalDate;});
  html+=`<div style="margin-top:16px"><div class="section-hd"><span class="section-title">Quest del ${selectedCalDate} (${dayQ.length})</span></div>${dayQ.length?dayQ.map(q=>`<div class="quest-card"><div class="quest-body"><div class="quest-name done">${escHtml(q.name)}</div><div class="quest-meta"><span class="tag tag-xp">⚡${q.xp_base} XP</span><span class="tag tag-cat">${q.category}</span></div></div></div>`).join(''):'<div style="color:var(--text3);font-size:12px;padding:8px 0">Nessuna quest.</div>'}</div>`;
  container.innerHTML=html;
}

function selectQuestDate(d){selectedCalDate=d;renderQuestCalendar(document.getElementById('quest-list-container'));}

let _pendingQuestPhoto='';
function openAddQuestModal(){_pendingQuestPhoto='';document.getElementById('q-photo-preview').style.display='none';openModal('modal-add-quest');playSound('open');}
function attachQuestPhoto(){pickImage(800,600,0.65,d=>{_pendingQuestPhoto=d;const prev=document.getElementById('q-photo-preview');prev.src=d;prev.style.display='block';showToast('📷 Foto allegata');});}

function addQuest() {
  const name=document.getElementById('q-name').value.trim(); if(!name){showToast('⚠️ Inserisci un nome');playSound('error');return;}
  const cat=document.getElementById('q-cat').value, diff=parseInt(document.getElementById('q-diff').value), type=document.getElementById('q-type').value, base=Math.round((type==='todo'?15:50)*DIFF_MULT[diff]);
  const q={id:uid(),user_id:CUR.id,name,category:cat,difficulty:diff,type,notes:document.getElementById('q-notes').value.trim(),xp_base:base,completed:false,created_at:ts(),photo:_pendingQuestPhoto};
  DB.quests.push(q); saveDB(); closeModal('modal-add-quest');
  document.getElementById('q-name').value=''; document.getElementById('q-notes').value=''; _pendingQuestPhoto='';
  renderQuests(); showToast('⚔️ Quest aggiunta!'); playSound('tap');
}

function deleteQuest(id,e){if(e)e.stopPropagation();playSound('tap');DB.quests=DB.quests.filter(q=>q.id!==id);saveDB();renderQuests();}

async function toggleQuest(id,e) {
  if(e)e.stopPropagation();
  const q=DB.quests.find(q=>q.id===id); if(!q||q.completed) return;
  q.completed=true; q.completed_at=ts(); saveDB();
  const stat=CAT_STAT[q.category]||'produttività';
  awardXP(q.xp_base,stat,'— '+q.name);
  addFeedPost(q.name, q.category, q.xp_base, q.notes, q.photo);
  checkTrophies(); renderQuests();
  await apiCall('COMPLETE_QUEST',{user_id:CUR.id,name:q.name,category:q.category,difficulty:q.difficulty||1,type:q.type||'quest',notes:q.notes||'',xp_base:q.xp_base});
}

/* ── ROUTINE ── */
const ROUTINE_MAX_PER_DAY = 3;

function renderRoutine() {
  const myRoutines=DB.routines.filter(r=>r.user_id===CUR.id);
  const todayRoutines=myRoutines.filter(r=>r.date===today());
  const doneToday=todayRoutines.length;
  const c=document.getElementById('routine-container');
  let html=`<div style="padding:0 20px">
    <div class="routine-progress-box">
      <div style="font-size:13px;font-weight:700;margin-bottom:6px">Oggi hai completato <span style="color:var(--accent)">${doneToday}/${ROUTINE_MAX_PER_DAY}</span> routine</div>
      <div class="xp-bar-wrap"><div class="xp-bar-fill" style="width:${Math.min(100,doneToday/ROUTINE_MAX_PER_DAY*100)}%;background:linear-gradient(90deg,var(--green),var(--cyan))"></div></div>
      ${doneToday>=ROUTINE_MAX_PER_DAY?'<div style="font-size:11px;color:var(--text3);margin-top:4px">Limite giornaliero raggiunto. Torna domani! 🌙</div>':''}
    </div>
    <div class="section-hd" style="margin-top:14px"><span class="section-title">Scegli routine</span></div>
    <div class="routine-grid">`;
  ROUTINE_ITEMS.forEach(item=>{
    const count=todayRoutines.filter(r=>r.item_id===item.id).length;
    const locked=doneToday>=ROUTINE_MAX_PER_DAY;
    html+=`<div class="routine-tile ${locked?'locked':''}" onclick="${locked?'showToast(\"⏰ Limite giornaliero raggiunto!\")':(`doRoutine('${item.id}')`)}" >
      <div class="routine-emoji">${item.emoji}</div>
      <div class="routine-name">${item.name}</div>
      <div class="routine-xp">+${item.xp} XP</div>
      ${count>0?`<div class="routine-done-badge">✓${count>1?' ×'+count:''}</div>`:''}
    </div>`;
  });
  html+=`</div>
    <div class="section-hd" style="margin-top:16px"><span class="section-title">Storico routine</span></div>
    <div>`;
  myRoutines.sort((a,b)=>b.ts-a.ts).slice(0,20).forEach(r=>{
    const item=ROUTINE_ITEMS.find(x=>x.id===r.item_id)||{emoji:'⭐',name:r.item_id};
    html+=`<div class="session-row"><div class="session-dot" style="background:var(--green)"></div><div class="session-info"><div class="session-name">${item.emoji} ${item.name}${r.custom_name?' — '+escHtml(r.custom_name):''}</div><div class="session-time">${new Date(r.ts).toLocaleString('it')}</div></div><div class="session-xp">+${r.xp} XP</div></div>`;
  });
  if(!myRoutines.length) html+='<div class="empty"><div class="empty-emoji">🌱</div><div class="empty-text">Nessuna routine ancora.</div></div>';
  html+=`</div></div>`;
  c.innerHTML=html;
}

function doRoutine(itemId) {
  const todayDone=DB.routines.filter(r=>r.user_id===CUR.id&&r.date===today()).length;
  if(todayDone>=ROUTINE_MAX_PER_DAY){showToast('⏰ Limite giornaliero raggiunto!');playSound('error');return;}
  const item=ROUTINE_ITEMS.find(x=>x.id===itemId); if(!item) return;
  if(itemId==='custom'){openCustomRoutineModal();return;}
  const r={id:uid(),user_id:CUR.id,item_id:itemId,date:today(),ts:ts(),xp:item.xp};
  DB.routines.push(r); saveDB();
  awardXP(item.xp, item.cat, '— Routine: '+item.name);
  addFeedPost('Routine: '+item.name, item.cat, item.xp, '', '');
  checkTrophies(); renderRoutine();
}

function openCustomRoutineModal(){openModal('modal-custom-routine');playSound('open');}
function saveCustomRoutine(){
  const name=document.getElementById('cr-name').value.trim(),xp=parseInt(document.getElementById('cr-xp').value)||20;
  if(!name){showToast('⚠️ Inserisci un nome');return;}
  const todayDone=DB.routines.filter(r=>r.user_id===CUR.id&&r.date===today()).length;
  if(todayDone>=ROUTINE_MAX_PER_DAY){showToast('⏰ Limite raggiunto!');return;}
  const r={id:uid(),user_id:CUR.id,item_id:'custom',custom_name:name,date:today(),ts:ts(),xp:Math.min(xp,50)};
  DB.routines.push(r); saveDB(); closeModal('modal-custom-routine');
  awardXP(r.xp,'produttività','— Routine: '+name);
  addFeedPost('Routine: '+name,'produttività',r.xp,'','');
  checkTrophies(); renderRoutine();
}

/* ── LIBRI (con suggestion) ── */
function getAllBooks() { return DB.books; }
function getBookSuggestions(query) {
  if(!query||query.length<2) return [];
  const q=query.toLowerCase();
  const seen=new Set(), results=[];
  DB.books.forEach(b=>{ const k=b.title.toLowerCase(); if(k.includes(q)&&!seen.has(k)){seen.add(k);results.push(b);} });
  return results.slice(0,5);
}

function onBookTitleInput() {
  const val=document.getElementById('bk-title').value;
  const sugg=getBookSuggestions(val);
  const el=document.getElementById('book-suggestions');
  if(!sugg.length){el.innerHTML='';el.style.display='none';return;}
  el.innerHTML=sugg.map(b=>`<div class="suggestion-item" onclick="selectBookSuggestion('${b.id}')">${b.emoji||'📖'} ${escHtml(b.title)} <span style="color:var(--text3);font-size:10px">— ${escHtml(b.author||'')}</span></div>`).join('');
  el.style.display='block';
}

function selectBookSuggestion(bookId) {
  const b=DB.books.find(x=>x.id===bookId); if(!b) return;
  document.getElementById('bk-title').value=b.title;
  document.getElementById('bk-author').value=b.author||'';
  document.getElementById('bk-genre').value=b.genre||'altro';
  document.getElementById('bk-diff').value=b.difficulty||3;
  document.getElementById('bk-pages').value=b.total_pages||'';
  document.getElementById('bk-emoji').value=b.emoji||'📖';
  document.getElementById('book-suggestions').style.display='none';
  showToast('📚 Libro importato dai suggeriti!');
  playSound('tap');
  // mostra chi legge lo stesso libro
  const readers=DB.books.filter(x=>x.title.toLowerCase()===b.title.toLowerCase()&&x.user_id!==CUR.id);
  if(readers.length){
    const names=readers.map(r=>getUser(r.user_id)?.username||'?').slice(0,3).join(', ');
    setTimeout(()=>showToast(`📖 Anche ${names} sta leggendo questo libro!`),1500);
  }
}

let _pendingBookPhoto='';
function renderBooks(c) {
  const books=DB.books.filter(b=>b.user_id===CUR.id);
  if(!books.length){c.innerHTML='<div class="empty"><div class="empty-emoji">📚</div><div class="empty-text">Aggiungi il tuo primo libro!</div></div>';return;}
  c.innerHTML=books.map(b=>{
    const pct=b.total_pages?Math.round((b.current_page||0)/b.total_pages*100):0;
    const done=(b.current_page||0)>=(b.total_pages||Infinity)&&b.total_pages>0;
    const sessions=DB.book_sessions.filter(s=>s.book_id===b.id).length;
    const readers=DB.books.filter(x=>x.title.toLowerCase()===b.title.toLowerCase()&&x.user_id!==CUR.id);
    return `<div class="book-card">
      <div class="book-head"><div class="book-cover">${b.emoji||'📖'}</div>
      <div class="book-meta"><div class="book-title">${escHtml(b.title)}</div><div class="book-author">${escHtml(b.author||'—')}</div>
      ${readers.length?`<div style="font-size:10px;color:var(--cyan);margin-bottom:4px">👥 +${readers.length} lo stanno leggendo</div>`:''}
      <div class="book-tags"><span class="tag tag-cat">${b.genre||'—'}</span><span class="tag tag-orange">${diffStars(b.difficulty)}</span>${done?'<span class="tag tag-green">✅</span>':''}</div>
      <div class="book-progress-wrap"><div class="book-progress-fill" style="width:${pct}%"></div></div>
      <div class="book-progress-nums"><span>${b.current_page||0}/${b.total_pages||'?'} pag.</span><span>${pct}% · ${sessions} sessioni</span></div>
      </div></div>
      ${!done?`<div class="book-actions"><button class="btn-sm btn-sm-primary" style="font-size:11px;flex:1" onclick="openReadingModal('${b.id}')">📖 +Pagine</button><button class="btn-sm btn-sm-ghost" style="font-size:11px" onclick="markBookDone('${b.id}')">✅ Finito</button></div>`:`<div style="font-size:11px;color:var(--green);padding-top:8px;text-align:center;font-weight:700">🏆 Bonus ${BOOK_DIFF_BONUS[b.difficulty]||0} XP!</div>`}
    </div>`;
  }).join('');
}

function addBook(){
  const title=document.getElementById('bk-title').value.trim(); if(!title){showToast('⚠️ Inserisci il titolo');return;}
  const diff=parseInt(document.getElementById('bk-diff').value)||3;
  const b={id:uid(),user_id:CUR.id,title,author:document.getElementById('bk-author').value.trim(),genre:document.getElementById('bk-genre').value,difficulty:diff,total_pages:parseInt(document.getElementById('bk-pages').value)||0,current_page:0,emoji:document.getElementById('bk-emoji').value||'📖',completed:false,created_at:ts()};
  DB.books.push(b); saveDB(); closeModal('modal-add-book'); document.getElementById('book-suggestions').style.display='none';
  ['bk-title','bk-author','bk-pages','bk-emoji'].forEach(id=>{document.getElementById(id).value='';});
  renderStudy(); showToast('📚 Libro aggiunto!'); playSound('tap');
}

function openReadingModal(bookId){const b=DB.books.find(b=>b.id===bookId);if(!b)return;document.getElementById('rd-book-id').value=bookId;document.getElementById('reading-modal-title').textContent='📖 '+b.title;document.getElementById('rd-pages').value='';document.getElementById('rd-current').value=b.current_page||'';document.getElementById('rd-notes').value='';openModal('modal-log-reading');playSound('open');}

async function logReading(){
  const bookId=document.getElementById('rd-book-id').value; const b=DB.books.find(b=>b.id===bookId);if(!b)return;
  const pages=parseInt(document.getElementById('rd-pages').value)||0,current=parseInt(document.getElementById('rd-current').value)||b.current_page;
  if(pages<1){showToast('⚠️ Inserisci le pagine lette');return;}
  b.current_page=Math.max(b.current_page||0,current); const xp=pages*XP_BOOK_PER_PAGE;
  const stat=BOOK_GENRE_STAT[b.genre]||'cultura';
  const sess={id:uid(),user_id:CUR.id,book_id:bookId,date:ts(),pages,current_page:b.current_page,notes:document.getElementById('rd-notes').value,xp};
  DB.book_sessions.push(sess); saveDB(); closeModal('modal-log-reading');
  awardXP(xp,stat,'— Lettura: '+b.title);
  addFeedPost(`📖 ${pages} pagine di "${b.title}"`, 'cultura', xp, sess.notes, '');
  if(b.total_pages&&b.current_page>=b.total_pages&&!b.completed) markBookDone(bookId,true); else renderStudy();
}

async function markBookDone(bookId,silent){
  const b=DB.books.find(b=>b.id===bookId);if(!b||b.completed)return;
  b.completed=true;b.completed_at=ts();if(!silent)b.current_page=b.total_pages||b.current_page;saveDB();
  const bonus=BOOK_DIFF_BONUS[b.difficulty]||0,stat=BOOK_GENRE_STAT[b.genre]||'cultura';
  awardXP(bonus,stat,'— 🏆 Libro completato: '+b.title);
  addFeedPost(`🏆 Finito "${b.title}"!`, 'cultura', bonus, '', '');
  checkTrophies(); renderStudy();
}

/* ── TROFEI ── */
const TROPHY_DEFS=[
  {id:'first_quest',name:'Prima quest',emoji:'⚔️',cat:'Quest',check:()=>DB.quests.filter(q=>q.user_id===CUR.id&&q.completed).length>=1},
  {id:'quest_5',name:'5 quest',emoji:'🗡️',cat:'Quest',check:()=>DB.quests.filter(q=>q.user_id===CUR.id&&q.completed).length>=5},
  {id:'quest_10',name:'10 quest',emoji:'🌟',cat:'Quest',check:()=>DB.quests.filter(q=>q.user_id===CUR.id&&q.completed).length>=10},
  {id:'streak_3',name:'Streak 3gg',emoji:'🔥',cat:'Streak',check:()=>(getUser(CUR.id)?.streak_days||0)>=3},
  {id:'streak_7',name:'Streak 7gg',emoji:'🔥',cat:'Streak',check:()=>(getUser(CUR.id)?.streak_days||0)>=7},
  {id:'streak_30',name:'Streak 30gg',emoji:'⚡',cat:'Streak',check:()=>(getUser(CUR.id)?.streak_days||0)>=30},
  {id:'level_5',name:'Livello 5',emoji:'⭐',cat:'Livello',check:()=>(getUser(CUR.id)?.level||0)>=5},
  {id:'level_10',name:'Livello 10',emoji:'🌍',cat:'Livello',check:()=>(getUser(CUR.id)?.level||0)>=10},
  {id:'xp_1000',name:'1.000 XP',emoji:'💎',cat:'XP',check:()=>(getUser(CUR.id)?.xp_total||0)>=1000},
  {id:'xp_5000',name:'5.000 XP',emoji:'💍',cat:'XP',check:()=>(getUser(CUR.id)?.xp_total||0)>=5000},
  {id:'first_book',name:'Primo libro',emoji:'📚',cat:'Lettura',check:()=>DB.books.filter(b=>b.user_id===CUR.id&&b.completed).length>=1},
  {id:'books_3',name:'3 libri',emoji:'📖',cat:'Lettura',check:()=>DB.books.filter(b=>b.user_id===CUR.id&&b.completed).length>=3},
  {id:'routine_7',name:'7 routine',emoji:'🌱',cat:'Routine',check:()=>DB.routines.filter(r=>r.user_id===CUR.id).length>=7},
  {id:'routine_30',name:'30 routine',emoji:'🦾',cat:'Routine',check:()=>DB.routines.filter(r=>r.user_id===CUR.id).length>=30},
  {id:'pvp_first',name:'Prima sfida',emoji:'⚔️',cat:'Sfide',check:()=>DB.challenges.filter(c=>c.creator_id===CUR.id||c.joiner_id===CUR.id).length>=1},
  {id:'pvp_win',name:'Prima vittoria',emoji:'🏆',cat:'Sfide',check:()=>DB.challenges.filter(c=>c.winner_id===CUR.id).length>=1},
  {id:'first_friend',name:'Primo amico',emoji:'🤝',cat:'Social',check:()=>(getUser(CUR.id)?.friends||[]).length>=1},
];

function checkTrophies(){
  const u=getUser(CUR.id);if(!u)return; if(!u.trophies)u.trophies=[];
  let newOnes=false;
  TROPHY_DEFS.forEach(def=>{
    if(!u.trophies.find(t=>t.id===def.id)&&def.check()){
      u.trophies.push({id:def.id,earned_at:ts()}); newOnes=true;
      setTimeout(()=>{showToast('🏆 Trofeo: '+def.name+' '+def.emoji);playSound('trophy');},500);
    }
  });
  if(newOnes){saveDB();syncCUR(u);apiCall('SYNC_USER_DATA',buildUserPayload(u));}
}

/* ── STUDIO ── */
let studyTab='exams';
function switchStudyTab(t){playSound('tap');studyTab=t;document.querySelectorAll('#screen-study .tab').forEach((b,i)=>b.classList.toggle('active',['exams','books','sessions','calendar'][i]===t));renderStudy();}
function renderStudy(){const c=document.getElementById('study-container');if(studyTab==='exams')renderExams(c);else if(studyTab==='books')renderBooks(c);else if(studyTab==='sessions')renderSessions(c);else renderCalendar(c);}

function masteryPct(examId){const chs=DB.chapters.filter(c=>c.exam_id===examId);if(!chs.length)return 0;const allCo=chs.flatMap(c=>DB.concepts.filter(co=>co.chapter_id===c.id));const doneCo=allCo.filter(c=>c.completed).length;return Math.round(((chs.filter(c=>c.completed).length/chs.length)*0.4+(allCo.length?doneCo/allCo.length:0)*0.6)*100);}

function renderExams(c){
  const exams=DB.exams.filter(e=>e.user_id===CUR.id);
  if(!exams.length){c.innerHTML='<div class="empty"><div class="empty-emoji">📘</div><div class="empty-text">Aggiungi il tuo primo esame!</div></div>';return;}
  c.innerHTML=exams.map(exam=>{
    const chs=DB.chapters.filter(ch=>ch.exam_id===exam.id),mp=masteryPct(exam.id);
    const dl=exam.exam_date?Math.ceil((new Date(exam.exam_date)-new Date())/86400000):null;
    const dlStr=dl!==null?(dl>0?dl+'gg':dl===0?'Oggi!':'Passato'):'';
    const mpColor=mp>75?'var(--green)':mp>40?'var(--accent2)':'var(--red)';
    return `<div class="exam-card"><div class="exam-head" onclick="toggleExamBody('${exam.id}')"><div class="exam-icon">${exam.emoji||'📘'}</div><div class="exam-info"><div class="exam-name">${escHtml(exam.title)}</div><div class="exam-date">${exam.exam_date?'📅 '+exam.exam_date+' ('+dlStr+')':''} · Mastery <b style="color:${mpColor}">${mp}%</b></div></div><div style="display:flex;flex-direction:column;gap:4px"><button class="btn-sm btn-sm-primary" style="font-size:10px;padding:4px 8px" onclick="event.stopPropagation();openLogSession('${exam.id}')">+Sessione</button><button class="btn-sm btn-sm-ghost" style="font-size:10px;padding:4px 8px" onclick="event.stopPropagation();openAddChapter('${exam.id}')">+Cap.</button></div></div><div class="mastery-bar"><div class="mastery-fill" style="width:${mp}%"></div></div><div class="exam-body" id="exam-body-${exam.id}">${chs.length?chs.map(renderChRow).join(''):'<div style="font-size:12px;color:var(--text3);padding:4px 0">Nessun capitolo ancora.</div>'}</div></div>`;
  }).join('');
}

function renderChRow(ch){const cos=DB.concepts.filter(c=>c.chapter_id===ch.id),done=cos.filter(c=>c.completed).length;return `<div class="chapter-row"><div class="ch-check ${ch.completed?'done':''}" onclick="toggleChapter('${ch.id}')"></div><div class="ch-info"><div class="ch-name" style="${ch.completed?'text-decoration:line-through;color:var(--text3)':''}">${escHtml(ch.title)}</div><div class="ch-concepts">${diffStars(ch.difficulty||2)} · ${done}/${cos.length} concetti</div></div><div class="ch-btns"><span class="ch-expand" onclick="toggleConcepts('${ch.id}')">concetti ▾</span><span class="ch-expand" onclick="openAddConcept('${ch.id}')">+</span></div></div><div id="concepts-${ch.id}" style="display:none">${cos.map(co=>`<div class="concept-row"><div class="concept-check ${co.completed?'done':''}" onclick="toggleConcept('${co.id}')"></div><span class="concept-name ${co.completed?'done':''}">${escHtml(co.title)}</span></div>`).join('')}${!cos.length?'<div style="font-size:11px;color:var(--text3);padding:4px 8px">Clicca + per aggiungere.</div>':''}</div>`;}

function toggleExamBody(id){document.getElementById('exam-body-'+id)?.classList.toggle('open');}
function toggleConcepts(id){const el=document.getElementById('concepts-'+id);if(el)el.style.display=el.style.display==='none'?'block':'none';}

async function addExam(){const title=document.getElementById('ex-name').value.trim();if(!title){showToast('⚠️ Nome materia');return;}const e={id:uid(),user_id:CUR.id,title,exam_date:document.getElementById('ex-date').value,target_hours:parseInt(document.getElementById('ex-hours').value)||40,emoji:document.getElementById('ex-emoji').value||'📘',created_at:ts()};DB.exams.push(e);saveDB();closeModal('modal-add-exam');document.getElementById('ex-name').value='';renderStudy();showToast('📘 Esame aggiunto!');playSound('tap');}
function openAddChapter(examId){document.getElementById('ch-exam-id').value=examId;document.getElementById('ch-name').value='';openModal('modal-add-chapter');playSound('open');}
async function addChapter(){const name=document.getElementById('ch-name').value.trim();if(!name){showToast('⚠️ Nome capitolo');return;}const ch={id:uid(),exam_id:document.getElementById('ch-exam-id').value,title:name,difficulty:parseInt(document.getElementById('ch-diff').value)||3,completed:false,created_at:ts()};DB.chapters.push(ch);saveDB();closeModal('modal-add-chapter');renderStudy();showToast('📚 Capitolo!');playSound('tap');}
async function toggleChapter(id){const ch=DB.chapters.find(c=>c.id===id);if(!ch||ch.completed)return;ch.completed=true;ch.completed_at=ts();saveDB();awardXP(Math.round(80*DIFF_MULT[ch.difficulty||2]),'mente','— Capitolo: '+ch.title);checkTrophies();renderStudy();}
function openAddConcept(chId){document.getElementById('co-chapter-id').value=chId;document.getElementById('co-name').value='';document.getElementById('co-notes').value='';openModal('modal-add-concept');playSound('open');}
async function addConcept(){const name=document.getElementById('co-name').value.trim();if(!name){showToast('⚠️ Nome concetto');return;}const co={id:uid(),chapter_id:document.getElementById('co-chapter-id').value,title:name,notes:document.getElementById('co-notes').value,completed:false,created_at:ts()};DB.concepts.push(co);saveDB();closeModal('modal-add-concept');renderStudy();showToast('🔵 Concetto!');playSound('tap');}
async function toggleConcept(id){const co=DB.concepts.find(c=>c.id===id);if(!co||co.completed)return;co.completed=true;co.completed_at=ts();saveDB();awardXP(25,'mente','— Concetto: '+co.title);renderStudy();}
function openLogSession(examId){document.getElementById('ss-exam-id').value=examId;document.getElementById('ss-mins').value='';document.getElementById('ss-notes').value='';openModal('modal-log-session');playSound('open');}
async function logSession(){const mins=parseInt(document.getElementById('ss-mins').value);if(!mins||mins<1){showToast('⚠️ Inserisci minuti');return;}const examId=document.getElementById('ss-exam-id').value,focus=parseInt(document.getElementById('ss-focus').value)||3,exam=DB.exams.find(e=>e.id===examId),xp=Math.round((mins/30)*40*(0.7+focus*0.1));const sess={id:uid(),user_id:CUR.id,exam_id:examId,exam_name:exam?.title||'Studio',date:ts(),duration_min:mins,focus_score:focus,notes:document.getElementById('ss-notes').value,xp};DB.sessions.push(sess);saveDB();closeModal('modal-log-session');awardXP(xp,'mente','— Sessione '+mins+'min');addFeedPost(`📝 Studio: ${exam?.title||'Generico'} (${mins}min)`,'mente',xp,'','');checkTrophies();renderStudy();}

function renderSessions(c){const sss=DB.sessions.filter(s=>s.user_id===CUR.id).sort((a,b)=>b.date-a.date);c.innerHTML='<div style="padding:0 20px">'+(sss.length?sss.map(s=>`<div class="session-row"><div class="session-dot"></div><div class="session-info"><div class="session-name">${escHtml(s.exam_name)} — ${s.duration_min}min</div><div class="session-time">${new Date(s.date).toLocaleString('it')} · Focus: ${'⭐'.repeat(s.focus_score)}</div>${s.notes?`<div style="font-size:10px;color:var(--text3);margin-top:2px">${escHtml(s.notes)}</div>`:''}</div><div class="session-xp">+${s.xp} XP</div></div>`).join(''):'<div class="empty"><div class="empty-emoji">📝</div><div class="empty-text">Nessuna sessione ancora.</div></div>')+'</div>';}

function renderCalendar(c){const now=new Date(),y=now.getFullYear(),m=now.getMonth(),fd=(new Date(y,m,1).getDay()+6)%7,dim=new Date(y,m+1,0).getDate();const MN=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];const sDates=new Set(DB.sessions.filter(s=>s.user_id===CUR.id).map(s=>{const d=new Date(s.date);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}));const bDates=new Set(DB.book_sessions.filter(s=>s.user_id===CUR.id).map(s=>{const d=new Date(s.date);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}));let html=`<div style="text-align:center;font-size:14px;font-weight:700;color:var(--text);padding:12px 20px 8px">${MN[m]} ${y}</div><div class="cal-grid">`;['Lu','Ma','Me','Gi','Ve','Sa','Do'].forEach(d=>html+=`<div class="cal-day-label">${d}</div>`);for(let i=0;i<fd;i++)html+='<div></div>';for(let d=1;d<=dim;d++){const isT=d===now.getDate(),k=y+'-'+(m+1)+'-'+d,cls=[isT?'today':'',sDates.has(k)?'has-session':'',bDates.has(k)?'has-book':''].filter(Boolean).join(' ');html+=`<div class="cal-day ${cls}">${d}</div>`;}html+='</div><div style="padding:10px 20px;font-size:11px;color:var(--text3)">🔵 Studio · 🟠 Lettura</div>';c.innerHTML=html;}

/* ── SFIDE PVP ── */
let pvpTab='active',pendingRules=[];
function switchPvpTab(t){playSound('tap');pvpTab=t;document.querySelectorAll('#screen-pvp .tab').forEach((b,i)=>b.classList.toggle('active',['active','pending','history'][i]===t));renderPvP();}
function renderPvP(){const myC=DB.challenges.filter(c=>c.creator_id===CUR.id||c.joiner_id===CUR.id);const list=pvpTab==='active'?myC.filter(c=>c.status==='active'):pvpTab==='pending'?myC.filter(c=>c.status==='pending'):myC.filter(c=>c.status==='done');const c=document.getElementById('pvp-container');c.innerHTML=list.length?list.map(ch=>renderChallengeCard(ch)).join(''):`<div class="empty"><div class="empty-emoji">⚔️</div><div class="empty-text">Nessuna sfida ${pvpTab==='active'?'attiva':'in corso'}.</div></div>`;}
function renderChallengeCard(ch){const iWon=ch.winner_id===CUR.id,typeLabel={athletic:'🏋️ Atletica',mental:'🧠 Mentale',mixed:'🎯 Mista'}[ch.type]||ch.type,typeClass={athletic:'ch-type-ath',mental:'ch-type-men',mixed:'ch-type-mix'}[ch.type]||'ch-type-men';return `<div class="challenge-card" onclick="viewChallenge('${ch.id}')"><div class="challenge-head"><span class="ch-type-badge ${typeClass}">${typeLabel}</span><span class="challenge-title">${escHtml(ch.title)}</span></div><div class="challenge-meta">${escHtml(ch.description||'')} · Scad. ${ch.deadline||'—'}</div><div class="challenge-footer"><span class="challenge-stake">⚡ ${ch.stake} XP</span><div style="display:flex;gap:5px;align-items:center">${ch.status==='done'?`<span class="tag ${iWon?'tag-green':'tag-red'}">${iWon?'🏆 Vinta':'❌ Persa'}</span>`:''} ${ch.status==='active'?`<button class="btn-sm btn-sm-primary" style="font-size:10px" onclick="event.stopPropagation();openDeclareWinner('${ch.id}')">Dichiara vincitore</button>`:''}<span class="challenge-code">${ch.code}</span></div></div></div>`;}
function viewChallenge(id){const ch=DB.challenges.find(c=>c.id===id);if(!ch)return;const typeLabel={athletic:'🏋️ Atletica',mental:'🧠 Mentale',mixed:'🎯 Mista'}[ch.type]||ch.type;document.getElementById('challenge-detail-content').innerHTML=`<div class="modal-handle" style="margin:16px auto 14px"></div><div style="padding:0 22px 6px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><span class="ch-type-badge ch-type-${ch.type}">${typeLabel}</span><span style="font-size:17px;font-weight:800;flex:1">${escHtml(ch.title)}</span></div><div style="font-size:13px;color:var(--text2);margin-bottom:14px">${escHtml(ch.description||'—')}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0"><div class="card2"><div style="font-size:18px;font-weight:900;color:var(--gold)">${ch.stake}</div><div style="font-size:10px;color:var(--text3)">XP in palio</div></div><div class="card2"><div style="font-size:14px;font-weight:700">${ch.deadline||'—'}</div><div style="font-size:10px;color:var(--text3)">Scadenza</div></div></div>${ch.status==='active'?`<button class="btn-sm btn-sm-primary" style="width:100%;margin-bottom:8px" onclick="closeModal('modal-challenge-detail');openDeclareWinner('${ch.id}')">🏆 Dichiara vincitore</button>`:''}<div style="text-align:center"><span class="challenge-code" onclick="copyCode('${ch.code}')">Codice: ${ch.code} — tocca per copiare</span></div></div>`;openModal('modal-challenge-detail');playSound('open');}
function copyCode(c){navigator.clipboard.writeText(c).then(()=>showToast('🔁 Codice copiato!')).catch(()=>showToast('Codice: '+c));}
function addRule(type){pendingRules=pendingRules||[];document.getElementById('rule-type').value=type;const titles={metrica:'📊 Metrica',durata:'⏱️ Durata',condizione:'🔁 Condizione',penalita:'⚠️ Penalità'};document.getElementById('rule-modal-title').textContent=titles[type]||'Regola';const fields={metrica:`<label class="input-label">COSA SI MISURA</label><input class="sm sm-mb" id="rf-what" placeholder="es. pagine lette"><label class="input-label">OBIETTIVO</label><input class="sm sm-mb" id="rf-target" placeholder="es. 200 pagine">`,durata:`<label class="input-label">DURATA</label><input class="sm sm-mb" id="rf-duration" placeholder="es. 7 giorni"><label class="input-label">INIZIO</label><input class="sm sm-mb" id="rf-start" type="date"><label class="input-label">FINE</label><input class="sm sm-mb" id="rf-end" type="date">`,condizione:`<label class="input-label">CONDIZIONE</label><textarea class="sm sm-mb" id="rf-cond"></textarea>`,penalita:`<label class="input-label">PENALITÀ</label><input class="sm sm-mb" id="rf-pen" placeholder="es. -50 XP">`};document.getElementById('rule-fields').innerHTML=fields[type]||'';openModal('modal-add-rule');playSound('open');}
function saveRule(){const type=document.getElementById('rule-type').value;let value='';if(type==='metrica')value=(document.getElementById('rf-what')?.value||'')+' — '+(document.getElementById('rf-target')?.value||'');else if(type==='durata'){const dur=document.getElementById('rf-duration')?.value||'',s=document.getElementById('rf-start')?.value||'',e=document.getElementById('rf-end')?.value||'';value=dur+(s?' dal '+s:'')+(e?' al '+e:'');}else if(type==='condizione')value=document.getElementById('rf-cond')?.value||'';else if(type==='penalita')value=document.getElementById('rf-pen')?.value||'';if(!value.trim()){showToast('⚠️ Compila i campi');return;}pendingRules.push({type,value});renderPendingRules();closeModal('modal-add-rule');}
function renderPendingRules(){const list=document.getElementById('pvp-rules-list');if(!list)return;list.innerHTML=(pendingRules||[]).map((r,i)=>`<div class="rule-item"><div class="rule-item-type">${r.type}</div><div class="rule-item-value">${escHtml(r.value)}</div><button class="rule-item-remove" onclick="removeRule(${i})">✕</button></div>`).join('');}
function removeRule(i){pendingRules.splice(i,1);renderPendingRules();}
async function createChallenge(){const title=document.getElementById('pvp-title').value.trim();if(!title){showToast('⚠️ Inserisci titolo');return;}const stake=Math.min(20,Math.max(5,parseInt(document.getElementById('pvp-stake').value)||20)),code=randCode();const ch={id:uid(),creator_id:CUR.id,creator_username:CUR.username,joiner_id:null,joiner_username:null,type:document.getElementById('pvp-type').value,title,description:document.getElementById('pvp-desc').value,rules:[...(pendingRules||[])],stake,deadline:document.getElementById('pvp-deadline').value,code,status:'pending',created_at:ts()};DB.challenges.push(ch);saveDB();pendingRules=[];renderPendingRules();closeModal('modal-create-challenge');showToast('⚔️ Sfida creata! Codice: '+code);renderPvP();playSound('tap');}
async function joinChallenge(){const code=document.getElementById('join-code-input').value.trim().toUpperCase();let ch=DB.challenges.find(c=>c.code===code);if(!ch){showToast('⚠️ Codice non trovato');return;}if(ch.creator_id===CUR.id){showToast('⚠️ Non puoi unirti alla tua sfida');return;}if(ch.joiner_id){showToast('⚠️ Sfida già occupata');return;}ch.joiner_id=CUR.id;ch.joiner_username=CUR.username;ch.status='active';saveDB();document.getElementById('join-code-input').value='';showToast('⚔️ Sfida accettata!');renderPvP();playSound('xp');}
function openDeclareWinner(id){document.getElementById('win-challenge-id').value=id;openModal('modal-declare-winner');playSound('open');}
async function declareWinner(who){const id=document.getElementById('win-challenge-id').value,ch=DB.challenges.find(c=>c.id===id);if(!ch)return;ch.status='done';if(who==='me'){ch.winner_id=CUR.id;awardXP(ch.stake,'sfide','🏆 Sfida vinta: '+ch.title);}else if(who==='draw'){ch.winner_id='draw';awardXP(Math.floor(ch.stake/2),'sfide','🤝 Pareggio: '+ch.title);}else{ch.winner_id=(ch.creator_id===CUR.id)?(ch.joiner_id||'opp'):ch.creator_id;}saveDB();closeModal('modal-declare-winner');closeModal('modal-challenge-detail');checkTrophies();renderPvP();}

/* ── STATS ── */
let statsTab='stats';
function switchStatsTab(t){playSound('tap');statsTab=t;document.querySelectorAll('#screen-stats .tab').forEach((b,i)=>b.classList.toggle('active',['stats','leaderboard'][i]===t));renderStats();}
function renderStats(){if(statsTab==='stats')renderMyStats();else renderLeaderboard();}

function renderMyStats(){
  const u=getUser(CUR.id)||CUR,stats=u.stats||{},maxVal=Math.max(1,...Object.values(stats).map(Number));
  const trophies=u.trophies||[],wins=DB.challenges.filter(c=>c.winner_id===CUR.id).length;
  const totalQuests=DB.quests.filter(q=>q.user_id===CUR.id&&q.completed).length,totalBooks=DB.books.filter(b=>b.user_id===CUR.id&&b.completed).length;
  let html=`<div style="padding:0 20px 20px">
    <div style="display:flex;align-items:center;gap:16px;padding:16px 0">
      <div class="profile-avatar-big" onclick="changeAvatar()">
        ${u.avatar?`<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:`<span style="font-size:28px;font-weight:900">${u.username[0].toUpperCase()}</span>`}
        <div class="avatar-edit-overlay">📷</div>
      </div>
      <div style="flex:1">
        <div style="font-size:20px;font-weight:900">${escHtml(u.username)}</div>
        <div style="font-size:12px;color:var(--accent2)">${rankTitle(u.level||1)} · Lv.${u.level||1}</div>
        <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><span class="tag tag-xp">⚡ ${(u.xp_total||0).toLocaleString()} XP</span><span class="streak-badge">🔥 ${u.streak_days||0} gg</span></div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px">${(u.nations||[]).join(' · ')||'Nessuna nazione impostata'}</div>
      </div>
    </div>
    <button class="btn-sm btn-sm-ghost" style="width:100%;margin-bottom:10px" onclick="openNationsModal()">🌍 Modifica nazioni</button>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:14px">
      <div class="card2" style="text-align:center"><div style="font-size:18px;font-weight:900;color:var(--green)">${wins}</div><div style="font-size:10px;color:var(--text3)">Vittorie</div></div>
      <div class="card2" style="text-align:center"><div style="font-size:18px;font-weight:900;color:var(--gold)">${totalQuests}</div><div style="font-size:10px;color:var(--text3)">Quest</div></div>
      <div class="card2" style="text-align:center"><div style="font-size:18px;font-weight:900;color:var(--cyan)">${totalBooks}</div><div style="font-size:10px;color:var(--text3)">Libri</div></div>
    </div>
    <div style="text-align:center;margin-bottom:8px"><canvas id="stats-canvas" width="240" height="240"></canvas></div>
    <div style="margin-bottom:14px">`;
  Object.entries(STAT_COLORS).forEach(([k,col])=>{const v=stats[k]||0,p=Math.round((v/maxVal)*100);html+=`<div class="stat-bar-row"><div class="stat-bar-label" style="color:${col}">${k}</div><div class="stat-bar-bg"><div class="stat-bar-fg" style="width:${p}%;background:${col}"></div></div><div class="stat-bar-val" style="color:${col}">${v}</div></div>`;});
  html+=`</div>
    <div class="visibility-toggle" style="margin-bottom:12px"><div class="toggle-track ${u.public_profile?'on':''}" id="profile-vis-toggle" onclick="toggleProfileVis()"><div class="toggle-knob"></div></div><span class="toggle-label" style="font-size:12px">Visibile in leaderboard</span></div>
    <button class="btn-sm btn-sm-ghost" style="width:100%;margin-bottom:8px" onclick="openPrivacySettings()">🔒 Privacy</button>
    <div class="section-hd" style="margin-bottom:8px"><span class="section-title">Trofei (${trophies.length}/${TROPHY_DEFS.length})</span></div>`;
  const cats=[...new Set(TROPHY_DEFS.map(d=>d.cat))];
  cats.forEach(cat=>{html+=`<div style="font-size:10px;color:var(--text3);font-weight:800;text-transform:uppercase;letter-spacing:.8px;margin:10px 0 6px">${cat}</div><div class="trophy-grid" style="grid-template-columns:repeat(3,1fr);padding:0;margin-bottom:8px">`;TROPHY_DEFS.filter(d=>d.cat===cat).forEach(def=>{const earned=trophies.find(t=>t.id===def.id);html+=`<div class="trophy-item" style="${!earned?'opacity:.3':''}"><div class="trophy-emoji">${def.emoji}</div><div class="trophy-name">${def.name}</div>${earned?`<div class="trophy-date">${new Date(earned.earned_at).toLocaleDateString('it')}</div>`:''}</div>`;});html+='</div>';});
  html+=`<button class="btn-sm btn-sm-red" style="width:100%;margin-top:16px;margin-bottom:24px" onclick="doLogout()">🚪 Esci dall'account</button></div>`;
  document.getElementById('stats-container').innerHTML=html;
  setTimeout(()=>drawRadar(stats,maxVal),50);
}

async function renderLeaderboard(){
  const container=document.getElementById('stats-container');
  container.innerHTML='<div style="text-align:center;padding:40px;color:var(--text3)">⏳ Leaderboard...</div>';
  let users=[];
  try{const result=await apiCall('GET_LEADERBOARD',{});if(result.success)users=result.leaderboard||[];}
  catch(e){users=DB.users.filter(u=>u.public_profile).map(u=>({id:u.id,username:u.username,xp_total:u.xp_total||0,level:u.level||1,streak_days:u.streak_days||0,avatar:u.avatar||'',nations:u.nations||[]})).sort((a,b)=>b.xp_total-a.xp_total);showToast('⚠️ Leaderboard offline');}
  if(!users.length){container.innerHTML='<div class="empty"><div class="empty-emoji">🏆</div><div class="empty-text">Sii il primo!</div></div>';return;}
  const myN=new Set((getUser(CUR.id)||CUR).nations||[]);
  const rankCls=['gold','silver','bronze'];
  container.innerHTML='<div style="padding:0 20px 20px">'+users.map((u,i)=>{
    const isMe=CUR&&u.id===CUR.id;
    const av=u.avatar?`<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:u.username[0].toUpperCase();
    const sameNation=(u.nations||[]).some(n=>myN.has(n));
    return `<div class="lb-row" style="${isMe?'border-color:var(--accent)':''}" onclick="viewUserProfile('${u.id}')">
      <div class="lb-rank ${rankCls[i]||''}">${i+1}</div>
      <div class="lb-avatar">${av}</div>
      <div class="lb-info"><div class="lb-name">${escHtml(u.username)}${isMe?' 👈':''}${sameNation&&!isMe?' 🌍':''}</div><div class="lb-xp">${(u.xp_total||0).toLocaleString()} XP · ${u.streak_days||0}🔥</div></div>
      <div class="lb-level">Lv.${u.level||1}</div>
    </div>`;
  }).join('')+'</div>';
}

function toggleProfileVis(){const u=getUser(CUR.id);if(!u)return;u.public_profile=!u.public_profile;saveDB();syncCUR(u);document.getElementById('profile-vis-toggle').classList.toggle('on',u.public_profile);showToast(u.public_profile?'🌐 Profilo pubblico':'🔒 Profilo privato');apiCall('SYNC_USER_DATA',buildUserPayload(u));}

function drawRadar(stats,maxVal){const canvas=document.getElementById('stats-canvas');if(!canvas)return;const ctx=canvas.getContext('2d'),W=240,H=240,cx=120,cy=120,r=84,keys=Object.keys(STAT_COLORS),n=keys.length;ctx.clearRect(0,0,W,H);for(let g=1;g<=4;g++){ctx.beginPath();for(let i=0;i<n;i++){const a=(Math.PI*2*i/n)-Math.PI/2,x=cx+Math.cos(a)*r*(g/4),y=cy+Math.sin(a)*r*(g/4);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.closePath();ctx.strokeStyle='rgba(255,255,255,0.07)';ctx.lineWidth=1;ctx.stroke();}for(let i=0;i<n;i++){const a=(Math.PI*2*i/n)-Math.PI/2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.stroke();ctx.fillStyle='#8080a0';ctx.font='9px -apple-system,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(keys[i],cx+Math.cos(a)*(r+16),cy+Math.sin(a)*(r+16));}ctx.beginPath();for(let i=0;i<n;i++){const v=Math.min(1,(stats[keys[i]]||0)/maxVal),a=(Math.PI*2*i/n)-Math.PI/2;i===0?ctx.moveTo(cx+Math.cos(a)*r*v,cy+Math.sin(a)*r*v):ctx.lineTo(cx+Math.cos(a)*r*v,cy+Math.sin(a)*r*v);}ctx.closePath();ctx.fillStyle='rgba(124,106,247,.22)';ctx.fill();ctx.strokeStyle='#7c6af7';ctx.lineWidth=2;ctx.stroke();for(let i=0;i<n;i++){const v=Math.min(1,(stats[keys[i]]||0)/maxVal),a=(Math.PI*2*i/n)-Math.PI/2;ctx.beginPath();ctx.arc(cx+Math.cos(a)*r*v,cy+Math.sin(a)*r*v,4,0,Math.PI*2);ctx.fillStyle=Object.values(STAT_COLORS)[i];ctx.fill();}}

/* ── NAZIONI ── */
function openNationsModal(){
  const u=getUser(CUR.id)||CUR,sel=new Set(u.nations||[]);
  document.getElementById('nations-content').innerHTML=`<div class="modal
