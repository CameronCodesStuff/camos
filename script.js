var appStartTime = Date.now();

/* ============================================================
   Set this to your deployed Cloudflare Worker URL for the best
   experience (see worker/DEPLOY.md). Leave blank to use the
   public proxy fallbacks only.
   Example: "https://camos-proxy.yourname.workers.dev"
   ============================================================ */
var CAMOS_PROXY = "https://camos.detlaffcameron.workers.dev";

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

/* ============ PWA (installable web app) ============ */
var deferredPrompt=null;
if('serviceWorker' in navigator){
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('sw.js').catch(function(){});
  });
}
window.addEventListener('beforeinstallprompt',function(e){
  e.preventDefault();
  deferredPrompt=e;
  var btn=document.getElementById('sm-install');if(btn)btn.style.display='flex';
});
window.addEventListener('appinstalled',function(){
  deferredPrompt=null;
  var btn=document.getElementById('sm-install');if(btn)btn.style.display='none';
  if(typeof showNotif==='function')showNotif('info','CamOS installed! Launch it from your home screen.');
});
function pwaInstall(){
  if(deferredPrompt){
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function(){deferredPrompt=null;var btn=document.getElementById('sm-install');if(btn)btn.style.display='none';});
  }else{
    if(typeof showNotif==='function')showNotif('info','To install: open your browser menu and choose "Add to Home Screen".');
  }
}

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
var ceScripts={};
var CE_STORE_KEY='camos_scripts_v1';
function ceSaveStore(){try{localStorage.setItem(CE_STORE_KEY,JSON.stringify(ceScripts));}catch(e){}}
function ceLoadStore(){try{var raw=localStorage.getItem(CE_STORE_KEY);if(raw)ceScripts=JSON.parse(raw)||{};}catch(e){ceScripts={};}}
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

  var COL=['159,153,238','127,119,221','83,74,183','200,180,255'];

  // Dense parallax starfield
  var stars=[];
  for(var i=0;i<360;i++)stars.push({x:Math.random(),y:Math.random(),z:Math.random()*0.9+0.1,tw:Math.random()*Math.PI*2});

  // Warp-streak stars shooting outward from center
  var streaks=[];
  function spawnStreak(){var a=Math.random()*Math.PI*2;return{a:a,d:Math.random()*0.1,sp:0.004+Math.random()*0.012,len:0.04+Math.random()*0.08};}
  for(var w=0;w<70;w++)streaks.push(spawnStreak());

  // Drifting network particles
  var net=[];
  for(var n=0;n<46;n++)net.push({x:Math.random(),y:Math.random(),vx:(Math.random()-0.5)*0.0009,vy:(Math.random()-0.5)*0.0009});

  // Rising sparks
  var sparks=[];
  for(var sp=0;sp<90;sp++)sparks.push({x:Math.random(),y:Math.random(),speed:0.001+Math.random()*0.004,size:Math.random()*2+0.4,hue:Math.floor(Math.random()*4)});

  // Expanding shockwave rings (burst from center, not spinning)
  var waves=[];
  function spawnWave(){return{r:0,max:0.55+Math.random()*0.3,sp:0.004+Math.random()*0.004,a:1};}
  for(var wv=0;wv<3;wv++){var iw=spawnWave();iw.r=Math.random()*iw.max;waves.push(iw);}

  // Lightning bolts that flash occasionally
  var bolts=[];
  var nextBolt=0;
  function makeBolt(W,H){
    var x0=Math.random()*W, segs=[], y=0, x=x0;
    while(y<H){y+=20+Math.random()*40;x+=(Math.random()-0.5)*70;segs.push({x:x,y:y});}
    return{segs:segs,x0:x0,life:1};
  }

  // Floating glow particles (big soft bokeh)
  var bokeh=[];
  for(var bk=0;bk<14;bk++)bokeh.push({x:Math.random(),y:Math.random(),r:30+Math.random()*70,drift:0.0001+Math.random()*0.0003,a:0.03+Math.random()*0.05,hue:Math.floor(Math.random()*4),ph:Math.random()*Math.PI*2});

  function frame(){
    var W=canvas.width,H=canvas.height,cx=W/2,cy=H*0.42;
    var t=Date.now()/1000;
    var minWH=Math.min(W,H);
    var pulse=0.5+0.5*Math.sin(t*2);

    // shifting nebula backdrop
    ctx.clearRect(0,0,W,H);
    var hueShift=Math.sin(t*0.3)*20;
    var bg=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(W,H)*0.9);
    bg.addColorStop(0,'rgba('+(48+hueShift)+',38,'+(108+hueShift)+',0.42)');
    bg.addColorStop(0.4,'rgba(26,18,58,0.18)');
    bg.addColorStop(1,'rgba(3,2,10,0)');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    // big soft bokeh glows
    for(var bi=0;bi<bokeh.length;bi++){
      var bo=bokeh[bi]; bo.y-=bo.drift; if(bo.y<-0.15)bo.y=1.15;
      var ba=bo.a*(0.6+0.4*Math.sin(t*1.2+bo.ph));
      var bx=bo.x*W, by=bo.y*H;
      var bgrad=ctx.createRadialGradient(bx,by,0,bx,by,bo.r);
      bgrad.addColorStop(0,'rgba('+COL[bo.hue]+','+ba+')');
      bgrad.addColorStop(1,'rgba('+COL[bo.hue]+',0)');
      ctx.fillStyle=bgrad; ctx.beginPath(); ctx.arc(bx,by,bo.r,0,Math.PI*2); ctx.fill();
    }

    // parallax starfield
    for(var i=0;i<stars.length;i++){
      var s2=stars[i];
      var x=s2.x*W, y=s2.y*H;
      var tw=0.3+0.7*Math.abs(Math.sin(t*1.8+s2.tw));
      ctx.beginPath(); ctx.arc(x,y,s2.z*1.5,0,Math.PI*2);
      ctx.fillStyle='rgba(200,196,255,'+(s2.z*0.6*tw)+')'; ctx.fill();
      s2.y+=0.00018*s2.z; if(s2.y>1)s2.y=0;
    }

    // warp streaks from center
    for(var ws=0;ws<streaks.length;ws++){
      var sr=streaks[ws]; sr.d+=sr.sp;
      var x1=cx+Math.cos(sr.a)*sr.d*minWH, y1=cy+Math.sin(sr.a)*sr.d*minWH;
      var x2=cx+Math.cos(sr.a)*(sr.d+sr.len)*minWH, y2=cy+Math.sin(sr.a)*(sr.d+sr.len)*minWH;
      var alpha=Math.min(1,sr.d*3)*0.5;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
      ctx.strokeStyle='rgba(180,170,255,'+alpha+')'; ctx.lineWidth=1.4; ctx.stroke();
      if(sr.d>0.75)streaks[ws]=spawnStreak();
    }

    // expanding shockwaves
    for(var vi=0;vi<waves.length;vi++){
      var wa=waves[vi]; wa.r+=wa.sp; wa.a=1-(wa.r/wa.max);
      if(wa.r>=wa.max){waves[vi]=spawnWave();continue;}
      ctx.beginPath(); ctx.arc(cx,cy,wa.r*minWH,0,Math.PI*2);
      ctx.strokeStyle='rgba(159,153,238,'+(wa.a*0.5)+')'; ctx.lineWidth=2*wa.a+0.5; ctx.stroke();
    }

    // network particles + links
    for(var a=0;a<net.length;a++){
      var p=net[a]; p.x+=p.vx; p.y+=p.vy;
      if(p.x<0||p.x>1)p.vx*=-1; if(p.y<0||p.y>1)p.vy*=-1;
      for(var b=a+1;b<net.length;b++){
        var q=net[b];
        var dx=(p.x-q.x)*W, dy=(p.y-q.y)*H, dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<140){
          ctx.beginPath(); ctx.moveTo(p.x*W,p.y*H); ctx.lineTo(q.x*W,q.y*H);
          ctx.strokeStyle='rgba(127,119,221,'+((1-dist/140)*0.16)+')'; ctx.lineWidth=0.6; ctx.stroke();
        }
      }
      ctx.beginPath(); ctx.arc(p.x*W,p.y*H,1.4,0,Math.PI*2);
      ctx.fillStyle='rgba(159,153,238,0.45)'; ctx.fill();
    }

    // huge pulsing core
    var coreR=minWH*(0.06+0.02*pulse);
    var cg=ctx.createRadialGradient(cx,cy,0,cx,cy,coreR*5);
    cg.addColorStop(0,'rgba(220,210,255,'+(0.5+0.3*pulse)+')');
    cg.addColorStop(0.3,'rgba(159,153,238,'+(0.3+0.15*pulse)+')');
    cg.addColorStop(0.6,'rgba(127,119,221,0.08)');
    cg.addColorStop(1,'rgba(127,119,221,0)');
    ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(cx,cy,coreR*5,0,Math.PI*2); ctx.fill();

    // lightning flashes
    if(t>nextBolt){
      bolts.push(makeBolt(W,H));
      nextBolt=t+0.6+Math.random()*2.2;
    }
    for(var li=bolts.length-1;li>=0;li--){
      var bl=bolts[li]; bl.life-=0.08;
      if(bl.life<=0){bolts.splice(li,1);continue;}
      ctx.beginPath(); ctx.moveTo(bl.x0,0);
      for(var bs=0;bs<bl.segs.length;bs++)ctx.lineTo(bl.segs[bs].x,bl.segs[bs].y);
      ctx.strokeStyle='rgba(210,200,255,'+(bl.life*0.5)+')'; ctx.lineWidth=1.5; ctx.stroke();
      // glow flash
      if(bl.life>0.85){ctx.fillStyle='rgba(159,153,238,0.04)';ctx.fillRect(0,0,W,H);}
    }

    // rising colourful sparks
    for(var k2=0;k2<sparks.length;k2++){
      var sk=sparks[k2]; sk.y-=sk.speed; if(sk.y<0){sk.y=1;sk.x=Math.random();}
      var sa=0.5*(1-sk.y)+0.25;
      ctx.beginPath(); ctx.arc(sk.x*W,sk.y*H,sk.size,0,Math.PI*2);
      ctx.fillStyle='rgba('+COL[sk.hue]+','+sa+')'; ctx.fill();
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
  ['terminal','browser','notepad','sysinfo','files','code'].forEach(closeApp);
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
var CMD_HELP={
  help:{usage:'help [command]',desc:'Show this help, or details for one command',cat:'Shell'},
  man:{usage:'man <command>',desc:'Show the manual entry for a command',cat:'Shell'},
  clear:{usage:'clear',desc:'Clear the terminal screen (alias: cls)',cat:'Shell'},
  history:{usage:'history',desc:'Show recently entered commands',cat:'Shell'},
  echo:{usage:'echo <text>',desc:'Print text back to the terminal',cat:'Shell'},
  ls:{usage:'ls [path]',desc:'List files and folders (alias: ll)',cat:'Files'},
  cd:{usage:'cd [path]',desc:'Change directory (cd .. to go up, cd ~ for home)',cat:'Files'},
  pwd:{usage:'pwd',desc:'Print the current working directory',cat:'Files'},
  cat:{usage:'cat <file>',desc:'Print the contents of a file',cat:'Files'},
  mkdir:{usage:'mkdir <name>',desc:'Create a new directory',cat:'Files'},
  touch:{usage:'touch <name>',desc:'Create a new empty file',cat:'Files'},
  rm:{usage:'rm <name>',desc:'Remove a file or folder',cat:'Files'},
  tree:{usage:'tree [path]',desc:'Show files as an indented tree',cat:'Files'},
  open:{usage:'open <app>',desc:'Launch an app: browser, notepad, files, sysinfo',cat:'System'},
  date:{usage:'date',desc:'Show the current date and time',cat:'System'},
  uptime:{usage:'uptime',desc:'How long CamOS has been running',cat:'System'},
  whoami:{usage:'whoami',desc:'Print the current user',cat:'System'},
  hostname:{usage:'hostname',desc:'Print the system hostname',cat:'System'},
  uname:{usage:'uname',desc:'Print system information',cat:'System'},
  neofetch:{usage:'neofetch',desc:'Show a system summary with the CamOS logo',cat:'System'}
};

function renderHelp(arg){
  if(arg){
    var key=arg.toLowerCase();
    var h=CMD_HELP[key];
    if(!h)return'<span style="color:#e05d5d">No help for \''+arg+'\'.</span> Type <span style="color:#9090dd">help</span> for the full list.';
    return '<span style="color:#9F99EE">'+key+'</span> - '+h.desc+'\n  <span style="color:#666">usage:</span> <span style="color:#33ff88">'+h.usage+'</span>';
  }
  var cats={};
  Object.keys(CMD_HELP).forEach(function(k){var c=CMD_HELP[k].cat;(cats[c]=cats[c]||[]).push(k);});
  var out='<span style="color:#9F99EE">CamOS Shell (camsh 3.0)</span>  -  type <span style="color:#33ff88">help &lt;command&gt;</span> for details\n';
  ['Shell','Files','System'].forEach(function(cat){
    if(!cats[cat])return;
    out+='\n<span style="color:#7F77DD">'+cat+'</span>\n';
    cats[cat].forEach(function(k){
      var pad=k+Array(Math.max(0,10-k.length)).join(' ');
      out+='  <span style="color:#33ff88">'+pad+'</span> <span style="color:#999">'+CMD_HELP[k].desc+'</span>\n';
    });
  });
  out+='\n<span style="color:#666">Tip: use the up/down arrows to repeat commands.</span>';
  return out;
}

function fsTree(node,prefix,depth){
  if(depth>4)return'';
  var out='',keys=Object.keys(node.children||{});
  keys.forEach(function(k,i){
    var child=node.children[k];
    var last=(i===keys.length-1);
    var branch=last?'└─ ':'├─ ';
    var color=child.type==='dir'?'#8888ff':'#33ff88';
    out+=prefix+branch+'<span style="color:'+color+'">'+k+(child.type==='dir'?'/':'')+'</span>\n';
    if(child.type==='dir')out+=fsTree(child,prefix+(last?'   ':'│  '),depth+1);
  });
  return out;
}

var CMDS={
  help:function(a){return renderHelp(a[0]);},
  man:function(a){if(!a[0])return'What manual page do you want? Try: man ls';return renderHelp(a[0]);},
  history:function(){if(!HIST.length)return'No history yet.';return HIST.slice().reverse().map(function(c,i){return'  '+(i+1)+'  '+c;}).join('\n');},
  pwd:function(){return CWD;},
  whoami:function(){return 'cameron';},
  hostname:function(){return 'camos';},
  uname:function(){return 'CamOS 3.0 '+(navigator.platform||'Browser');},
  date:function(){return new Date().toString();},
  uptime:function(){var s=Math.floor((Date.now()-appStartTime)/1000);return'up '+Math.floor(s/60)+'m '+(s%60)+'s';},
  clear:function(){document.getElementById('t-out').innerHTML='';return null;},
  open:function(a){var app=(a[0]||'').toLowerCase();var map={browser:'browser',web:'browser',notepad:'notepad',editor:'notepad',files:'files',explorer:'files',sysinfo:'sysinfo',system:'sysinfo'};if(map[app]){openApp(map[app]);return'Opening '+map[app]+'...';}return'open: unknown app \''+(a[0]||'')+'\'. Try: browser, notepad, files, sysinfo';},
  ls:function(a){var path=a[0]?resolvePath(a[0]):CWD,n=getNode(path);if(!n)return'ls: '+a[0]+': No such file or directory';if(n.type!=='dir')return a[0]||path;var it=Object.entries(n.children);if(!it.length)return'';return it.map(function(e){return'<span style="color:'+(e[1].type==='dir'?'#8888ff':'#33ff88')+'">'+e[0]+(e[1].type==='dir'?'/':'')+'</span>';}).join('  ');},
  tree:function(a){var path=a[0]?resolvePath(a[0]):CWD,n=getNode(path);if(!n)return'tree: '+a[0]+': No such directory';if(n.type!=='dir')return a[0];return'<span style="color:#8888ff">'+(path||'/')+'</span>\n'+fsTree(n,'',0);},
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
  var parts=line.split(/\s+/),cmd=parts[0].toLowerCase(),args=parts.slice(1);
  var al={ll:'ls',cls:'clear','?':'help'};if(al[cmd])cmd=al[cmd];
  if(CMDS[cmd])return CMDS[cmd](args);
  return'<span style="color:#e05d5d">'+cmd+': command not found.</span> Type <span style="color:#9090dd">help</span> for a list of commands.';
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
  url=unwrapProxy(url);
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

function unwrapProxy(url){
  // If a URL is already a proxied link, extract the real target so we don't
  // double-wrap it (which produces the Worker's "Proxy is running" banner).
  if(!url)return url;
  try{
    if(CAMOS_PROXY&&url.indexOf(workerBase())===0){
      // Proper proxied link: worker.dev/?u=<encoded target>
      var qi=url.indexOf('?u=');
      if(qi>-1){
        var enc=url.slice(qi+3);
        var dec=enc;
        try{dec=decodeURIComponent(enc);}catch(e){}
        // guard against accidental double-encoding (?u=https%3A...)
        if(/^https?%3A/i.test(enc)){try{dec=decodeURIComponent(enc);}catch(e){}}
        return unwrapProxy(dec);
      }
      // A bare worker-origin URL with NO ?u= means a relative SPA navigation
      // (e.g. youtube pushState to /results?...). Strip the worker origin and
      // treat the remaining path as living on the CURRENT tab's real site.
      var rest=url.slice(workerBase().length); // e.g. "/results?search_query=cats"
      var t=brTabs[brCurTab];
      if(t&&t.url){
        try{
          var base=new URL(t.url);
          return new URL(rest,base.origin).href;
        }catch(e){}
      }
      // nothing to anchor to: drop it so we don't load the banner
      return '';
    }
    var m=url.match(/[?&]url=([^&]+)/);
    if(m&&/corsproxy\.io|allorigins/.test(url))return decodeURIComponent(m[1]);
    var m2=url.match(/[?&]quest=([^&]+)/);
    if(m2&&/codetabs/.test(url))return decodeURIComponent(m2[1]);
  }catch(e){}
  return url;
}

async function brNavTo(url,skipHistory){
  if(!url)return;
  url=unwrapProxy(url.trim());
  if(!url){return;}
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
  if(id==='code')ceInit();
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
    // Saved CamScript files (persisted) appear here first
    Object.keys(ceScripts).forEach(function(n){items.push({name:n,type:'script',size:(ceScripts[n]||'').length,content:ceScripts[n]});});
    downloads.forEach(function(d){items.push({name:d.name,type:'download',size:d.size,blob:d.blob,status:d.status});});
  }
  var title=document.getElementById('fx-path');if(title)title.textContent=fxView==='files'?'/home/cameron/documents':'/home/cameron/downloads';
  var count=document.getElementById('fx-count');if(count)count.textContent=items.length+' item'+(items.length===1?'':'s');
  if(!items.length){
    var empty=document.createElement('div');empty.className='fx-empty';
    empty.innerHTML='<i class="ti '+(fxView==='files'?'ti-file-off':'ti-download')+'"></i><span>'+(fxView==='files'?'No saved files yet. Save one from Notepad.':'No downloads yet. Save a script from the Code editor, or download from the Browser.')+'</span>';
    grid.appendChild(empty);
    return;
  }
  items.forEach(function(it){
    var ext=(it.name.split('.').pop()||'').toLowerCase();
    var icon=it.type==='script'?'ti-file-code':it.type==='doc'?'ti-file-text':['mp3','wav','ogg','flac','m4a'].indexOf(ext)>-1?'ti-music':['mp4','webm','mkv','mov'].indexOf(ext)>-1?'ti-video':['jpg','jpeg','png','gif','webp','svg'].indexOf(ext)>-1?'ti-photo':['zip','rar','7z','tar','gz'].indexOf(ext)>-1?'ti-file-zip':['pdf'].indexOf(ext)>-1?'ti-file-type-pdf':'ti-file';
    var sz=it.size>(1<<20)?(it.size/(1<<20)).toFixed(1)+' MB':it.size>1024?(it.size>>10)+' KB':((it.size||0)+' B');
    var tile=document.createElement('div');tile.className='fx-item'+(it.type==='script'?' fx-script':'');
    tile.innerHTML='<div class="fx-item-icon"><i class="ti '+icon+'"></i></div><div class="fx-item-name">'+it.name+'</div><div class="fx-item-size">'+sz+'</div>';
    tile.addEventListener('dblclick',function(){fxOpen(it);});
    tile.addEventListener('contextmenu',function(e){e.preventDefault();e.stopPropagation();fxShowCtx(e,it);});
    grid.appendChild(tile);
  });
}
function fxShowCtx(e,it){
  var m=document.getElementById('fx-ctxmenu');if(!m)return;
  m.innerHTML='';
  var actions=[];
  if(it.type==='script'){
    actions.push({label:'Open & Run',icon:'ti-player-play',fn:function(){ceOpenByName(it.name);setTimeout(ceRun,60);}});
    actions.push({label:'Edit',icon:'ti-pencil',fn:function(){ceOpenByName(it.name);}});
    actions.push({label:'Delete',icon:'ti-trash',danger:true,fn:function(){delete ceScripts[it.name];ceSaveStore();fxRender();showNotif('info','Deleted '+it.name);}});
  }else if(it.type==='doc'){
    actions.push({label:'Open',icon:'ti-folder-open',fn:function(){fxOpen(it);}});
    actions.push({label:'Edit',icon:'ti-pencil',fn:function(){fxOpen(it);}});
  }else{
    actions.push({label:'Open',icon:'ti-folder-open',fn:function(){fxOpen(it);}});
    actions.push({label:'Save to device',icon:'ti-download',fn:function(){fxOpen(it);}});
  }
  actions.forEach(function(a){
    var item=document.createElement('div');item.className='ctx-it'+(a.danger?' danger':'');
    item.innerHTML='<i class="ti '+a.icon+'"></i>'+a.label;
    item.addEventListener('click',function(){a.fn();fxHideCtx();});
    m.appendChild(item);
  });
  var win=document.getElementById('win-files').getBoundingClientRect();
  m.style.left=Math.min(e.clientX,window.innerWidth-180)+'px';
  m.style.top=Math.min(e.clientY,window.innerHeight-160)+'px';
  m.style.display='block';
}
function fxHideCtx(){var m=document.getElementById('fx-ctxmenu');if(m)m.style.display='none';}
function fxOpen(it){
  if(it.type==='script'){
    ceOpenByName(it.name);
  }else if(it.type==='doc'){
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

/* ============ CAMSCRIPT CODE EDITOR ============ */
var ceLoaded=false;
var ceCurrentName='untitled.cams';
var CE_SAMPLE=[
  '# Welcome to CamScript!',
  '# Press Run (or Ctrl+Enter) to try it.',
  '# Open the Cheatsheet button for the full guide.',
  '',
  'say "Hello, Cameron!"',
  '',
  '# --- Variables & math ---',
  'let name = "world"',
  'say "Hello, " + name',
  'let a = 6',
  'let b = 7',
  'say a * b',
  '',
  '# --- Lists ---',
  'let nums = [3, 1, 4, 1, 5]',
  'say "sorted: " + sort(nums)',
  'say "biggest: " + max(9, 2, 7)',
  '',
  '# --- Objects ---',
  'let hero = {name: "Cam", level: 9}',
  'say hero.name + " is level " + hero.level',
  '',
  '# --- Loops ---',
  'for i = 1 to 3',
  '  say "line " + i',
  'end',
  '',
  'for each fruit in ["apple", "pear", "plum"]',
  '  say "I like " + fruit',
  'end',
  '',
  '# --- Conditions ---',
  'let score = 85',
  'if score >= 50',
  '  say "You passed!"',
  'else',
  '  say "Try again"',
  'end',
  '',
  '# --- Functions ---',
  'to greet who',
  '  return "Welcome, " + who',
  'end',
  'say greet("friend")'
].join('\n');

function ceInit(){
  if(!ceLoaded){
    ceLoaded=true;
    var ta=document.getElementById('ce-code');
    if(ta&&!ta.value)ta.value=CE_SAMPLE;
    ceUpdateLines();
  }
  ceUpdateName();
}
function ceUpdateName(){var el=document.getElementById('ce-filename');if(el)el.textContent=ceCurrentName;}
function ceUpdateLines(){
  var ta=document.getElementById('ce-code'),ln=document.getElementById('ce-lines');
  if(!ta||!ln)return;
  var count=ta.value.split('\n').length;
  var out='';for(var i=1;i<=count;i++)out+=i+'\n';
  ln.textContent=out;
  ln.scrollTop=ta.scrollTop;
}
function ceClear(){var o=document.getElementById('ce-output');if(o){o.innerHTML='';o.classList.remove('has-error');}}
function cePrint(text,cls){
  var o=document.getElementById('ce-output');if(!o)return;
  var line=document.createElement('div');
  line.className='ce-out-line'+(cls?' '+cls:'');
  line.textContent=text;
  o.appendChild(line);
  o.scrollTop=o.scrollHeight;
}
function ceToggleHelp(){var p=document.getElementById('ce-help-pane');if(p)p.classList.toggle('open');}
function ceLoadSample(){var ta=document.getElementById('ce-code');if(ta){ta.value=CE_SAMPLE;ceCurrentName='example.cams';ceUpdateName();ceUpdateLines();ceClear();}}
function ceNew(){
  var ta=document.getElementById('ce-code');if(!ta)return;
  ta.value='';ceCurrentName='untitled.cams';ceUpdateName();ceUpdateLines();ceClear();
  showNotif('info','New script');
}
function ceSave(){
  var ta=document.getElementById('ce-code');if(!ta)return;
  var def=ceCurrentName||'untitled.cams';
  showModal('Save Script','Save to CamOS Downloads as:',def,function(nm){
    if(!nm)return;
    if(!/\.cams$/.test(nm))nm+='.cams';
    ceCurrentName=nm;
    ceScripts[nm]=ta.value;
    ceSaveStore();
    ceUpdateName();
    showNotif('download','Saved '+nm+' to Downloads');
    if(document.getElementById('win-files').classList.contains('open'))fxRender();
  });
}
function ceOpenByName(name){
  if(!(name in ceScripts))return;
  openApp('code');
  var ta=document.getElementById('ce-code');
  if(ta)ta.value=ceScripts[name];
  ceCurrentName=name;ceUpdateName();ceUpdateLines();ceClear();
  showNotif('info','Opened '+name);
}
function ceRun(){
  ceClear();
  var ta=document.getElementById('ce-code');if(!ta)return;
  var src=ta.value;
  try{
    var interp=new CamScript(cePrint);
    interp.run(src);
    if(!document.getElementById('ce-output').children.length)cePrint('(program finished with no output)','ce-dim');
  }catch(err){
    cePrint('Error: '+(err&&err.message?err.message:err),'ce-err');
    var o=document.getElementById('ce-output');if(o)o.classList.add('has-error');
  }
}

/* ---- CamScript interpreter (v2) ---- */
function CamScript(printFn,opts){
  this.print=printFn||function(){};
  this.globals={};
  this.funcs={};
  this.steps=0;
  this.opts=opts||{};
}
CamScript.RETURN={};
CamScript.prototype.run=function(src){
  var rawLines=src.replace(/\r/g,'').split('\n');
  var lines=[];
  for(var i=0;i<rawLines.length;i++){
    var noComment=this.stripComment(rawLines[i]);
    if(noComment.trim()==='')continue;
    lines.push({text:noComment.trim(),num:i+1});
  }
  this.lines=lines;
  this.execBlock(0,lines.length,this.globals,0);
};
CamScript.prototype.stripComment=function(line){
  var out='',inStr=false,q='';
  for(var i=0;i<line.length;i++){
    var c=line[i];
    if(inStr){out+=c;if(c===q)inStr=false;continue;}
    if(c==='"'||c==="'"){inStr=true;q=c;out+=c;continue;}
    if(c==='#')break;
    out+=c;
  }
  return out;
};
CamScript.prototype.tick=function(num){
  this.steps++;
  if(this.steps>500000)throw new Error('Program ran too long (possible infinite loop) near line '+num);
};
CamScript.prototype.matchEnd=function(start){
  var depth=0;
  for(var i=start;i<this.lines.length;i++){
    var first=this.lines[i].text.split(/\s+/)[0];
    if(i!==start&&(first==='if'||first==='repeat'||first==='while'||first==='for'||first==='to'||first==='try'))depth++;
    else if(first==='end'){if(depth===0)return i;depth--;}
  }
  throw new Error("Missing 'end' for block starting at line "+this.lines[start].num);
};
CamScript.prototype.findAtDepth=function(start,endIdx,keyword){
  var depth=0;
  for(var i=start+1;i<endIdx;i++){
    var first=this.lines[i].text.split(/\s+/)[0];
    if(first==='if'||first==='repeat'||first==='while'||first==='for'||first==='to'||first==='try')depth++;
    else if(first==='end')depth--;
    else if(first===keyword&&depth===0)return i;
  }
  return -1;
};
CamScript.prototype.execBlock=function(from,to,scope,depth){
  if(depth>300)throw new Error('Too much nesting / recursion');
  var i=from;
  while(i<to){
    var line=this.lines[i];
    this.tick(line.num);
    var t=line.text;
    var first=t.split(/\s+/)[0];

    if(first==='say'||first==='print'){
      var val=this.eval(t.slice(first.length).trim(),scope,line.num);
      this.print(this.toStr(val));
      i++;continue;
    }
    if(first==='show'){ // show without newline-join; same as say here
      this.print(this.toStr(this.eval(t.slice(4).trim(),scope,line.num)));
      i++;continue;
    }
    if(first==='wait'){
      // wait is cooperative: we busy-evaluate nothing (sync interpreter), just validate
      var ms=this.eval(t.slice(4).trim(),scope,line.num);
      // In sync mode we cannot truly sleep; record intent (no-op) to keep it beginner-safe
      i++;continue;
    }
    if(first==='let'||first==='set'){
      var rest=t.slice(first.length).trim();
      var eq=this.splitAssign(rest,line.num);
      // 'let' on a plain name declares in the current scope; on index/prop it updates
      var isPlain=/^[a-zA-Z_]\w*$/.test(eq.name.trim());
      this.assign(eq.name,this.eval(eq.expr,scope,line.num),scope,line.num,first==='let'&&isPlain);
      i++;continue;
    }
    if(first==='change'){ // change x by 5  /  change x to 9
      var m=t.match(/^change\s+(.+?)\s+(by|to)\s+(.+)$/);
      if(!m)throw new Error("Use: change x by 1  (or)  change x to 5  (line "+line.num+")");
      var cur=(m[1] in scope)?scope[m[1]]:this.globals[m[1]];
      var amt=this.eval(m[3],scope,line.num);
      this.assign(m[1],m[2]==='by'?(cur+amt):amt,scope,line.num);
      i++;continue;
    }
    if(first==='if'){
      var endIdx=this.matchEnd(i);
      var elseIdx=this.findAtDepth(i,endIdx,'else');
      var cond=this.eval(t.slice(2).trim(),scope,line.num);
      if(this.truthy(cond))this.execBlock(i+1,elseIdx>-1?elseIdx:endIdx,scope,depth+1);
      else if(elseIdx>-1)this.execBlock(elseIdx+1,endIdx,scope,depth+1);
      i=endIdx+1;continue;
    }
    if(first==='repeat'){
      var endR=this.matchEnd(i);
      var rm=t.match(/^repeat\s+(.+?)\s+times$/);
      if(!rm)throw new Error("Use: repeat 3 times (line "+line.num+")");
      var n=Math.floor(Number(this.eval(rm[1],scope,line.num)));
      if(isNaN(n))throw new Error('repeat needs a number (line '+line.num+')');
      for(var r=0;r<n;r++){this.tick(line.num);this.execBlock(i+1,endR,scope,depth+1);}
      i=endR+1;continue;
    }
    if(first==='while'){
      var endW=this.matchEnd(i);
      var cexp=t.slice(5).trim();
      while(this.truthy(this.eval(cexp,scope,line.num))){this.tick(line.num);this.execBlock(i+1,endW,scope,depth+1);}
      i=endW+1;continue;
    }
    if(first==='for'){
      var endF=this.matchEnd(i);
      // for each item in list  /  for i = 1 to 10  [step k]
      var each=t.match(/^for\s+each\s+([a-zA-Z_]\w*)\s+in\s+(.+)$/);
      var rng=t.match(/^for\s+([a-zA-Z_]\w*)\s*=\s*(.+?)\s+to\s+(.+?)(?:\s+step\s+(.+))?$/);
      if(each){
        var coll=this.eval(each[2],scope,line.num);
        var vn=each[1];
        if(Array.isArray(coll)){
          for(var fi=0;fi<coll.length;fi++){this.tick(line.num);var ls=Object.create(scope);ls[vn]=coll[fi];this.execBlock(i+1,endF,ls,depth+1);}
        }else if(coll&&typeof coll==='object'){
          var keys=Object.keys(coll);
          for(var ki=0;ki<keys.length;ki++){this.tick(line.num);var ls2=Object.create(scope);ls2[vn]=keys[ki];this.execBlock(i+1,endF,ls2,depth+1);}
        }else if(typeof coll==='string'){
          for(var si=0;si<coll.length;si++){this.tick(line.num);var ls3=Object.create(scope);ls3[vn]=coll[si];this.execBlock(i+1,endF,ls3,depth+1);}
        }else throw new Error("for each needs a list, text or object (line "+line.num+")");
      }else if(rng){
        var vn2=rng[1];
        var a=Number(this.eval(rng[2],scope,line.num));
        var b=Number(this.eval(rng[3],scope,line.num));
        var step=rng[4]?Number(this.eval(rng[4],scope,line.num)):1;
        if(step===0)throw new Error('step cannot be 0 (line '+line.num+')');
        if(step>0)for(var v=a;v<=b;v+=step){this.tick(line.num);var lsr=Object.create(scope);lsr[vn2]=v;this.execBlock(i+1,endF,lsr,depth+1);}
        else for(var v2=a;v2>=b;v2+=step){this.tick(line.num);var lsr2=Object.create(scope);lsr2[vn2]=v2;this.execBlock(i+1,endF,lsr2,depth+1);}
      }else throw new Error("Use: for each x in list  (or)  for i = 1 to 10 (line "+line.num+")");
      i=endF+1;continue;
    }
    if(first==='to'){
      var endT=this.matchEnd(i);
      var header=t.slice(2).trim().split(/\s+/);
      this.funcs[header[0]]={params:header.slice(1),from:i+1,to:endT};
      i=endT+1;continue;
    }
    if(first==='return'){
      var rv=t.slice(6).trim();
      this.returnValue=rv?this.eval(rv,scope,line.num):null;
      throw CamScript.RETURN;
    }
    if(first==='try'){
      var endTry=this.matchEnd(i);
      var catchIdx=this.findAtDepth(i,endTry,'catch');
      try{
        this.execBlock(i+1,catchIdx>-1?catchIdx:endTry,scope,depth+1);
      }catch(err){
        if(err===CamScript.RETURN)throw err;
        if(catchIdx>-1){
          var cm=this.lines[catchIdx].text.match(/^catch\s+([a-zA-Z_]\w*)/);
          var cs=Object.create(scope);
          if(cm)cs[cm[1]]=(err&&err.message)?err.message:String(err);
          this.execBlock(catchIdx+1,endTry,cs,depth+1);
        }
      }
      i=endTry+1;continue;
    }
    if(first==='end'||first==='else'||first==='catch'){i++;continue;}

    // function call as a statement
    var callName=first;
    if(this.funcs[callName]){
      this.callFunc(callName,t.slice(callName.length).trim(),scope,line.num,depth);
      i++;continue;
    }
    // assignment without let:  x = ...  or  list[0] = ...  or  obj.k = ...
    if(/[a-zA-Z_]/.test(t.charAt(0))&&this.hasTopAssign(t)){
      var as=this.splitAssign(t,line.num);
      this.assign(as.name,this.eval(as.expr,scope,line.num),scope,line.num);
      i++;continue;
    }
    // bare expression (e.g. a function-style builtin) - evaluate & ignore
    this.eval(t,scope,line.num);
    i++;
  }
};
CamScript.prototype.callFunc=function(name,argStr,scope,num,depth){
  var fn=this.funcs[name];
  var args=this.parseArgs(argStr,scope,num);
  var local=Object.create(this.globals);
  for(var p=0;p<fn.params.length;p++)local[fn.params[p]]=args[p];
  this.returnValue=null;
  try{this.execBlock(fn.from,fn.to,local,depth+1);}
  catch(e){if(e===CamScript.RETURN)return this.returnValue;throw e;}
  return this.returnValue;
};
CamScript.prototype.parseArgs=function(argStr,scope,num){
  argStr=argStr.trim();if(!argStr)return [];
  var parts=this.splitTop(argStr,',');
  var self=this;
  return parts.map(function(p){return self.eval(p.trim(),scope,num);});
};
CamScript.prototype.splitTop=function(s,sep){
  var parts=[],cur='',depth=0,inStr=false,q='';
  for(var i=0;i<s.length;i++){
    var c=s[i];
    if(inStr){cur+=c;if(c===q)inStr=false;continue;}
    if(c==='"'||c==="'"){inStr=true;q=c;cur+=c;continue;}
    if(c==='('||c==='['||c==='{')depth++;
    if(c===')'||c===']'||c==='}')depth--;
    if(c===sep&&depth===0){parts.push(cur);cur='';continue;}
    cur+=c;
  }
  if(cur.trim()!=='')parts.push(cur);
  return parts;
};
CamScript.prototype.hasTopAssign=function(s){
  var depth=0,inStr=false,q='';
  for(var i=0;i<s.length;i++){
    var c=s[i];
    if(inStr){if(c===q)inStr=false;continue;}
    if(c==='"'||c==="'"){inStr=true;q=c;continue;}
    if(c==='('||c==='['||c==='{')depth++;
    if(c===')'||c===']'||c==='}')depth--;
    if(c==='='&&depth===0){
      var prev=s[i-1],next=s[i+1];
      if(prev==='='||prev==='>'||prev==='<'||prev==='!')continue;
      if(next==='=')continue;
      return true;
    }
  }
  return false;
};
CamScript.prototype.splitAssign=function(rest,num){
  var depth=0,inStr=false,q='';
  for(var i=0;i<rest.length;i++){
    var c=rest[i];
    if(inStr){if(c===q)inStr=false;continue;}
    if(c==='"'||c==="'"){inStr=true;q=c;continue;}
    if(c==='('||c==='['||c==='{')depth++;
    if(c===')'||c===']'||c==='}')depth--;
    if(c==='='&&depth===0){
      var prev=rest[i-1],next=rest[i+1];
      if(prev==='='||prev==='>'||prev==='<'||prev==='!')continue;
      if(next==='=')continue;
      return {name:rest.slice(0,i).trim(),expr:rest.slice(i+1).trim()};
    }
  }
  throw new Error("Expected '=' in assignment (line "+num+")");
};
// assign supports plain names, list[index], obj.key, obj["key"]
CamScript.prototype.assign=function(target,value,scope,num,declare){
  target=target.trim();
  if(/^[a-zA-Z_]\w*$/.test(target)){
    if(declare){scope[target]=value;return;}
    // find the scope object that actually owns this name and update it there
    var s=scope;
    while(s){
      if(Object.prototype.hasOwnProperty.call(s,target)){s[target]=value;return;}
      s=Object.getPrototypeOf(s);
    }
    // not found anywhere -> create in current scope
    scope[target]=value;
    return;
  }
  // index / property assignment
  var mIdx=target.match(/^(.+)\[(.+)\]$/);
  if(mIdx){
    var obj=this.eval(mIdx[1],scope,num);
    var key=this.eval(mIdx[2],scope,num);
    if(obj==null)throw new Error('Cannot set index on nothing (line '+num+')');
    obj[key]=value;return;
  }
  var mDot=target.match(/^(.+)\.([a-zA-Z_]\w*)$/);
  if(mDot){
    var obj2=this.eval(mDot[1],scope,num);
    if(obj2==null||typeof obj2!=='object')throw new Error('Cannot set property on that (line '+num+')');
    obj2[mDot[2]]=value;return;
  }
  throw new Error('Cannot assign to "'+target+'" (line '+num+')');
};
CamScript.prototype.truthy=function(v){return !(v===false||v===0||v===''||v===null||v===undefined||(Array.isArray(v)&&v.length===0));};
CamScript.prototype.toStr=function(v){
  if(v===true)return'true';if(v===false)return'false';
  if(v===null||v===undefined)return'nothing';
  if(Array.isArray(v))return'['+v.map(this.toStr,this).join(', ')+']';
  if(typeof v==='object'){var self=this;return'{'+Object.keys(v).map(function(k){return k+': '+self.toStr(v[k]);}).join(', ')+'}';}
  return String(v);
};

/* Expression evaluator */
CamScript.prototype.eval=function(expr,scope,num){
  this.exprNum=num;
  this.toks=this.tokenize(expr,num);this.pos=0;this.scope=scope;
  var v=this.parseOr();
  if(this.pos<this.toks.length)throw new Error("Unexpected '"+this.toks[this.pos].v+"' (line "+num+")");
  return v;
};
CamScript.prototype.tokenize=function(s,num){
  var toks=[],i=0;
  while(i<s.length){
    var c=s[i];
    if(c===' '||c==='\t'){i++;continue;}
    if(c==='"'||c==="'"){var q=c,str='';i++;while(i<s.length&&s[i]!==q){if(s[i]==='\\'&&i+1<s.length){var nx=s[i+1];str+=(nx==='n'?'\n':nx==='t'?'\t':nx);i+=2;continue;}str+=s[i];i++;}if(i>=s.length)throw new Error('Unclosed string (line '+num+')');i++;toks.push({t:'str',v:str});continue;}
    if(/[0-9]/.test(c)||(c==='.'&&/[0-9]/.test(s[i+1]))){var nstr='';while(i<s.length&&/[0-9.]/.test(s[i])){nstr+=s[i];i++;}toks.push({t:'num',v:parseFloat(nstr)});continue;}
    if(/[a-zA-Z_]/.test(c)){var id='';while(i<s.length&&/[a-zA-Z0-9_]/.test(s[i])){id+=s[i];i++;}toks.push({t:'id',v:id});continue;}
    var two=s.substr(i,2);
    if(two==='=='||two==='!='||two==='>='||two==='<='){toks.push({t:'op',v:two});i+=2;continue;}
    if('+-*/%()<>[]{}.,:'.indexOf(c)>-1){toks.push({t:'op',v:c});i++;continue;}
    throw new Error("Unexpected character '"+c+"' (line "+num+")");
  }
  return toks;
};
CamScript.prototype.peek=function(){return this.toks[this.pos];};
CamScript.prototype.next=function(){return this.toks[this.pos++];};
CamScript.prototype.parseOr=function(){var l=this.parseAnd();while(this.peek()&&this.peek().t==='id'&&this.peek().v==='or'){this.next();var r=this.parseAnd();l=this.truthy(l)||this.truthy(r);}return l;};
CamScript.prototype.parseAnd=function(){var l=this.parseCmp();while(this.peek()&&this.peek().t==='id'&&this.peek().v==='and'){this.next();var r=this.parseCmp();l=this.truthy(l)&&this.truthy(r);}return l;};
CamScript.prototype.parseCmp=function(){
  var l=this.parseAdd();
  while(this.peek()&&((this.peek().t==='op'&&['==','!=','>','<','>=','<='].indexOf(this.peek().v)>-1)||(this.peek().t==='id'&&this.peek().v==='is'))){
    var op=this.next().v;
    if(op==='is'&&this.peek()&&this.peek().t==='id'&&this.peek().v==='not'){this.next();var rn=this.parseAdd();l=(l!==rn);continue;}
    if(op==='is'){var ri=this.parseAdd();l=(l===ri);continue;}
    var r=this.parseAdd();
    if(op==='==')l=(l===r);else if(op==='!=')l=(l!==r);else if(op==='>')l=(l>r);else if(op==='<')l=(l<r);else if(op==='>=')l=(l>=r);else if(op==='<=')l=(l<=r);
  }
  return l;
};
CamScript.prototype.parseAdd=function(){
  var l=this.parseMul();
  while(this.peek()&&this.peek().t==='op'&&(this.peek().v==='+'||this.peek().v==='-')){
    var op=this.next().v;var r=this.parseMul();
    if(op==='+'){if(typeof l==='string'||typeof r==='string')l=this.toStr(l)+this.toStr(r);else if(Array.isArray(l)&&Array.isArray(r))l=l.concat(r);else l=l+r;}
    else l=l-r;
  }
  return l;
};
CamScript.prototype.parseMul=function(){var l=this.parseUnary();while(this.peek()&&this.peek().t==='op'&&(this.peek().v==='*'||this.peek().v==='/'||this.peek().v==='%')){var op=this.next().v;var r=this.parseUnary();if(op==='*')l=l*r;else if(op==='/')l=l/r;else l=l%r;}return l;};
CamScript.prototype.parseUnary=function(){var p=this.peek();if(p&&p.t==='op'&&p.v==='-'){this.next();return -this.parseUnary();}if(p&&p.t==='id'&&p.v==='not'){this.next();return !this.truthy(this.parseUnary());}return this.parsePostfix();};
CamScript.prototype.parsePostfix=function(){
  var v=this.parsePrimary();
  while(this.peek()&&this.peek().t==='op'&&(this.peek().v==='['||this.peek().v==='.')){
    var op=this.next().v;
    if(op==='['){var idx=this.parseOr();var cc=this.next();if(!cc||cc.v!==']')throw new Error('Missing ] (line '+this.exprNum+')');
      if(v==null)throw new Error('Cannot index nothing (line '+this.exprNum+')');
      v=v[idx];
    }else{ // .
      var key=this.next();if(!key||key.t!=='id')throw new Error('Expected property name after . (line '+this.exprNum+')');
      if(v==null)throw new Error('Cannot read property of nothing (line '+this.exprNum+')');
      v=v[key.v];
    }
  }
  return v;
};
CamScript.prototype.BUILTINS={
  round:function(a){return Math.round(a[0]);},floor:function(a){return Math.floor(a[0]);},ceil:function(a){return Math.ceil(a[0]);},
  abs:function(a){return Math.abs(a[0]);},sqrt:function(a){return Math.sqrt(a[0]);},pow:function(a){return Math.pow(a[0],a[1]);},
  min:function(a){return Math.min.apply(null,a);},max:function(a){return Math.max.apply(null,a);},
  random:function(a){if(a.length===0)return Math.random();if(a.length===1)return Math.floor(Math.random()*a[0]);return Math.floor(Math.random()*(a[1]-a[0]+1))+a[0];},
  length:function(a){var x=a[0];if(x==null)return 0;if(Array.isArray(x)||typeof x==='string')return x.length;if(typeof x==='object')return Object.keys(x).length;return 0;},
  upper:function(a){return String(a[0]).toUpperCase();},lower:function(a){return String(a[0]).toLowerCase();},
  trim:function(a){return String(a[0]).trim();},
  text:function(a){return this.toStr(a[0]);},number:function(a){return Number(a[0]);},
  contains:function(a){var c=a[0];if(Array.isArray(c))return c.indexOf(a[1])>-1;return String(c).indexOf(String(a[1]))>-1;},
  join:function(a){return a[0].join(a.length>1?String(a[1]):',');},
  split:function(a){return String(a[0]).split(a.length>1?String(a[1]):'');},
  push:function(a){a[0].push(a[1]);return a[0];},
  pop:function(a){return a[0].pop();},
  first:function(a){return a[0][0];},last:function(a){return a[0][a[0].length-1];},
  reverse:function(a){return a[0].slice().reverse();},
  sort:function(a){return a[0].slice().sort(function(x,y){return x>y?1:x<y?-1:0;});},
  range:function(a){var s=a.length>1?a[0]:0,e=a.length>1?a[1]:a[0],out=[];for(var i=s;i<e;i++)out.push(i);return out;},
  keys:function(a){return Object.keys(a[0]);},
  has:function(a){return Object.prototype.hasOwnProperty.call(a[0],a[1]);},
  type:function(a){var x=a[0];if(Array.isArray(x))return'list';if(x===null)return'nothing';return typeof x==='object'?'object':typeof x;}
};
CamScript.prototype.parsePrimary=function(){
  var tk=this.next();
  if(!tk)throw new Error('Unexpected end of expression (line '+this.exprNum+')');
  if(tk.t==='num')return tk.v;
  if(tk.t==='str')return tk.v;
  if(tk.t==='op'&&tk.v==='('){var v=this.parseOr();var c=this.next();if(!c||c.v!==')')throw new Error('Missing ) (line '+this.exprNum+')');return v;}
  if(tk.t==='op'&&tk.v==='['){ // list literal
    var arr=[];
    if(this.peek()&&this.peek().v===']'){this.next();return arr;}
    while(true){arr.push(this.parseOr());var n=this.next();if(!n)throw new Error('Missing ] (line '+this.exprNum+')');if(n.v===']')break;if(n.v!==',')throw new Error('Expected , or ] (line '+this.exprNum+')');}
    return arr;
  }
  if(tk.t==='op'&&tk.v==='{'){ // object literal {key: value, ...}
    var obj={};
    if(this.peek()&&this.peek().v==='}'){this.next();return obj;}
    while(true){
      var kt=this.next();var key;
      if(kt.t==='id'||kt.t==='str')key=kt.v;else throw new Error('Object key must be a name or text (line '+this.exprNum+')');
      var colon=this.next();if(!colon||colon.v!==':')throw new Error('Expected : after key (line '+this.exprNum+')');
      obj[key]=this.parseOr();
      var nn=this.next();if(!nn)throw new Error('Missing } (line '+this.exprNum+')');if(nn.v==='}')break;if(nn.v!==',')throw new Error('Expected , or } (line '+this.exprNum+')');
    }
    return obj;
  }
  if(tk.t==='id'){
    if(tk.v==='true')return true;
    if(tk.v==='false')return false;
    if(tk.v==='nothing')return null;
    if(tk.v==='pi')return Math.PI;
    // builtin or user-function call:  name(args)
    if(this.peek()&&this.peek().t==='op'&&this.peek().v==='('){
      this.next();
      var args=[];
      if(this.peek()&&this.peek().v===')'){this.next();}
      else{while(true){args.push(this.parseOr());var a=this.next();if(!a)throw new Error('Missing ) (line '+this.exprNum+')');if(a.v===')')break;if(a.v!==',')throw new Error('Expected , or ) (line '+this.exprNum+')');}}
      if(this.BUILTINS[tk.v])return this.BUILTINS[tk.v].call(this,args);
      if(this.funcs[tk.v]){
        var fn=this.funcs[tk.v];var local=Object.create(this.globals);
        for(var p=0;p<fn.params.length;p++)local[fn.params[p]]=args[p];
        this.returnValue=null;
        try{this.execBlock(fn.from,fn.to,local,1);}catch(e){if(e===CamScript.RETURN)return this.returnValue;throw e;}
        return this.returnValue;
      }
      throw new Error("Unknown function '"+tk.v+"' (line "+this.exprNum+")");
    }
    // builtin used without parens that take no args
    if(tk.v==='random')return Math.random();
    if(this.scope&&(tk.v in this.scope))return this.scope[tk.v];
    if(tk.v in this.globals)return this.globals[tk.v];
    throw new Error("Unknown name '"+tk.v+"' (line "+this.exprNum+")");
  }
  throw new Error("Unexpected '"+tk.v+"' (line "+this.exprNum+")");
};


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
  ceLoadStore();
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

  var ceTa=document.getElementById('ce-code');
  if(ceTa){
    ceTa.addEventListener('input',ceUpdateLines);
    ceTa.addEventListener('scroll',function(){var ln=document.getElementById('ce-lines');if(ln)ln.scrollTop=ceTa.scrollTop;});
    ceTa.addEventListener('keydown',function(e){
      if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();ceRun();return;}
      if(e.key==='Tab'){e.preventDefault();var s=this.selectionStart;this.value=this.value.slice(0,s)+'  '+this.value.slice(this.selectionEnd);this.selectionStart=this.selectionEnd=s+2;ceUpdateLines();}
    });
  }

  ['terminal','browser','notepad','sysinfo','files','code'].forEach(initDrag);

  var desktop=document.getElementById('desktop');
  if(desktop){
    desktop.addEventListener('click',function(e){if(!e.target.closest('#smenu')&&!e.target.closest('#start-btn'))closeMenu();if(!e.target.closest('#ctxmenu'))hideCtx();});
    document.addEventListener('click',function(e){if(!e.target.closest('#fx-ctxmenu')&&!e.target.closest('.fx-item'))fxHideCtx();});
    desktop.addEventListener('contextmenu',function(e){if(e.target.closest('.win')||e.target.closest('#taskbar'))return;e.preventDefault();var m=document.getElementById('ctxmenu');m.style.left=Math.min(e.clientX,window.innerWidth-190)+'px';m.style.top=Math.min(e.clientY,window.innerHeight-180)+'px';m.style.display='block';});
  }

  var ov=document.getElementById('modal-overlay');
  if(ov)ov.addEventListener('click',function(e){if(e.target===this)closeModal(null);});
});
