var appStartTime = Date.now();

/* ============================================================
   Set this to your deployed Cloudflare Worker URL for the best
   experience (see worker/DEPLOY.md). Leave blank to use the
   public proxy fallbacks only.
   Example: "https://camos-proxy.yourname.workers.dev"
   ============================================================ */
var CAMOS_PROXY = "https://camos.detlaffcameron.workers.dev/";

function workerBase(){return CAMOS_PROXY.replace(/\/$/,'');}
function P_WORKER(u){return workerBase()+'/?u='+encodeURIComponent(u);}
function P_CORSPROXY(u){return 'https://corsproxy.io/?url='+encodeURIComponent(u);}
function P_ALLORIGINS(u){return 'https://api.allorigins.win/raw?url='+encodeURIComponent(u);}
function P_ALLORIGINS_GET(u){return 'https://api.allorigins.win/get?url='+encodeURIComponent(u);}
function P_CODETABS(u){return 'https://api.codetabs.com/v1/proxy/?quest='+encodeURIComponent(u);}

/* Three-tier fallback chain:
   1. The Cloudflare Worker directly (best - rewrites everything server-side)
   2. The public proxies directly (different IPs, may dodge blocks)
   3. The public proxies wrapped INSIDE the Worker (stacked - Worker fetches
      the public-proxy URL, so a target blocking the Worker's IP can still be
      reached via a public proxy's IP, while still getting Worker rewriting)
*/
function htmlProxyChain(){
  var tiers=[];
  if(CAMOS_PROXY){
    tiers.push({fn:P_WORKER,worker:true,label:'CamOS Proxy'});
  }
  tiers.push({fn:P_CORSPROXY,worker:false,label:'corsproxy'});
  tiers.push({fn:P_ALLORIGINS,worker:false,label:'allorigins'});
  tiers.push({fn:P_CODETABS,worker:false,label:'codetabs'});
  tiers.push({fn:P_ALLORIGINS_GET,worker:false,label:'allorigins-json'});
  if(CAMOS_PROXY){
    tiers.push({fn:function(u){return P_WORKER(P_CORSPROXY(u));},worker:true,label:'CamOS+corsproxy'});
    tiers.push({fn:function(u){return P_WORKER(P_CODETABS(u));},worker:true,label:'CamOS+codetabs'});
  }
  return tiers;
}
var USING_WORKER=false;

var FS = {
  '/': {type:'dir',children:{
    home:{type:'dir',children:{cameron:{type:'dir',children:{
      readme:{type:'file',content:'Welcome to CamOS v3.0\nBuilt by Cameron.\n\nTry: ls, cd, cat readme, neofetch, help'},
      notes:{type:'file',content:'# My Notes\n\n- NEXUS platform\n- CamOS browser\n- Game dev projects\n'},
      '.camshrc':{type:'file',content:'export USER=cameron\nexport HOME=/home/cameron'},
      projects:{type:'dir',children:{nexus:{type:'file',content:'NEXUS - realtime chat\nStack: Firebase + vanilla JS'}}}
    }}}},
    etc:{type:'dir',children:{hostname:{type:'file',content:'camos'}}},
    tmp:{type:'dir',children:{}}
  }}
};
var CWD='/home/cameron', HIST=[], HISTI=-1;
var zTop=10, maxed={}, savedBounds={};
var brTabs=[], brCurTab=-1, downloads=[];
var npFiles={}, npCurrent='untitled.txt', npWrap=false;
var wpIdx=0;
var WP=[
  {name:'Twilight',css:'radial-gradient(ellipse at 20% 10%,#2a2150 0%,transparent 55%),radial-gradient(ellipse at 80% 90%,#0f3460 0%,transparent 55%),linear-gradient(135deg,#0a0a18,#12122a)'},
  {name:'Graphite',css:'linear-gradient(135deg,#0d1117,#161b22,#1a1a2e)'},
  {name:'Amethyst',css:'radial-gradient(ellipse at 70% 20%,#3c1f6e 0%,transparent 60%),linear-gradient(160deg,#160a2e,#0a0a1a)'},
  {name:'Deep Sea',css:'linear-gradient(135deg,#0a1628,#0f2744,#143d6b)'},
  {name:'Forest',css:'radial-gradient(ellipse at 30% 80%,#0f3a2a 0%,transparent 55%),linear-gradient(135deg,#0a1a12,#0a0f0a)'},
  {name:'Ember',css:'radial-gradient(ellipse at 50% 0%,#3a1616 0%,transparent 60%),linear-gradient(135deg,#1a0a0a,#0f0606)'},
  {name:'Teal Night',css:'linear-gradient(135deg,#0a0a1a,#0a1a2a,#0a2a2a)'},
  {name:'Aurora',css:'radial-gradient(ellipse at 15% 25%,#1a4a4a 0%,transparent 50%),radial-gradient(ellipse at 85% 75%,#3a1f6e 0%,transparent 50%),linear-gradient(135deg,#06080f,#0a0a1a)'},
  {name:'Sunset',css:'radial-gradient(ellipse at 50% 100%,#5a2a3a 0%,transparent 60%),radial-gradient(ellipse at 50% 0%,#2a2a5a 0%,transparent 55%),linear-gradient(160deg,#0a0612,#0f0a18)'},
  {name:'Midnight',css:'linear-gradient(135deg,#000005,#08081a,#0a0a22)'}
];
var customWP=[];
function allWallpapers(){return WP.concat(customWP);}
function applyWallpaper(i){
  var all=allWallpapers();
  if(i<0||i>=all.length)return;
  wpIdx=i;
  var w=all[i];
  var d=document.getElementById('desktop');
  if(w.image){d.style.background='#06060f';d.style.backgroundImage='url('+w.image+')';d.style.backgroundSize='cover';d.style.backgroundPosition='center';}
  else{d.style.backgroundImage='';d.style.background=w.css;}
}
var NICONS={welcome:'ti-device-desktop',bookmark:'ti-bookmark',notepad:'ti-file-text',wallpaper:'ti-palette',info:'ti-info-circle',error:'ti-alert-circle',download:'ti-download'};
var ntimer=null, modalCB=null, bootIdx=0, bootAnimId=null;
var BOOT_STEPS=[
  'Initializing CamOS kernel 3.0',
  'Probing virtual hardware',
  'Mounting filesystem /dev/vda1',
  'Loading device drivers',
  'Bringing up network interface',
  'Starting camsh service',
  'Launching window manager',
  'Loading desktop environment',
  'Finalizing user session',
  'Welcome'
];

/* ============ BOOT ============ */
function initBootCanvas(){
  var canvas=document.getElementById('boot-canvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  function resize(){canvas.width=window.innerWidth;canvas.height=window.innerHeight;}
  resize(); window.addEventListener('resize',resize);

  var stars=[];
  for(var i=0;i<140;i++)stars.push({x:Math.random(),y:Math.random(),z:Math.random()*0.9+0.1,tw:Math.random()*Math.PI*2});

  var orbs=[];
  for(var k=0;k<5;k++)orbs.push({a:Math.random()*Math.PI*2,r:0.18+k*0.07,sp:(0.0006+Math.random()*0.0008)*(k%2?1:-1),size:2+Math.random()*2});

  function frame(){
    var W=canvas.width,H=canvas.height,cx=W/2,cy=H*0.42;
    ctx.clearRect(0,0,W,H);
    var t=Date.now()/1000;

    var bg=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(W,H)*0.75);
    bg.addColorStop(0,'rgba(44,36,98,0.30)');
    bg.addColorStop(0.5,'rgba(20,16,48,0.10)');
    bg.addColorStop(1,'rgba(5,4,14,0)');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    for(var i=0;i<stars.length;i++){
      var st=stars[i];
      var x=st.x*W, y=st.y*H;
      var tw=0.4+0.6*Math.abs(Math.sin(t*1.5+st.tw));
      ctx.beginPath(); ctx.arc(x,y,st.z*1.3,0,Math.PI*2);
      ctx.fillStyle='rgba(159,153,238,'+(st.z*0.5*tw)+')'; ctx.fill();
      st.y+=0.00018*st.z; if(st.y>1)st.y=0;
    }

    var minWH=Math.min(W,H);
    for(var ri=0;ri<3;ri++){
      var rad=minWH*(0.16+ri*0.07);
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(t*(0.12*(ri%2?-1:1)));
      ctx.beginPath();
      var seg=6;
      for(var ss=0;ss<=seg;ss++){
        var ang=(Math.PI*2/seg)*ss;
        var px=Math.cos(ang)*rad, py=Math.sin(ang)*rad;
        if(ss===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
      }
      ctx.strokeStyle='rgba(127,119,221,'+(0.10-ri*0.02)+')';
      ctx.lineWidth=1; ctx.stroke();
      ctx.restore();
    }

    for(var o=0;o<orbs.length;o++){
      var ob=orbs[o]; ob.a+=ob.sp*60;
      var ox=cx+Math.cos(ob.a)*minWH*ob.r;
      var oy=cy+Math.sin(ob.a)*minWH*ob.r;
      var g=ctx.createRadialGradient(ox,oy,0,ox,oy,ob.size*4);
      g.addColorStop(0,'rgba(159,153,238,0.8)');
      g.addColorStop(1,'rgba(159,153,238,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(ox,oy,ob.size*4,0,Math.PI*2); ctx.fill();
    }

    bootAnimId=requestAnimationFrame(frame);
  }
  frame();
}
function stopBootCanvas(){ if(bootAnimId){cancelAnimationFrame(bootAnimId);bootAnimId=null;} }

function bootStep(){
  if(bootIdx>=BOOT_STEPS.length){
    var st=document.getElementById('boot-status');if(st)st.textContent='Welcome to CamOS';
    stopBootCanvas();
    setTimeout(function(){
      var bs=document.getElementById('boot');
      bs.style.transition='opacity 0.7s'; bs.style.opacity='0';
      setTimeout(function(){bs.style.display='none';showLogin();},700);
    },500);
    return;
  }
  var msg=BOOT_STEPS[bootIdx];
  var progress=Math.round((bootIdx+1)/BOOT_STEPS.length*100);
  var fill=document.getElementById('boot-bar-fill');
  var pct=document.getElementById('boot-pct');
  var status=document.getElementById('boot-status');
  var log=document.getElementById('boot-log');
  if(fill)fill.style.width=progress+'%';
  if(pct)pct.textContent=progress+'%';
  if(status)status.textContent=msg;
  if(log){
    var line=document.createElement('div');
    line.className='boot-log-line';
    line.innerHTML='<span class="bll-ok">[ <i class="ti ti-check"></i> ]</span> '+msg;
    log.appendChild(line);
    while(log.children.length>5)log.removeChild(log.firstChild);
  }
  bootIdx++;
  setTimeout(bootStep,260+Math.random()*220);
}

/* ============ LOGIN ============ */
function initLoginCanvas(){
  var canvas=document.getElementById('login-canvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  function resize(){canvas.width=window.innerWidth;canvas.height=window.innerHeight;}
  resize(); window.addEventListener('resize',resize);
  var pts=[];
  for(var i=0;i<55;i++)pts.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height,vx:(Math.random()-0.5)*0.25,vy:(Math.random()-0.5)*0.25,r:Math.random()*1.6+0.4});
  function frame(){
    var W=canvas.width,H=canvas.height;
    ctx.clearRect(0,0,W,H);
    for(var i=0;i<pts.length;i++){
      var p=pts[i]; p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle='rgba(127,119,221,0.45)';ctx.fill();
      for(var j=i+1;j<pts.length;j++){
        var q=pts[j],dx=p.x-q.x,dy=p.y-q.y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<130){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle='rgba(83,74,183,'+((1-d/130)*0.18)+')';ctx.lineWidth=0.5;ctx.stroke();}
      }
    }
    window._loginAnim=requestAnimationFrame(frame);
  }
  frame();
}
function showLogin(){
  var ls=document.getElementById('login');
  ls.style.display='flex'; ls.style.opacity='0'; ls.style.transition='opacity 0.6s';
  initLoginCanvas();
  setTimeout(function(){ls.style.opacity='1';document.getElementById('login-pw').focus();},50);
  tickLoginClock(); window._lci=setInterval(tickLoginClock,1000);
}
function tickLoginClock(){
  var d=new Date();
  var t=document.getElementById('login-time');
  var dt=document.getElementById('login-date');
  if(t)t.textContent=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  if(dt)dt.textContent=d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'});
}
function doLogin(){
  var pw=document.getElementById('login-pw').value;
  if(pw===''||pw==='1234'){
    clearInterval(window._lci);
    if(window._loginAnim)cancelAnimationFrame(window._loginAnim);
    var ls=document.getElementById('login');
    ls.style.transition='opacity 0.5s'; ls.style.opacity='0';
    setTimeout(function(){ls.style.display='none';startDesktop();},500);
  }else{
    var err=document.getElementById('login-err');
    var card=document.getElementById('login-card');
    err.textContent='Incorrect password';
    card.style.animation='shake 0.4s';
    setTimeout(function(){card.style.animation='';},400);
    document.getElementById('login-pw').value='';
    setTimeout(function(){err.textContent='';},3000);
  }
}
function doLogout(){
  closeMenu();
  ['terminal','browser','notepad','sysinfo','files'].forEach(closeApp);
  var d=document.getElementById('desktop');
  d.style.transition='opacity 0.4s'; d.style.opacity='0';
  setTimeout(function(){d.style.display='none';d.style.opacity='1';document.getElementById('login-pw').value='';showLogin();},400);
}

/* ============ DESKTOP ============ */
function initDesktopCanvas(){
  var c=document.getElementById('desktop-canvas');
  if(!c)return;
  var ctx=c.getContext('2d'),pts=[];
  function resize(){c.width=window.innerWidth;c.height=window.innerHeight-44;}
  resize(); window.addEventListener('resize',resize);
  for(var i=0;i<26;i++)pts.push({x:Math.random()*c.width,y:Math.random()*c.height,vx:(Math.random()-0.5)*0.1,vy:(Math.random()-0.5)*0.1,r:Math.random()+0.2,a:Math.random()*0.12+0.03});
  function draw(){
    ctx.clearRect(0,0,c.width,c.height);
    pts.forEach(function(p){p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=c.width;if(p.x>c.width)p.x=0;if(p.y<0)p.y=c.height;if(p.y>c.height)p.y=0;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,'+p.a+')';ctx.fill();});
    requestAnimationFrame(draw);
  }
  draw();
}
function startDesktop(){
  var d=document.getElementById('desktop');
  d.style.display='block'; d.style.opacity='0'; d.style.transition='opacity 0.5s';
  setTimeout(function(){d.style.opacity='1';},50);
  initDesktopCanvas();
  tickClock(); setInterval(tickClock,1000); setInterval(siPoll,2500);
  setTimeout(function(){showNotif('welcome','Welcome to CamOS! Double-click icons to open apps.');},900);
}

/* ============ FILESYSTEM / TERMINAL ============ */
function resolvePath(p){
  if(!p||p==='~')return'/home/cameron';
  if(!p.startsWith('/'))p=CWD+'/'+p;
  var parts=p.split('/').filter(Boolean),stack=[];
  parts.forEach(function(s){if(s==='..')stack.pop();else if(s!=='.')stack.push(s);});
  return'/'+stack.join('/');
}
function getNode(path){
  var parts=path.split('/').filter(Boolean),node=FS['/'];
  for(var i=0;i<parts.length;i++){if(!node||!node.children)return null;node=node.children[parts[i]];if(!node)return null;}
  return node;
}
function cwdNode(){return getNode(CWD);}
var CMDS={
  help:function(){return 'Commands: ls cd pwd cat echo mkdir touch rm clear date whoami uname uptime neofetch';},
  pwd:function(){return CWD;},
  whoami:function(){return 'cameron';},
  hostname:function(){return 'camos';},
  uname:function(){return 'CamOS 3.0 '+(navigator.platform||'Browser');},
  date:function(){return new Date().toString();},
  uptime:function(){var s=Math.floor((Date.now()-appStartTime)/1000);return'up '+Math.floor(s/60)+'m '+(s%60)+'s';},
  clear:function(){document.getElementById('t-out').innerHTML='';return null;},
  ls:function(a){var path=a[0]?resolvePath(a[0]):CWD,n=getNode(path);if(!n)return'ls: '+a[0]+': No such file or directory';if(n.type!=='dir')return a[0]||path;var it=Object.entries(n.children);if(!it.length)return'';return it.map(function(e){return'<span style="color:'+(e[1].type==='dir'?'#8888ff':'#33ff88')+'">'+e[0]+(e[1].type==='dir'?'/':'')+'</span>';}).join('  ');},
  cd:function(a){var path=resolvePath(a[0]||'~'),n=getNode(path);if(!n)return'cd: '+(a[0]||'')+': No such directory';if(n.type!=='dir')return'cd: '+a[0]+': Not a directory';CWD=path||'/';return'';},
  cat:function(a){if(!a[0])return'cat: missing operand';var n=getNode(resolvePath(a[0]));if(!n)return'cat: '+a[0]+': No such file';if(n.type==='dir')return'cat: '+a[0]+': Is a directory';return n.content;},
  echo:function(a){return a.join(' ');},
  mkdir:function(a){if(!a[0])return'mkdir: missing operand';var p=cwdNode();if(!p)return'error';if(p.children[a[0]])return'mkdir: '+a[0]+': exists';p.children[a[0]]={type:'dir',children:{}};return'';},
  touch:function(a){if(!a[0])return'touch: missing operand';var p=cwdNode();if(!p)return'error';if(!p.children[a[0]])p.children[a[0]]={type:'file',content:''};return'';},
  rm:function(a){if(!a[0])return'rm: missing operand';var p=cwdNode();if(!p||!p.children[a[0]])return'rm: '+a[0]+': No such file';delete p.children[a[0]];return'';},
  neofetch:function(){return'<span style="color:#7F77DD">   /\\    </span>  <span style="color:#9090dd">cameron</span><span style="color:#555">@</span><span style="color:#9090dd">camos</span>\n<span style="color:#534AB7">  /  \\   </span>  OS: CamOS 3.0\n<span style="color:#534AB7"> / /\\ \\  </span>  Shell: camsh 3.0\n<span style="color:#3c34a0">/_/  \\_\\ </span>  CPU: '+(navigator.hardwareConcurrency||'?')+' threads\n           Res: '+window.screen.width+'x'+window.screen.height;}
};
function runCmd(line){
  line=line.trim();if(!line)return'';
  var parts=line.split(/\s+/),cmd=parts[0],args=parts.slice(1);
  var al={ll:'ls',cls:'clear'};if(al[cmd])cmd=al[cmd];
  if(CMDS[cmd])return CMDS[cmd](args);
  return'<span style="color:#e05d5d">'+cmd+': command not found</span>';
}

/* ============ BROWSER ============ */
function $br(id){var w=document.getElementById('win-browser');return w?w.querySelector('#'+id):null;}

window.addEventListener('message',function(e){
  if(!e.data||typeof e.data!=='object')return;
  if(e.data.type==='CAMOS_NAV'&&typeof e.data.url==='string')brGo(e.data.url);
  if(e.data.type==='CAMOS_DL'&&typeof e.data.url==='string')brDownload(e.data.url,e.data.name);
  if(e.data.type==='CAMOS_TITLE'&&typeof e.data.title==='string'&&e.data.title)brSetTitle(e.data.title);
});

function absUrl(href,base){
  try{return new URL(href,base).href;}catch(e){return href;}
}

function brDownload(url,filename){
  if(!filename){var p=url.split('/');filename=(p[p.length-1]||'download').split('?')[0]||'download';}
  showNotif('download','Downloading '+filename+'...');
  var entry={url:url,name:filename,status:'fetching',blob:null,size:0};
  downloads.push(entry); brShowDlPanel(); brRenderDlPanel();
  var chain=[url,P_CODETABS(url),P_CORSPROXY(url),P_ALLORIGINS(url)];
  var idx=0;
  function attempt(){
    if(idx>=chain.length){entry.status='error';brRenderDlPanel();showNotif('error','Download failed: '+filename);return;}
    fetch(chain[idx]).then(function(r){
      if(!r.ok)throw new Error('HTTP '+r.status);
      return r.blob();
    }).then(function(blob){
      if(!blob||blob.size===0)throw new Error('empty');
      var obj=URL.createObjectURL(blob);
      entry.blob=obj;entry.status='done';entry.size=blob.size;
      var a=document.createElement('a');a.href=obj;a.download=filename;a.style.display='none';
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      brRenderDlPanel();showNotif('download','Saved '+filename);
    }).catch(function(){idx++;attempt();});
  }
  attempt();
}
function brShowDlPanel(){var p=$br('dl-panel');if(p)p.classList.add('vis');}
function brHideDlPanel(){var p=$br('dl-panel');if(p)p.classList.remove('vis');}
function brRenderDlPanel(){
  var list=$br('dl-list');if(!list)return;
  list.innerHTML='';
  downloads.slice().reverse().forEach(function(d){
    var ext=(d.name.split('.').pop()||'').toLowerCase();
    var icon=['mp3','wav','ogg','flac','m4a'].indexOf(ext)>-1?'ti-music':['mp4','webm','mkv','mov'].indexOf(ext)>-1?'ti-video':['jpg','jpeg','png','gif','webp','svg'].indexOf(ext)>-1?'ti-photo':['zip','rar','7z','tar','gz'].indexOf(ext)>-1?'ti-archive':['pdf'].indexOf(ext)>-1?'ti-file-type-pdf':'ti-file';
    var sz=d.size>(1<<20)?(d.size/(1<<20)).toFixed(1)+'MB':d.size>1024?(d.size>>10)+'KB':'';
    var item=document.createElement('div');item.className='dl-item';
    item.innerHTML='<i class="ti '+icon+' dl-icon"></i><span class="dl-name">'+d.name+'</span><span class="dl-size">'+sz+'</span>'+(d.status==='done'&&d.blob?'<a class="dl-btn" href="'+d.blob+'" download="'+d.name+'">Save</a>':'')+(d.status==='fetching'?'<span class="dl-pend">...</span>':'')+(d.status==='error'?'<span class="dl-fail">Failed</span>':'');
    list.appendChild(item);
  });
}

function newBrTab(url){
  var tab={url:'',title:'New Tab',html:'',hist:[],hidx:-1};
  brTabs.push(tab); brCurTab=brTabs.length-1;
  renderBrTabs();
  if(url)brNavTo(url);
  else{brShow('home');brSetUrl('');brSetTitle('New Tab');}
}
function closeBrTab(idx,evt){
  if(evt){evt.stopPropagation();evt.preventDefault();}
  brTabs.splice(idx,1);
  if(!brTabs.length){brCurTab=-1;newBrTab();return;}
  if(brCurTab>=brTabs.length)brCurTab=brTabs.length-1;
  renderBrTabs(); brLoadTab(brCurTab);
}
function switchBrTab(idx){if(idx===brCurTab)return;brCurTab=idx;renderBrTabs();brLoadTab(idx);}
function brLoadTab(idx){
  var t=brTabs[idx];if(!t)return;
  brSetTitle(t.title);
  if(!t.url){brShow('home');brSetUrl('');return;}
  brSetUrl(t.url);
  if(t.worker&&CAMOS_PROXY){
    var iframeW=$br('br-iframe');
    if(iframeW){iframeW.removeAttribute('sandbox');iframeW.removeAttribute('srcdoc');iframeW.src=P_WORKER(t.url);brShow('content');}
    return;
  }
  if(t.html)brInjectHTML(t.html,t.url,true);
  else brNavTo(t.url,true);
}
function renderBrTabs(){
  var inner=$br('br-tabs-inner');if(!inner)return;
  inner.innerHTML='';
  brTabs.forEach(function(t,i){
    var el=document.createElement('div');
    el.className='br-tab'+(i===brCurTab?' active':'');
    var fav=document.createElement('i');fav.className='ti ti-world br-tab-favicon';
    var lbl=document.createElement('span');lbl.className='br-tab-label';
    var title=t.title||'New Tab';lbl.textContent=title.length>16?title.slice(0,16)+'...':title;
    var x=document.createElement('span');x.className='br-tab-x';x.innerHTML='<i class="ti ti-x"></i>';
    x.addEventListener('mousedown',function(e){e.stopPropagation();closeBrTab(i,e);});
    el.appendChild(fav);el.appendChild(lbl);el.appendChild(x);
    el.addEventListener('click',function(e){if(!e.target.closest('.br-tab-x'))switchBrTab(i);});
    inner.appendChild(el);
  });
  var active=inner.querySelector('.active');
  if(active)active.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
}
function brSetTitle(title){
  var t=brTabs[brCurTab];if(t)t.title=title;
  var el=$br('br-win-title');if(el)el.textContent=(title||'Browser').slice(0,32);
  renderBrTabs();
}
function brSetUrl(url){
  var el=$br('br-url');
  if(el&&document.activeElement!==el)el.value=url||'';
  var sec=$br('br-security');
  if(sec){
    if(!url)sec.innerHTML='';
    else if(url.startsWith('https://'))sec.innerHTML='<i class="ti ti-lock" style="color:#33a05a;font-size:11px"></i>';
    else sec.innerHTML='<i class="ti ti-lock-open" style="color:#888;font-size:11px"></i>';
  }
}
function brShow(which){
  ['home','loading','err'].forEach(function(p){var el=$br('br-'+p);if(el)el.classList.toggle('vis',p===which);});
  var iframe=$br('br-iframe');if(iframe)iframe.style.display=(which==='content')?'block':'none';
}

async function brNavTo(url,skipHistory){
  if(!url)return;
  url=url.trim();
  var isSearch=!url.startsWith('http')&&(url.indexOf(' ')>-1||!url.match(/\.\w{2,}/));
  if(isSearch)url='https://html.duckduckgo.com/html/?q='+encodeURIComponent(url);
  else if(!url.startsWith('http://')&&!url.startsWith('https://'))url='https://'+url;

  var t=brTabs[brCurTab];
  if(t&&!skipHistory){t.hist=t.hist.slice(0,t.hidx+1);t.hist.push(url);t.hidx=t.hist.length-1;t.url=url;}
  else if(t)t.url=url;

  brSetUrl(url); brShow('loading');
  var lmsg=$br('br-loading-msg');
  var tiers=htmlProxyChain();
  var fetched=false;
  for(var pi=0;pi<tiers.length;pi++){
    var tier=tiers[pi];
    try{
      if(lmsg)lmsg.textContent='Loading via '+tier.label+' ('+(pi+1)+'/'+tiers.length+')...';
      var resp=await fetch(tier.fn(url),{signal:AbortSignal.timeout(13000)});
      if(!resp.ok)continue;
      var html=await resp.text();
      if(!html||html.length<60)continue;
      if(html.charAt(0)==='{'&&html.indexOf('"contents"')>-1){
        try{var j=JSON.parse(html);if(j.contents)html=j.contents;}catch(e){}
      }
      USING_WORKER=tier.worker;
      brInjectHTML(html,url);
      fetched=true;break;
    }catch(e){}
  }
  if(!fetched){brShowErr(url);var t2=brTabs[brCurTab];if(t2){t2.title='Error';brSetTitle('Error');}}
}

function brInjectHTML(html,baseUrl,silent){
  var tm=html.match(/<title[^>]*>([^<]{0,120})<\/title>/i);
  var title=tm?tm[1].trim().replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'):baseUrl;

  if(USING_WORKER){
    var iframeW=$br("br-iframe");if(!iframeW)return;
    // Point the iframe directly at the Worker URL. This gives the page the
    // Worker's real origin (not null), so history API, module scripts and
    // relative URLs all behave like a real tab. The Worker already injected
    // the nav/download hook server-side.
    iframeW.removeAttribute("sandbox");
    iframeW.removeAttribute("srcdoc");
    iframeW.src=P_WORKER(baseUrl);
    brShow("content");
    var tw=brTabs[brCurTab];
    if(tw){tw.title=title;tw.html='';tw.url=baseUrl;tw.worker=true;}
    brSetTitle(title);brSetUrl(baseUrl);
    return;
  }

  html=html.replace(/<base\b[^>]*>/gi,'');

  html=html.replace(/<script\b[^>]*src\s*=[^>]*>\s*<\/script>/gi,'');
  html=html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi,function(m,body){
    if(!body)return'';
    if(/history\.|replaceState|pushState|window\.top|window\.parent|window\.opener|location\s*=/.test(body))return'';
    if(body.length>15000)return'';
    return m;
  });

  var proxyBase=P_CODETABS('').replace(/\?quest=$/,'?quest=');

  var rewriter='<script>(function(){'
    +'var BASE="'+baseUrl.replace(/"/g,'\\"')+'";'
    +'var PX="https://api.codetabs.com/v1/proxy/?quest=";'
    +'function abs(u){try{return new URL(u,BASE).href;}catch(e){return u;}}'
    +'function px(u){return PX+encodeURIComponent(abs(u));}'
    +'function fix(){'
    +'var i,el;'
    +'var imgs=document.querySelectorAll("img[src]");for(i=0;i<imgs.length;i++){el=imgs[i];var s=el.getAttribute("src");if(s&&s.indexOf("data:")!==0&&s.indexOf("blob:")!==0&&s.indexOf("codetabs")<0){el.src=px(s);}}'
    +'var links=document.querySelectorAll("link[rel=stylesheet][href]");for(i=0;i<links.length;i++){el=links[i];var h=el.getAttribute("href");if(h&&h.indexOf("codetabs")<0){el.href=px(h);}}'
    +'}'
    +'fix();'
    +'document.addEventListener("click",function(e){'
    +'var a=e.target.closest("a[href]");if(!a)return;'
    +'var h=a.getAttribute("href");if(!h||h.charAt(0)==="#"||h.indexOf("javascript:")===0||h.indexOf("mailto:")===0)return;'
    +'var dl=a.hasAttribute("download");'
    +'e.preventDefault();e.stopPropagation();'
    +'var u=abs(h);'
    +'if(dl){parent.postMessage({type:"CAMOS_DL",url:u,name:a.getAttribute("download")||""},"*");}'
    +'else{parent.postMessage({type:"CAMOS_NAV",url:u},"*");}'
    +'},true);'
    +'document.addEventListener("submit",function(e){'
    +'var f=e.target;if(!f)return;e.preventDefault();'
    +'var method=(f.method||"get").toLowerCase();'
    +'var action=abs(f.getAttribute("action")||BASE);'
    +'if(method==="get"){var fd=new FormData(f);var qs=new URLSearchParams(fd).toString();var url=action+(action.indexOf("?")>-1?"&":"?")+qs;parent.postMessage({type:"CAMOS_NAV",url:url},"*");}'
    +'else{parent.postMessage({type:"CAMOS_NAV",url:action},"*");}'
    +'},true);'
    +'})();<\/script>';

  var styles='<style>'
    +'html,body{max-width:100%!important;}'
    +'*{box-sizing:border-box;}'
    +'body{font-family:system-ui,sans-serif;overflow-x:hidden;}'
    +'img{max-width:100%!important;height:auto;}'
    +'a[href]{cursor:pointer;}'
    +'::-webkit-scrollbar{width:7px;height:7px;}'
    +'::-webkit-scrollbar-track{background:#f0f0f0;}'
    +'::-webkit-scrollbar-thumb{background:#bbb;border-radius:4px;}'
    +'<\/style>';

  var inject='<base href="'+baseUrl+'">'+styles;
  if(html.indexOf('<head')>-1)html=html.replace(/<head([^>]*)>/i,function(m){return m+inject;});
  else html='<head>'+inject+'</head>'+html;
  html=html.replace(/<\/body>/i,rewriter+'</body>');
  if(html.indexOf('CAMOS_NAV')<0)html+=rewriter;

  var iframe=$br('br-iframe');if(!iframe)return;
  iframe.setAttribute('sandbox','allow-scripts allow-forms allow-popups');
  iframe.srcdoc=html;
  brShow('content');
  var t=brTabs[brCurTab];
  if(t){t.title=title;t.html=html;t.url=baseUrl;}
  brSetTitle(title); brSetUrl(baseUrl);
}

function brShowErr(url){
  brShow('err');
  var link=$br('br-open-ext');if(link)link.href=url||'#';
  var dl=$br('br-dl-link');if(dl)dl.setAttribute('data-url',url||'');
}
function brGo(url){
  var u=url;
  if(u===undefined||u===null){var el=$br('br-url');u=el?el.value.trim():'';}
  if(typeof u!=='string')u=String(u);
  u=u.trim();if(!u)return;
  if(!brTabs.length){newBrTab();setTimeout(function(){brNavTo(u);},0);}
  else brNavTo(u);
}
function brBack(){var t=brTabs[brCurTab];if(!t||t.hidx<=0)return;t.hidx--;t.html='';brNavTo(t.hist[t.hidx],true);}
function brFwd(){var t=brTabs[brCurTab];if(!t||t.hidx>=t.hist.length-1)return;t.hidx++;t.html='';brNavTo(t.hist[t.hidx],true);}
function brReload(){var t=brTabs[brCurTab];if(t&&t.url){t.html='';brNavTo(t.url,true);}}
function brHome(){brShow('home');brSetUrl('');brSetTitle('New Tab');var t=brTabs[brCurTab];if(t){t.url='';t.html='';}}
function brBookmark(){var t=brTabs[brCurTab];if(!t||!t.url)return;showNotif('bookmark','Bookmarked: '+(t.title||t.url).slice(0,40));}
function brOpenExt(){var link=$br('br-open-ext');if(link&&link.href&&link.href!=='#')window.open(link.href,'_blank','noopener');}
function brDlPage(){var t=brTabs[brCurTab];if(!t||!t.url)return;brDownload(t.url);}
function brDlFromErr(){var link=$br('br-dl-link');if(!link)return;var u=link.getAttribute('data-url');if(u)brDownload(u);}

/* ============ NOTEPAD ============ */
function npUpdate(){
  var ta=document.getElementById('np-ta');if(!ta)return;
  var v=ta.value,words=v.trim()?v.trim().split(/\s+/).length:0;
  var wc=document.getElementById('np-wc');if(wc)wc.textContent=words+' words';
  var cc=document.getElementById('np-cc');if(cc)cc.textContent=v.length+' chars';
  var before=v.slice(0,ta.selectionStart),ln=before.split('\n').length,col=before.split('\n').pop().length+1;
  var pos=document.getElementById('np-pos');if(pos)pos.textContent='Ln '+ln+' Col '+col;
}
function npNew(){showModal('New File','Filename:','untitled.txt',function(n){if(!n)return;npFiles[n]='';npCurrent=n;var ta=document.getElementById('np-ta');if(ta)ta.value='';npUpdate();showNotif('notepad','New: '+n);});}
function npSave(){var ta=document.getElementById('np-ta');if(!ta)return;npFiles[npCurrent]=ta.value;var fn=getNode('/home/cameron');if(fn)fn.children[npCurrent]={type:'file',content:ta.value};showNotif('notepad','Saved: '+npCurrent);}
function npOpen(){
  var opts=Object.keys(npFiles),fn=getNode('/home/cameron');
  if(fn)Object.keys(fn.children).forEach(function(k){if(fn.children[k].type==='file'&&opts.indexOf(k)===-1)opts.push(k);});
  if(!opts.length){showNotif('notepad','No files.');return;}
  showModal('Open','Files: '+opts.join(', '),opts[0],function(n){
    if(!n)return;var c=npFiles[n];if(c===undefined){var nd=getNode('/home/cameron/'+n);c=nd?nd.content:null;}
    if(c===null||c===undefined){showNotif('notepad','Not found: '+n);return;}
    npCurrent=n;var ta=document.getElementById('np-ta');if(ta)ta.value=c;npUpdate();showNotif('notepad','Opened: '+n);
  });
}
function npCopy(){var ta=document.getElementById('np-ta');if(!ta)return;navigator.clipboard.writeText(ta.value).catch(function(){});showNotif('notepad','Copied');}
function npDownload(){
  var ta=document.getElementById('np-ta');if(!ta)return;
  var blob=new Blob([ta.value],{type:'text/plain'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=npCurrent;a.click();
  showNotif('notepad','Downloaded '+npCurrent);
}
function npToggleWrap(){npWrap=!npWrap;var ta=document.getElementById('np-ta');if(ta)ta.style.whiteSpace=npWrap?'pre-wrap':'pre';showNotif('notepad','Wrap: '+(npWrap?'ON':'OFF'));}
function npWC(){var ta=document.getElementById('np-ta');if(!ta)return;var v=ta.value,w=v.trim()?v.trim().split(/\s+/).length:0;showNotif('notepad',w+' words, '+v.length+' chars, '+v.split('\n').length+' lines');}
function npFind(){
  showModal('Find','Search for:','',function(term){
    if(!term)return;
    showModal('Replace','Replace with:','',function(rep){
      var ta=document.getElementById('np-ta');if(!ta)return;
      var count=ta.value.split(term).length-1;
      ta.value=ta.value.split(term).join(rep||'');
      npUpdate();showNotif('notepad','Replaced '+count+' occurrence(s)');
    });
  });
}

/* ============ SYSINFO ============ */
function fillSysInfo(){
  function sv(id,val){var el=document.getElementById(id);if(el)el.textContent=val;}
  sv('si-plat',navigator.platform||'Unknown');
  sv('si-cores',(navigator.hardwareConcurrency||'?')+' threads');
  sv('si-mem',performance&&performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576)+'MB / '+Math.round(performance.memory.jsHeapSizeLimit/1048576)+'MB':'N/A');
  sv('si-res',window.screen.width+'x'+window.screen.height);
  var ua=navigator.userAgent;
  sv('si-eng',ua.includes('Chrome')?'Blink':ua.includes('Firefox')?'Gecko':ua.includes('Safari')?'WebKit':'Unknown');
  sv('si-lang',navigator.language||'en');
  sv('si-net',navigator.onLine?'Connected':'Offline');
  var s=Math.floor((Date.now()-appStartTime)/1000);sv('si-up',Math.floor(s/60)+'m '+(s%60)+'s');
}
function siPoll(){
  if(!document.getElementById('win-sysinfo').classList.contains('open'))return;
  fillSysInfo();
  var pct=Math.floor(Math.random()*28+4);
  var fill=document.getElementById('si-cpu-fill');if(fill)fill.style.width=pct+'%';
  var pe=document.getElementById('si-cpu-pct');if(pe)pe.textContent=pct+'%';
}

/* ============ WINDOWS ============ */
function openApp(id){
  var win=document.getElementById('win-'+id),tb=document.getElementById('tb-'+id);
  if(!win||!tb)return;
  win.style.display='';win.classList.add('open');tb.classList.add('open');focusApp(id);
  if(id==='sysinfo')fillSysInfo();
  if(id==='terminal'){var ti=document.getElementById('t-in');if(ti)ti.focus();}
  if(id==='notepad')npUpdate();
  if(id==='browser'&&!brTabs.length)newBrTab();
  if(id==='files')fxRender('files');
}

var fxView='files';
function fxRender(which){
  if(which)fxView=which;
  document.querySelectorAll('.fx-nav-item').forEach(function(el){el.classList.toggle('active',el.getAttribute('data-view')===fxView);});
  var grid=document.getElementById('fx-grid');if(!grid)return;
  grid.innerHTML='';
  var items=[];
  if(fxView==='files'){
    var names=Object.keys(npFiles);
    var fn=getNode('/home/cameron');
    if(fn)Object.keys(fn.children).forEach(function(k){if(fn.children[k].type==='file'&&names.indexOf(k)===-1)names.push(k);});
    names.forEach(function(n){
      var content=npFiles[n];
      if(content===undefined){var nd=getNode('/home/cameron/'+n);content=nd?nd.content:'';}
      items.push({name:n,type:'doc',size:(content||'').length,content:content});
    });
  }else if(fxView==='downloads'){
    downloads.forEach(function(d){items.push({name:d.name,type:'download',size:d.size,blob:d.blob,status:d.status});});
  }
  var title=document.getElementById('fx-path');if(title)title.textContent=fxView==='files'?'/home/cameron/documents':'/home/cameron/downloads';
  var count=document.getElementById('fx-count');if(count)count.textContent=items.length+' item'+(items.length===1?'':'s');
  if(!items.length){
    var empty=document.createElement('div');empty.className='fx-empty';
    empty.innerHTML='<i class="ti '+(fxView==='files'?'ti-file-off':'ti-download')+'"></i><span>'+(fxView==='files'?'No saved files yet. Save one from Notepad.':'No downloads yet. Download something from the Browser.')+'</span>';
    grid.appendChild(empty);
    return;
  }
  items.forEach(function(it){
    var ext=(it.name.split('.').pop()||'').toLowerCase();
    var icon=it.type==='doc'?'ti-file-text':['mp3','wav','ogg','flac','m4a'].indexOf(ext)>-1?'ti-music':['mp4','webm','mkv','mov'].indexOf(ext)>-1?'ti-video':['jpg','jpeg','png','gif','webp','svg'].indexOf(ext)>-1?'ti-photo':['zip','rar','7z','tar','gz'].indexOf(ext)>-1?'ti-file-zip':['pdf'].indexOf(ext)>-1?'ti-file-type-pdf':'ti-file';
    var sz=it.size>(1<<20)?(it.size/(1<<20)).toFixed(1)+' MB':it.size>1024?(it.size>>10)+' KB':((it.size||0)+' B');
    var tile=document.createElement('div');tile.className='fx-item';
    tile.innerHTML='<div class="fx-item-icon"><i class="ti '+icon+'"></i></div><div class="fx-item-name">'+it.name+'</div><div class="fx-item-size">'+sz+'</div>';
    tile.addEventListener('dblclick',function(){fxOpen(it);});
    grid.appendChild(tile);
  });
}
function fxOpen(it){
  if(it.type==='doc'){
    openApp('notepad');
    npCurrent=it.name;
    var ta=document.getElementById('np-ta');if(ta)ta.value=it.content||'';
    npUpdate();
    showNotif('notepad','Opened '+it.name);
  }else if(it.type==='download'){
    if(it.blob){var a=document.createElement('a');a.href=it.blob;a.download=it.name;a.click();}
    else showNotif('error','File not available');
  }
}

function closeApp(id){var win=document.getElementById('win-'+id),tb=document.getElementById('tb-'+id);if(win){win.classList.remove('open');win.style.display='';}if(tb)tb.classList.remove('open','focused');maxed[id]=false;}
function minApp(id){var win=document.getElementById('win-'+id),tb=document.getElementById('tb-'+id);if(win){win.classList.remove('open');win.style.display='';}if(tb)tb.classList.remove('focused');}
function maxApp(id){
  var win=document.getElementById('win-'+id);if(!win)return;
  if(maxed[id]){var b=savedBounds[id];win.style.width=b.w;win.style.height=b.h;win.style.top=b.t;win.style.left=b.l;win.style.borderRadius='10px';maxed[id]=false;}
  else{savedBounds[id]={w:win.style.width,h:win.style.height,t:win.style.top,l:win.style.left};win.style.width='100vw';win.style.height='calc(100vh - 44px)';win.style.top='0';win.style.left='0';win.style.borderRadius='0';maxed[id]=true;}
  focusApp(id);
}
function focusApp(id){
  zTop++;var win=document.getElementById('win-'+id);if(!win)return;
  win.style.zIndex=zTop;win.classList.add('open');
  document.querySelectorAll('.tb-app').forEach(function(el){el.classList.remove('focused');});
  var tb=document.getElementById('tb-'+id);if(tb)tb.classList.add('focused');
}
function tbClick(id){var win=document.getElementById('win-'+id);if(!win)return;if(!win.classList.contains('open'))openApp(id);else minApp(id);}
function initDrag(id){
  var bar=document.getElementById('drag-'+id),win=document.getElementById('win-'+id);
  if(!bar||!win)return;var drag=false,ox=0,oy=0;
  bar.addEventListener('mousedown',function(e){if(e.target.classList.contains('wb'))return;if(maxed[id])return;drag=true;ox=e.clientX-win.offsetLeft;oy=e.clientY-win.offsetTop;focusApp(id);e.preventDefault();});
  document.addEventListener('mousemove',function(e){if(!drag)return;win.style.left=Math.max(0,Math.min(e.clientX-ox,window.innerWidth-win.offsetWidth))+'px';win.style.top=Math.max(0,Math.min(e.clientY-oy,window.innerHeight-win.offsetHeight-44))+'px';});
  document.addEventListener('mouseup',function(){drag=false;});
  win.addEventListener('mousedown',function(){focusApp(id);});
}

/* ============ MENUS / MISC ============ */
function toggleMenu(){document.getElementById('smenu').classList.toggle('open');}
function closeMenu(){document.getElementById('smenu').classList.remove('open');}
function hideCtx(){document.getElementById('ctxmenu').style.display='none';}
function changeWallpaper(){openWallpaperPicker();}
function openWallpaperPicker(){
  var ov=document.getElementById('wp-overlay');if(!ov)return;
  renderWallpaperGrid();
  ov.classList.add('open');
}
function closeWallpaperPicker(){var ov=document.getElementById('wp-overlay');if(ov)ov.classList.remove('open');}
function renderWallpaperGrid(){
  var grid=document.getElementById('wp-grid');if(!grid)return;
  grid.innerHTML='';
  var all=allWallpapers();
  all.forEach(function(w,i){
    var tile=document.createElement('div');
    tile.className='wp-tile'+(i===wpIdx?' active':'');
    if(w.image){tile.style.backgroundImage='url('+w.image+')';tile.style.backgroundSize='cover';tile.style.backgroundPosition='center';}
    else{tile.style.background=w.css;}
    var label=document.createElement('span');label.className='wp-tile-name';label.textContent=w.name||('Custom '+(i-WP.length+1));
    tile.appendChild(label);
    if(i>=WP.length){
      var del=document.createElement('span');del.className='wp-tile-del';del.innerHTML='<i class="ti ti-x"></i>';
      del.addEventListener('click',function(e){e.stopPropagation();customWP.splice(i-WP.length,1);if(wpIdx>=allWallpapers().length)wpIdx=0;renderWallpaperGrid();});
      tile.appendChild(del);
    }
    tile.addEventListener('click',function(){applyWallpaper(i);renderWallpaperGrid();});
    grid.appendChild(tile);
  });
}
function wpAddUrl(){
  var inp=document.getElementById('wp-url-input');if(!inp)return;
  var url=inp.value.trim();if(!url)return;
  customWP.push({name:'Custom',image:url});
  inp.value='';
  applyWallpaper(allWallpapers().length-1);
  renderWallpaperGrid();
  showNotif('wallpaper','Custom wallpaper added');
}
function wpAddUpload(ev){
  var file=ev.target.files&&ev.target.files[0];if(!file)return;
  var reader=new FileReader();
  reader.onload=function(e){
    customWP.push({name:file.name.slice(0,12),image:e.target.result});
    applyWallpaper(allWallpapers().length-1);
    renderWallpaperGrid();
    showNotif('wallpaper','Wallpaper uploaded');
  };
  reader.readAsDataURL(file);
  ev.target.value='';
}
function wpAddColor(){
  var inp=document.getElementById('wp-color-input');if(!inp)return;
  var c=inp.value;
  customWP.push({name:c,css:'linear-gradient(135deg,'+c+','+shadeColor(c,-25)+')'});
  applyWallpaper(allWallpapers().length-1);
  renderWallpaperGrid();
  showNotif('wallpaper','Color wallpaper added');
}
function shadeColor(hex,pct){
  var n=parseInt(hex.slice(1),16);
  var r=Math.max(0,Math.min(255,((n>>16)&255)+pct));
  var g=Math.max(0,Math.min(255,((n>>8)&255)+pct));
  var b=Math.max(0,Math.min(255,(n&255)+pct));
  return'#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
function tickClock(){var d=new Date();var ck=document.getElementById('tb-clock');if(ck)ck.textContent=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});var dt=document.getElementById('tb-date');if(dt)dt.textContent=d.toLocaleDateString([],{month:'short',day:'numeric'});}
function showNotif(type,msg){
  var n=document.getElementById('notif');if(!n)return;
  var ic=NICONS[type]||'ti-bell';
  var tEl=document.getElementById('notif-title');if(tEl)tEl.innerHTML='<i class="ti '+ic+'"></i>'+type.charAt(0).toUpperCase()+type.slice(1);
  var bEl=document.getElementById('notif-body');if(bEl)bEl.textContent=msg;
  n.style.display='block';n.style.opacity='1';n.style.transition='none';
  clearTimeout(ntimer);ntimer=setTimeout(function(){n.style.transition='opacity 0.4s';n.style.opacity='0';setTimeout(function(){n.style.display='none';},400);},3500);
}
function showModal(title,desc,placeholder,cb){
  modalCB=cb;
  var h=document.getElementById('modal-h');if(h)h.textContent=title;
  var p=document.getElementById('modal-p');if(p)p.textContent=desc;
  var inp=document.getElementById('modal-input');
  if(inp){inp.style.display='block';inp.value=placeholder||'';inp.placeholder=placeholder||'';}
  var ov=document.getElementById('modal-overlay');if(ov)ov.classList.add('open');
  setTimeout(function(){if(inp)inp.focus();},50);
  if(inp)inp.onkeydown=function(e){if(e.key==='Enter')closeModal(inp.value);if(e.key==='Escape')closeModal(null);};
}
function closeModal(val){var ov=document.getElementById('modal-overlay');if(ov)ov.classList.remove('open');if(modalCB&&val!==null&&val!==undefined)modalCB(val);modalCB=null;}

/* ============ INIT ============ */
document.addEventListener('DOMContentLoaded',function(){
  initBootCanvas();
  setTimeout(bootStep,600);

  document.getElementById('login-go').addEventListener('click',doLogin);
  document.getElementById('login-pw').addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});

  var tIn=document.getElementById('t-in'),tOut=document.getElementById('t-out'),tPS=document.getElementById('t-ps');
  if(tIn){tIn.addEventListener('keydown',function(e){
    if(e.key==='Enter'){
      var val=this.value;if(val.trim()){HIST.unshift(val);HISTI=-1;}
      tOut.innerHTML+='<span style="color:#7F77DD">cameron@camos:'+CWD+'$</span> '+val+'\n';
      var res=runCmd(val);if(res!==null&&res!==undefined&&res!=='')tOut.innerHTML+=res+'\n';
      tPS.textContent='cameron@camos:'+CWD+'$';this.value='';
      var tb=document.getElementById('t-body');if(tb)tb.scrollTop=tb.scrollHeight;
    }else if(e.key==='ArrowUp'){e.preventDefault();if(HISTI<HIST.length-1){HISTI++;this.value=HIST[HISTI];}}
    else if(e.key==='ArrowDown'){e.preventDefault();if(HISTI>0){HISTI--;this.value=HIST[HISTI];}else{HISTI=-1;this.value='';}}
  });}

  var brUrlEl=document.getElementById('br-url');
  if(brUrlEl)brUrlEl.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();brGo(this.value.trim());}});

  var npTa=document.getElementById('np-ta');
  if(npTa){
    npTa.addEventListener('input',npUpdate);npTa.addEventListener('keyup',npUpdate);npTa.addEventListener('click',npUpdate);
    npTa.addEventListener('keydown',function(e){if(e.key==='Tab'){e.preventDefault();var s=this.selectionStart;this.value=this.value.slice(0,s)+'  '+this.value.slice(this.selectionEnd);this.selectionStart=this.selectionEnd=s+2;npUpdate();}});
  }

  ['terminal','browser','notepad','sysinfo','files'].forEach(initDrag);

  var desktop=document.getElementById('desktop');
  if(desktop){
    desktop.addEventListener('click',function(e){if(!e.target.closest('#smenu')&&!e.target.closest('#start-btn'))closeMenu();if(!e.target.closest('#ctxmenu'))hideCtx();});
    desktop.addEventListener('contextmenu',function(e){if(e.target.closest('.win')||e.target.closest('#taskbar'))return;e.preventDefault();var m=document.getElementById('ctxmenu');m.style.left=Math.min(e.clientX,window.innerWidth-190)+'px';m.style.top=Math.min(e.clientY,window.innerHeight-180)+'px';m.style.display='block';});
  }

  var ov=document.getElementById('modal-overlay');
  if(ov)ov.addEventListener('click',function(e){if(e.target===this)closeModal(null);});
});
