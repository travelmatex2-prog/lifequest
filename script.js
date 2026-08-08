// ══════════════════════════════════════════════════════════════
//  LIFEQUEST — script.js AGGIORNATO CON PATCH 7, 8, 9, 10, 11 & 12
// ══════════════════════════════════════════════════════════════

const API_URL = "https://script.google.com/macros/s/AKfycbwFqis_PWeMNHuWqjaMNo2jhQDJ7ieW5Xc0iYiyDQJkbI2AV-02CBUj4zrapM4fCCMb/exec";
const DB_KEY  = 'lq_db_v5';

const RANK_TITLES = ['Novizio','Apprendista','Studioso','Veterano','Esperto','Maestro','Gran Maestro','Leggenda','Semidio','Dio degli Eroi'];
const XP_BOOK_PER_PAGE = 3;
const BOOK_DIFF_BONUS  = [0,50,150,300,500,800];
const BOOK_GENRE_STAT  = {saggistica:'cultura',filosofia:'mente',scienza:'mente',storia:'cultura',economia:'mente',narrativa:'cultura','self-help':'mente',tecnico:'mente',altro:'cultura'};
const DIFF_MULT = [1,1,1.15,1.3,1.5,1.7];
const CAT_STAT  = {mente:'mente',corpo:'corpo',cultura:'cultura',sociale:'sociale','produttivita':'produttivita',athletic:'corpo',mental:'mente',mixed:'mente',altro:'produttivita',sfide:'sfide'};
const STAT_COLORS = {mente:'#7c6af7',corpo:'#3de89a',cultura:'#f5c842',sociale:'#ff6eb4','produttivita':'#3dcff5',sfide:'#ff5e7a'};
const MOTIVS = [
  'Ogni grande impresa inizia con un primo passo. ',
  'La costanza batte il talento quando il talento non si impegna.',
  'Un giorno da guerriero vale piu di mille da spettatore. ⚔️',
  'Non contare i giorni — fai contare i giorni.',
  'La disciplina e scegliere tra cio che vuoi adesso e cio che vuoi di piu.',
  'Il successo e la somma di piccoli sforzi ripetuti ogni giorno.',
  'Il momento perfetto per iniziare era ieri. Il secondo migliore e adesso.',
  'Non esiste talento, solo dedizione mascherata da genio. ',
  'Un capitolo al giorno teniamo l ignoranza lontano. ',
  'La sofferenza di oggi e la forza di domani. '
];
const ROUTINE_ITEMS = [
  {id:'meditation',name:'Meditazione',emoji:'🧘',cat:'mente',xp:30},
  {id:'workout',name:'Allenamento',emoji:'🏋️‍♂️',cat:'corpo',xp:80},
  {id:'run',name:'Corsa',emoji:'🏃‍♂️',cat:'corpo',xp:60},
  {id:'reading',name:'Lettura libera',emoji:'📖',cat:'cultura',xp:20},
  {id:'journal',name:'Diario',emoji:'✍️',cat:'mente',xp:15},
  {id:'cold_shower',name:'Doccia fredda',emoji:'🚿',cat:'corpo',xp:25},
  {id:'cook',name:'Cucinare sano',emoji:'🍳',cat:'corpo',xp:20},
  {id:'stretch',name:'Stretching',emoji:'🧘‍♀️',cat:'corpo',xp:20},
  {id:'study',name:'Studio 30min',emoji:'📚',cat:'mente',xp:40},
  {id:'gratitude',name:'Gratitudine',emoji:'🙏',cat:'sociale',xp:10},
  {id:'social_call',name:'Chiamata amico',emoji:'📞',cat:'sociale',xp:15},
  {id:'custom',name:'Custom',emoji:'⭐',cat:'produttivita',xp:20},
];

const LANGUAGES = [
  '🇮🇹 Italiano', '🇬🇧 English', '🇩🇪 Deutsch', '🇫🇷 Français',
  '🇪🇸 Español', '🇵🇹 Português', '🇯🇵 日本語', '🇧🇷 Português (BR)',
  '🇸🇦 العربية', '🇨🇳 中文', '🇷🇺 Русский', '🇰🇷 한국어'
];

function mkDB(){return{users:[],quests:[],exams:[],chapters:[],concepts:[],sessions:[],books:[],book_sessions:[],challenges:[],feed_posts:[],routines:[],comments:[]}}
function loadDB(){try{return JSON.parse(localStorage.getItem(DB_KEY))||mkDB();}catch(e){return mkDB();}}
function saveDB(){try{localStorage.setItem(DB_KEY,JSON.stringify(DB));}catch(e){}}
let DB=loadDB();
let CUR=null;
let BANNED_WORDS_LIST = []; 

try{
  CUR=JSON.parse(localStorage.getItem('lq_cur_v5')||localStorage.getItem('lq_cur_v4')||localStorage.getItem('lq_cur_v3')||localStorage.getItem('lq_cur_v2')||'null');
}catch(e){}

let _actx=null;
function _ctx(){if(!_actx){try{_actx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}return _actx;}

function playSound(type) {
  const map = {
    tap:'snd-tap', xp:'snd-xp', levelup:'snd-levelup',
    trophy:'snd-trophy', like:'snd-like', error:'snd-error',
    open:'snd-open', quest:'snd-quest', challenge:'snd-challenge',
    login:'snd-login'
  };
  const el = document.getElementById(map[type]);
  if (el) {
    el.currentTime = 0;
    el.play().catch(() => _playSynth(type));
    return;
  }
  _playSynth(type);
}

function _playSynth(type) {
  const ctx = _ctx(); if (!ctx) return;
  const now = ctx.currentTime;
  function tone(freq, dur, vol, wave, delay) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = wave || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, now + (delay||0));
    g.gain.linearRampToValueAtTime(vol||0.15, now + (delay||0) + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + (delay||0) + dur);
    o.connect(g); g.connect(ctx.destination); o.start(now + (delay||0)); o.stop(now + (delay||0) + dur);
  }
  if (type==='tap')       { tone(700,0.06,0.1); }
  else if (type==='xp')   { tone(440,0.08,0.18); tone(660,0.12,0.18,undefined,0.08); tone(880,0.1,0.14,undefined,0.18); }
  else if (type==='levelup') { [523,659,784,1047,1319].forEach((f,i)=>tone(f,0.18,0.2,undefined,i*0.09)); }
  else if (type==='trophy') { [523,659,784,1047].forEach((f,i)=>tone(f,0.15,0.18,undefined,i*0.1)); }
  else if (type==='like') { tone(900,0.06,0.1); tone(1200,0.08,0.1,undefined,0.06); }
  else if (type==='error'){ tone(180,0.15,0.1,'sawtooth'); tone(140,0.1,0.08,'sawtooth',0.1); }
  else if (type==='open') { tone(400,0.05,0.08); tone(600,0.08,0.08,undefined,0.05); }
  else if (type==='quest'){ tone(523,0.1,0.18); tone(659,0.1,0.18,undefined,0.1); tone(784,0.15,0.2,undefined,0.2); }
  else if (type==='challenge') { tone(220,0.12,0.2,'sawtooth'); tone(440,0.12,0.2,'square',0.12); tone(330,0.2,0.18,undefined,0.24); }
  else if (type==='login') { [392,523,659,784].forEach((f,i)=>tone(f,0.14,0.15,undefined,i*0.08)); }
}

function uid(){return Math.random().toString(36).substr(2,9)+Date.now().toString(36);}
function ts(){return Date.now();}
function today(){return new Date().toISOString().split('T')[0];}
async function hashStr(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');}

function diffStars(d){return '⭐'.repeat(Math.max(1,d||1));}
function escHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function relTime(t){const d=Math.floor((Date.now()-t)/1000);if(d<60)return 'adesso';if(d<3600)return Math.floor(d/60)+'min fa';if(d<86400)return Math.floor(d/3600)+'h fa';return Math.floor(d/86400)+'g fa';}

async function apiCall(action,payload){
  try{
    const p=encodeURIComponent(JSON.stringify(payload||{}));
    const r=await fetch(`${API_URL}?action=${action}&p=${p}`,{method:'GET',redirect:'follow'});
    return await r.json();
  }catch(e){return{success:false,error:String(e)};}
}

function checkBannedWords(text) {
  const t = text.toLowerCase();
  const found = BANNED_WORDS_LIST.filter(w => w && t.includes(w));
  return found;
}

function validateAndPost(text, onOk) {
  const bad = checkBannedWords(text);
  if (bad.length) {
    showToast('⚠️ Testo non accettabile: ' + bad.join(', '));
    playSound('error');
    return;
  }
  onOk();
}

function xpForLevel(l){return Math.round(500*l*l);}
function calcLevel(xp){let l=1;while(xpForLevel(l+1)<=xp)l++;return l;}
function rankTitle(l){return RANK_TITLES[Math.min(Math.floor((l-1)/5),9)];}
function streakMult(u){const d=u.streak_days||0;if(d>=30)return 1.5;if(d>=14)return 1.3;if(d>=7)return 1.15;if(d>=3)return 1.05;return 1;}
function getUser(id){return DB.users.find(u=>u.id===id);}
function syncCUR(u){CUR=u;localStorage.setItem('lq_cur_v5',JSON.stringify(u));}

function xpBarPct(xpCur, lvl) {
  const xpThis = xpForLevel(lvl);
  const xpNxt  = xpForLevel(lvl + 1);
  const needed = xpNxt - xpThis;
  return needed > 0 ? Math.min(100, Math.max(0, Math.round((xpCur - xpThis) / needed * 100))) : 100;
}

function buildUserPayload(u){
  return{
    user_id: u.id, username: u.username, xp_total: u.xp_total || 0,
    level: u.level || 1, streak_days: u.streak_days || 0,
    last_active: u.last_active || today(), public_profile: !!u.public_profile,
    stats: u.stats || {}, languages: u.languages || [],
    avatar_url: u.avatar_url || u.avatar || '', privacy: u.privacy || {},
    trophies: u.trophies || [],
    following: u.following || [],
    followers: u.followers || {},
    preferred_genres: u.preferred_genres || []
  };
}

function awardXP(amount,stat,note){
  if(!CUR)return 0;
  const u=getUser(CUR.id);if(!u)return 0;
  const oldLevel = u.level || 1; 
  const xp=Math.max(1,Math.round(amount*streakMult(u)));
  u.xp_total=(u.xp_total||0)+xp;
  u.level=calcLevel(u.xp_total);
  if(stat&&u.stats)u.stats[stat]=(u.stats[stat]||0)+xp;
  const td=today();
  if(u.last_active!==td){const yd=new Date(Date.now()-86400000).toISOString().split('T')[0];u.streak_days=(u.last_active===yd)?(u.streak_days||0)+1:1;u.last_active=td;}
  saveDB();syncCUR(u);
  showToast('+'+xp+' XP ✨ '+(note||''));
  spawnXPFloat(xp);
  
  if (u.level > oldLevel) { playSound('levelup'); } else { playSound('xp'); }

  apiCall('SYNC_USER_DATA',buildUserPayload(u));
  updateDashboard();
  return xp;
}

function compressImage(dataUrl,maxW,maxH,q){
  return new Promise(res=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.width,h=img.height;
      if(w>maxW||h>maxH){if(w/h>maxW/maxH){h=Math.round(h*maxW/w);w=maxW;}else{w=Math.round(w*maxH/h);h=maxH;}}
      const c=document.createElement('canvas');c.width=w;c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      res(c.toDataURL('image/jpeg',q||0.65));
    };img.src=dataUrl;
  });
}
function pickImage(maxW,maxH,q,cb){
  const inp=document.createElement('input');inp.type='file';inp.accept='image/*';
  inp.onchange=async e=>{
    const f=e.target.files[0];if(!f)return;
    if(f.size>8*1024*1024){showToast('⚠️ Max 8MB');return;}
    const r=new FileReader();r.onload=async ev=>{cb(await compressImage(ev.target.result,maxW,maxH,q));};r.readAsDataURL(f);
  };inp.click();
}

function spawnXPFloat(xp){const el=document.createElement('div');el.className='xp-float';el.textContent='+'+xp+' XP';el.style.cssText='top:'+(70+Math.random()*80)+'px;left:'+(50+Math.random()*180)+'px';document.body.appendChild(el);setTimeout(()=>el.remove(),950);}
let _toastT;
function showToast(msg){const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(_toastT);_toastT=setTimeout(()=>t.classList.remove('show'),2800);}
function showLoading(msg){let el=document.getElementById('loading-overlay');if(!el){el=document.createElement('div');el.id='loading-overlay';document.body.appendChild(el);}el.innerHTML='<div class="loading-box"><div class="loading-spinner"></div><div>'+(msg||'Caricamento...')+'</div></div>';el.style.display='flex';}
function hideLoading(){const el=document.getElementById('loading-overlay');if(el)el.style.display='none';}

function switchAuthTab(tab){
  document.querySelectorAll('.auth-tab').forEach((b,i)=>b.classList.toggle('active',i===(tab==='login'?0:1)));
  document.getElementById('login-form').style.display=tab==='login'?'':'none';
  document.getElementById('register-form').style.display=tab==='register'?'':'none';
  document.getElementById('auth-error').textContent='';
}

async function doRegister(){
  const user=document.getElementById('r-user').value.trim();
  const pass=document.getElementById('r-pass').value;
  const pin=document.getElementById('r-pin').value.trim();
  const err=document.getElementById('auth-error');
  if(user.length<3){err.textContent='Username min 3 caratteri';return;}
  if(pass.length<6){err.textContent='Password min 6 caratteri';return;}
  if(!/^\d{4}$/.test(pin)){err.textContent='PIN: 4 cifre numeriche';return;}
  const password_hash=await hashStr(pass+'lq_salt_v2');
  const pin_hash=await hashStr(pin+'lq_pin_v2');
  err.textContent='Registrazione in corso...';
  showLoading('Creazione personaggio...');
  const result=await apiCall('REGISTER_USER',{username:user,password_hash,pin_hash});
  hideLoading();
  if(result.success){
    const u={id:result.user_id,username:user,password_hash,pin_hash,xp_total:0,level:1,streak_days:0,last_active:today(),public_profile:true,avatar:'',languages:[],stats:{mente:0,corpo:0,cultura:0,sociale:0,'produttivita':0,sfide:0},trophies:[],privacy:{},following:[],followers:{}};
    DB.users.push(u);
    saveDB();
    syncCUR(u);
    bootApp();
    err.textContent='';
  }else{
    err.textContent=result.message||'Errore di registrazione';
  }
}

async function doLogin(){
  const user=document.getElementById('l-user').value.trim();
  const pass=document.getElementById('l-pass').value;
  const err=document.getElementById('auth-error');
  if(!user||!pass){err.textContent='Inserisci username e password';return;}
  const password_hash=await hashStr(pass+'lq_salt_v2');
  err.textContent='Accesso in corso...';showLoading('Login...');
  try{
    const result=await apiCall('LOGIN_USER',{username:user,password_hash});
    hideLoading();
    if(result.success&&result.user){
      const cu=result.user;
      let local=DB.users.find(u=>u.id===cu.id);
      if(local){
        cu.xp_total=Math.max(local.xp_total||0,cu.xp_total||0);
        cu.level=Math.max(local.level||1,cu.level||1);
        cu.streak_days=Math.max(local.streak_days||0,cu.streak_days||0);
        cu.trophies=local.trophies||[];cu.privacy=local.privacy||{};
        cu.following = (cu.following && cu.following.length) ? cu.following : (local.following||[]);
        cu.followers = (cu.followers && Object.keys(cu.followers).length) ? cu.followers : (local.followers||{});
        cu.avatar=local.avatar||cu.avatar_url||cu.avatar||''; cu.languages=cu.languages?.length?cu.languages:(local.languages||[]);
        if(cu.stats)Object.keys(local.stats||{}).forEach(k=>{cu.stats[k]=Math.max(cu.stats[k]||0,local.stats[k]||0);});
        DB.users[DB.users.indexOf(local)]=cu;
      }else{
        cu.trophies=[];cu.privacy={};cu.following=cu.following||[];cu.followers=cu.followers||{};
        cu.avatar=cu.avatar_url||cu.avatar||''; cu.languages=cu.languages||[];
        DB.users.push(cu);
      }
      saveDB();syncCUR(cu);
      syncCloudDataOnLogin(cu.id).then(()=>bootApp());
      err.textContent='';
    }else{
      const local=DB.users.find(u=>u.username&&u.username.toLowerCase()===user.toLowerCase()&&u.password_hash===password_hash);
      if(local){syncCUR(local);bootApp();showToast('⚠️ Offline: dati locali');}
      else err.textContent=(result.message||'Credenziali errate')+'. Se hai cambiato dispositivo, riprova o usa il PIN di recupero.';
    }
  }catch(e){hideLoading();err.textContent='Errore di connessione';}
}

// ══ BUG 2 FIX — funzione doResetPin precedentemente mancante ══
async function doResetPin(){
  const user    = document.getElementById('pr-user').value.trim();
  const pin     = document.getElementById('pr-pin').value.trim();
  const np      = document.getElementById('pr-newpass').value;
  const err     = document.getElementById('pr-error');
  if(!user || !pin || !np){ err.textContent='Compila tutti i campi'; return; }
  if(np.length < 6){ err.textContent='Password min 6 caratteri'; return; }
  if(!/^\d{4}$/.test(pin)){ err.textContent='PIN: 4 cifre numeriche'; return; }
  const pin_hash          = await hashStr(pin + 'lq_pin_v2');
  const new_password_hash = await hashStr(np  + 'lq_salt_v2');
  err.textContent = 'Reset in corso...';
  showLoading('Reimpostazione password...');
  const res = await apiCall('RESET_PIN', { username: user, pin_hash, new_password_hash });
  hideLoading();
  if(res.success){
    showToast('✅ Password reimpostata! Ora accedi.');
    closeModal('modal-pin-reset');
    err.textContent = '';
    // Pre-compila username nel form login per comodità
    const lUser = document.getElementById('l-user');
    if(lUser) lUser.value = user;
    switchAuthTab('login');
  } else {
    err.textContent = res.message || 'Errore: PIN o username errati';
    playSound('error');
  }
}

async function syncCloudDataOnLogin(userId) {
  try {
    const qRes = await apiCall('GET_USER_QUESTS', { user_id: userId });
    if (qRes.success && qRes.quests) {
      qRes.quests.forEach(cq => {
        if (!DB.quests.find(q => q.id === cq.id)) DB.quests.push(cq);
      });
    }
    const bRes = await apiCall('GET_USER_BOOKS', { user_id: userId });
    if (bRes.success && bRes.books) {
      bRes.books.forEach(cb => {
        const existing = DB.books.find(b => b.id === cb.id);
        if (existing) Object.assign(existing, cb);
        else DB.books.push(cb);
      });
    }
    const bsRes = await apiCall('GET_USER_BOOK_SESSIONS', { user_id: userId });
    if (bsRes.success && bsRes.sessions) {
      bsRes.sessions.forEach(cs => {
        if (!DB.book_sessions.find(s => s.id === cs.id)) DB.book_sessions.push(cs);
      });
    }
    const ssRes = await apiCall('GET_USER_STUDY_SESSIONS', { user_id: userId });
    if (ssRes.success && ssRes.sessions) {
      ssRes.sessions.forEach(cs => {
        if (!DB.sessions.find(s => s.id === cs.id)) DB.sessions.push(cs);
      });
    }
    const exRes = await apiCall('GET_USER_EXAMS', { user_id: userId });
    if (exRes.success && exRes.exams) {
      exRes.exams.forEach(ce => {
        const existing = DB.exams.find(e => e.id === ce.id);
        if (existing) Object.assign(existing, ce);
        else DB.exams.push(ce);
      });
    }
    saveDB();
  } catch(e) { console.error('syncCloudDataOnLogin:', e); }
}

function gotoTab(tab){
  playSound('tap');
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('screen-'+tab).classList.add('active');
  document.getElementById('nav-'+tab).classList.add('active');
  ({home:renderHome,quest:renderQuests,study:renderStudy,routine:renderRoutine,pvp:renderPvP_load,stats:renderStats,friends:renderFriendsScreen,libri:renderLibri}[tab]||function(){})();
  window.scrollTo(0,0);
}

function updateDashboard(){
  if(!CUR)return;
  const u=getUser(CUR.id)||CUR,lvl=u.level||1,xpCur=u.xp_total||0;
  const xpThis=xpForLevel(lvl),xpNxt=xpForLevel(lvl+1);
  const pct=xpBarPct(xpCur, lvl);
  document.getElementById('hd-level').textContent=lvl;
  document.getElementById('hd-name').textContent=u.username;
  document.getElementById('hd-rank').textContent=rankTitle(lvl)+'  Lv.'+lvl;
  document.getElementById('hd-streak').innerHTML='🔥 '+(u.streak_days||0)+' gg';
  document.getElementById('xp-bar').style.width=pct+'%';
  document.getElementById('xp-cur').textContent=xpCur.toLocaleString()+' XP';
  document.getElementById('xp-next').textContent='→ Lv.'+(lvl+1)+' ('+xpNxt.toLocaleString()+' XP)';
  const av=document.getElementById('hd-avatar');
  if(av)av.innerHTML=u.avatar?'<img src="'+u.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':'<span>'+u.username[0].toUpperCase()+'</span>';
  const s=u.stats||{};
  ['mente','corpo','cultura','sociale','sfide'].forEach(k=>{const el=document.getElementById('ds-'+k);if(el)el.textContent=s[k]||0;});
}

function renderHome(){
  updateDashboard();
  document.getElementById('motiv-text').textContent=MOTIVS[new Date().getDay()%MOTIVS.length];
  loadAndRenderFeed();
}

let feedMode='following';
let _feedCache=[];

function toggleFeedMode() {
  playSound('tap');
  feedMode = feedMode === 'following' ? 'all' : 'following';
  document.getElementById('feed-switch-track').classList.toggle('on', feedMode === 'all');
  renderFeed();
}

async function loadAndRenderFeed(){
  const u=getUser(CUR.id)||CUR;
  const following=u.following||[];
  showLoading('Carico feed...');
  try{
    const res=await apiCall('GET_FEED_POSTS',{
      user_id:CUR.id,
      following,
      mode:feedMode,
      limit:60
    });
    hideLoading();
    if(res.success && res.posts){
      const cloudIds=new Set(res.posts.map(p=>p.id));
      const localOnly=DB.feed_posts.filter(p=>!cloudIds.has(p.id));
      _feedCache=[...res.posts,...localOnly].sort((a,b)=>b.ts-a.ts);
      res.posts.forEach(cp=>{
        const existing=DB.feed_posts.find(p=>p.id===cp.id);
        if(!existing) DB.feed_posts.unshift(cp);
      });
      saveDB();
    } else {
      _feedCache=[...DB.feed_posts].sort((a,b)=>b.ts-a.ts);
    }
  }catch(e){
    hideLoading();
    _feedCache=[...DB.feed_posts].sort((a,b)=>b.ts-a.ts);
  }
  renderFeed();
}

function renderFeed(){
  const u=getUser(CUR.id)||CUR;
  const myFollowing=new Set(u.following||[]);
  const myLanguages=new Set(u.languages||[]);
  let posts=[..._feedCache];

  if(feedMode==='following'){
    posts=posts.filter(p=>p.user_id===CUR.id||myFollowing.has(p.user_id));
  } else {
    if(myLanguages.size>0){
      posts=posts.filter(p=>{
        if(p.user_id===CUR.id)return true;
        const pu=getUser(p.user_id);
        const pLangs=pu?.languages||p.languages||[];
        return pLangs.some(l=>myLanguages.has(l));
      });
    }
  }

  const el=document.getElementById('feed-list');
  if(!posts.length){
    const hint=feedMode==='following'
      ?' Segui altri utenti o passa a "Tutti"'
      :' Imposta le tue lingue nel profilo per filtrare';
    el.innerHTML='<div class="empty" style="padding:20px 0"><div class="empty-emoji">📭</div><div class="empty-text">Nessuna attività nel feed.<br><small style="color:var(--text3)">'+hint+'</small></div></div>';
    return;
  }
  el.innerHTML=posts.slice(0,40).map(renderFeedPost).join('');
}

function renderFeedPost(p){
  const author=getUser(p.user_id);
  const name=author?escHtml(author.username):'Utente';
  const av=author?.avatar?'<img src="'+author.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':name[0];
  const myLike=(p.likes||[]).includes(CUR.id);
  const likeCount=(p.likes||[]).length;
  const comments=DB.comments.filter(c=>c.post_id===p.id);
  const img=p.photo?'<div class="feed-photo" onclick="openPhotoModal(\''+p.id+'\')"><img src="'+p.photo+'" alt="foto"></div>':'';
  return '<div class="feed-card" id="post-'+p.id+'">'
    +'<div class="feed-header">'
    +'<div class="feed-avatar" onclick="viewUserProfile(\''+p.user_id+'\')">'+av+'</div>'
    +'<div class="feed-meta"><div class="feed-author" onclick="viewUserProfile(\''+p.user_id+'\')">'+name+'</div><div class="feed-time">'+relTime(p.ts)+'</div></div>'
    +'<span class="tag tag-cat" style="font-size:9px">'+escHtml(p.category||'')+'</span>'
    +'</div>'
    +'<div class="feed-body"><div class="feed-title">'+escHtml(p.title||'')+'</div>'
    +(p.notes?'<div class="feed-notes">'+escHtml(p.notes)+'</div>':'')
    +img+'</div>'
    +'<div class="feed-footer">'
    +'<button class="feed-action'+(myLike?' liked':'')+'" onclick="toggleLike(\''+p.id+'\')">'+(myLike?'❤️':'🤍')+' <span id="lc-'+p.id+'">'+likeCount+'</span></button>'
    +'<button class="feed-action" onclick="toggleComments(\''+p.id+'\')">💬 '+comments.length+'</button>'
    +'<span class="feed-xp">+'+(p.xp||0)+' XP</span>'
    +'</div>'
    +'<div class="feed-comments" id="fc-'+p.id+'" style="display:none">'
    +'<div class="comments-list" id="cl-'+p.id+'">'+comments.map(c=>'<div class="comment-row"><b>'+escHtml(getUser(c.user_id)?.username||'?')+':</b> '+escHtml(c.text)+'</div>').join('')+'</div>'
    +'<div class="comment-input-row"><input class="sm comment-input" id="ci-'+p.id+'" placeholder="Commenta..." onkeydown="if(event.key===\'Enter\')submitComment(\''+p.id+'\')"><button class="btn-sm btn-sm-primary" onclick="submitComment(\''+p.id+'\')">↑</button></div>'
    +'</div></div>';
}

function toggleLike(postId){
  playSound('like');
  const p=DB.feed_posts.find(x=>x.id===postId);if(!p)return;
  if(!p.likes)p.likes=[];
  const idx=p.likes.indexOf(CUR.id);
  if(idx>=0)p.likes.splice(idx,1);else p.likes.push(CUR.id);
  saveDB();
  const myLike=p.likes.includes(CUR.id);
  const btn=document.querySelector('#post-'+postId+' .feed-action');
  if(btn){btn.className='feed-action'+(myLike?' liked':'');btn.innerHTML=(myLike?'❤️':'🤍')+' <span id="lc-'+postId+'">'+p.likes.length+'</span>';}
}
function toggleComments(postId){
  playSound('tap');
  const el=document.getElementById('fc-'+postId);
  if(el)el.style.display=el.style.display==='none'?'block':'none';
}
function submitComment(postId){
  const inp=document.getElementById('ci-'+postId);
  const text=(inp?.value||'').trim();if(!text)return;
  validateAndPost(text, () => {
    const c={id:uid(),post_id:postId,user_id:CUR.id,text,ts:ts()};
    DB.comments.push(c);saveDB();inp.value='';playSound('tap');
    const cl=document.getElementById('cl-'+postId);
    if(cl)cl.innerHTML+='<div class="comment-row"><b>'+escHtml(CUR.username)+':</b> '+escHtml(text)+'</div>';
  });
}
function openPhotoModal(postId){
  const p=DB.feed_posts.find(x=>x.id===postId);if(!p?.photo)return;
  const ov=document.createElement('div');ov.className='photo-overlay';ov.onclick=()=>ov.remove();
  ov.innerHTML='<img src="'+p.photo+'" style="max-width:96vw;max-height:90vh;border-radius:var(--r);box-shadow:0 0 40px rgba(0,0,0,0.8)">';
  document.body.appendChild(ov);
}
function addFeedPost(title,category,xp,notes,photo){
  const u=getUser(CUR.id)||CUR;
  const p={id:uid(),user_id:CUR.id,username:u.username,avatar_url:u.avatar||'',title,category,xp,notes:notes||'',photo:photo||'',ts:ts(),likes:[]};
  DB.feed_posts.unshift(p);
  _feedCache.unshift(p);
  saveDB();
  apiCall('SAVE_FEED_POST',p);
  return p.id;
}

let qTab='todo',selectedCalDate=today();
function switchQuestTab(t){playSound('tap');qTab=t;document.querySelectorAll('#screen-quest .tab').forEach((b,i)=>b.classList.toggle('active',['todo','active','done','calendar'][i]===t));renderQuests();}
function renderQuests(){
  const c=document.getElementById('quest-list-container');
  if(qTab==='calendar'){renderQuestCalendar(c);return;}
  const myQ=DB.quests.filter(q=>q.user_id===CUR.id);
  const list=qTab==='todo'?myQ.filter(q=>!q.completed&&q.type==='todo'):qTab==='active'?myQ.filter(q=>!q.completed&&q.type==='quest'):myQ.filter(q=>q.completed).sort((a,b)=>(b.completed_at||0)-(a.completed_at||0));
  c.innerHTML=list.length?list.map(q=>
    '<div class="quest-card">'
    +'<div class="quest-check'+(q.completed?' done':'')+'" onclick="toggleQuest(\''+q.id+'\',event)"></div>'
    +'<div class="quest-body">'
    +'<div class="quest-name'+(q.completed?' done':'')+'">'+escHtml(q.name)+'</div>'
    +(q.photo?'<div style="margin:5px 0"><img src="'+q.photo+'" style="width:100%;border-radius:8px;max-height:140px;object-fit:cover"></div>':'')
    +'<div class="quest-meta"><span class="tag tag-xp">⚡'+q.xp_base+' XP</span><span class="tag tag-cat">'+q.category+'</span>'+(q.completed?'<span class="tag tag-green">✅</span>':'')+'</div>'
    +(q.notes?'<div style="font-size:11px;color:var(--text3);margin-top:4px">'+escHtml(q.notes)+'</div>':'')
    +'</div>'
    +(!q.completed?'<button class="btn-sm btn-sm-red" style="font-size:10px;padding:4px 8px;flex-shrink:0" onclick="deleteQuest(\''+q.id+'\',event)">✕</button>':'')
    +'</div>'
  ).join(''):'<div class="empty"><div class="empty-emoji">'+(qTab==='done'?'🏆':'⚔️')+'</div><div class="empty-text">'+(qTab==='done'?'Nessuna quest completata.':'Aggiungi la tua prima quest!')+'</div></div>';
}
function renderQuestCalendar(container){
  const now=new Date(),y=now.getFullYear(),m=now.getMonth(),dim=new Date(y,m+1,0).getDate(),fd=(new Date(y,m,1).getDay()+6)%7;
  const cQ=DB.quests.filter(q=>q.user_id===CUR.id&&q.completed);
  const qd={};cQ.forEach(q=>{const ds=q.completed_at?new Date(q.completed_at).toISOString().split('T')[0]:'';if(ds)qd[ds]=(qd[ds]||0)+1;});
  let h='<div style="text-align:center;font-size:15px;font-weight:700;margin-bottom:10px">📅 '+new Date(y,m).toLocaleString('it',{month:'long',year:'numeric'})+'</div><div class="cal-grid">';
  ['Lu','Ma','Me','Gi','Ve','Sa','Do'].forEach(d=>h+='<div class="cal-day-label">'+d+'</div>');
  for(let i=0;i<fd;i++)h+='<div></div>';
  for(let d=1;d<=dim;d++){const ds=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');const cnt=qd[ds]||0;h+='<div class="cal-day'+(selectedCalDate===ds?' today':'')+(cnt?' has-session':'')+'" onclick="selectQuestDate(\''+ds+'\')">'+d+(cnt?'<span style="font-size:9px;display:block;color:var(--accent)">•'+cnt+'</span>':'')+'</div>';}
  h+='</div>';
  const dayQ=cQ.filter(q=>{const d=q.completed_at?new Date(q.completed_at).toISOString().split('T')[0]:'';return d===selectedCalDate;});
  h+='<div style="margin-top:16px"><div class="section-hd"><span class="section-title">Quest del '+selectedCalDate+' ('+dayQ.length+')</span></div>'+(dayQ.length?dayQ.map(q=>'<div class="quest-card"><div class="quest-body"><div class="quest-name done">'+escHtml(q.name)+'</div><div class="quest-meta"><span class="tag tag-xp">⚡'+q.xp_base+' XP</span><span class="tag tag-cat">'+q.category+'</span></div></div></div>').join(''):'<div style="color:var(--text3);font-size:12px;padding:8px 0">Nessuna quest.</div>')+'</div>';
  container.innerHTML=h;
}
function selectQuestDate(d){selectedCalDate=d;renderQuestCalendar(document.getElementById('quest-list-container'));}

let _pendingQuestPhoto='';
function openAddQuestModal(){_pendingQuestPhoto='';const pr=document.getElementById('q-photo-preview');if(pr)pr.style.display='none';openModal('modal-add-quest');}
function attachQuestPhoto(){pickImage(800,600,0.65,d=>{_pendingQuestPhoto=d;const pr=document.getElementById('q-photo-preview');if(pr){pr.src=d;pr.style.display='block';}showToast('📸 Foto allegata');});}
function addQuest(){
  const name=document.getElementById('q-name').value.trim();if(!name){showToast('⚠️ Inserisci un nome');playSound('error');return;}
  validateAndPost(name, () => {
    const cat=document.getElementById('q-cat').value,diff=parseInt(document.getElementById('q-diff').value)||2,type=document.getElementById('q-type').value;
    const base=Math.round((type==='todo'?15:50)*DIFF_MULT[diff]);
    const q={id:uid(),user_id:CUR.id,name,category:cat,difficulty:diff,type,notes:document.getElementById('q-notes').value.trim(),xp_base:base,completed:false,created_at:ts(),photo:_pendingQuestPhoto};
    DB.quests.push(q);saveDB();closeModal('modal-add-quest');
    document.getElementById('q-name').value='';document.getElementById('q-notes').value='';_pendingQuestPhoto='';
    renderQuests();showToast('⚔️ Quest aggiunta!');playSound('tap');
  });
}
function deleteQuest(id,e){if(e)e.stopPropagation();playSound('tap');DB.quests=DB.quests.filter(q=>q.id!==id);saveDB();renderQuests();}
async function toggleQuest(id,e){
  if(e)e.stopPropagation();
  const q=DB.quests.find(q=>q.id===id);if(!q||q.completed)return;
  q.completed=true;q.completed_at=ts();saveDB();
  awardXP(q.xp_base,CAT_STAT[q.category]||'produttivita','— '+q.name);
  playSound('quest'); 
  addFeedPost(q.name,q.category,q.xp_base,q.notes,q.photo);
  checkTrophies();renderQuests();
  await apiCall('COMPLETE_QUEST',{user_id:CUR.id,name:q.name,category:q.category,difficulty:q.difficulty||1,type:q.type||'quest',notes:q.notes||'',xp_base:q.xp_base});
}

function openCustomRoutineModal(){openModal('modal-custom-routine');}

function doRoutine(itemId) {
  const item = ROUTINE_ITEMS.find(x => x.id === itemId); if (!item) return;
  if (itemId === 'custom') { openCustomRoutineModal(); return; }
  const todayRoutineQuests = DB.quests.filter(q =>
    q.user_id === CUR.id && q.routine_item_id === itemId && q.created_at >= new Date().setHours(0,0,0,0)
  );
  if (todayRoutineQuests.length >= 3) {
    showToast('⚠️ Max 3 per questo tipo oggi');
    playSound('error'); return;
  }
  const q = {
    id: uid(), user_id: CUR.id, name: item.name,
    category: item.cat, difficulty: 1, type: 'todo',
    notes: 'Creata da Routine', xp_base: item.xp,
    completed: false, created_at: ts(),
    routine_item_id: itemId, photo: ''
  };
  DB.quests.push(q); saveDB();
  showToast('✨ Quest aggiunta! Vai in Quest per completarla.');
  playSound('tap');
}

function renderRoutine(){
  const myRoutineQuests = DB.quests.filter(r => r.user_id === CUR.id && r.routine_item_id && r.created_at >= new Date().setHours(0,0,0,0));
  const c = document.getElementById('routine-container');
  let h = '<div style="padding:0 20px">'
    + '<div class="routine-progress-box">'
    + '<div style="font-size:13px;font-weight:700;margin-bottom:6px">Routine di oggi — tap per creare quest</div>'
    + '<div style="font-size:11px;color:var(--text3)">Max 3 quest per tipo. Completa dalla scheda Quest per guadagnare XP.</div>'
    + '</div>'
    + '<div class="section-hd" style="margin-top:14px"><span class="section-title">Scegli routine</span></div>'
    + '<div class="routine-grid">';

  ROUTINE_ITEMS.forEach(item => {
    const cnt = myRoutineQuests.filter(r => r.routine_item_id === item.id).length;
    const locked = cnt >= 3;
    h += '<div class="routine-tile' + (locked?' locked':'') + '" onclick="' + (locked ? 'showToast(\'⚠️ Max 3 per oggi\')' : 'doRoutine(\'' + item.id + '\')') + '">'
      + '<div class="routine-emoji">' + item.emoji + '</div>'
      + '<div class="routine-name">' + item.name + '</div>'
      + '<div class="routine-xp">+' + item.xp + ' XP</div>'
      + (cnt ? '<div class="routine-done-badge">' + cnt + '/3</div>' : '')
      + '</div>';
  });
  h += '</div></div>';
  c.innerHTML = h;
}

function saveCustomRoutine(){
  const name=document.getElementById('cr-name').value.trim();
  const xp=Math.min(50,parseInt(document.getElementById('cr-xp').value)||20);
  if(!name){showToast('⚠️ Inserisci nome');return;}
  validateAndPost(name, () => {
    const todayRoutineQuests = DB.quests.filter(q =>
      q.user_id === CUR.id && q.routine_item_id === 'custom' && q.custom_name === name && q.created_at >= new Date().setHours(0,0,0,0)
    );
    if(todayRoutineQuests.length >= 3){showToast('⚠️ Max 3 per oggi');return;}
    const q = {
      id: uid(), user_id: CUR.id, name: 'Custom: ' + name,
      category: 'produttivita', difficulty: 1, type: 'todo',
      notes: 'Routine personalizzata', xp_base: xp,
      completed: false, created_at: ts(),
      routine_item_id: 'custom', custom_name: name, photo: ''
    };
    DB.quests.push(q);saveDB();closeModal('modal-custom-routine');
    showToast('✨ Quest personalizzata aggiunta!');
    playSound('tap');
    renderRoutine();
  });
}

function onBookTitleInput(){
  const val=document.getElementById('bk-title').value;
  const el=document.getElementById('book-suggestions');
  if(val.length<2){el.innerHTML='';el.style.display='none';return;}
  const q=val.toLowerCase(),seen=new Set(),res=[];
  DB.books.forEach(b=>{const k=b.title.toLowerCase();if(k.includes(q)&&!seen.has(k)){seen.add(k);res.push(b);}});
  if(res.length){
    el.innerHTML=res.slice(0,6).map(b=>'<div class="suggestion-item" onclick="selectBookSuggestion(\''+b.id+'\')">'+escHtml(b.emoji||'📖')+' '+escHtml(b.title)+'<span style="color:var(--text3);font-size:10px"> — '+escHtml(b.author||'')+'</span></div>').join('');
    el.style.display='block';
  } else {
    el.innerHTML='';el.style.display='none';
  }
  if(res.length<3){
    apiCall('SEARCH_CATALOG_BOOKS',{query:val}).then(cloudRes=>{
      if(cloudRes.success&&cloudRes.books){
        cloudRes.books.forEach(b=>{
          const k=b.title.toLowerCase();
          if(!seen.has(k)){seen.add(k);res.push(b);}
        });
        if(res.length){
          el.innerHTML=res.slice(0,6).map(b=>'<div class="suggestion-item" onclick="selectBookSuggestion(\''+b.id+'\')">'+escHtml(b.emoji||'📖')+' '+escHtml(b.title)+'<span style="color:var(--text3);font-size:10px"> — '+escHtml(b.author||'')+'</span></div>').join('');
          el.style.display='block';
        }
      }
    });
  }
}
function selectBookSuggestion(id){
  const b=DB.books.find(x=>x.id===id);if(!b)return;
  document.getElementById('bk-title').value=b.title;
  document.getElementById('bk-author').value=b.author||'';
  document.getElementById('bk-genre').value=b.genre||'altro';
  document.getElementById('bk-diff').value=b.difficulty||3;
  document.getElementById('bk-pages').value=b.total_pages||'';
  document.getElementById('bk-emoji').value=b.emoji||'';
  document.getElementById('book-suggestions').style.display='none';
  showToast('📖 Libro importato!');playSound('tap');
}
function renderBooks(c){
  const books=DB.books.filter(b=>b.user_id===CUR.id);
  if(!books.length){c.innerHTML='<div class="empty"><div class="empty-emoji">📖</div><div class="empty-text">Aggiungi il tuo primo libro!</div></div><div id="study-similar"></div>';return;}
  let h = books.map(b=>{
    const pct=b.total_pages?Math.round((b.current_page||0)/b.total_pages*100):0;
    const done=(b.current_page||0)>=(b.total_pages||Infinity)&&b.total_pages>0;
    const ss=DB.book_sessions.filter(s=>s.book_id===b.id).length;
    return '<div class="book-card"><div class="book-head"><div class="book-cover">'+(b.emoji||'📖')+'</div><div class="book-meta">'
      +'<div class="book-title">'+escHtml(b.title)+'</div><div class="book-author">'+escHtml(b.author||'—')+'</div>'
      +'<div class="book-tags"><span class="tag tag-cat">'+(b.genre||'—')+'</span><span class="tag tag-orange">'+diffStars(b.difficulty)+'</span>'+(done?'<span class="tag tag-green">✅</span>':'')+'</div>'
      +'<div class="book-progress-wrap"><div class="book-progress-fill" style="width:'+pct+'%"></div></div>'
      +'<div class="book-progress-nums"><span>'+(b.current_page||0)+'/'+(b.total_pages||'?')+' pag.</span><span>'+pct+'% • '+ss+' sessioni</span></div>'
      +'</div></div>'
      +(!done?'<div class="book-actions"><button class="btn-sm btn-sm-primary" style="font-size:11px;flex:1" onclick="openReadingModal(\''+b.id+'\')">+Pagine</button><button class="btn-sm btn-sm-ghost" style="font-size:11px" onclick="markBookDone(\''+b.id+'\')">✅ Finito</button></div>':'<div style="font-size:11px;color:var(--green);padding-top:8px;text-align:center;font-weight:700">Bonus '+(BOOK_DIFF_BONUS[b.difficulty]||0)+' XP! 🎉</div>')
      +'</div>';
  }).join('');
  h += '<div id="study-similar"></div>';
  c.innerHTML = h;

  const myTitles = books.map(b=>b.title).slice(0,5);
  if (myTitles.length) {
    apiCall('FIND_SIMILAR', { user_id: CUR.id, book_titles: myTitles }).then(res => {
      if (!res.success || !res.users?.length) return;
      const el = document.getElementById('study-similar');
      if (!el) return;
      el.innerHTML = '<div class="section-hd" style="margin-top:16px"><span class="section-title">👥 Chi legge cose simili</span></div>'
        + '<input class="sm" id="similar-search" placeholder="Cerca utente..." style="margin:8px 0" oninput="filterSimilarUsers()">'
        + '<div id="similar-list">'
        + res.users.map(u => '<div class="friend-card similar-user-card" data-username="'+escHtml(u.username.toLowerCase())+'" onclick="viewUserProfileBooks(\''+u.id+'\')" style="cursor:pointer">'
          + '<div class="friend-name">' + escHtml(u.username) + '</div>'
          + '<span class="tag tag-xp">' + u.common + ' libri in comune</span>'
          + (u.common_titles&&u.common_titles.length?'<div style="font-size:10px;color:var(--text3);margin-top:4px">📖 '+u.common_titles.map(t=>escHtml(t)).join(', ')+'</div>':'')
          + '</div>').join('')
        + '</div>';
    });
  }
}

function filterSimilarUsers(){
  const q=(document.getElementById('similar-search')?.value||'').toLowerCase();
  document.querySelectorAll('.similar-user-card').forEach(el=>{
    el.style.display=(!q||el.dataset.username.includes(q))?'':'none';
  });
}

let libriTab = 'catalogo';
let discussionPage = 1;
const DISC_PER_PAGE = 10;

function switchLibriTab(t){
  playSound('tap');
  libriTab=t;
  document.querySelectorAll('#screen-libri .tab').forEach((b,i)=>b.classList.toggle('active',['catalogo','discussioni'][i]===t));
  renderLibri();
}

function renderLibri(){
  if(libriTab==='catalogo') renderLibriCatalogo();
  else renderDiscussioni();
}

function onGlobalBookTitleInput(){
  const val=document.getElementById('gbk-title').value;
  const el=document.getElementById('global-book-suggestions');
  if(val.length<2){el.innerHTML='';el.style.display='none';return;}
  const q=val.toLowerCase(),seen=new Set(),res=[];
  DB.books.forEach(b=>{const k=b.title.toLowerCase();if(k.includes(q)&&!seen.has(k)){seen.add(k);res.push(b);}});
  if(!res.length){el.innerHTML='';el.style.display='none';return;}
  el.innerHTML=res.slice(0,6).map(b=>'<div class="suggestion-item" onclick="selectGlobalBookSuggestion(\''+b.id+'\')">'+escHtml(b.emoji||'📖')+' '+escHtml(b.title)+'<span style="color:var(--text3);font-size:10px"> — '+escHtml(b.author||'')+'</span></div>').join('');
  el.style.display='block';
}
function selectGlobalBookSuggestion(id){
  const b=DB.books.find(x=>x.id===id);if(!b)return;
  document.getElementById('gbk-title').value=b.title;
  document.getElementById('gbk-author').value=b.author||'';
  document.getElementById('gbk-genre').value=b.genre||'narrativa';
  document.getElementById('gbk-diff').value=b.difficulty||3;
  document.getElementById('gbk-pages').value=b.total_pages||'';
  document.getElementById('gbk-emoji').value=b.emoji||'';
  document.getElementById('global-book-suggestions').style.display='none';
  showToast('📖 Libro importato!');
}

function addGlobalBook(){
  const title=document.getElementById('gbk-title').value.trim();
  if(!title){showToast('⚠️ Inserisci il titolo');return;}
  validateAndPost(title,()=>{
    const existing=DB.books.find(b=>b.title.toLowerCase()===title.toLowerCase()&&!b.user_id);
    if(existing){showToast('ℹ️ Libro già in catalogo!');closeModal('modal-add-book-global');return;}
    const diff=parseInt(document.getElementById('gbk-diff').value)||3;
    const b={
      id:'cat_'+uid(), user_id:null,
      title, author:document.getElementById('gbk-author').value.trim(),
      genre:document.getElementById('gbk-genre').value,
      difficulty:diff,
      total_pages:parseInt(document.getElementById('gbk-pages').value)||0,
      current_page:0, emoji:document.getElementById('gbk-emoji').value||'📖',
      completed:false, created_at:ts(), is_catalog:true
    };
    DB.books.push(b);saveDB();
    closeModal('modal-add-book-global');
    ['gbk-title','gbk-author','gbk-pages','gbk-emoji'].forEach(id=>document.getElementById(id).value='');
    showToast('📚 Libro aggiunto al catalogo!');playSound('tap');
    apiCall('SAVE_BOOK',{...b,user_id:'__catalog__'});
    renderLibri();
  });
}

function renderLibriCatalogo(){
  const c=document.getElementById('libri-container');
  const catalogBooks=DB.books.filter(b=>b.is_catalog||!b.user_id);
  const myBooks=DB.books.filter(b=>b.user_id===CUR.id);
  
  let h='<div style="padding:0 20px">';
  h+='<input class="sm" id="catalog-search" placeholder="🔍 Cerca per titolo, autore, genere..." style="margin-bottom:12px" oninput="renderLibriCatalogo()">';
  
  const q=(document.getElementById('catalog-search')?.value||'').toLowerCase();
  
  const filtered=catalogBooks.filter(b=>!q||(b.title.toLowerCase().includes(q)||((b.author||'').toLowerCase().includes(q))||((b.genre||'').toLowerCase().includes(q))));
  
  if(filtered.length){
    h+='<div class="section-hd"><span class="section-title">📚 Catalogo libri ('+filtered.length+')</span></div>';
    h+=filtered.map(b=>{
      const inMyList=myBooks.some(mb=>mb.title.toLowerCase()===b.title.toLowerCase());
      return '<div class="book-card" style="display:flex;align-items:center;gap:12px">'
        +'<div class="book-cover" style="font-size:28px;flex-shrink:0">'+(b.emoji||'📖')+'</div>'
        +'<div style="flex:1">'
        +'<div class="book-title">'+escHtml(b.title)+'</div>'
        +'<div class="book-author">'+escHtml(b.author||'—')+'</div>'
        +'<div class="book-tags"><span class="tag tag-cat">'+(b.genre||'—')+'</span><span class="tag tag-orange">'+diffStars(b.difficulty||1)+'</span>'+(b.total_pages?'<span class="tag">'+b.total_pages+' pag.</span>':'')+'</div>'
        +'</div>'
        +(inMyList
          ?'<span class="tag tag-green">✅ In lista</span>'
          :'<button class="btn-sm btn-sm-primary" style="flex-shrink:0" onclick="addBookFromCatalog(\''+b.id+'\')">+ Aggiungi</button>')
        +'</div>';
    }).join('');
  } else {
    h+='<div class="empty"><div class="empty-emoji">📚</div><div class="empty-text">'+(q?'Nessun risultato per "'+escHtml(q)+'".':'Il catalogo è vuoto. Inserisci il primo libro!')+'</div></div>';
  }
  
  h+='</div>';
  c.innerHTML=h;
  if(!catalogBooks.length){
    apiCall('GET_CATALOG_BOOKS',{}).then(res=>{
      if(res.success&&res.books){
        res.books.forEach(b=>{
          if(!DB.books.find(x=>x.id===b.id)) DB.books.push({...b,is_catalog:true});
        });
        saveDB();renderLibriCatalogo();
      }
    });
  }
}

function addBookFromCatalog(bookId){
  const cat=DB.books.find(b=>b.id===bookId);if(!cat)return;
  const already=DB.books.find(b=>b.user_id===CUR.id&&b.title.toLowerCase()===cat.title.toLowerCase());
  if(already){showToast('📖 Già nella tua lista!');return;}
  const b={...cat,id:uid(),user_id:CUR.id,current_page:0,completed:false,created_at:ts(),is_catalog:false};
  DB.books.push(b);saveDB();
  showToast('📖 Aggiunto alla tua lista!');playSound('tap');
  apiCall('SAVE_BOOK',{...b,user_id:CUR.id});
  renderLibriCatalogo();
}

function onDiscBookInput(){
  const val=document.getElementById('disc-book-title').value;
  const el=document.getElementById('disc-book-suggestions');
  if(val.length<2){el.innerHTML='';el.style.display='none';return;}
  const q=val.toLowerCase(),seen=new Set(),res=[];
  DB.books.forEach(b=>{const k=b.title.toLowerCase();if(k.includes(q)&&!seen.has(k)){seen.add(k);res.push(b);}});
  if(!res.length){el.innerHTML='';el.style.display='none';return;}
  el.innerHTML=res.slice(0,5).map(b=>'<div class="suggestion-item" onclick="document.getElementById(\'disc-book-title\').value=\''+escHtml(b.title)+'\';document.getElementById(\'disc-book-suggestions\').style.display=\'none\'">'+escHtml(b.emoji||'📖')+' '+escHtml(b.title)+'</div>').join('');
  el.style.display='block';
}

function createDiscussion(){
  const bookTitle=document.getElementById('disc-book-title').value.trim();
  const title=document.getElementById('disc-title').value.trim();
  const body=document.getElementById('disc-body').value.trim();
  if(!bookTitle){showToast('⚠️ Specifica il libro');return;}
  if(!title){showToast('⚠️ Inserisci un argomento');return;}
  if(!body){showToast('⚠️ Scrivi qualcosa');return;}
  validateAndPost(title+' '+body,()=>{
    const disc={
      id:uid(),user_id:CUR.id,username:CUR.username,
      book_title:bookTitle,title,
      type:document.getElementById('disc-type').value,
      body,ts:ts(),replies:[],likes:[]
    };
    if(!DB.discussions)DB.discussions=[];
    DB.discussions.unshift(disc);saveDB();
    closeModal('modal-create-discussion');
    ['disc-book-title','disc-title','disc-body'].forEach(id=>document.getElementById(id).value='');
    showToast('💬 Discussione creata!');playSound('tap');
    apiCall('SAVE_DISCUSSION',disc);
    discussionPage=1;renderDiscussioni();
  });
}

function renderDiscussioni(){
  const c=document.getElementById('libri-container');
  if(!DB.discussions)DB.discussions=[];
  
  let h='<div style="padding:0 20px">';
  h+='<div style="display:flex;gap:8px;margin-bottom:12px">';
  h+='<input class="sm" id="disc-search" placeholder="🔍 Cerca discussioni o libri..." style="flex:1;margin:0" oninput="renderDiscussioni()">';
  h+='<button class="btn-sm btn-sm-primary" onclick="openModal(\'modal-create-discussion\');playSound(\'open\')">+ Crea</button>';
  h+='</div>';
  
  const q=(document.getElementById('disc-search')?.value||'').toLowerCase();
  let discs=[...(DB.discussions||[])];
  
  if(!discs.length){
    apiCall('GET_DISCUSSIONS',{}).then(res=>{
      if(res.success&&res.discussions){
        DB.discussions=res.discussions;saveDB();renderDiscussioni();
      }
    });
  }
  
  if(q) discs=discs.filter(d=>d.title.toLowerCase().includes(q)||d.book_title.toLowerCase().includes(q)||(d.body||'').toLowerCase().includes(q));
  
  const total=discs.length;
  const pages=Math.max(1,Math.ceil(total/DISC_PER_PAGE));
  discussionPage=Math.min(discussionPage,pages);
  const start=(discussionPage-1)*DISC_PER_PAGE;
  const pageDiscs=discs.slice(start,start+DISC_PER_PAGE);
  
  if(!pageDiscs.length){
    h+='<div class="empty"><div class="empty-emoji">💬</div><div class="empty-text">'+(q?'Nessuna discussione trovata.':'Sii il primo a creare una discussione!')+'</div></div>';
  } else {
    h+=pageDiscs.map(d=>renderDiscCard(d)).join('');
    if(pages>1){
      h+='<div style="display:flex;justify-content:center;gap:6px;margin-top:14px;flex-wrap:wrap">';
      for(let p=1;p<=pages;p++){
        h+='<button class="btn-sm '+(discussionPage===p?'btn-sm-primary':'btn-sm-ghost')+'" onclick="discussionPage='+p+';renderDiscussioni()">'+p+'</button>';
      }
      h+='</div>';
    }
  }
  h+='</div>';
  c.innerHTML=h;
}

function renderDiscCard(d){
  const typeEmoji=d.type==='aiuto'?'🆘':'💬';
  const replies=(d.replies||[]).length;
  return '<div class="feed-card" id="disc-'+d.id+'">'
    +'<div class="feed-header">'
    +'<div class="feed-avatar">'+escHtml((d.username||'?')[0].toUpperCase())+'</div>'
    +'<div class="feed-meta"><div class="feed-author">'+escHtml(d.username||'Utente')+'</div><div class="feed-time">'+relTime(d.ts)+'</div></div>'
    +'<span class="tag tag-cat" style="font-size:9px">'+typeEmoji+' '+escHtml(d.type||'')+'</span>'
    +'</div>'
    +'<div class="feed-body">'
    +'<div style="font-size:10px;color:var(--accent2);font-weight:700;margin-bottom:4px">📖 '+escHtml(d.book_title)+'</div>'
    +'<div class="feed-title">'+escHtml(d.title)+'</div>'
    +'<div class="feed-notes">'+escHtml(d.body||'')+'</div>'
    +'</div>'
    +'<div class="feed-footer">'
    +'<button class="feed-action" onclick="toggleDiscLike(\''+d.id+'\')">'+((d.likes||[]).includes(CUR.id)?'❤️':'🤍')+' '+(d.likes||[]).length+'</button>'
    +'<button class="feed-action" onclick="toggleDiscReplies(\''+d.id+'\')">💬 '+replies+'</button>'
    +'</div>'
    +'<div class="feed-comments" id="drepl-'+d.id+'" style="display:none">'
    +(d.replies||[]).map(r=>'<div class="comment-row"><b>'+escHtml(r.username||'?')+':</b> '+escHtml(r.text)+'</div>').join('')
    +'<div class="comment-input-row"><input class="sm comment-input" id="dri-'+d.id+'" placeholder="Rispondi..." onkeydown="if(event.key===\'Enter\')replyToDisc(\''+d.id+'\')"><button class="btn-sm btn-sm-primary" onclick="replyToDisc(\''+d.id+'\')">↑</button></div>'
    +'</div>'
    +'</div>';
}
function toggleDiscReplies(id){const el=document.getElementById('drepl-'+id);if(el)el.style.display=el.style.display==='none'?'block':'none';}
function toggleDiscLike(id){
  if(!DB.discussions)return;
  const d=DB.discussions.find(x=>x.id===id);if(!d)return;
  if(!d.likes)d.likes=[];
  const idx=d.likes.indexOf(CUR.id);
  if(idx>=0)d.likes.splice(idx,1);else d.likes.push(CUR.id);
  saveDB();renderDiscussioni();
}
function replyToDisc(id){
  const inp=document.getElementById('dri-'+id);
  const text=(inp?.value||'').trim();if(!text)return;
  validateAndPost(text,()=>{
    if(!DB.discussions)DB.discussions=[];
    const d=DB.discussions.find(x=>x.id===id);if(!d)return;
    if(!d.replies)d.replies=[];
    const r={id:uid(),user_id:CUR.id,username:CUR.username,text,ts:ts()};
    d.replies.push(r);saveDB();inp.value='';
    apiCall('REPLY_DISCUSSION',{discussion_id:id,reply:r});
    toggleDiscReplies(id);toggleDiscReplies(id);
    renderDiscussioni();
  });
}

async function viewUserProfileBooks(userId){
  const u=getUser(userId)||{id:userId,username:'Utente',level:1,xp_total:0,stats:{},following:[],followers:{}};
  const myUser=getUser(CUR.id)||CUR;
  const myBooks=DB.books.filter(b=>b.user_id===CUR.id).map(b=>b.title.toLowerCase());
  const isFollowing=(myUser.following||[]).includes(userId);
  const av=u.avatar?'<img src="'+u.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':'<span style="font-size:28px;font-weight:900;color:var(--accent2)">'+escHtml((u.username||'?')[0].toUpperCase())+'</span>';
  
  let userBooks=[];
  try{
    const bRes=await apiCall('GET_USER_BOOKS',{user_id:userId});
    if(bRes.success&&bRes.books) userBooks=bRes.books;
  }catch(e){}
  
  const commonBooks=userBooks.filter(b=>myBooks.includes(b.title.toLowerCase()));
  const preferredGenres=u.preferred_genres||[];
  
  const c=document.getElementById('profile-content');
  c.innerHTML=
    '<div style="padding:24px 20px 20px;text-align:center">'
    +'<div style="width:72px;height:72px;border-radius:50%;background:var(--accent-bg);border:2px solid rgba(124,106,247,0.4);overflow:hidden;margin:0 auto 12px;display:flex;align-items:center;justify-content:center">'+av+'</div>'
    +'<div style="font-size:20px;font-weight:900;margin-bottom:4px">'+escHtml(u.username||'Utente')+'</div>'
    +'<div style="font-size:12px;color:var(--accent2);font-weight:700;margin-bottom:14px">'+rankTitle(u.level||1)+' · Lv.'+(u.level||1)+'</div>'
    +(preferredGenres.length?'<div style="margin-bottom:12px"><div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-bottom:6px">Generi preferiti</div><div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center">'+preferredGenres.map(g=>'<span class="tag tag-cat">'+escHtml(g)+'</span>').join('')+'</div></div>':'')
    +(commonBooks.length?'<div style="margin-bottom:16px;text-align:left"><div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-bottom:6px">📚 Libri in comune</div>'+commonBooks.map(b=>'<div class="friend-card" style="padding:8px 10px"><div class="book-title" style="font-size:12px">'+escHtml(b.emoji||'📖')+' '+escHtml(b.title)+'</div><div style="font-size:10px;color:var(--text3)">'+escHtml(b.author||'')+'</div></div>').join('')+'</div>':'<div style="font-size:12px;color:var(--text3);margin-bottom:12px">Nessun libro in comune trovato.</div>')
    +(userBooks.length?'<div style="text-align:left"><div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-bottom:6px">📖 Tutti i libri ('+userBooks.length+')</div>'+userBooks.map(b=>'<div class="friend-card" style="padding:8px 10px"><div style="font-size:12px;font-weight:700">'+escHtml(b.emoji||'📖')+' '+escHtml(b.title)+'</div><div style="font-size:10px;color:var(--text3)">'+escHtml(b.genre||'—')+'</div></div>').join('')+'</div>':'')
    +(!userId.includes(CUR.id)
      ?(isFollowing
        ?'<button class="btn btn-primary" style="opacity:0.7;margin-top:16px" onclick="unfollowUser(\''+userId+'\');closeModal(\'modal-profile\')">✓ Seguito · Smetti</button>'
        :'<button class="btn btn-primary" style="margin-top:16px" onclick="followUser(\''+userId+'\',\''+escHtml(u.username||'')+'\');closeModal(\'modal-profile\')">➕ Segui</button>')
      :'<button class="btn btn-primary" style="margin-top:16px" onclick="closeModal(\'modal-profile\')">Chiudi</button>')
    +'</div>';
  openModal('modal-profile');
}

function addBook(){
  const title=document.getElementById('bk-title').value.trim();if(!title){showToast('⚠️ Inserisci il titolo');return;}
  validateAndPost(title, () => {
    const diff=parseInt(document.getElementById('bk-diff').value)||3;
    const b={id:uid(),user_id:CUR.id,title,author:document.getElementById('bk-author').value.trim(),genre:document.getElementById('bk-genre').value,difficulty:diff,total_pages:parseInt(document.getElementById('bk-pages').value)||0,current_page:0,emoji:document.getElementById('bk-emoji').value||'',completed:false,created_at:ts()};
    DB.books.push(b);saveDB();closeModal('modal-add-book');document.getElementById('book-suggestions').style.display='none';
    ['bk-title','bk-author','bk-pages','bk-emoji'].forEach(id=>{document.getElementById(id).value='';});
    renderStudy();showToast('📖 Libro aggiunto!');playSound('tap');
    apiCall('SAVE_BOOK', {...b, user_id: CUR.id}); 
  });
}

function openReadingModal(bookId){
  const b=DB.books.find(b=>b.id===bookId);if(!b)return;
  document.getElementById('rd-book-id').value=bookId;
  document.getElementById('reading-modal-title').textContent='📖 '+b.title;
  document.getElementById('rd-pages').value='';
  document.getElementById('rd-current').value=b.current_page||'';
  document.getElementById('rd-notes').value='';
  openModal('modal-log-reading');
}
async function logReading(){
  const bookId=document.getElementById('rd-book-id').value;
  const b=DB.books.find(b=>b.id===bookId);if(!b)return;
  const pages=parseInt(document.getElementById('rd-pages').value)||0;
  if(pages<1){showToast('⚠️ Inserisci le pagine lette');return;}
  const current=parseInt(document.getElementById('rd-current').value)||b.current_page;
  b.current_page=Math.max(b.current_page||0,current);
  const xp=pages*XP_BOOK_PER_PAGE;
  const stat=BOOK_GENRE_STAT[b.genre]||'cultura';
  const notes = document.getElementById('rd-notes').value;
  DB.book_sessions.push({id:uid(),user_id:CUR.id,book_id:bookId,date:ts(),pages,current_page:b.current_page,notes,xp});
  saveDB();closeModal('modal-log-reading');
  awardXP(xp,stat,'— Lettura: '+b.title);
  addFeedPost('📖 '+pages+' pagine di "'+b.title+'"','cultura',xp,notes,'');
  if(b.total_pages&&b.current_page>=b.total_pages&&!b.completed)markBookDone(bookId,true);else renderStudy();
  apiCall('LOG_BOOK_SESSION', {
    book_id: bookId, user_id: CUR.id,
    pages_read: pages, date: today(), xp_gained: xp, notes
  });
}
async function markBookDone(bookId,silent){
  const b=DB.books.find(b=>b.id===bookId);if(!b||b.completed)return;
  b.completed=true;b.completed_at=ts();if(!silent)b.current_page=b.total_pages||b.current_page;saveDB();
  const bonus=BOOK_DIFF_BONUS[b.difficulty]||0,stat=BOOK_GENRE_STAT[b.genre]||'cultura';
  awardXP(bonus,stat,'— 🏆 Libro: '+b.title);
  addFeedPost('🏆 Finito "'+b.title+'"!','cultura',bonus,'','');
  checkTrophies();renderStudy();
  apiCall('SAVE_BOOK', {...b, user_id: CUR.id}); 
}

const TROPHY_DEFS=[
  {id:'first_quest',name:'Prima quest',emoji:'⚔️',cat:'Quest',check:()=>DB.quests.filter(q=>q.user_id===CUR.id&&q.completed).length>=1},
  {id:'quest_5',name:'5 quest',emoji:'🛡️',cat:'Quest',check:()=>DB.quests.filter(q=>q.user_id===CUR.id&&q.completed).length>=5},
  {id:'quest_10',name:'10 quest',emoji:'⚔️',cat:'Quest',check:()=>DB.quests.filter(q=>q.user_id===CUR.id&&q.completed).length>=10},
  {id:'quest_25',name:'25 quest',emoji:'👑',cat:'Quest',check:()=>DB.quests.filter(q=>q.user_id===CUR.id&&q.completed).length>=25},
  {id:'streak_3',name:'Streak 3gg',emoji:'🔥',cat:'Streak',check:()=>(getUser(CUR.id)?.streak_days||0)>=3},
  {id:'streak_7',name:'Streak 7gg',emoji:'🔥',cat:'Streak',check:()=>(getUser(CUR.id)?.streak_days||0)>=7},
  {id:'streak_14',name:'Streak 14gg',emoji:'⚡',cat:'Streak',check:()=>(getUser(CUR.id)?.streak_days||0)>=14},
  {id:'streak_30',name:'Streak 30gg',emoji:'⚡',cat:'Streak',check:()=>(getUser(CUR.id)?.streak_days||0)>=30},
  {id:'level_5',name:'Livello 5',emoji:'⭐',cat:'Livello',check:()=>(getUser(CUR.id)?.level||0)>=5},
  {id:'level_10',name:'Livello 10',emoji:'🌟',cat:'Livello',check:()=>(getUser(CUR.id)?.level||0)>=10},
  {id:'xp_1000',name:'1.000 XP',emoji:'💰',cat:'XP',check:()=>(getUser(CUR.id)?.xp_total||0)>=1000},
  {id:'xp_5000',name:'5.000 XP',emoji:'💎',cat:'XP',check:()=>(getUser(CUR.id)?.xp_total||0)>=5000},
  {id:'first_book',name:'Primo libro',emoji:'📖',cat:'Lettura',check:()=>DB.books.filter(b=>b.user_id===CUR.id&&b.completed).length>=1},
  {id:'books_3',name:'3 libri',emoji:'📚',cat:'Lettura',check:()=>DB.books.filter(b=>b.user_id===CUR.id&&b.completed).length>=3},
  {id:'routine_7',name:'7 routine',emoji:'🌱',cat:'Routine',check:()=>DB.routines.filter(r=>r.user_id===CUR.id).length>=7},
  {id:'routine_30',name:'30 routine',emoji:'🌿',cat:'Routine',check:()=>DB.routines.filter(r=>r.user_id===CUR.id).length>=30},
  {id:'pvp_first',name:'Prima sfida',emoji:'⚔️',cat:'Sfide',check:()=>DB.challenges.filter(c=>c.creator_id===CUR.id||c.joiner_id===CUR.id).length>=1},
  {id:'pvp_win',name:'Prima vittoria',emoji:'🏆',cat:'Sfide',check:()=>DB.challenges.filter(c=>c.winner_id===CUR.id).length>=1},
  {id:'first_friend',name:'Primo amico',emoji:'👋',cat:'Social',check:()=>(getUser(CUR.id)?.friends||[]).length>=1},
  {id:'friends_5',name:'5 amici',emoji:'👥',cat:'Social',check:()=>(getUser(CUR.id)?.friends||[]).length>=5},
];
function checkTrophies(){
  const u=getUser(CUR.id);if(!u)return;if(!u.trophies)u.trophies=[];
  let newOnes=false;
  TROPHY_DEFS.forEach(def=>{
    if(!u.trophies.find(t=>t.id===def.id)&&def.check()){
      u.trophies.push({id:def.id,earned_at:ts()});newOnes=true;
      setTimeout(()=>{showToast('🏆 Trofeo: '+def.name+' '+def.emoji);playSound('trophy');},500);
    }
  });
  if(newOnes){saveDB();syncCUR(u);apiCall('SYNC_USER_DATA',buildUserPayload(u));}
}

let studyTab='exams';
function switchStudyTab(t){playSound('tap');studyTab=t;document.querySelectorAll('#screen-study .tab').forEach((b,i)=>b.classList.toggle('active',['exams','books','sessions','calendar'][i]===t));renderStudy();}
function renderStudy(){
  const c=document.getElementById('study-container');
  if(studyTab==='exams')renderExams(c);
  else if(studyTab==='books')renderBooks(c);
  else if(studyTab==='sessions')renderSessions(c);
  else renderCalendar(c);
}
function masteryPct(examId){
  const chs=DB.chapters.filter(c=>c.exam_id===examId);if(!chs.length)return 0;
  const allCo=chs.flatMap(c=>DB.concepts.filter(co=>co.chapter_id===c.id));
  const doneCo=allCo.filter(c=>c.completed).length;
  return Math.round(((chs.filter(c=>c.completed).length/chs.length)*0.4+(allCo.length?doneCo/allCo.length:0)*0.6)*100);
}
function renderExams(c){
  const exams=DB.exams.filter(e=>e.user_id===CUR.id);
  if(!exams.length){c.innerHTML='<div class="empty"><div class="empty-emoji">📚</div><div class="empty-text">Aggiungi il tuo primo esame!</div></div>';return;}
  c.innerHTML=exams.map(exam=>{
    const chs=DB.chapters.filter(ch=>ch.exam_id===exam.id),mp=masteryPct(exam.id);
    const dl=exam.exam_date?Math.ceil((new Date(exam.exam_date)-new Date())/86400000):null;
    const dlStr=dl!==null?(dl>0?dl+'gg':dl===0?'Oggi!':'Passato'):'';
    const mpColor=mp>75?'var(--green)':mp>40?'var(--accent2)':'var(--red)';
    return '<div class="exam-card">'
      +'<div class="exam-head" onclick="toggleExamBody(\''+exam.id+'\')">'
      +'<div class="exam-icon">'+(exam.emoji||'📚')+'</div>'
      +'<div class="exam-info"><div class="exam-name">'+escHtml(exam.title)+'</div><div class="exam-date">'+(exam.exam_date?'📅 '+exam.exam_date+' ('+dlStr+')':'')+' • Mastery <b style="color:'+mpColor+'">'+mp+'%</b></div></div>'
      +'<div style="display:flex;flex-direction:column;gap:4px">'
      +'<button class="btn-sm btn-sm-primary" style="font-size:10px;padding:4px 8px" onclick="event.stopPropagation();openLogSession(\''+exam.id+'\')">+Sessione</button>'
      +'<button class="btn-sm btn-sm-ghost" style="font-size:10px;padding:4px 8px" onclick="event.stopPropagation();openAddChapter(\''+exam.id+'\')">+Cap.</button>'
      +'</div></div>'
      +'<div class="mastery-bar"><div class="mastery-fill" style="width:'+mp+'%"></div></div>'
      +'<div class="exam-body" id="exam-body-'+exam.id+'">'+(chs.length?chs.map(renderChRow).join(''):'<div style="font-size:12px;color:var(--text3);padding:4px 0">Nessun capitolo.</div>')+'</div>'
      +'</div>';
  }).join('');
}
function renderChRow(ch){
  const cos=DB.concepts.filter(c=>c.chapter_id===ch.id),done=cos.filter(c=>c.completed).length;
  return '<div class="chapter-row">'
    +'<div class="ch-check'+(ch.completed?' done':'')+'" onclick="toggleChapter(\''+ch.id+'\')"></div>'
    +'<div class="ch-info"><div class="ch-name" style="'+(ch.completed?'text-decoration:line-through;color:var(--text3)':'')+'">'+escHtml(ch.title)+'</div><div class="ch-concepts">'+diffStars(ch.difficulty||2)+' • '+done+'/'+cos.length+' concetti</div></div>'
    +'<div class="ch-btns"><span class="ch-expand" onclick="toggleConcepts(\''+ch.id+'\')">concetti ▾</span><span class="ch-expand" onclick="openAddConcept(\''+ch.id+'\')">+</span></div>'
    +'</div>'
    +'<div id="concepts-'+ch.id+'" style="display:none">'
    +cos.map(co=>'<div class="concept-row"><div class="concept-check'+(co.completed?' done':'')+'" onclick="toggleConcept(\''+co.id+'\')"></div><span class="concept-name'+(co.completed?' done':'')+'">'+escHtml(co.title)+'</span></div>').join('')
    +(!cos.length?'<div style="font-size:11px;color:var(--text3);padding:4px 8px">Nessun concetto. Clicca + per aggiungere.</div>':'')
    +'</div>';
}
function toggleExamBody(id){document.getElementById('exam-body-'+id)?.classList.toggle('open');}
function toggleConcepts(id){const el=document.getElementById('concepts-'+id);if(el)el.style.display=el.style.display==='none'?'block':'none';}
async function addExam(){
  const title=document.getElementById('ex-name').value.trim();if(!title){showToast('⚠️ Nome materia');return;}
  validateAndPost(title, () => {
    const e={id:uid(),user_id:CUR.id,title,exam_date:document.getElementById('ex-date').value,target_hours:parseInt(document.getElementById('ex-hours').value)||40,emoji:document.getElementById('ex-emoji').value||'',created_at:ts()};
    DB.exams.push(e);saveDB();closeModal('modal-add-exam');document.getElementById('ex-name').value='';renderStudy();showToast('🎓 Esame aggiunto!');playSound('tap');
  });
}
function openAddChapter(examId){document.getElementById('ch-exam-id').value=examId;document.getElementById('ch-name').value='';openModal('modal-add-chapter');}
async function addChapter(){
  const name=document.getElementById('ch-name').value.trim();if(!name){showToast('⚠️ Nome capitolo');return;}
  validateAndPost(name, () => {
    DB.chapters.push({id:uid(),exam_id:document.getElementById('ch-exam-id').value,title:name,difficulty:parseInt(document.getElementById('ch-diff').value)||3,completed:false,created_at:ts()});
    saveDB();closeModal('modal-add-chapter');renderStudy();showToast('📖 Capitolo aggiunto!');playSound('tap');
  });
}
async function toggleChapter(id){
  const ch=DB.chapters.find(c=>c.id===id);if(!ch||ch.completed)return;
  ch.completed=true;ch.completed_at=ts();saveDB();
  awardXP(Math.round(80*DIFF_MULT[ch.difficulty||2]),'mente','— Capitolo: '+ch.title);
  checkTrophies();renderStudy();
}
function openAddConcept(chId){document.getElementById('co-chapter-id').value=chId;document.getElementById('co-name').value='';document.getElementById('co-notes').value='';openModal('modal-add-concept');}
async function addConcept(){
  const name=document.getElementById('co-name').value.trim();if(!name){showToast('⚠️ Nome concetto');return;}
  validateAndPost(name, () => {
    DB.concepts.push({id:uid(),chapter_id:document.getElementById('co-chapter-id').value,title:name,notes:document.getElementById('co-notes').value,completed:false,created_at:ts()});
    saveDB();closeModal('modal-add-concept');renderStudy();showToast('💡 Concetto aggiunto!');playSound('tap');
  });
}
async function toggleConcept(id){
  const co=DB.concepts.find(c=>c.id===id);if(!co||co.completed)return;
  co.completed=true;co.completed_at=ts();saveDB();
  awardXP(25,'mente','— Concetto: '+co.title);renderStudy();
}
function openLogSession(examId){document.getElementById('ss-exam-id').value=examId;document.getElementById('ss-mins').value='';document.getElementById('ss-notes').value='';openModal('modal-log-session');}
async function logSession(){
  const mins=parseInt(document.getElementById('ss-mins').value);if(!mins||mins<1){showToast('⚠️ Inserisci i minuti');return;}
  const examId=document.getElementById('ss-exam-id').value,focus=parseInt(document.getElementById('ss-focus').value)||3;
  const exam=DB.exams.find(e=>e.id===examId);
  const xp=Math.round((mins/30)*40*(0.7+focus*0.1));
  const notes = document.getElementById('ss-notes').value;
  const session = {id:uid(),user_id:CUR.id,exam_id:examId,exam_name:exam?.title||'Studio',date:ts(),duration_min:mins,focus_score:focus,notes,xp};
  DB.sessions.push(session);
  saveDB();closeModal('modal-log-session');
  awardXP(xp,'mente','— Studio '+mins+'min');
  addFeedPost('Studio '+mins+'min ('+(exam?.title||'generale')+')','mente',xp,notes,'');
  checkTrophies();renderStudy();
  apiCall('LOG_STUDY_SESSION', {
    session_id: session.id, exam_id: examId, user_id: CUR.id,
    minutes: mins, notes, xp_gained: xp, created_at: new Date().toISOString()
  });
}
function renderSessions(c){
  const ss=DB.sessions.filter(s=>s.user_id===CUR.id).sort((a,b)=>b.date-a.date);
  if(!ss.length){c.innerHTML='<div class="empty"><div class="empty-emoji">⏱️</div><div class="empty-text">Nessuna sessione registrata.</div></div>';return;}
  c.innerHTML=ss.map(s=>'<div class="session-row"><div class="session-dot" style="background:var(--accent)"></div><div class="session-info"><div class="session-name">'+escHtml(s.exam_name)+' ('+s.duration_min+' min)</div><div class="session-time">'+new Date(s.date).toLocaleString('it')+' • Focus '+s.focus_score+'/5</div>'+(s.notes?'<div style="font-size:11px;color:var(--text3);margin-top:2px">'+escHtml(s.notes)+'</div>':'')+'</div><div class="session-xp">+'+s.xp+' XP</div></div>').join('');
}
function renderCalendar(c){
  const now=new Date(),y=now.getFullYear(),m=now.getMonth(),dim=new Date(y,m+1,0).getDate(),fd=(new Date(y,m,1).getDay()+6)%7;
  const ss=DB.sessions.filter(s=>s.user_id===CUR.id);
  const sd={};ss.forEach(s=>{const ds=new Date(s.date).toISOString().split('T')[0];sd[ds]=(sd[ds]||0)+s.duration_min;});
  let h='<div style="text-align:center;font-size:15px;font-weight:700;margin-bottom:10px">📅 '+new Date(y,m).toLocaleString('it',{month:'long',year:'numeric'})+'</div><div class="cal-grid">';
  ['Lu','Ma','Me','Gi','Ve','Sa','Do'].forEach(d=>h+='<div class="cal-day-label">'+d+'</div>');
  for(let i=0;i<fd;i++)h+='<div></div>';
  for(let d=1;d<=dim;d++){const ds=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');const mins=sd[ds]||0;h+='<div class="cal-day'+(selectedCalDate===ds?' today':'')+(mins?' has-session':'')+'" onclick="selectCalDate(\''+ds+'\')">'+d+(mins?'<span style="font-size:9px;display:block;color:var(--accent)">'+mins+'m</span>':'')+'</div>';}
  h+='</div>';
  const dayS=ss.filter(s=>new Date(s.date).toISOString().split('T')[0]===selectedCalDate);
  h+='<div style="margin-top:16px"><div class="section-hd"><span class="section-title">Sessioni del '+selectedCalDate+' ('+dayS.length+')</span></div>'+(dayS.length?dayS.map(s=>'<div class="session-row"><div class="session-dot" style="background:var(--accent)"></div><div class="session-info"><div class="session-name">'+escHtml(s.exam_name)+' ('+s.duration_min+' min)</div><div class="session-time">Focus '+s.focus_score+'/5</div></div><div class="session-xp">+'+s.xp+' XP</div></div>').join(''):'<div style="color:var(--text3);font-size:12px;padding:8px 0">Nessuna sessione.</div>')+'</div>';
  c.innerHTML=h;
}
function selectCalDate(d){selectedCalDate=d;renderCalendar(document.getElementById('study-container'));}

let pvpTab='active';
function switchPvpTab(t){playSound('tap');pvpTab=t;document.querySelectorAll('#screen-pvp .tab').forEach((b,i)=>b.classList.toggle('active',['active','pending','history'][i]===t));renderPvP();}

async function renderPvP_load() {
  const res = await apiCall('GET_CHALLENGES', { user_id: CUR.id });
  if (res.success && res.challenges) {
    res.challenges.forEach(ch => {
      if (!DB.challenges) DB.challenges = [];
      const existing = DB.challenges.find(c => c.id === ch.id);
      if (existing) Object.assign(existing, ch); else DB.challenges.push(ch);
    });
    saveDB();
  }
  renderPvP();
}

function renderPvP(){
  const c=document.getElementById('pvp-container');
  const myId=CUR.id;
  const list=(DB.challenges||[]).filter(ch=>{
    const isParticipant = ch.creator_id===myId || ch.joiner_id===myId;
    if(pvpTab==='active') return isParticipant && ch.status==='active';
    if(pvpTab==='pending') return isParticipant && ch.status==='pending';
    if(pvpTab==='history') return isParticipant && (ch.status==='done' || ch.status==='completed');
    return false;
  });

  let h = list.length ? list.map(ch=>{
    const isCreator = ch.creator_id===myId;
    const oppName = isCreator ? (ch.joiner_username||'In attesa...') : ch.creator_username;
    return '<div class="challenge-card">'
      +'<div class="challenge-head"><div class="challenge-title">'+escHtml(ch.title)+'</div><span class="tag tag-orange">⚡'+ch.stake_xp+' XP</span></div>'
      +'<div class="challenge-meta">Avversario: <b>'+escHtml(oppName)+'</b> · Codice: <b>'+ch.code+'</b></div>'
      +(ch.deadline?'<div style="font-size:11px;color:var(--text3);margin-top:2px">Scadenza: '+ch.deadline+'</div>':'')
      +'<div class="challenge-footer">'
      +(ch.status==='active'?'<button class="btn-sm btn-sm-primary" onclick="openDeclareWinner(\''+ch.id+'\')">Dichiara vincitore</button>':'<span style="font-size:11px;color:var(--text3)">Stato: '+ch.status+'</span>')
      +'</div></div>';
  }).join('') : '<div class="empty"><div class="empty-emoji">⚔️</div><div class="empty-text">Nessuna sfida in questa categoria.</div></div>';

  const publicChallenges = (DB.challenges||[]).filter(c => c.public && c.status==='pending' && c.creator_id !== CUR.id && !c.joiner_id);
  if (publicChallenges.length && pvpTab === 'active') {
    h += '<div style="padding:16px 0 0"><div class="section-title" style="margin-bottom:8px">🌐 SFIDE PUBBLICHE APERTE</div>';
    publicChallenges.forEach(ch => {
      h += '<div class="challenge-card" style="border-color:var(--gold)">'
        + '<div class="challenge-head"><div class="challenge-title">' + escHtml(ch.title) + '</div></div>'
        + '<div class="challenge-meta">Creata da: ' + escHtml(ch.creator_username||'?') + ' · Codice: <b>' + ch.code + '</b></div>'
        + '<div class="challenge-footer"><span class="challenge-stake">+' + ch.stake_xp + ' XP</span>'
        + '<button class="btn-sm btn-sm-primary" onclick="document.getElementById(\'join-code-input\').value=\'' + ch.code + '\';joinChallenge()">Accetta sfida</button>'
        + '</div></div>';
    });
    h += '</div>';
  }

  c.innerHTML = h;
}

async function createChallenge() {
  const title = document.getElementById('pvp-title').value.trim();
  if (!title) { showToast('⚠️ Inserisci il titolo'); return; }
  validateAndPost(title, async () => {
    const stake = Math.min(20, Math.max(5, parseInt(document.getElementById('pvp-stake').value)||10));
    const isPublic = document.getElementById('pvp-public')?.classList.contains('on') ?? false;
    const deadline = document.getElementById('pvp-deadline').value;

    showLoading('Creazione sfida...');
    const res = await apiCall('CREATE_CHALLENGE', {
      creator_id: CUR.id, creator_username: CUR.username,
      type: document.getElementById('pvp-type').value,
      title, description: document.getElementById('pvp-desc').value,
      rules: [...(pendingRules||[])], stake_xp: stake,
      deadline, public: isPublic
    });
    hideLoading();

    if (res.success) {
      const ch = { id: res.challenge_id, code: res.code, creator_id: CUR.id,
        creator_username: CUR.username, joiner_id: null, type: document.getElementById('pvp-type').value,
        title, stake_xp: stake, deadline, status: 'pending', created_at: ts(), public: isPublic };
      if (!DB.challenges) DB.challenges = [];
      DB.challenges.push(ch); saveDB();
      pendingRules = []; renderPendingRules(); closeModal('modal-create-challenge');
      showToast('✨ Sfida creata! Codice: ' + res.code); playSound('challenge'); renderPvP();
      if (isPublic) addFeedPost('⚔️ Sfida: ' + title, 'sfide', stake, 'Codice: ' + res.code, '');
    } else {
      showToast('❌ ' + (res.message||'Errore'));
    }
  });
}

async function joinChallenge() {
  const code = document.getElementById('join-code-input').value.trim();
  if (!code || !/^\d+$/.test(code)) { showToast('⚠️ Inserisci un codice numerico'); return; }
  showLoading('Ricerca sfida...');
  const res = await apiCall('JOIN_CHALLENGE', { code, user_id: CUR.id, username: CUR.username });
  hideLoading();
  if (res.success) {
    let ch = DB.challenges?.find(c => c.code === code);
    if (!ch) { ch = res.challenge; DB.challenges = DB.challenges||[]; DB.challenges.push(ch); }
    else { ch.joiner_id = CUR.id; ch.joiner_username = CUR.username; ch.status = 'active'; }
    saveDB();
    document.getElementById('join-code-input').value = '';
    showToast('⚔️ Sfida accettata!'); playSound('xp'); renderPvP();
  } else {
    showToast('❌ ' + (res.message||'Sfida non trovata')); playSound('error');
  }
}

function openDeclareWinner(challengeId){
  document.getElementById('win-challenge-id').value = challengeId;
  openModal('modal-declare-winner');
}

async function declareWinner(resultType){
  const challengeId = document.getElementById('win-challenge-id').value;
  const ch = DB.challenges.find(c => c.id === challengeId);
  if(!ch) { closeModal('modal-declare-winner'); return; }
  
  let winnerId = '';
  if(resultType === 'me') winnerId = CUR.id;
  else if(resultType === 'opp') winnerId = (ch.creator_id === CUR.id ? ch.joiner_id : ch.creator_id);
  else winnerId = 'draw';

  showLoading('Invio verdetto...');
  const res = await apiCall('DECLARE_WINNER', { challenge_id: challengeId, user_id: CUR.id, winner_id: winnerId });
  hideLoading();

  closeModal('modal-declare-winner');
  if(res.success){
    ch.status = 'done';
    ch.winner_id = winnerId;
    saveDB();
    if(winnerId === CUR.id){
      awardXP(ch.stake_xp, 'sfide', '— Vittoria Sfida!');
      playSound('trophy');
    } else {
      playSound('tap');
    }
    showToast('🏆 Verdetto registrato!');
    renderPvP();
  } else {
    showToast('❌ ' + (res.message || 'Errore'));
  }
}

let pendingRules = [];
function addRule(type){
  document.getElementById('rule-type').value = type;
  document.getElementById('rule-modal-title').textContent = 'Aggiungi Regola: ' + type;
  document.getElementById('rule-fields').innerHTML = '<div class="field"><label>DESCRIZIONE REGOLA</label><input type="text" id="rule-desc-input" placeholder="es. Minimo 50 pagine"></div>';
  openModal('modal-add-rule');
}
function saveRule(){
  const desc = document.getElementById('rule-desc-input').value.trim();
  const type = document.getElementById('rule-type').value;
  if(!desc) return;
  validateAndPost(desc, () => {
    pendingRules.push({type, desc});
    closeModal('modal-add-rule');
    renderPendingRules();
  });
}
function renderPendingRules(){
  const el = document.getElementById('pvp-rules-list');
  if(!el) return;
  el.innerHTML = pendingRules.map((r, i) => '<div style="font-size:11px;background:var(--bg3);padding:4px 8px;border-radius:4px;margin-bottom:4px;display:flex;justify-content:space-between"><span><b>['+r.type+']</b> '+escHtml(r.desc)+'</span><span style="color:var(--red);cursor:pointer" onclick="pendingRules.splice('+i+',1);renderPendingRules()">✕</span></div>').join('');
}

function renderFriendsScreen(){
  const c=document.getElementById('friends-container');
  const u=getUser(CUR.id)||CUR;
  const following=u.following||[];
  const followers=u.followers||{};
  const followingCount=following.length;
  const followersCount=Object.keys(followers).length;

  let h='<div style="padding:0 20px">';
  h+='<div style="display:flex;gap:0;margin-bottom:18px;background:var(--card);border-radius:var(--r);border:1px solid var(--border);overflow:hidden">'
    +'<div style="flex:1;padding:16px;text-align:center;border-right:1px solid var(--border)">'
    +'<div style="font-size:22px;font-weight:900;color:var(--text)">'+followingCount+'</div>'
    +'<div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-top:3px">Seguiti</div>'
    +'</div>'
    +'<div style="flex:1;padding:16px;text-align:center">'
    +'<div style="font-size:22px;font-weight:900;color:var(--text)">'+followersCount+'</div>'
    +'<div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-top:3px">Seguaci</div>'
    +'</div>'
    +'</div>';

  h+='<div class="section-hd"><span class="section-title">Seguiti ('+followingCount+')</span></div>';
  if(following.length){
    following.forEach(fid=>{
      const fu=getUser(fid);
      const name=fu?escHtml(fu.username):'@'+fid;
      if(!fu){
        apiCall('GET_USER_DATA',{user_id:fid}).then(r=>{
          if(r.success&&r.user){
            if(!getUser(fid)) DB.users.push({...r.user,avatar:r.user.avatar_url||''});
            saveDB(); renderFriendsScreen();
          }
        });
      }
      const av=fu?.avatar?'<img src="'+fu.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':name[0];
      h+='<div class="friend-card" style="display:flex;align-items:center;gap:10px">'
        +'<div class="feed-avatar" onclick="viewUserProfile(\''+fid+'\')">'+av+'</div>'
        +'<div class="friend-name" style="flex:1;cursor:pointer" onclick="viewUserProfile(\''+fid+'\')">'+name+'<div style="font-size:10px;color:var(--text3)">Lv.'+(fu?.level||1)+'</div></div>'
        +'<button class="btn-sm btn-sm-ghost" onclick="unfollowUser(\''+fid+'\')">Smetti</button>'
        +'</div>';
    });
  }else{
    h+='<div class="empty"><div class="empty-emoji">🔍</div><div class="empty-text">Non segui ancora nessuno.</div></div>';
  }

  h+='<div class="section-hd" style="margin-top:20px"><span class="section-title">Cerca utenti</span></div>'
    +'<div style="display:flex;gap:8px;margin-bottom:12px"><input class="sm" id="search-user-input" placeholder="Cerca username..." style="flex:1;margin:0"><button class="btn-sm btn-sm-primary" onclick="searchUsersAction()">Cerca</button></div>'
    +'<div id="search-results"></div></div>';
  c.innerHTML=h;
}

async function searchUsersAction(){
  const q=document.getElementById('search-user-input').value.trim();
  if(!q)return;
  showLoading('Ricerca...');
  const res=await apiCall('SEARCH_USERS',{query:q});
  hideLoading();
  const el=document.getElementById('search-results');
  if(res.success&&res.users){
    const u=getUser(CUR.id)||CUR;
    const myFollowing=new Set(u.following||[]);
    res.users.forEach(usr=>{if(!getUser(usr.id))DB.users.push({...usr,avatar:usr.avatar_url||''});});
    saveDB();
    el.innerHTML=res.users.filter(usr=>usr.id!==CUR.id).map(usr=>{
      const isFollowing=myFollowing.has(usr.id);
      return '<div class="friend-card" style="display:flex;align-items:center;gap:10px">'
        +'<div class="feed-avatar" onclick="viewUserProfile(\''+usr.id+'\')">'+escHtml(usr.username[0])+'</div>'
        +'<div style="flex:1;cursor:pointer" onclick="viewUserProfile(\''+usr.id+'\')">'
        +'<div class="friend-name">'+escHtml(usr.username)+'</div>'
        +'<div style="font-size:10px;color:var(--text3)">Lv.'+usr.level+' • '+usr.followers_count+' seguaci</div>'
        +'</div>'
        +(isFollowing
          ?'<button class="btn-sm btn-sm-ghost" onclick="unfollowUser(\''+usr.id+'\')">Seguito ✓</button>'
          :'<button class="btn-sm btn-sm-primary" onclick="followUser(\''+usr.id+'\',\''+escHtml(usr.username)+'\')">Segui</button>')
        +'</div>';
    }).join('')||'<div style="font-size:12px;color:var(--text3)">Nessun utente trovato.</div>';
  }
}

async function followUser(targetId, targetUsername){
  const u=getUser(CUR.id);
  if(!u.following)u.following=[];
  if(u.following.includes(targetId)){showToast('Stai già seguendo questo utente');return;}
  u.following.push(targetId);
  saveDB();syncCUR(u);
  showToast('✅ Ora segui '+targetUsername+'!');playSound('tap');
  renderFriendsScreen();
  await apiCall('FOLLOW_USER',{follower_id:CUR.id,target_id:targetId,follower_username:u.username});
  apiCall('SYNC_USER_DATA',buildUserPayload(u));
}

async function unfollowUser(targetId){
  const u=getUser(CUR.id);
  if(!u.following)u.following=[];
  u.following=u.following.filter(id=>id!==targetId);
  saveDB();syncCUR(u);
  showToast('Hai smesso di seguire questo utente');playSound('tap');
  renderFriendsScreen();
  await apiCall('UNFOLLOW_USER',{follower_id:CUR.id,target_id:targetId});
  apiCall('SYNC_USER_DATA',buildUserPayload(u));
}

function addFriend(fid){
  const u=getUser(CUR.id);
  if(!u.friends) u.friends=[];
  if(!u.friends.includes(fid)){
    u.friends.push(fid);
    saveDB(); syncCUR(u);
    showToast('👋 Amico aggiunto!');
    renderFriendsScreen();
    apiCall('SYNC_USER_DATA',buildUserPayload(u));
  }
}

let statsTab = 'stats';
let calFilter = 'all';
let calSelectedDate = today();

function switchStatsTab(t) {
  statsTab = t;
  document.querySelectorAll('#screen-stats .tab').forEach((b,i) =>
    b.classList.toggle('active', ['stats','leaderboard','calendar'][i] === t));
  renderStats();
}

function renderStats() {
  if (statsTab==='stats') renderMyStats();
  else if (statsTab==='leaderboard') renderLeaderboard();
  else renderPersonalCalendar();
}

function renderMyStats(){
  const c=document.getElementById('stats-container');
  const u=getUser(CUR.id)||CUR;
  const s=u.stats||{};
  const lvl=u.level||1;
  const xpCur=u.xp_total||0;
  const xpThis=xpForLevel(lvl);
  const xpNxt=xpForLevel(lvl+1);
  const pct=xpBarPct(xpCur,lvl);
  const av=u.avatar?'<img src="'+u.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':'<span style="font-size:32px;font-weight:900;color:var(--accent2)">'+escHtml((u.username||'?')[0].toUpperCase())+'</span>';
  const followingCount=(u.following||[]).length;
  const followersCount=Object.keys(u.followers||{}).length;

  let h='<div style="padding:0 20px 20px">';

  h+='<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:20px;margin-bottom:14px;text-align:center">'
    +'<div style="width:80px;height:80px;border-radius:50%;background:var(--accent-bg);border:3px solid rgba(124,106,247,0.4);overflow:hidden;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;position:relative;cursor:pointer" onclick="changeAvatar()">'
    +av
    +'<div style="position:absolute;bottom:0;right:0;width:22px;height:22px;background:var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;border:2px solid var(--card)">📷</div>'
    +'</div>'
    +'<div style="font-size:18px;font-weight:900;margin-bottom:3px">'+escHtml(u.username||'')+'</div>'
    +'<div style="font-size:12px;color:var(--accent2);font-weight:700;margin-bottom:14px">'+rankTitle(lvl)+' · Lv.'+lvl+'</div>'
    +'<div style="height:7px;background:var(--bg);border-radius:4px;overflow:hidden;margin-bottom:5px">'
    +'<div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,var(--accent),var(--cyan));border-radius:4px;transition:width 0.8s ease"></div>'
    +'</div>'
    +'<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-bottom:16px">'
    +'<span>'+xpCur.toLocaleString()+' XP</span><span>→ Lv.'+(lvl+1)+' ('+xpNxt.toLocaleString()+')</span>'
    +'</div>'
    +'<div style="display:flex;gap:0;background:var(--bg2);border-radius:10px;border:1px solid var(--border);overflow:hidden">'
    +'<div style="flex:1;padding:10px;text-align:center;border-right:1px solid var(--border)"><div style="font-size:17px;font-weight:900">'+followingCount+'</div><div style="font-size:9px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-top:2px">Seguiti</div></div>'
    +'<div style="flex:1;padding:10px;text-align:center"><div style="font-size:17px;font-weight:900">'+followersCount+'</div><div style="font-size:9px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-top:2px">Seguaci</div></div>'
    +'</div>'
    +'</div>';

  h+='<div class="section-hd"><span class="section-title">Statistiche</span></div>'
    +'<div class="stats-grid">';
  Object.entries(s).forEach(([k,v])=>{
    if(!v&&v!==0)return;
    h+='<div class="stat-card"><div class="stat-val" style="color:'+(STAT_COLORS[k]||'var(--accent)')+'">'+v+'</div><div class="stat-lbl">'+k.toUpperCase()+'</div></div>';
  });
  h+='</div>';

  h+='<div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">';
  const isPublic=u.public_profile!==false;
  h+='<div style="display:flex;align-items:center;justify-content:space-between;background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:12px 16px">'
    +'<div><div style="font-size:13px;font-weight:700">Profilo pubblico</div><div style="font-size:11px;color:var(--text3)">Visibile in leaderboard e ricerche</div></div>'
    +'<div class="toggle-track '+(isPublic?'on':'')+'" id="profile-public-toggle" onclick="togglePublicProfile()"><div class="toggle-knob"></div></div>'
    +'</div>';
  h+='<button class="btn-sm btn-sm-ghost" style="width:100%;padding:13px" onclick="openModal(\'modal-nations\');renderNationsModal()">🌍 Lingue parlate</button>';
  h+='<button class="btn-sm btn-sm-ghost" style="width:100%;padding:13px;color:var(--red)" onclick="doLogout()">Esci dall\'account</button>';
  h+='</div>';

  const myGenres=u.preferred_genres||[];
  h+='<div class="section-hd" style="margin-top:8px"><span class="section-title">📚 Generi preferiti</span></div>';
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">';
  const ALL_GENRES=['narrativa','saggistica','filosofia','scienza','storia','economia','self-help','tecnico','thriller','fantasy','fantascienza','romanzo','biografia','poesia','classico','altro'];
  ALL_GENRES.forEach(g=>{
    const on=myGenres.includes(g);
    h+='<div class="nation-tile'+(on?' on':'')+'" onclick="togglePreferredGenre(\''+g+'\')">'+escHtml(g)+'</div>';
  });
  h+='</div>';
  c.innerHTML=h;
}

function togglePublicProfile(){
  const u=getUser(CUR.id);
  u.public_profile=!u.public_profile;
  saveDB();syncCUR(u);
  const t=document.getElementById('profile-public-toggle');
  if(t)t.classList.toggle('on',u.public_profile);
  showToast(u.public_profile?'✅ Profilo pubblico':'🔒 Profilo privato');
  apiCall('SYNC_USER_DATA',buildUserPayload(u));
}

function changeAvatar(){
  pickImage(300,300,0.8,async d=>{
    const u=getUser(CUR.id);
    u.avatar=d;saveDB();syncCUR(u);
    updateDashboard();
    showToast('📸 Avatar aggiornato!');
    apiCall('SYNC_USER_DATA',buildUserPayload(u));
    renderMyStats();
  });
}

function doLogout(){
  if(!confirm('Sei sicuro di voler uscire?'))return;
  localStorage.removeItem('lq_cur_v5');
  CUR=null;_feedCache=[];
  document.getElementById('app').style.display='none';
  document.getElementById('auth-screen').style.display='flex';
  showToast('Arrivederci!');
}

async function doAppRefresh(){
  playSound('tap');
  showToast('🔄 Aggiornamento in corso...');
  showLoading('Aggiornamento...');
  try {
    await syncCloudDataOnLogin(CUR.id);
    const res = await apiCall('LOGIN_USER',{username:CUR.username,password_hash:CUR.password_hash||''});
    if(res.success&&res.user){
      const cu=res.user;
      const local=getUser(CUR.id);
      if(local){
        cu.xp_total=Math.max(local.xp_total||0,cu.xp_total||0);
        cu.level=Math.max(local.level||1,cu.level||1);
        cu.streak_days=Math.max(local.streak_days||0,cu.streak_days||0);
        cu.avatar=local.avatar||cu.avatar_url||'';
        cu.trophies=local.trophies||cu.trophies||[];
        cu.privacy=local.privacy||{};
        cu.following=(cu.following&&cu.following.length)?cu.following:(local.following||[]);
        cu.followers=(cu.followers&&Object.keys(cu.followers).length)?cu.followers:(local.followers||{});
        cu.languages=cu.languages?.length?cu.languages:(local.languages||[]);
        cu.preferred_genres=local.preferred_genres||cu.preferred_genres||[];
        if(cu.stats)Object.keys(local.stats||{}).forEach(k=>{cu.stats[k]=Math.max(cu.stats[k]||0,local.stats[k]||0);});
        DB.users[DB.users.indexOf(local)]=cu;
      }
      saveDB();syncCUR(cu);
    }
    hideLoading();
    showToast('✅ Dati aggiornati!');
    const activeScreen=document.querySelector('.screen.active');
    if(activeScreen){
      const tab=activeScreen.id.replace('screen-','');
      ({home:renderHome,quest:renderQuests,study:renderStudy,routine:renderRoutine,pvp:renderPvP_load,stats:renderStats,friends:renderFriendsScreen}[tab]||function(){})();
    }
  } catch(e){ hideLoading(); showToast('⚠️ Errore aggiornamento'); }
}

function renderNationsModal(){
  const u=getUser(CUR.id)||CUR;
  const myLangs=new Set(u.languages||[]);
  const grid=document.getElementById('nations-grid');
  if(!grid)return;
  grid.innerHTML=LANGUAGES.map(l=>{
    const on=myLangs.has(l);
    return '<div class="nation-tile'+(on?' on':'')+'" onclick="toggleLanguage(\''+escHtml(l)+'\')" id="lang-'+escHtml(l).replace(/[^a-zA-Z]/g,'_')+'">'+escHtml(l)+'</div>';
  }).join('');
}

function toggleLanguage(lang){
  const u=getUser(CUR.id);
  if(!u.languages)u.languages=[];
  const idx=u.languages.indexOf(lang);
  if(idx>=0)u.languages.splice(idx,1);else u.languages.push(lang);
  saveDB();syncCUR(u);
  const id='lang-'+lang.replace(/[^a-zA-Z]/g,'_');
  const el=document.getElementById(id);
  if(el)el.classList.toggle('on',u.languages.includes(lang));
}

function saveLanguages(){
  const u=getUser(CUR.id);
  closeModal('modal-nations');
  showToast('✅ Lingue salvate!');
  apiCall('SYNC_USER_DATA',buildUserPayload(u));
}

function togglePreferredGenre(genre){
  const u=getUser(CUR.id);
  if(!u.preferred_genres)u.preferred_genres=[];
  const idx=u.preferred_genres.indexOf(genre);
  if(idx>=0)u.preferred_genres.splice(idx,1);else u.preferred_genres.push(genre);
  saveDB();syncCUR(u);
  apiCall('SYNC_USER_DATA',buildUserPayload(u));
  renderMyStats();
  showToast(u.preferred_genres.includes(genre)?'✅ Genere aggiunto':'Genere rimosso');
}

// ══ BUG 3 FIX — Leaderboard funzionante ══
async function renderLeaderboard(){
  const c=document.getElementById('stats-container');
  c.innerHTML='<div style="padding:20px;text-align:center;color:var(--text3)">Caricamento classifica...</div>';
  const res=await apiCall('GET_LEADERBOARD',{});
  if(!res.success||!res.leaderboard||!res.leaderboard.length){
    c.innerHTML='<div class="empty"><div class="empty-emoji">🏆</div><div class="empty-text">Nessun utente in classifica.<br><small style="color:var(--text3)">Assicurati di avere il profilo pubblico attivo.</small></div></div>';
    return;
  }
  const medals=['🥇','🥈','🥉'];
  let h='<div style="padding:0 20px 20px">';
  h+='<div class="section-hd" style="margin-bottom:12px"><span class="section-title">🏆 Classifica globale ('+res.leaderboard.length+')</span></div>';
  res.leaderboard.forEach((u,i)=>{
    const isSelf=u.id===CUR.id;
    const av=u.avatar_url?'<img src="'+u.avatar_url+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':escHtml((u.username||'?')[0].toUpperCase());
    h+='<div class="friend-card" style="display:flex;align-items:center;gap:10px;'+(isSelf?'border-color:var(--accent);background:var(--accent-bg)':'')+'" onclick="viewUserProfile(\''+u.id+'\')">'+
      '<div style="font-size:18px;width:28px;text-align:center;flex-shrink:0">'+(medals[i]||'#'+(i+1))+'</div>'+
      '<div class="feed-avatar" style="width:36px;height:36px;font-size:13px;flex-shrink:0">'+av+'</div>'+
      '<div style="flex:1;min-width:0">'+
        '<div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(u.username)+(isSelf?' <span style="font-size:10px;color:var(--accent2)">(tu)</span>':'')+'</div>'+
        '<div style="font-size:10px;color:var(--text3)">'+rankTitle(u.level||1)+' · Lv.'+(u.level||1)+' · 🔥'+(u.streak_days||0)+'gg</div>'+
      '</div>'+
      '<div style="font-size:13px;font-weight:900;color:var(--gold)">'+((u.xp_total||0).toLocaleString())+' XP</div>'+
    '</div>';
  });
  h+='</div>';
  c.innerHTML=h;
}

function renderPersonalCalendar() {
  const c = document.getElementById('stats-container'); if (!c) return;

  function getEventsForDate(dateStr) {
    const events = [];
    DB.quests.filter(q => q.user_id===CUR.id && q.completed && q.completed_at).forEach(q => {
      const d = new Date(q.completed_at).toISOString().split('T')[0];
      if (d === dateStr) events.push({type:'quest', label:' '+q.name, xp:q.xp_base, cat:q.category});
    });
    DB.sessions.filter(s => s.user_id===CUR.id).forEach(s => {
      const d = s.date || new Date(s.ts||0).toISOString().split('T')[0];
      if (d === dateStr) { const ex = DB.exams.find(e=>e.id===s.exam_id); events.push({type:'study', label:' '+(ex?.name||'Studio'), xp:s.xp||0, cat:'mente'}); }
    });
    DB.book_sessions.filter(s => s.user_id===CUR.id).forEach(s => {
      const d = s.date || new Date(s.ts||0).toISOString().split('T')[0];
      if (d === dateStr) { const bk = DB.books.find(b=>b.id===s.book_id); events.push({type:'study', label:' '+(bk?.title||'Lettura'), xp:s.xp_gained||0, cat:'cultura'}); }
    });
    DB.routines.filter(r => r.user_id===CUR.id && r.date===dateStr).forEach(r => {
      const item = ROUTINE_ITEMS.find(x=>x.id===r.item_id)||{emoji:'',name:r.item_id||'Custom'};
      events.push({type:'routine', label:item.emoji+' '+item.name+(r.custom_name?' — '+r.custom_name:''), xp:r.xp||0, cat:item.cat});
    });
    (DB.challenges||[]).filter(ch => (ch.creator_id===CUR.id||ch.joiner_id===CUR.id) && ch.created_at).forEach(ch => {
      const d = new Date(ch.created_at).toISOString().split('T')[0];
      if (d === dateStr) events.push({type:'challenge', label:' Sfida: '+ch.title, xp:ch.status==='done'&&ch.winner_id===CUR.id?ch.stake:0, cat:'sfide'});
    });
    return events;
  }

  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const dim = new Date(y, m+1, 0).getDate();
  const fd = (new Date(y,m,1).getDay()+6)%7;

  const eventMap = {};
  for (let d = 1; d <= dim; d++) {
    const ds = y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    eventMap[ds] = getEventsForDate(ds).length;
  }

  let h = '<div style="padding:16px 20px">';

  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">';
  [['all','Tutto'],['quest','Quest'],['study','Studio'],['routine','Routine'],['challenge','Sfide']].forEach(([k,l]) => {
    h += '<button class="btn-sm '+(calFilter===k?'btn-sm-primary':'btn-sm-ghost')+'" onclick="calFilter=\''+k+'\';renderPersonalCalendar()">'+l+'</button>';
  });
  h += '</div>';

  h += '<div style="text-align:center;font-size:15px;font-weight:700;margin-bottom:10px">📅 '+new Date(y,m).toLocaleString('it',{month:'long',year:'numeric'})+'</div>';
  h += '<div class="cal-grid">';
  ['Lu','Ma','Me','Gi','Ve','Sa','Do'].forEach(d => h += '<div class="cal-day-label">'+d+'</div>');
  for (let i=0; i<fd; i++) h += '<div></div>';
  for (let d=1; d<=dim; d++) {
    const ds = y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const cnt = eventMap[ds]||0;
    h += '<div class="cal-day'+(calSelectedDate===ds?' today':'')+(cnt?' has-session':'')+'" onclick="calSelectedDate=\''+ds+'\';renderPersonalCalendar()">'+d
      +(cnt?'<span style="font-size:8px;display:block;color:var(--accent)">'+cnt+'</span>':'')+'</div>';
  }
  h += '</div>';

  const dayEvents = getEventsForDate(calSelectedDate).filter(e => calFilter==='all' || e.type===calFilter);
  h += '<div style="margin-top:16px"><div class="section-hd"><span class="section-title">'+calSelectedDate+' ('+dayEvents.length+' eventi)</span></div>';
  if (!dayEvents.length) {
    h += '<div style="color:var(--text3);font-size:12px;padding:12px 0">Nessuna attività registrata.</div>';
  } else {
    h += '<input class="sm" id="cal-search" placeholder="Cerca evento..." style="margin:8px 0" oninput="renderPersonalCalendar()">';
    const q = document.getElementById('cal-search')?.value?.toLowerCase()||'';
    dayEvents.filter(e => !q || e.label.toLowerCase().includes(q)).forEach(e => {
      h += '<div class="session-row"><div class="session-dot" style="background:'+(STAT_COLORS[e.cat]||'var(--accent)')+'"></div>'
        +'<div class="session-info"><div class="session-name">'+escHtml(e.label)+'</div>'
        +'<div class="session-time">'+e.type+'</div></div>'
        +(e.xp?'<div class="session-xp">+'+e.xp+' XP</div>':'')+'</div>';
    });
  }
  h += '</div></div>';
  c.innerHTML = h;
}

function openModal(id){document.getElementById(id)?.classList.add('open');}
function closeModal(id){document.getElementById(id)?.classList.remove('open');}

function viewUserProfile(id){
  const u=getUser(id)||{id,username:'Utente',level:1,xp_total:0,stats:{},following:[],followers:{}};
  const isSelf=id===CUR.id;
  const myUser=getUser(CUR.id)||CUR;
  const isFollowing=(myUser.following||[]).includes(id);
  const followersCount=Object.keys(u.followers||{}).length;
  const followingCount=(u.following||[]).length;
  const av=u.avatar?'<img src="'+u.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':'<span style="font-size:28px;font-weight:900;color:var(--accent2)">'+escHtml((u.username||'?')[0].toUpperCase())+'</span>';
  const s=u.stats||{};
  const statsHtml=Object.entries(s).filter(([,v])=>v>0).map(([k,v])=>'<div style="text-align:center"><div style="font-size:16px;font-weight:900;color:'+(STAT_COLORS[k]||'var(--accent)')+'">'+v+'</div><div style="font-size:9px;color:var(--text3);font-weight:700;text-transform:uppercase">'+k+'</div></div>').join('');
  
  const _lvl=u.level||1;
  const _pct=xpBarPct(u.xp_total||0,_lvl);
  const _xpNxt=xpForLevel(_lvl+1);

  const c=document.getElementById('profile-content');
  c.innerHTML=
    '<div style="padding:24px 20px 20px;text-align:center">'
    +'<div style="width:72px;height:72px;border-radius:50%;background:var(--accent-bg);border:2px solid rgba(124,106,247,0.4);overflow:hidden;margin:0 auto 12px;display:flex;align-items:center;justify-content:center">'+av+'</div>'
    +'<div style="font-size:20px;font-weight:900;margin-bottom:4px">'+escHtml(u.username||'Utente')+'</div>'
    +'<div style="font-size:12px;color:var(--accent2);font-weight:700;margin-bottom:14px">'+rankTitle(u.level||1)+' · Lv.'+(u.level||1)+'</div>'
    +'<div style="display:flex;gap:0;margin-bottom:16px;background:var(--bg2);border-radius:10px;border:1px solid var(--border);overflow:hidden">'
    +'<div style="flex:1;padding:12px;text-align:center;border-right:1px solid var(--border)"><div style="font-size:18px;font-weight:900">'+followingCount+'</div><div style="font-size:9px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-top:2px">Seguiti</div></div>'
    +'<div style="flex:1;padding:12px;text-align:center"><div style="font-size:18px;font-weight:900">'+followersCount+'</div><div style="font-size:9px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-top:2px">Seguaci</div></div>'
    +'</div>'
    +(statsHtml?'<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:16px">'+statsHtml+'</div>':'')
    +'<div style="height:6px;background:var(--bg);border-radius:4px;overflow:hidden;margin:0 0 4px"><div style="height:100%;width:'+_pct+'%;background:linear-gradient(90deg,var(--accent),var(--cyan));border-radius:4px"></div></div>'
    +'<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-bottom:14px"><span>'+(u.xp_total||0).toLocaleString()+' XP</span><span>→ Lv.'+(_lvl+1)+' ('+_xpNxt.toLocaleString()+')</span></div>'
    +(!isSelf
      ?(isFollowing
        ?'<button class="btn btn-primary" style="opacity:0.7" onclick="unfollowUser(\''+id+'\');closeModal(\'modal-profile\')">✓ Seguito · Smetti di seguire</button>'
        :'<button class="btn btn-primary" onclick="followUser(\''+id+'\',\''+escHtml(u.username||'')+'\');closeModal(\'modal-profile\')">➕ Segui</button>')
      :'<button class="btn btn-primary" onclick="closeModal(\'modal-profile\')">Chiudi</button>')
    +'</div>';
  openModal('modal-profile');
}

function hideSplash(){
  const splash = document.getElementById('splash');
  if(!splash) return;
  splash.style.opacity = '0';
  setTimeout(() => { splash.style.display = 'none'; }, 520);
}

function bootApp(){
  hideSplash();
  document.getElementById('auth-screen').style.display='none';
  document.getElementById('app').style.display='flex';
  const lbl=document.getElementById('feed-switch-label');
  if(lbl)lbl.textContent='Seguiti';
  feedMode='following';
  gotoTab('home');
  playSound('login');
  apiCall('GET_BANNED_WORDS',{}).then(res=>{
    if(res.success)BANNED_WORDS_LIST=res.words||[];
  });
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(hideSplash, 1500);
  if(CUR){
    try{ bootApp(); }
    catch(e){ console.error('bootApp error:',e); CUR=null; hideSplash(); }
  }
});
