/* ============================================================
   LIFEQUEST v2.0 — script.js CORRETTO E COMPLETATO
   ============================================================ */

const API_URL = "https://script.google.com/macros/s/YOUR_GAS_WEB_APP_URL_HERE/exec";
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
  'Un capitolo al giorno tiene l\'ignoranza lontano. ',
  'La sofferenza di oggi e la forza di domani. '
];
const ROUTINE_ITEMS = [
  {id:'meditation',name:'Meditazione',emoji:'',cat:'mente',xp:30},
  {id:'workout',name:'Allenamento',emoji:'️',cat:'corpo',xp:80},
  {id:'run',name:'Corsa',emoji:'',cat:'corpo',xp:60},
  {id:'reading',name:'Lettura libera',emoji:'',cat:'cultura',xp:20},
  {id:'journal',name:'Diario',emoji:'',cat:'mente',xp:15},
  {id:'cold_shower',name:'Doccia fredda',emoji:'',cat:'corpo',xp:25},
  {id:'cook',name:'Cucinare sano',emoji:'',cat:'corpo',xp:20},
  {id:'stretch',name:'Stretching',emoji:'',cat:'corpo',xp:20},
  {id:'study',name:'Studio 30min',emoji:'',cat:'mente',xp:40},
  {id:'gratitude',name:'Gratitudine',emoji:'',cat:'sociale',xp:10},
  {id:'social_call',name:'Chiamata amico',emoji:'',cat:'sociale',xp:15},
  {id:'custom',name:'Custom',emoji:'⭐',cat:'produttivita',xp:20},
];
const NATIONS = [' Italia',' America',' Regno Unito',' Germania',' Francia',' Spagna',' Portogallo',' Giappone',' Brasile',' Argentina',' Canada',' Australia',' Olanda',' Svezia',' Svizzera'];

/* ── DB ── */
function mkDB(){return{users:[],quests:[],exams:[],chapters:[],concepts:[],sessions:[],books:[],book_sessions:[],challenges:[],feed_posts:[],routines:[],comments:[]}}
function loadDB(){try{return JSON.parse(localStorage.getItem(DB_KEY))||mkDB();}catch(e){return mkDB();}}
function saveDB(){try{localStorage.setItem(DB_KEY,JSON.stringify(DB));}catch(e){}}
let DB=loadDB();
let CUR=null;
try{
  CUR=JSON.parse(localStorage.getItem('lq_cur_v5')||localStorage.getItem('lq_cur_v4')||localStorage.getItem('lq_cur_v3')||localStorage.getItem('lq_cur_v2')||'null');
}catch(e){}

/* ── AUDIO ── */
let _actx=null;
function _ctx(){if(!_actx){try{_actx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}return _actx;}
function playSound(type){
  const ctx=_ctx();if(!ctx)return;
  const now=ctx.currentTime;
  function tone(freq,dur,vol,wave){
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=wave||'sine';o.frequency.value=freq;
    g.gain.setValueAtTime(vol||0.15,now);
    g.gain.exponentialRampToValueAtTime(0.001,now+dur);
    o.connect(g);g.connect(ctx.destination);o.start(now);o.stop(now+dur);
  }
  if(type==='tap'){tone(700,0.07,0.12);}
  else if(type==='xp'){tone(440,0.08,0.18);setTimeout(()=>tone(660,0.12,0.18),80);}
  else if(type==='trophy'){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,0.15,0.18),i*100));}
  else if(type==='like'){tone(900,0.06,0.1);setTimeout(()=>tone(1200,0.08,0.1),60);}
  else if(type==='error'){tone(180,0.15,0.1,'sawtooth');}
  else if(type==='open'){tone(400,0.06,0.08);setTimeout(()=>tone(600,0.08,0.08),60);}
}

/* ── UTILS ── */
function uid(){return Math.random().toString(36).substr(2,9)+Date.now().toString(36);}
function ts(){return Date.now();}
function today(){return new Date().toISOString().split('T')[0];}
async function hashStr(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');}
function randCode(){return 'LQ-'+Math.floor(1000+Math.random()*9000);}
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

/* ── XP ── */
function xpForLevel(l){return Math.round(500*l*l);}
function calcLevel(xp){let l=1;while(xpForLevel(l+1)<=xp)l++;return l;}
function rankTitle(l){return RANK_TITLES[Math.min(Math.floor((l-1)/5),9)];}
function streakMult(u){const d=u.streak_days||0;if(d>=30)return 1.5;if(d>=14)return 1.3;if(d>=7)return 1.15;if(d>=3)return 1.05;return 1;}
function getUser(id){return DB.users.find(u=>u.id===id);}
function syncCUR(u){CUR=u;localStorage.setItem('lq_cur_v5',JSON.stringify(u));}

function buildUserPayload(u){
  return{user_id:u.id,username:u.username,xp_total:u.xp_total||0,level:u.level||1,streak_days:u.streak_days||0,last_active:u.last_active||today(),public_profile:!!u.public_profile,stats:u.stats||{},nations:u.nations||[],avatar:u.avatar||''};
}

function awardXP(amount,stat,note){
  if(!CUR)return 0;
  const u=getUser(CUR.id);if(!u)return 0;
  const xp=Math.max(1,Math.round(amount*streakMult(u)));
  u.xp_total=(u.xp_total||0)+xp;
  u.level=calcLevel(u.xp_total);
  if(stat&&u.stats)u.stats[stat]=(u.stats[stat]||0)+xp;
  const td=today();
  if(u.last_active!==td){const yd=new Date(Date.now()-86400000).toISOString().split('T')[0];u.streak_days=(u.last_active===yd)?(u.streak_days||0)+1:1;u.last_active=td;}
  saveDB();syncCUR(u);
  showToast('+'+xp+' XP ✨ '+(note||''));
  spawnXPFloat(xp);
  playSound('xp');
  apiCall('SYNC_USER_DATA',buildUserPayload(u));
  updateDashboard();
  return xp;
}

/* ── IMMAGINI ── */
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

/* ── EFFETTI ── */
function spawnXPFloat(xp){const el=document.createElement('div');el.className='xp-float';el.textContent='+'+xp+' XP';el.style.cssText='top:'+(70+Math.random()*80)+'px;left:'+(50+Math.random()*180)+'px';document.body.appendChild(el);setTimeout(()=>el.remove(),950);}
let _toastT;
function showToast(msg){const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(_toastT);_toastT=setTimeout(()=>t.classList.remove('show'),2800);}
function showLoading(msg){let el=document.getElementById('loading-overlay');if(!el){el=document.createElement('div');el.id='loading-overlay';document.body.appendChild(el);}el.innerHTML='<div class="loading-box"><div class="loading-spinner"></div><div>'+(msg||'Caricamento...')+'</div></div>';el.style.display='flex';}
function hideLoading(){const el=document.getElementById('loading-overlay');if(el)el.style.display='none';}

/* ── AUTH ── */
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
  const result=await apiCall('REGISTER_USER',{username:user,password_hash,pin_hash});
  if(result.success){
    const u={id:result.user_id,username:user,password_hash,pin_hash,xp_total:0,level:1,streak_days:0,last_active:today(),public_profile:true,avatar:'',nations:[],stats:{mente:0,corpo:0,cultura:0,sociale:0,'produttivita':0,sfide:0},trophies:[],privacy:{},friends:[],friend_names:{}};
    DB.users.push(u);saveDB();syncCUR(u);bootApp();
  }else err.textContent=result.message||'Errore di registrazione';
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
        cu.friends=local.friends||[];cu.friend_names=local.friend_names||{};
        cu.avatar=local.avatar||cu.avatar||'';cu.nations=local.nations?.length?local.nations:(cu.nations||[]);
        if(cu.stats)Object.keys(local.stats||{}).forEach(k=>{cu.stats[k]=Math.max(cu.stats[k]||0,local.stats[k]||0);});
        DB.users[DB.users.indexOf(local)]=cu;
      }else{
        cu.trophies=[];cu.privacy={};cu.friends=[];cu.friend_names={};
        cu.avatar=cu.avatar||'';cu.nations=cu.nations||[];
        DB.users.push(cu);
      }
      saveDB();syncCUR(cu);bootApp();err.textContent='';
    }else{
      const local=DB.users.find(u=>u.username.toLowerCase()===user.toLowerCase()&&u.password_hash===password_hash);
      if(local){syncCUR(local);bootApp();showToast('⚠️ Offline: dati locali');}
      else err.textContent=result.message||'Credenziali errate';
    }
  }catch(e){hideLoading();err.textContent='Errore di connessione';}
}

/* ── NAV ── */
function gotoTab(tab){
  playSound('tap');
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('screen-'+tab).classList.add('active');
  document.getElementById('nav-'+tab).classList.add('active');
  ({home:renderHome,quest:renderQuests,study:renderStudy,routine:renderRoutine,pvp:renderPvP,stats:renderStats,friends:renderFriendsScreen}[tab]||function(){})();
  window.scrollTo(0,0);
}

/* ── DASHBOARD ── */
function updateDashboard(){
  if(!CUR)return;
  const u=getUser(CUR.id)||CUR,lvl=u.level||1,xpCur=u.xp_total||0;
  const xpThis=xpForLevel(lvl),xpNxt=xpForLevel(lvl+1);
  const pct=Math.min(100,Math.round((xpCur-xpThis)/(xpNxt-xpThis)*100));
  document.getElementById('hd-level').textContent=lvl;
  document.getElementById('hd-name').textContent=u.username;
  document.getElementById('hd-rank').textContent=rankTitle(lvl)+'  Lv.'+lvl;
  document.getElementById('hd-streak').innerHTML=' '+(u.streak_days||0)+' gg';
  document.getElementById('xp-bar').style.width=pct+'%';
  document.getElementById('xp-cur').textContent=xpCur.toLocaleString()+' XP';
  document.getElementById('xp-next').textContent='→ Lv.'+(lvl+1)+' ('+xpNxt.toLocaleString()+' XP)';
  const av=document.getElementById('hd-avatar');
  if(av)av.innerHTML=u.avatar?'<img src="'+u.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':'<span>'+u.username[0].toUpperCase()+'</span>';
  const s=u.stats||{};
  ['mente','corpo','cultura','sociale','sfide'].forEach(k=>{const el=document.getElementById('ds-'+k);if(el)el.textContent=s[k]||0;});
}

/* ── HOME FEED ── */
let feedMode='friends';
function renderHome(){
  updateDashboard();
  document.getElementById('motiv-text').textContent=MOTIVS[new Date().getDay()%MOTIVS.length];
  renderFeed();
}
function toggleFeedMode(){
  playSound('tap');
  feedMode=feedMode==='friends'?'all':'friends';
  document.getElementById('feed-switch-label').textContent=feedMode==='friends'?'Amici':'Tutti';
  document.getElementById('feed-switch-track').classList.toggle('on',feedMode==='all');
  renderFeed();
}
function renderFeed(){
  const u=getUser(CUR.id)||CUR;
  const myFriends=new Set(u.friends||[]);
  const myNations=new Set(u.nations||[]);
  let posts=[...DB.feed_posts].sort((a,b)=>b.ts-a.ts);
  if(feedMode==='friends'){
    posts=posts.filter(p=>p.user_id===CUR.id||myFriends.has(p.user_id));
  }else{
    if(myNations.size>0)posts=posts.filter(p=>{if(p.user_id===CUR.id)return true;const pu=getUser(p.user_id);return(pu?.nations||[]).some(n=>myNations.has(n));});
  }
  const el=document.getElementById('feed-list');
  if(!posts.length){
    el.innerHTML='<div class="empty" style="padding:20px 0"><div class="empty-emoji"></div><div class="empty-text">Nessuna attivita nel feed.<br><small style="color:var(--text3)">'+(feedMode==='friends'?'Aggiungi amici o passa a "Tutti"':'Imposta le tue nazioni nel profilo')+'</small></div></div>';
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
    +'<button class="feed-action'+(myLike?' liked':'')+'" onclick="toggleLike(\''+p.id+'\')">'+(myLike?'❤️':'')+' <span id="lc-'+p.id+'">'+likeCount+'</span></button>'
    +'<button class="feed-action" onclick="toggleComments(\''+p.id+'\')"> '+comments.length+'</button>'
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
  if(btn){btn.className='feed-action'+(myLike?' liked':'');btn.innerHTML=(myLike?'❤️':'')+' <span id="lc-'+postId+'">'+p.likes.length+'</span>';}
}
function toggleComments(postId){
  playSound('tap');
  const el=document.getElementById('fc-'+postId);
  if(el)el.style.display=el.style.display==='none'?'block':'none';
}
function submitComment(postId){
  const inp=document.getElementById('ci-'+postId);
  const text=(inp?.value||'').trim();if(!text)return;
  const c={id:uid(),post_id:postId,user_id:CUR.id,text,ts:ts()};
  DB.comments.push(c);saveDB();inp.value='';playSound('tap');
  const cl=document.getElementById('cl-'+postId);
  if(cl)cl.innerHTML+='<div class="comment-row"><b>'+escHtml(CUR.username)+':</b> '+escHtml(text)+'</div>';
  const btns=document.querySelectorAll('#post-'+postId+' .feed-action');
  if(btns[1])btns[1].textContent=' '+DB.comments.filter(c=>c.post_id===postId).length;
}
function openPhotoModal(postId){
  const p=DB.feed_posts.find(x=>x.id===postId);if(!p?.photo)return;
  const ov=document.createElement('div');ov.className='photo-overlay';ov.onclick=()=>ov.remove();
  ov.innerHTML='<img src="'+p.photo+'" style="max-width:96vw;max-height:90vh;border-radius:var(--r);box-shadow:0 0 40px rgba(0,0,0,0.8)">';
  document.body.appendChild(ov);
}
function addFeedPost(title,category,xp,notes,photo){
  const p={id:uid(),user_id:CUR.id,title,category,xp,notes:notes||'',photo:photo||'',ts:ts(),likes:[]};
  DB.feed_posts.unshift(p);saveDB();return p.id;
}

/* ── QUEST ── */
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
    +(q.completed&&q.completed_at?'<div style="font-size:10px;color:var(--text3);margin-top:2px"> '+new Date(q.completed_at).toLocaleDateString('it')+'</div>':'')
    +'</div>'
    +(!q.completed?'<button class="btn-sm btn-sm-red" style="font-size:10px;padding:4px 8px;flex-shrink:0" onclick="deleteQuest(\''+q.id+'\',event)">✕</button>':'')
    +'</div>'
  ).join(''):'<div class="empty"><div class="empty-emoji">'+(qTab==='done'?'':'⚔️')+'</div><div class="empty-text">'+(qTab==='done'?'Nessuna quest completata.':'Aggiungi la tua prima quest!')+'</div></div>';
}
function renderQuestCalendar(container){
  const now=new Date(),y=now.getFullYear(),m=now.getMonth(),dim=new Date(y,m+1,0).getDate(),fd=(new Date(y,m,1).getDay()+6)%7;
  const cQ=DB.quests.filter(q=>q.user_id===CUR.id&&q.completed);
  const qd={};cQ.forEach(q=>{const ds=q.completed_at?new Date(q.completed_at).toISOString().split('T')[0]:'';if(ds)qd[ds]=(qd[ds]||0)+1;});
  let h='<div style="text-align:center;font-size:15px;font-weight:700;margin-bottom:10px"> '+new Date(y,m).toLocaleString('it',{month:'long',year:'numeric'})+'</div><div class="cal-grid">';
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
function attachQuestPhoto(){pickImage(800,600,0.65,d=>{_pendingQuestPhoto=d;const pr=document.getElementById('q-photo-preview');if(pr){pr.src=d;pr.style.display='block';}showToast(' Foto allegata');});}
function addQuest(){
  const name=document.getElementById('q-name').value.trim();if(!name){showToast('⚠️ Inserisci un nome');playSound('error');return;}
  const cat=document.getElementById('q-cat').value,diff=parseInt(document.getElementById('q-diff').value)||2,type=document.getElementById('q-type').value;
  const base=Math.round((type==='todo'?15:50)*DIFF_MULT[diff]);
  const q={id:uid(),user_id:CUR.id,name,category:cat,difficulty:diff,type,notes:document.getElementById('q-notes').value.trim(),xp_base:base,completed:false,created_at:ts(),photo:_pendingQuestPhoto};
  DB.quests.push(q);saveDB();closeModal('modal-add-quest');
  document.getElementById('q-name').value='';document.getElementById('q-notes').value='';_pendingQuestPhoto='';
  renderQuests();showToast('⚔️ Quest aggiunta!');playSound('tap');
}
function deleteQuest(id,e){if(e)e.stopPropagation();playSound('tap');DB.quests=DB.quests.filter(q=>q.id!==id);saveDB();renderQuests();}
async function toggleQuest(id,e){
  if(e)e.stopPropagation();
  const q=DB.quests.find(q=>q.id===id);if(!q||q.completed)return;
  q.completed=true;q.completed_at=ts();saveDB();
  awardXP(q.xp_base,CAT_STAT[q.category]||'produttivita','— '+q.name);
  addFeedPost(q.name,q.category,q.xp_base,q.notes,q.photo);
  checkTrophies();renderQuests();
  await apiCall('COMPLETE_QUEST',{user_id:CUR.id,name:q.name,category:q.category,difficulty:q.difficulty||1,type:q.type||'quest',notes:q.notes||'',xp_base:q.xp_base});
}

/* ── ROUTINE ── */
const ROUTINE_MAX=3;
function openCustomRoutineModal(){openModal('modal-custom-routine');}
function renderRoutine(){
  const myR=DB.routines.filter(r=>r.user_id===CUR.id);
  const todayR=myR.filter(r=>r.date===today());
  const done=todayR.length;
  const c=document.getElementById('routine-container');
  let h='<div style="padding:0 20px"><div class="routine-progress-box">'
    +'<div style="font-size:13px;font-weight:700;margin-bottom:6px">Oggi: <span style="color:var(--accent)">'+done+'/'+ROUTINE_MAX+'</span> routine</div>'
    +'<div class="xp-bar-wrap"><div class="xp-bar-fill" style="width:'+Math.min(100,done/ROUTINE_MAX*100)+'%;background:linear-gradient(90deg,var(--green),var(--cyan))"></div></div>'
    +(done>=ROUTINE_MAX?'<div style="font-size:11px;color:var(--text3);margin-top:4px">Limite raggiunto. Torna domani! </div>':'')
    +'</div><div class="section-hd" style="margin-top:14px"><span class="section-title">Scegli routine</span></div><div class="routine-grid">';
  ROUTINE_ITEMS.forEach(item=>{
    const cnt=todayR.filter(r=>r.item_id===item.id).length;
    const locked=done>=ROUTINE_MAX;
    h+='<div class="routine-tile'+(locked?' locked':'')+'" onclick="'+(locked?'showToast(\'⏰ Limite raggiunto!\')':'doRoutine(\''+item.id+'\')')+'">'
      +'<div class="routine-emoji">'+item.emoji+'</div>'
      +'<div class="routine-name">'+item.name+'</div>'
      +'<div class="routine-xp">+'+item.xp+' XP</div>'
      +(cnt?'<div class="routine-done-badge">✓'+(cnt>1?' '+cnt:'')+'</div>':'')
      +'</div>';
  });
  h+='</div><div class="section-hd" style="margin-top:16px"><span class="section-title">Storico</span></div><div>';
  myR.sort((a,b)=>b.ts-a.ts).slice(0,20).forEach(r=>{
    const item=ROUTINE_ITEMS.find(x=>x.id===r.item_id)||{emoji:'⭐',name:r.item_id};
    h+='<div class="session-row"><div class="session-dot" style="background:var(--green)"></div><div class="session-info"><div class="session-name">'+item.emoji+' '+item.name+(r.custom_name?' — '+escHtml(r.custom_name):'')+'</div><div class="session-time">'+new Date(r.ts).toLocaleString('it')+'</div></div><div class="session-xp">+'+r.xp+' XP</div></div>';
  });
  if(!myR.length)h+='<div class="empty"><div class="empty-emoji"></div><div class="empty-text">Nessuna routine ancora.</div></div>';
  h+='</div></div>';
  c.innerHTML=h;
}
function doRoutine(itemId){
  const done=DB.routines.filter(r=>r.user_id===CUR.id&&r.date===today()).length;
  if(done>=ROUTINE_MAX){showToast('⏰ Limite giornaliero raggiunto!');playSound('error');return;}
  const item=ROUTINE_ITEMS.find(x=>x.id===itemId);if(!item)return;
  if(itemId==='custom'){openCustomRoutineModal();return;}
  const r={id:uid(),user_id:CUR.id,item_id:itemId,date:today(),ts:ts(),xp:item.xp};
  DB.routines.push(r);saveDB();
  awardXP(item.xp,item.cat,'— Routine: '+item.name);
  addFeedPost('Routine: '+item.name,item.cat,item.xp,'','');
  checkTrophies();renderRoutine();
}
function saveCustomRoutine(){
  const name=document.getElementById('cr-name').value.trim();
  const xp=Math.min(50,parseInt(document.getElementById('cr-xp').value)||20);
  if(!name){showToast('⚠️ Inserisci nome');return;}
  const done=DB.routines.filter(r=>r.user_id===CUR.id&&r.date===today()).length;
  if(done>=ROUTINE_MAX){showToast('⏰ Limite raggiunto!');return;}
  const r={id:uid(),user_id:CUR.id,item_id:'custom',custom_name:name,date:today(),ts:ts(),xp};
  DB.routines.push(r);saveDB();closeModal('modal-custom-routine');
  awardXP(xp,'produttivita','— Routine: '+name);
  addFeedPost('Routine: '+name,'produttivita',xp,'','');
  checkTrophies();renderRoutine();
}

/* ── LIBRI ── */
function onBookTitleInput(){
  const val=document.getElementById('bk-title').value;
  const el=document.getElementById('book-suggestions');
  if(val.length<2){el.innerHTML='';el.style.display='none';return;}
  const q=val.toLowerCase(),seen=new Set(),res=[];
  DB.books.forEach(b=>{const k=b.title.toLowerCase();if(k.includes(q)&&!seen.has(k)){seen.add(k);res.push(b);}});
  if(!res.length){el.innerHTML='';el.style.display='none';return;}
  el.innerHTML=res.slice(0,5).map(b=>'<div class="suggestion-item" onclick="selectBookSuggestion(\''+b.id+'\')">'+escHtml(b.emoji||'')+' '+escHtml(b.title)+'<span style="color:var(--text3);font-size:10px"> — '+escHtml(b.author||'')+'</span></div>').join('');
  el.style.display='block';
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
  showToast(' Libro importato!');playSound('tap');
  const readers=DB.books.filter(x=>x.title.toLowerCase()===b.title.toLowerCase()&&x.user_id!==CUR.id);
  if(readers.length)setTimeout(()=>showToast(' '+readers.slice(0,3).map(r=>getUser(r.user_id)?.username||'?').join(', ')+' sta/stanno leggendo questo libro!'),1400);
}
function renderBooks(c){
  const books=DB.books.filter(b=>b.user_id===CUR.id);
  if(!books.length){c.innerHTML='<div class="empty"><div class="empty-emoji"></div><div class="empty-text">Aggiungi il tuo primo libro!</div></div>';return;}
  c.innerHTML=books.map(b=>{
    const pct=b.total_pages?Math.round((b.current_page||0)/b.total_pages*100):0;
    const done=(b.current_page||0)>=(b.total_pages||Infinity)&&b.total_pages>0;
    const ss=DB.book_sessions.filter(s=>s.book_id===b.id).length;
    const readers=DB.books.filter(x=>x.title.toLowerCase()===b.title.toLowerCase()&&x.user_id!==CUR.id);
    return '<div class="book-card"><div class="book-head"><div class="book-cover">'+(b.emoji||'')+'</div><div class="book-meta">'
      +'<div class="book-title">'+escHtml(b.title)+'</div><div class="book-author">'+escHtml(b.author||'—')+'</div>'
      +(readers.length?'<div style="font-size:10px;color:var(--cyan);margin-bottom:4px"> +'+readers.length+' lo leggono</div>':'')
      +'<div class="book-tags"><span class="tag tag-cat">'+(b.genre||'—')+'</span><span class="tag tag-orange">'+diffStars(b.difficulty)+'</span>'+(done?'<span class="tag tag-green">✅</span>':'')+'</div>'
      +'<div class="book-progress-wrap"><div class="book-progress-fill" style="width:'+pct+'%"></div></div>'
      +'<div class="book-progress-nums"><span>'+(b.current_page||0)+'/'+(b.total_pages||'?')+' pag.</span><span>'+pct+'%  '+ss+' sessioni</span></div>'
      +'</div></div>'
      +(!done?'<div class="book-actions"><button class="btn-sm btn-sm-primary" style="font-size:11px;flex:1" onclick="openReadingModal(\''+b.id+'\')"> +Pagine</button><button class="btn-sm btn-sm-ghost" style="font-size:11px" onclick="markBookDone(\''+b.id+'\')">✅ Finito</button></div>':'<div style="font-size:11px;color:var(--green);padding-top:8px;text-align:center;font-weight:700"> Bonus '+(BOOK_DIFF_BONUS[b.difficulty]||0)+' XP!</div>')
      +'</div>';
  }).join('');
}
function addBook(){
  const title=document.getElementById('bk-title').value.trim();if(!title){showToast('⚠️ Inserisci il titolo');return;}
  const diff=parseInt(document.getElementById('bk-diff').value)||3;
  const b={id:uid(),user_id:CUR.id,title,author:document.getElementById('bk-author').value.trim(),genre:document.getElementById('bk-genre').value,difficulty:diff,total_pages:parseInt(document.getElementById('bk-pages').value)||0,current_page:0,emoji:document.getElementById('bk-emoji').value||'',completed:false,created_at:ts()};
  DB.books.push(b);saveDB();closeModal('modal-add-book');document.getElementById('book-suggestions').style.display='none';
  ['bk-title','bk-author','bk-pages','bk-emoji'].forEach(id=>{document.getElementById(id).value='';});
  renderStudy();showToast(' Libro aggiunto!');playSound('tap');
}
function openReadingModal(bookId){
  const b=DB.books.find(b=>b.id===bookId);if(!b)return;
  document.getElementById('rd-book-id').value=bookId;
  document.getElementById('reading-modal-title').textContent=' '+b.title;
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
  DB.book_sessions.push({id:uid(),user_id:CUR.id,book_id:bookId,date:ts(),pages,current_page:b.current_page,notes:document.getElementById('rd-notes').value,xp});
  saveDB();closeModal('modal-log-reading');
  awardXP(xp,stat,'— Lettura: '+b.title);
  addFeedPost(' '+pages+' pagine di "'+b.title+'"','cultura',xp,document.getElementById('rd-notes')?.value||'','');
  if(b.total_pages&&b.current_page>=b.total_pages&&!b.completed)markBookDone(bookId,true);else renderStudy();
}
async function markBookDone(bookId,silent){
  const b=DB.books.find(b=>b.id===bookId);if(!b||b.completed)return;
  b.completed=true;b.completed_at=ts();if(!silent)b.current_page=b.total_pages||b.current_page;saveDB();
  const bonus=BOOK_DIFF_BONUS[b.difficulty]||0,stat=BOOK_GENRE_STAT[b.genre]||'cultura';
  awardXP(bonus,stat,'—  Libro: '+b.title);
  addFeedPost(' Finito "'+b.title+'"!','cultura',bonus,'','');
  checkTrophies();renderStudy();
}
/* ── TROFEI ── */
const TROPHY_DEFS=[
  {id:'first_quest',name:'Prima quest',emoji:'⚔️',cat:'Quest',check:()=>DB.quests.filter(q=>q.user_id===CUR.id&&q.completed).length>=1},
  {id:'quest_5',name:'5 quest',emoji:'️',cat:'Quest',check:()=>DB.quests.filter(q=>q.user_id===CUR.id&&q.completed).length>=5},
  {id:'quest_10',name:'10 quest',emoji:'',cat:'Quest',check:()=>DB.quests.filter(q=>q.user_id===CUR.id&&q.completed).length>=10},
  {id:'quest_25',name:'25 quest',emoji:'',cat:'Quest',check:()=>DB.quests.filter(q=>q.user_id===CUR.id&&q.completed).length>=25},
  {id:'streak_3',name:'Streak 3gg',emoji:'',cat:'Streak',check:()=>(getUser(CUR.id)?.streak_days||0)>=3},
  {id:'streak_7',name:'Streak 7gg',emoji:'',cat:'Streak',check:()=>(getUser(CUR.id)?.streak_days||0)>=7},
  {id:'streak_14',name:'Streak 14gg',emoji:'',cat:'Streak',check:()=>(getUser(CUR.id)?.streak_days||0)>=14},
  {id:'streak_30',name:'Streak 30gg',emoji:'⚡',cat:'Streak',check:()=>(getUser(CUR.id)?.streak_days||0)>=30},
  {id:'level_5',name:'Livello 5',emoji:'⭐',cat:'Livello',check:()=>(getUser(CUR.id)?.level||0)>=5},
  {id:'level_10',name:'Livello 10',emoji:'',cat:'Livello',check:()=>(getUser(CUR.id)?.level||0)>=10},
  {id:'xp_1000',name:'1.000 XP',emoji:'',cat:'XP',check:()=>(getUser(CUR.id)?.xp_total||0)>=1000},
  {id:'xp_5000',name:'5.000 XP',emoji:'',cat:'XP',check:()=>(getUser(CUR.id)?.xp_total||0)>=5000},
  {id:'first_book',name:'Primo libro',emoji:'',cat:'Lettura',check:()=>DB.books.filter(b=>b.user_id===CUR.id&&b.completed).length>=1},
  {id:'books_3',name:'3 libri',emoji:'',cat:'Lettura',check:()=>DB.books.filter(b=>b.user_id===CUR.id&&b.completed).length>=3},
  {id:'routine_7',name:'7 routine',emoji:'',cat:'Routine',check:()=>DB.routines.filter(r=>r.user_id===CUR.id).length>=7},
  {id:'routine_30',name:'30 routine',emoji:'',cat:'Routine',check:()=>DB.routines.filter(r=>r.user_id===CUR.id).length>=30},
  {id:'pvp_first',name:'Prima sfida',emoji:'⚔️',cat:'Sfide',check:()=>DB.challenges.filter(c=>c.creator_id===CUR.id||c.joiner_id===CUR.id).length>=1},
  {id:'pvp_win',name:'Prima vittoria',emoji:'',cat:'Sfide',check:()=>DB.challenges.filter(c=>c.winner_id===CUR.id).length>=1},
  {id:'first_friend',name:'Primo amico',emoji:'',cat:'Social',check:()=>(getUser(CUR.id)?.friends||[]).length>=1},
  {id:'friends_5',name:'5 amici',emoji:'',cat:'Social',check:()=>(getUser(CUR.id)?.friends||[]).length>=5},
];
function checkTrophies(){
  const u=getUser(CUR.id);if(!u)return;if(!u.trophies)u.trophies=[];
  let newOnes=false;
  TROPHY_DEFS.forEach(def=>{
    if(!u.trophies.find(t=>t.id===def.id)&&def.check()){
      u.trophies.push({id:def.id,earned_at:ts()});newOnes=true;
      setTimeout(()=>{showToast(' Trofeo: '+def.name+' '+def.emoji);playSound('trophy');},500);
    }
  });
  if(newOnes){saveDB();syncCUR(u);apiCall('SYNC_USER_DATA',buildUserPayload(u));}
}

/* ── STUDIO ── */
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
  if(!exams.length){c.innerHTML='<div class="empty"><div class="empty-emoji"></div><div class="empty-text">Aggiungi il tuo primo esame!</div></div>';return;}
  c.innerHTML=exams.map(exam=>{
    const chs=DB.chapters.filter(ch=>ch.exam_id===exam.id),mp=masteryPct(exam.id);
    const dl=exam.exam_date?Math.ceil((new Date(exam.exam_date)-new Date())/86400000):null;
    const dlStr=dl!==null?(dl>0?dl+'gg':dl===0?'Oggi!':'Passato'):'';
    const mpColor=mp>75?'var(--green)':mp>40?'var(--accent2)':'var(--red)';
    return '<div class="exam-card">'
      +'<div class="exam-head" onclick="toggleExamBody(\''+exam.id+'\')">'
      +'<div class="exam-icon">'+(exam.emoji||'')+'</div>'
      +'<div class="exam-info"><div class="exam-name">'+escHtml(exam.title)+'</div><div class="exam-date">'+(exam.exam_date?' '+exam.exam_date+' ('+dlStr+')':'')+'  Mastery <b style="color:'+mpColor+'">'+mp+'%</b></div></div>'
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
    +'<div class="ch-info"><div class="ch-name" style="'+(ch.completed?'text-decoration:line-through;color:var(--text3)':'')+'">'+escHtml(ch.title)+'</div><div class="ch-concepts">'+diffStars(ch.difficulty||2)+'  '+done+'/'+cos.length+' concetti</div></div>'
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
  const e={id:uid(),user_id:CUR.id,title,exam_date:document.getElementById('ex-date').value,target_hours:parseInt(document.getElementById('ex-hours').value)||40,emoji:document.getElementById('ex-emoji').value||'',created_at:ts()};
  DB.exams.push(e);saveDB();closeModal('modal-add-exam');document.getElementById('ex-name').value='';renderStudy();showToast(' Esame aggiunto!');playSound('tap');
}
function openAddChapter(examId){document.getElementById('ch-exam-id').value=examId;document.getElementById('ch-name').value='';openModal('modal-add-chapter');}
async function addChapter(){
  const name=document.getElementById('ch-name').value.trim();if(!name){showToast('⚠️ Nome capitolo');return;}
  DB.chapters.push({id:uid(),exam_id:document.getElementById('ch-exam-id').value,title:name,difficulty:parseInt(document.getElementById('ch-diff').value)||3,completed:false,created_at:ts()});
  saveDB();closeModal('modal-add-chapter');renderStudy();showToast(' Capitolo aggiunto!');playSound('tap');
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
  DB.concepts.push({id:uid(),chapter_id:document.getElementById('co-chapter-id').value,title:name,notes:document.getElementById('co-notes').value,completed:false,created_at:ts()});
  saveDB();closeModal('modal-add-concept');renderStudy();showToast(' Concetto aggiunto!');playSound('tap');
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
  DB.sessions.push({id:uid(),user_id:CUR.id,exam_id:examId,exam_name:exam?.title||'Studio',date:ts(),duration_min:mins,focus_score:focus,notes:document.getElementById('ss-notes').value,xp});
  saveDB();closeModal('modal-log-session');
  awardXP(xp,'mente','— Studio '+mins+'min');
  addFeedPost(' Studio: '+(exam?.title||'Generico')+' ('+mins+'min)','mente',xp,'','');
  checkTrophies();renderStudy();
}
function renderSessions(c){
  const sss=DB.sessions.filter(s=>s.user_id===CUR.id).sort((a,b)=>b.date-a.date);
  c.innerHTML='<div style="padding:0 20px">'+(sss.length?sss.map(s=>'<div class="session-row"><div class="session-dot"></div><div class="session-info"><div class="session-name">'+escHtml(s.exam_name)+' — '+s.duration_min+'min</div><div class="session-time">'+new Date(s.date).toLocaleString('it')+'  Focus: '+'⭐'.repeat(s.focus_score)+'</div>'+(s.notes?'<div style="font-size:10px;color:var(--text3);margin-top:2px">'+escHtml(s.notes)+'</div>':'')+'</div><div class="session-xp">+'+s.xp+' XP</div></div>').join(''):'<div class="empty"><div class="empty-emoji"></div><div class="empty-text">Nessuna sessione ancora.</div></div>')+'</div>';
}
function renderCalendar(c){
  const now=new Date(),y=now.getFullYear(),m=now.getMonth(),fd=(new Date(y,m,1).getDay()+6)%7,dim=new Date(y,m+1,0).getDate();
  const MN=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const sd=new Set(DB.sessions.filter(s=>s.user_id===CUR.id).map(s=>{const d=new Date(s.date);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}));
  const bd=new Set(DB.book_sessions.filter(s=>s.user_id===CUR.id).map(s=>{const d=new Date(s.date);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}));
  let h='<div style="text-align:center;font-size:14px;font-weight:700;color:var(--text);padding:12px 20px 8px">'+MN[m]+' '+y+'</div><div class="cal-grid">';
  ['Lu','Ma','Me','Gi','Ve','Sa','Do'].forEach(d=>h+='<div class="cal-day-label">'+d+'</div>');
  for(let i=0;i<fd;i++)h+='<div></div>';
  for(let d=1;d<=dim;d++){const k=y+'-'+(m+1)+'-'+d,cls=(d===now.getDate()?'today ':''+(sd.has(k)?'has-session ':''+(bd.has(k)?'has-book':''))).trim();h+='<div class="cal-day '+cls+'">'+d+'</div>';}
  h+='</div><div style="padding:10px 20px;font-size:11px;color:var(--text3)"> Studio   Lettura</div>';
  c.innerHTML=h;
}

/* ── PVP ── */
let pvpTab='active',pendingRules=[];
function switchPvpTab(t){playSound('tap');pvpTab=t;document.querySelectorAll('#screen-pvp .tab').forEach((b,i)=>b.classList.toggle('active',['active','pending','history'][i]===t));renderPvP();}
function renderPvP(){
  const myC=DB.challenges.filter(c=>c.creator_id===CUR.id||c.joiner_id===CUR.id);
  const list=pvpTab==='active'?myC.filter(c=>c.status==='active'):pvpTab==='pending'?myC.filter(c=>c.status==='pending'):myC.filter(c=>c.status==='done');
  document.getElementById('pvp-container').innerHTML=list.length?list.map(renderChallengeCard).join(''):'<div class="empty"><div class="empty-emoji">⚔️</div><div class="empty-text">Nessuna sfida '+(pvpTab==='active'?'attiva':pvpTab==='pending'?'in attesa':'conclusa')+'.</div></div>';
}
function renderChallengeCard(ch){
  const iWon=ch.winner_id===CUR.id;
  const tl={athletic:'️ Atletica',mental:' Mentale',mixed:' Mista'}[ch.type]||ch.type;
  const tc={athletic:'ch-type-ath',mental:'ch-type-men',mixed:'ch-type-mix'}[ch.type]||'ch-type-men';
  return '<div class="challenge-card" onclick="viewChallenge(\''+ch.id+'\')">'
    +'<div class="challenge-head"><span class="ch-type-badge '+tc+'">'+tl+'</span><span class="challenge-title">'+escHtml(ch.title)+'</span></div>'
    +'<div class="challenge-meta">'+escHtml(ch.description||'')+'  Scad. '+(ch.deadline||'—')+'</div>'
    +'<div class="challenge-footer"><span class="challenge-stake">⚡ '+ch.stake+' XP</span>'
    +'<div style="display:flex;gap:5px;align-items:center">'
    +(ch.status==='done'?'<span class="tag '+(iWon?'tag-green':'tag-red')+'">'+(iWon?' Vinta':'❌ Persa')+'</span>':'')
    +(ch.status==='active'?'<button class="btn-sm btn-sm-primary" style="font-size:10px" onclick="event.stopPropagation();openDeclareWinner(\''+ch.id+'\')">Dichiara vincitore</button>':'')
    +'<span class="challenge-code">'+ch.code+'</span></div></div></div>';
}
function viewChallenge(id){
  const ch=DB.challenges.find(c=>c.id===id);if(!ch)return;
  const tl={athletic:'️ Atletica',mental:' Mentale',mixed:' Mista'}[ch.type]||ch.type;
  document.getElementById('challenge-detail-content').innerHTML=
    '<div class="modal-handle" style="margin:16px auto 14px"></div><div style="padding:0 22px 16px">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><span class="ch-type-badge ch-type-'+ch.type+'">'+tl+'</span><span style="font-size:17px;font-weight:800;flex:1">'+escHtml(ch.title)+'</span></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">'+escHtml(ch.description||'—')+'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">'
    +'<div class="card2"><div style="font-size:18px;font-weight:900;color:var(--gold)">'+ch.stake+'</div><div style="font-size:10px;color:var(--text3)">XP in palio</div></div>'
    +'<div class="card2"><div style="font-size:14px;font-weight:700">'+(ch.deadline||'—')+'</div><div style="font-size:10px;color:var(--text3)">Scadenza</div></div>'
    +'<div class="card2"><div style="font-size:13px;font-weight:700">'+escHtml(ch.creator_username||'—')+'</div><div style="font-size:10px;color:var(--text3)">Creatore</div></div>'
    +'<div class="card2"><div style="font-size:13px;font-weight:700">'+escHtml(ch.joiner_username||'In attesa...')+'</div><div style="font-size:10px;color:var(--text3)">Avversario</div></div>'
    +'</div>'
    +(ch.status==='active'?'<button class="btn-sm btn-sm-primary" style="width:100%;margin-bottom:10px" onclick="closeModal(\'modal-challenge-detail\');openDeclareWinner(\''+ch.id+'\')"> Dichiara vincitore</button>':'')
    +'<div style="text-align:center"><span class="challenge-code" onclick="copyCode(\''+ch.code+'\')">Codice: '+ch.code+' — tocca per copiare</span></div>'
    +'</div>';
  openModal('modal-challenge-detail');
}
function copyCode(c){navigator.clipboard.writeText(c).then(()=>showToast(' Codice copiato!')).catch(()=>showToast('Codice: '+c));}
function addRule(type){
  pendingRules=pendingRules||[];
  document.getElementById('rule-type').value=type;
  const titles={metrica:' Metrica',durata:'⏱️ Durata',condizione:' Condizione',penalita:'⚠️ Penalita'};
  document.getElementById('rule-modal-title').textContent=titles[type]||'Regola';
  const fields={
    metrica:'<label class="input-label">COSA SI MISURA</label><input class="sm sm-mb" id="rf-what" placeholder="es. pagine lette"><label class="input-label">OBIETTIVO</label><input class="sm sm-mb" id="rf-target" placeholder="es. chi arriva a 200">',
    durata:'<label class="input-label">DURATA</label><input class="sm sm-mb" id="rf-duration" placeholder="es. 7 giorni"><label class="input-label">INIZIO</label><input class="sm sm-mb" id="rf-start" type="date"><label class="input-label">FINE</label><input class="sm sm-mb" id="rf-end" type="date">',
    condizione:'<label class="input-label">CONDIZIONE</label><textarea class="sm sm-mb" id="rf-cond" placeholder="es. ogni giorno almeno 30min..."></textarea>',
    penalita:'<label class="input-label">PENALITA</label><input class="sm sm-mb" id="rf-pen" placeholder="es. -50 XP extra">'
  };
  document.getElementById('rule-fields').innerHTML=fields[type]||'';
  openModal('modal-add-rule');
}
function saveRule(){
  const type=document.getElementById('rule-type').value;let value='';
  if(type==='metrica')value=(document.getElementById('rf-what')?.value||'')+' — '+(document.getElementById('rf-target')?.value||'');
  else if(type==='durata'){const dur=document.getElementById('rf-duration')?.value||'',s=document.getElementById('rf-start')?.value||'',e=document.getElementById('rf-end')?.value||'';value=dur+(s?' dal '+s:'')+(e?' al '+e:'');}
  else if(type==='condizione')value=document.getElementById('rf-cond')?.value||'';
  else if(type==='penalita')value=document.getElementById('rf-pen')?.value||'';
  if(!value.trim()){showToast('⚠️ Compila i campi');return;}
  pendingRules.push({type,value});renderPendingRules();closeModal('modal-add-rule');
}
function renderPendingRules(){
  const list=document.getElementById('pvp-rules-list');if(!list)return;
  list.innerHTML=(pendingRules||[]).map((r,i)=>'<div class="rule-item"><div class="rule-item-type">'+r.type+'</div><div class="rule-item-value">'+escHtml(r.value)+'</div><button class="rule-item-remove" onclick="removeRule('+i+')">✕</button></div>').join('');
}
function removeRule(i){pendingRules.splice(i,1);renderPendingRules();}
async function createChallenge(){
  const title=document.getElementById('pvp-title').value.trim();if(!title){showToast('⚠️ Inserisci il titolo');return;}
  const stake=Math.min(20,Math.max(5,parseInt(document.getElementById('pvp-stake').value)||20)),code=randCode();
  const ch={id:uid(),creator_id:CUR.id,creator_username:CUR.username,joiner_id:null,joiner_username:null,type:document.getElementById('pvp-type').value,title,description:document.getElementById('pvp-desc').value,rules:[...(pendingRules||[])],stake,deadline:document.getElementById('pvp-deadline').value,code,status:'pending',created_at:ts()};
  DB.challenges.push(ch);saveDB();pendingRules=[];renderPendingRules();closeModal('modal-create-challenge');
  showToast('⚔️ Sfida creata! Codice: '+code);playSound('tap');renderPvP();
}
async function joinChallenge(){
  const code=document.getElementById('join-code-input').value.trim().toUpperCase();
  const ch=DB.challenges.find(c=>c.code===code);
  if(!ch){showToast('⚠️ Codice non trovato');return;}
  if(ch.creator_id===CUR.id){showToast('⚠️ Non puoi unirti alla tua sfida');return;}
  if(ch.joiner_id){showToast('⚠️ Sfida gia occupata');return;}
  ch.joiner_id=CUR.id;ch.joiner_username=CUR.username;ch.status='active';
  saveDB();document.getElementById('join-code-input').value='';
  showToast('⚔️ Sfida accettata!');playSound('xp');renderPvP();
}
function openDeclareWinner(id){document.getElementById('win-challenge-id').value=id;openModal('modal-declare-winner');}
async function declareWinner(who){
  const id=document.getElementById('win-challenge-id').value,ch=DB.challenges.find(c=>c.id===id);if(!ch)return;
  ch.status='done';
  if(who==='me'){ch.winner_id=CUR.id;awardXP(ch.stake,'sfide',' Sfida vinta: '+ch.title);}
  else if(who==='draw'){ch.winner_id='draw';awardXP(Math.floor(ch.stake/2),'sfide',' Pareggio: '+ch.title);}
  else{ch.winner_id=ch.creator_id===CUR.id?(ch.joiner_id||'opp'):ch.creator_id;}
  saveDB();closeModal('modal-declare-winner');closeModal('modal-challenge-detail');
  checkTrophies();renderPvP();
}

/* ── STATS ── */
let statsTab='stats';
function switchStatsTab(t){playSound('tap');statsTab=t;document.querySelectorAll('#screen-stats .tab').forEach((b,i)=>b.classList.toggle('active',['stats','leaderboard'][i]===t));renderStats();}
function renderStats(){if(statsTab==='stats')renderMyStats();else renderLeaderboard();}
function renderMyStats(){
  const u=getUser(CUR.id)||CUR,stats=u.stats||{},maxVal=Math.max(1,...Object.values(stats).map(Number));
  const trophies=u.trophies||[],wins=DB.challenges.filter(c=>c.winner_id===CUR.id).length;
  const totalQuests=DB.quests.filter(q=>q.user_id===CUR.id&&q.completed).length,totalBooks=DB.books.filter(b=>b.user_id===CUR.id&&b.completed).length;
  let h='<div style="padding:0 20px 20px">'
    +'<div style="display:flex;align-items:center;gap:16px;padding:16px 0">'
    +'<div class="profile-avatar-big" onclick="changeAvatar()">'
    +(u.avatar?'<img src="'+u.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':'<span style="font-size:28px;font-weight:900">'+u.username[0].toUpperCase()+'</span>')
    +'<div class="avatar-edit-overlay"></div></div>'
    +'<div style="flex:1"><div style="font-size:20px;font-weight:900">'+escHtml(u.username)+'</div>'
    +'<div style="font-size:12px;color:var(--accent2)">'+rankTitle(u.level||1)+'  Lv.'+(u.level||1)+'</div>'
    +'<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><span class="tag tag-xp">⚡ '+(u.xp_total||0).toLocaleString()+' XP</span><span class="streak-badge"> '+(u.streak_days||0)+' gg</span></div>'
    +'<div style="font-size:11px;color:var(--text3);margin-top:4px">'+((u.nations||[]).join('  ')||'Nessuna nazione impostata')+'</div>'
    +'</div></div>'
    +'<button class="btn-sm btn-sm-ghost" style="width:100%;margin-bottom:10px" onclick="openNationsModal()"> Modifica nazioni</button>'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:14px">'
    +'<div class="card2" style="text-align:center"><div style="font-size:18px;font-weight:900;color:var(--green)">'+wins+'</div><div style="font-size:10px;color:var(--text3)">Vittorie</div></div>'
    +'<div class="card2" style="text-align:center"><div style="font-size:18px;font-weight:900;color:var(--gold)">'+totalQuests+'</div><div style="font-size:10px;color:var(--text3)">Quest</div></div>'
    +'<div class="card2" style="text-align:center"><div style="font-size:18px;font-weight:900;color:var(--cyan)">'+totalBooks+'</div><div style="font-size:10px;color:var(--text3)">Libri</div></div>'
    +'</div>'
    +'<div style="text-align:center;margin-bottom:8px"><canvas id="stats-canvas" width="240" height="240"></canvas></div>'
    +'<div style="margin-bottom:14px">';
  Object.entries(STAT_COLORS).forEach(([k,col])=>{const v=stats[k]||0,p=Math.round((v/maxVal)*100);h+='<div class="stat-bar-row"><div class="stat-bar-label" style="color:'+col+'">'+k+'</div><div class="stat-bar-bg"><div class="stat-bar-fg" style="width:'+p+'%;background:'+col+'"></div></div><div class="stat-bar-val" style="color:'+col+'">'+v+'</div></div>';});
  h+='</div>'
    +'<div class="visibility-toggle" style="margin-bottom:12px"><div class="toggle-track '+(u.public_profile?'on':'')+'" id="profile-vis-toggle" onclick="toggleProfileVis()"><div class="toggle-knob"></div></div><span class="toggle-label" style="font-size:12px">Visibile in leaderboard</span></div>'
    +'<button class="btn-sm btn-sm-ghost" style="width:100%;margin-bottom:8px" onclick="openPrivacySettings()"> Privacy</button>'
    +'<div class="section-hd" style="margin-bottom:8px"><span class="section-title">Trofei ('+trophies.length+'/'+TROPHY_DEFS.length+')</span></div>';
  const cats=[...new Set(TROPHY_DEFS.map(d=>d.cat))];
  cats.forEach(cat=>{
    h+='<div style="font-size:10px;color:var(--text3);font-weight:800;text-transform:uppercase;letter-spacing:.8px;margin:10px 0 6px">'+cat+'</div><div class="trophy-grid" style="padding:0;margin-bottom:8px">';
    TROPHY_DEFS.filter(d=>d.cat===cat).forEach(def=>{const earned=trophies.find(t=>t.id===def.id);h+='<div class="trophy-item" style="'+(earned?'':'opacity:.3')+'"><div class="trophy-emoji">'+def.emoji+'</div><div class="trophy-name">'+def.name+'</div>'+(earned?'<div class="trophy-date">'+new Date(earned.earned_at).toLocaleDateString('it')+'</div>':'')+'</div>';});
    h+='</div>';
  });
  h+='<button class="btn-sm btn-sm-red" style="width:100%;margin-top:16px;margin-bottom:24px" onclick="doLogout()"> Esci dall\'account</button></div>';
  document.getElementById('stats-container').innerHTML=h;
  setTimeout(()=>drawRadar(stats,maxVal),50);
}
async function renderLeaderboard(){
  const container=document.getElementById('stats-container');
  container.innerHTML='<div style="text-align:center;padding:40px;color:var(--text3)">⏳ Caricamento leaderboard...</div>';
  let users=[];
  try{const r=await apiCall('GET_LEADERBOARD',{});if(r.success)users=r.leaderboard||[];}
  catch(e){}
  if(!users.length){
    users=DB.users.filter(u=>u.public_profile).map(u=>({id:u.id,username:u.username,xp_total:u.xp_total||0,level:u.level||1,streak_days:u.streak_days||0,avatar:u.avatar||'',nations:u.nations||[]})).sort((a,b)=>b.xp_total-a.xp_total);
    if(!users.length){container.innerHTML='<div class="empty"><div class="empty-emoji"></div><div class="empty-text">Sii il primo in classifica!<br><small style="color:var(--text3)">Attiva "Visibile in leaderboard" nel profilo</small></div></div>';return;}
    showToast('⚠️ Leaderboard offline');
  }
  const myN=new Set((getUser(CUR.id)||CUR).nations||[]);
  const rankCls=['gold','silver','bronze'];
  container.innerHTML='<div style="padding:0 20px 20px">'+users.map((u,i)=>{
    const isMe=CUR&&u.id===CUR.id;
    const av=u.avatar?'<img src="'+u.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':u.username[0].toUpperCase();
    const sameNation=(u.nations||[]).some(n=>myN.has(n));
    return '<div class="lb-row" style="'+(isMe?'border-color:var(--accent)':'')+'" onclick="viewUserProfile(\''+u.id+'\')">'
      +'<div class="lb-rank '+(rankCls[i]||'')+'">'+( i+1)+'</div>'
      +'<div class="lb-avatar">'+av+'</div>'
      +'<div class="lb-info"><div class="lb-name">'+escHtml(u.username)+(isMe?' ':'')+(sameNation&&!isMe?' ':'')+'</div><div class="lb-xp">'+(u.xp_total||0).toLocaleString()+' XP  '+(u.streak_days||0)+'</div></div>'
      +'<div class="lb-level">Lv.'+(u.level||1)+'</div></div>';
  }).join('')+'</div>';
}
function toggleProfileVis(){
  const u=getUser(CUR.id);if(!u)return;
  u.public_profile=!u.public_profile;saveDB();syncCUR(u);
  document.getElementById('profile-vis-toggle')?.classList.toggle('on',u.public_profile);
  showToast(u.public_profile?' Profilo pubblico':' Profilo privato');
  apiCall('SYNC_USER_DATA',buildUserPayload(u));
}
function drawRadar(stats,maxVal){
  const canvas=document.getElementById('stats-canvas');if(!canvas)return;
  const ctx=canvas.getContext('2d'),W=240,H=240,cx=120,cy=120,r=84,keys=Object.keys(STAT_COLORS),n=keys.length;
  ctx.clearRect(0,0,W,H);
  for(let g=1;g<=4;g++){ctx.beginPath();for(let i=0;i<n;i++){const a=(Math.PI*2*i/n)-Math.PI/2,x=cx+Math.cos(a)*r*(g/4),y=cy+Math.sin(a)*r*(g/4);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.closePath();ctx.strokeStyle='rgba(255,255,255,0.07)';ctx.lineWidth=1;ctx.stroke();}
  for(let i=0;i<n;i++){const a=(Math.PI*2*i/n)-Math.PI/2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.stroke();ctx.fillStyle='#8080a0';ctx.font='9px -apple-system,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(keys[i],cx+Math.cos(a)*(r+16),cy+Math.sin(a)*(r+16));}
  ctx.beginPath();for(let i=0;i<n;i++){const v=Math.min(1,(stats[keys[i]]||0)/maxVal),a=(Math.PI*2*i/n)-Math.PI/2;i===0?ctx.moveTo(cx+Math.cos(a)*r*v,cy+Math.sin(a)*r*v):ctx.lineTo(cx+Math.cos(a)*r*v,cy+Math.sin(a)*r*v);}
  ctx.closePath();ctx.fillStyle='rgba(124,106,247,.22)';ctx.fill();ctx.strokeStyle='#7c6af7';ctx.lineWidth=2;ctx.stroke();
  for(let i=0;i<n;i++){const v=Math.min(1,(stats[keys[i]]||0)/maxVal),a=(Math.PI*2*i/n)-Math.PI/2;ctx.beginPath();ctx.arc(cx+Math.cos(a)*r*v,cy+Math.sin(a)*r*v,4,0,Math.PI*2);ctx.fillStyle=Object.values(STAT_COLORS)[i];ctx.fill();}
}

/* ── NAZIONI ── */
function openNationsModal(){
  const u=getUser(CUR.id)||CUR,sel=new Set(u.nations||[]);
  document.getElementById('nations-content').innerHTML='<div class="modal-title"> Le tue nazioni</div>'
    +'<p style="font-size:12px;color:var(--text3);margin-bottom:12px">Seleziona le nazioni per filtrare il feed "Tutti".</p>'
    +'<div class="nations-grid">'+NATIONS.map(n=>'<div class="nation-chip'+(sel.has(n)?' selected':'')+'" onclick="this.classList.toggle(\'selected\');playSound(\'tap\')">'+n+'</div>').join('')+'</div>'
    +'<button class="btn-sm btn-sm-primary" style="width:100%;margin-top:14px" onclick="saveNations()">Salva</button>';
  openModal('modal-nations');
}
function saveNations(){
  const u=getUser(CUR.id);if(!u)return;
  u.nations=[...document.querySelectorAll('.nation-chip.selected')].map(el=>el.textContent);
  saveDB();syncCUR(u);closeModal('modal-nations');
  showToast(' Nazioni aggiornate!');
  apiCall('SYNC_USER_DATA',buildUserPayload(u));
}

/* ── AVATAR ── */
function changeAvatar(){
  pickImage(300,300,0.7,async d=>{
    const u=getUser(CUR.id);if(!u)return;
    u.avatar=d;saveDB();syncCUR(u);updateDashboard();renderMyStats();
    showToast(' Foto profilo aggiornata!');
    await apiCall('SYNC_USER_DATA',buildUserPayload(u));
  });
}

/* ── PRIVACY ── */
function openPrivacySettings(){
  const u=getUser(CUR.id),p=u?.privacy||{};
  const content=document.getElementById('privacy-content');if(!content)return;
  const toggle=(key,label)=>{const on=p[key]!==false;return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--bg3)"><div class="toggle-track '+(on?'on':'')+'" id="priv-'+key+'" onclick="this.classList.toggle(\'on\');playSound(\'tap\')" style="cursor:pointer;flex-shrink:0"><div class="toggle-knob"></div></div><span style="font-size:13px;color:var(--text)">'+label+'</span></div>';};
  content.innerHTML='<div class="modal-title"> Privacy</div>'
    +toggle('show_stats',' Mostra statistiche')
    +toggle('show_trophies',' Mostra trofei')
    +toggle('show_quests','⚔️ Mostra quest')
    +toggle('show_books',' Mostra libri')
    +toggle('show_streak',' Mostra streak')
    +toggle('show_xp','⚡ Mostra XP')
    +'<button class="btn-sm btn-sm-primary" style="width:100%;margin-top:14px" onclick="savePrivacy()">Salva</button>';
  openModal('modal-privacy');
}
async function savePrivacy(){
  const u=getUser(CUR.id);if(!u)return;
  if(!u.privacy)u.privacy={};
  ['show_stats','show_trophies','show_quests','show_books','show_streak','show_xp'].forEach(k=>{u.privacy[k]=!!document.getElementById('priv-'+k)?.classList.contains('on');});
  saveDB();syncCUR(u);closeModal('modal-privacy');showToast(' Privacy aggiornata!');
  await apiCall('SYNC_USER_DATA',buildUserPayload(u));
}

/* ── SCHERMATA AMICI ── */
function renderFriendsScreen(){
  const u=getUser(CUR.id)||CUR,friends=u.friends||[],names=u.friend_names||{};
  let h='<div style="padding:0 20px 24px">'
    +'<div style="display:flex;gap:8px;margin-bottom:16px">'
    +'<input class="sm" id="fs-search-input" placeholder="Cerca username..." style="flex:1;margin:0" onkeydown="if(event.key===\'Enter\')searchUsers()">'
    +'<button class="btn-sm btn-sm-primary" onclick="searchUsers()">Cerca</button></div>'
    +'<div id="fs-search-results" style="margin-bottom:16px"></div>'
    +'<div class="section-hd"><span class="section-title">I tuoi amici ('+friends.length+')</span></div>'
    +'<div id="fs-friends-list">';
  if(!friends.length){
    h+='<div class="empty" style="padding:20px 0"><div class="empty-emoji"></div><div class="empty-text">Nessun amico ancora.<br>Cerca per username!</div></div>';
  }else{
    friends.forEach(id=>{
      const fu=getUser(id),name=fu?.username||names[id]||id;
      const av=fu?.avatar?'<img src="'+fu.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':name[0].toUpperCase();
      h+='<div class="friend-row">'
        +'<div class="lb-avatar" onclick="viewUserProfile(\''+id+'\')" style="cursor:pointer">'+av+'</div>'
        +'<div style="flex:1;cursor:pointer" onclick="viewUserProfile(\''+id+'\')">'
        +'<div style="font-weight:700;font-size:14px">'+escHtml(name)+'</div>'
        +'<div style="font-size:11px;color:var(--text3)">'+(fu?rankTitle(fu.level||1)+'  Lv.'+(fu.level||1)+'  '+(fu.xp_total||0).toLocaleString()+' XP':'')+'</div>'
        +'</div>'
        +'<button class="btn-sm btn-sm-ghost" style="margin-right:4px" onclick="viewUserProfile(\''+id+'\')">️</button>'
        +'<button class="btn-sm btn-sm-red" onclick="confirmRemoveFriend(\''+id+'\',\''+escHtml(name)+'\')">✕</button>'
        +'</div>';
    });
  }
  h+='</div></div>';
  document.getElementById('friends-container').innerHTML=h;
}
async function searchUsers(){
  const query=(document.getElementById('fs-search-input')?.value||'').trim();
  if(query.length<2){showToast('⚠️ Min 2 caratteri');return;}
  const resultEl=document.getElementById('fs-search-results');if(!resultEl)return;
  resultEl.innerHTML='<div style="color:var(--text3);font-size:12px;padding:8px 0">Ricerca in corso...</div>';
  let matches=DB.users.filter(u=>u.id!==CUR.id&&u.username.toLowerCase().includes(query.toLowerCase()));
  try{
    const r=await apiCall('SEARCH_USERS',{query});
    if(r.success&&r.users){
      r.users.forEach(ru=>{
        if(!DB.users.find(x=>x.id===ru.id)){ru.trophies=[];ru.privacy={};ru.friends=[];ru.friend_names={};ru.avatar=ru.avatar||'';ru.nations=ru.nations||[];DB.users.push(ru);}
        else{const idx=DB.users.findIndex(x=>x.id===ru.id);if(idx>=0){DB.users[idx]={...DB.users[idx],xp_total:ru.xp_total,level:ru.level,avatar:ru.avatar,nations:ru.nations};}}
      });
      saveDB();
      matches=DB.users.filter(u=>u.id!==CUR.id&&u.username.toLowerCase().includes(query.toLowerCase()));
    }
  }catch(e){}
  if(!matches.length){resultEl.innerHTML='<div style="color:var(--text3);font-size:12px;padding:8px 0">Nessun utente trovato.</div>';return;}
  const myUser=getUser(CUR.id),friends=new Set(myUser?.friends||[]);
  resultEl.innerHTML='<div class="section-hd" style="margin-bottom:8px"><span class="section-title">Risultati ('+matches.length+')</span></div>'
    +matches.map(found=>{
      const isFriend=friends.has(found.id);
      const av=found.avatar?'<img src="'+found.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':found.username[0].toUpperCase();
      return '<div class="friend-row">'
        +'<div class="lb-avatar" onclick="viewUserProfile(\''+found.id+'\')" style="cursor:pointer">'+av+'</div>'
        +'<div style="flex:1;cursor:pointer" onclick="viewUserProfile(\''+found.id+'\')">'
        +'<div style="font-weight:700;font-size:14px">'+escHtml(found.username)+'</div>'
        +'<div style="font-size:11px;color:var(--text3)">'+rankTitle(found.level||1)+'  Lv.'+(found.level||1)+'  '+(found.xp_total||0).toLocaleString()+' XP</div>'
        +'</div>'
        +'<button class="btn-sm '+(isFriend?'btn-sm-red':'btn-sm-primary')+'" style="margin-right:4px" onclick="'+(isFriend?'confirmRemoveFriend(\''+found.id+'\',\''+escHtml(found.username)+'\')':'addFriend(\''+found.id+'\',\''+escHtml(found.username)+'\')')+'">'+(isFriend?'✕ Rimuovi':'+ Aggiungi')+'</button>'
        +'<button class="btn-sm btn-sm-ghost" onclick="viewUserProfile(\''+found.id+'\')">️</button>'
        +'</div>';
    }).join('');
}
function addFriend(friendId,friendUsername){
  playSound('xp');
  const u=getUser(CUR.id);if(!u)return;
  if(!u.friends)u.friends=[];if(!u.friend_names)u.friend_names={};
  if(u.friends.includes(friendId)){showToast('Gia amici!');return;}
  u.friends.push(friendId);u.friend_names[friendId]=friendUsername;
  saveDB();syncCUR(u);showToast('✅ '+friendUsername+' aggiunto!');
  checkTrophies();renderFriendsScreen();
  apiCall('SYNC_USER_DATA',buildUserPayload(u));
}
function confirmRemoveFriend(id,name){
  if(!confirm('Rimuovere '+name+' dagli amici?'))return;
  const u=getUser(CUR.id);if(!u||!u.friends)return;
  u.friends=u.friends.filter(x=>x!==id);if(u.friend_names)delete u.friend_names[id];
  saveDB();syncCUR(u);showToast('Rimosso.');
  apiCall('SYNC_USER_DATA',buildUserPayload(u));
  renderFriendsScreen();
}

/* ── PROFILO UTENTE ── */
function viewUserProfile(userId){
  let u=DB.users.find(x=>x.id===userId);
  if(u){
    _openProfileModal(u);
    apiCall('GET_USER_DATA',{user_id:userId}).then(r=>{if(r.success&&r.user){const idx=DB.users.findIndex(x=>x.id===userId);if(idx>=0){DB.users[idx]={...DB.users[idx],xp_total:r.user.xp_total,level:r.user.level,streak_days:r.user.streak_days,avatar:r.user.avatar,nations:r.user.nations,stats:r.user.stats};saveDB();}}}).catch(()=>{});
    return;
  }
  showLoading('Caricamento profilo...');
  apiCall('GET_USER_DATA',{user_id:userId}).then(r=>{
    hideLoading();
    if(r.success&&r.user){
      const ru=r.user;ru.trophies=[];ru.privacy={};ru.friends=[];ru.friend_names={};ru.avatar=ru.avatar||'';ru.nations=ru.nations||[];
      DB.users.push(ru);saveDB();_openProfileModal(ru);
    }else showToast('Utente non trovato.');
  }).catch(()=>{hideLoading();showToast('Errore caricamento.');});
}
function _openProfileModal(u){
  const isMe=u.id===CUR.id,priv=u.privacy||{};
  const myUser=getUser(CUR.id),isFriend=(myUser?.friends||[]).includes(u.id);
  const av=u.avatar?'<img src="'+u.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':u.username[0].toUpperCase();
  const wins=DB.challenges.filter(c=>c.winner_id===u.id).length;
  const visQ=DB.quests.filter(q=>q.user_id===u.id&&q.completed);
  const visB=DB.books.filter(b=>b.user_id===u.id&&b.completed);
  let h='<div class="profile-header"><div class="profile-avatar">'+av+'</div>'
    +'<div class="profile-username">'+escHtml(u.username)+'</div>'
    +'<div class="profile-rank">'+rankTitle(u.level||1)+'  Lv.'+(u.level||1)+'</div>'
    +'<div style="font-size:11px;color:var(--text3);margin-top:4px">'+((u.nations||[]).join('  ')||'')+'</div>'
    +'<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;justify-content:center">'
    +(priv.show_xp!==false?'<span class="tag tag-xp">⚡ '+(u.xp_total||0).toLocaleString()+' XP</span>':'')
    +(priv.show_streak!==false?'<span class="streak-badge"> '+(u.streak_days||0)+' gg</span>':'')
    +'<span class="tag tag-green"> '+wins+' vittorie</span></div>'
    +(!isMe?'<div style="display:flex;gap:8px;margin-top:14px"><button class="btn-sm '+(isFriend?'btn-sm-red':'btn-sm-primary')+'" style="flex:1" onclick="'+(isFriend?'confirmRemoveFriend(\''+u.id+'\',\''+escHtml(u.username)+'\');closeModal(\'modal-profile\')':'addFriend(\''+u.id+'\',\''+escHtml(u.username)+'\');closeModal(\'modal-profile\')')+'">'+(isFriend?'✕ Rimuovi amico':'+ Aggiungi amico')+'</button></div>':'')
    +'</div>'
    +'<div style="padding:14px 20px">';
  if(priv.show_stats!==false){
    const st=u.stats||{},maxV=Math.max(1,...Object.values(st).map(Number));
    h+='<div class="section-hd"><span class="section-title">Statistiche</span></div><div style="margin-bottom:14px">';
    Object.entries(STAT_COLORS).forEach(([k,col])=>{const v=st[k]||0,p=Math.round((v/maxV)*100);h+='<div class="stat-bar-row"><div class="stat-bar-label" style="color:'+col+'">'+k+'</div><div class="stat-bar-bg"><div class="stat-bar-fg" style="width:'+p+'%;background:'+col+'"></div></div><div class="stat-bar-val" style="color:'+col+'">'+v+'</div></div>';});
    h+='</div>';
  }
  if(priv.show_books!==false&&visB.length){h+='<div class="section-hd"><span class="section-title">Libri ('+visB.length+')</span></div>';visB.slice(0,6).forEach(b=>{h+='<div class="session-row"><div class="session-dot" style="background:var(--orange)"></div><div class="session-info"><div class="session-name">'+(b.emoji||'')+' '+escHtml(b.title)+'</div><div class="session-time">'+escHtml(b.author||'')+'  '+diffStars(b.difficulty)+'</div></div></div>';});}
  if(priv.show_quests!==false&&visQ.length){h+='<div class="section-hd" style="margin-top:10px"><span class="section-title">Quest ('+visQ.length+')</span></div>';visQ.slice(0,8).forEach(q=>{const d=q.completed_at?new Date(q.completed_at).toLocaleDateString('it'):'';h+='<div class="session-row"><div class="session-dot"></div><div class="session-info"><div class="session-name">'+escHtml(q.name)+'</div><div class="session-time">'+q.category+'  '+q.xp_base+' XP'+(d?'  '+d:'')+'</div></div></div>';});}
  if(priv.show_trophies!==false&&(u.trophies||[]).length){h+='<div class="section-hd" style="margin-top:10px"><span class="section-title">Trofei ('+u.trophies.length+')</span></div><div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">';u.trophies.forEach(t=>{const def=TROPHY_DEFS.find(d=>d.id===t.id);if(def)h+='<span style="font-size:22px" title="'+def.name+'">'+def.emoji+'</span>';});h+='</div>';}
  h+='</div>';
  document.getElementById('profile-content').innerHTML=h;
  openModal('modal-profile');
}

/* ── MODALI ── */
function openModal(id){document.getElementById(id)?.classList.add('open');playSound('open');}
function closeModal(id){document.getElementById(id)?.classList.remove('open');}

async function doResetPin(){
  const username=document.getElementById('pr-user').value.trim(),pin=document.getElementById('pr-pin').value.trim(),newPass=document.getElementById('pr-newpass').value,errEl=document.getElementById('pr-error');
  if(!username||!/^\d{4}$/.test(pin)||newPass.length<6){errEl.textContent='Compila tutti i campi (password min. 6 char.)';return;}
  const pin_hash=await hashStr(pin+'lq_pin_v2'),new_password_hash=await hashStr(newPass+'lq_salt_v2');
  errEl.textContent='Verifica in corso...';
  const result=await apiCall('RESET_PIN',{username,pin_hash,new_password_hash});
  if(result.success){closeModal('modal-pin-reset');showToast('✅ Password reimpostata!');}
  else errEl.textContent=result.message||'PIN o username errati.';
}

function doLogout(){
  if(!confirm('Vuoi davvero uscire dall\'account?'))return;
  CUR=null;
  localStorage.removeItem('lq_cur_v5');localStorage.removeItem('lq_cur_v4');localStorage.removeItem('lq_cur_v3');localStorage.removeItem('lq_cur_v2');
  document.getElementById('app').style.display='none';
  document.getElementById('auth-screen').style.display='';
  document.getElementById('l-user').value='';document.getElementById('l-pass').value='';
  document.getElementById('auth-error').textContent='';
  showToast(' Logout effettuato');
}

/* ── BOOT ── */
function bootApp(){
  document.getElementById('auth-screen').style.display='none';
  document.getElementById('app').style.display='flex';
  updateDashboard();renderHome();checkTrophies();
  pendingRules=[];renderPendingRules();
}

window.addEventListener('load',()=>{
  if(!CUR){
    try{CUR=JSON.parse(localStorage.getItem('lq_cur_v4')||localStorage.getItem('lq_cur_v3')||localStorage.getItem('lq_cur_v2')||'null');}catch(e){}
    if(CUR)localStorage.setItem('lq_cur_v5',JSON.stringify(CUR));
  }
  if(CUR){
    let u=getUser(CUR.id);
    if(!u){u={...CUR};DB.users.push(u);}
    if(!u.nations)u.nations=[];
    if(!u.friends)u.friends=[];
    if(!u.friend_names)u.friend_names={};
    if(!u.trophies)u.trophies=[];
    if(!u.privacy)u.privacy={};
    if(!u.stats)u.stats={mente:0,corpo:0,cultura:0,sociale:0,'produttivita':0,sfide:0};
    saveDB();syncCUR(u);bootApp();
    apiCall('GET_USER_DATA',{user_id:u.id}).then(r=>{
      if(r.success&&r.user){
        const cu=r.user;
        u.xp_total=Math.max(u.xp_total||0,cu.xp_total||0);
        u.level=Math.max(u.level||1,cu.level||1);
        u.streak_days=Math.max(u.streak_days||0,cu.streak_days||0);
        if(cu.stats)Object.keys(cu.stats).forEach(k=>{u.stats[k]=Math.max(u.stats[k]||0,cu.stats[k]||0);});
        if(cu.nations?.length&&!u.nations.length)u.nations=cu.nations;
        if(cu.avatar&&!u.avatar)u.avatar=cu.avatar;
        saveDB();syncCUR(u);updateDashboard();
      }
    }).catch(()=>{});
  }
});
