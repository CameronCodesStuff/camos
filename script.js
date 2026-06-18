/* =====================================================
   CamOS v3.0 — script.js
   ===================================================== */

/* ---- PROXIES ---- */
var PROXIES = [
  function(u) { return 'https://corsproxy.io/?' + encodeURIComponent(u); },
  function(u) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u); },
  function(u) { return 'https://thingproxy.freeboard.io/fetch/' + u; }
];

var appStartTime = Date.now();

/* =====================================================
   BOOT CANVAS
   ===================================================== */
function initBootCanvas() {
  var c = document.getElementById('boot-canvas');
  if (!c) return;
  var ctx = c.getContext('2d');
  var pts = [];
  function resize() { c.width = window.innerWidth; c.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  for (var i = 0; i < 80; i++) {
    pts.push({ x: Math.random() * c.width, y: Math.random() * c.height, vx: (Math.random()-0.5)*0.3, vy: (Math.random()-0.5)*0.3, r: Math.random()*1.4+0.3, a: Math.random()*0.5+0.1 });
  }
  function draw() {
    ctx.clearRect(0,0,c.width,c.height);
    for (var i=0;i<pts.length;i++) {
      var p=pts[i]; p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=c.width; if(p.x>c.width)p.x=0; if(p.y<0)p.y=c.height; if(p.y>c.height)p.y=0;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle='rgba(127,119,221,'+(p.a*0.45)+')'; ctx.fill();
    }
    for (var i=0;i<pts.length;i++) {
      for (var j=i+1;j<pts.length;j++) {
        var dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y, d=Math.sqrt(dx*dx+dy*dy);
        if(d<110){ ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y); ctx.strokeStyle='rgba(83,74,183,'+((1-d/110)*0.14)+')'; ctx.lineWidth=0.5; ctx.stroke(); }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* =====================================================
   BOOT SEQUENCE
   ===================================================== */
var BOOT_STEPS = [
  'Initializing UEFI firmware...','Detecting hardware components...',
  'Initializing memory controller...','Mounting virtual filesystem...',
  'Loading kernel modules...','Starting network subsystem...',
  'Launching window manager...','Loading user session...',
  'Starting desktop environment...','System ready.'
];
var bootIdx = 0;

function bootStep() {
  var fill = document.getElementById('boot-bar-fill');
  var msg  = document.getElementById('boot-msg');
  var log  = document.getElementById('boot-log');
  if (bootIdx >= BOOT_STEPS.length) {
    setTimeout(function() {
      var bs = document.getElementById('boot');
      bs.style.transition = 'opacity 0.7s'; bs.style.opacity = '0';
      setTimeout(function() { bs.style.display='none'; showLogin(); }, 700);
    }, 300); return;
  }
  var s = BOOT_STEPS[bootIdx];
  msg.textContent = s;
  fill.style.width = ((bootIdx+1)/BOOT_STEPS.length*100)+'%';
  var line = document.createElement('div');
  line.innerHTML = '<span class="ok">[ OK ]</span> <span class="tag">'+s+'</span>';
  log.appendChild(line); log.scrollTop=log.scrollHeight;
  bootIdx++; setTimeout(bootStep, 260+Math.random()*180);
}

/* =====================================================
   LOGIN
   ===================================================== */
function showLogin() {
  var ls = document.getElementById('login');
  ls.style.display='flex'; ls.style.opacity='0'; ls.style.transition='opacity 0.5s';
  setTimeout(function(){ ls.style.opacity='1'; document.getElementById('login-pw').focus(); },50);
  tickLoginClock(); window._lci=setInterval(tickLoginClock,1000);
}
function tickLoginClock() {
  var d=new Date();
  document.getElementById('login-time').textContent=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  document.getElementById('login-date').textContent=d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'});
}
function doLogin() {
  var pw=document.getElementById('login-pw').value;
  if(pw===''||pw==='1234'){
    clearInterval(window._lci);
    var ls=document.getElementById('login');
    ls.style.transition='opacity 0.4s'; ls.style.opacity='0';
    setTimeout(function(){ ls.style.display='none'; startDesktop(); },400);
  } else {
    var err=document.getElementById('login-err');
    err.textContent='Incorrect password — try: 1234';
    document.getElementById('login-pw').value='';
    setTimeout(function(){err.textContent='';},3000);
  }
}
function doLogout() {
  closeMenu();
  ['terminal','browser','notepad','sysinfo'].forEach(function(id){closeApp(id);});
  var d=document.getElementById('desktop');
  d.style.transition='opacity 0.4s'; d.style.opacity='0';
  setTimeout(function(){ d.style.display='none'; d.style.opacity='1'; document.getElementById('login-pw').value=''; showLogin(); },400);
}

/* =====================================================
   DESKTOP PARTICLES
   ===================================================== */
function initDesktopCanvas() {
  var c=document.getElementById('desktop-canvas'); if(!c)return;
  var ctx=c.getContext('2d'); var pts=[];
  function resize(){c.width=window.innerWidth;c.height=window.innerHeight-44;}
  resize(); window.addEventListener('resize',resize);
  for(var i=0;i<35;i++) pts.push({x:Math.random()*c.width,y:Math.random()*c.height,vx:(Math.random()-0.5)*0.12,vy:(Math.random()-0.5)*0.12,r:Math.random()+0.2,a:Math.random()*0.2+0.05});
  function draw(){
    ctx.clearRect(0,0,c.width,c.height);
    pts.forEach(function(p){ p.x+=p.vx;p.y+=p.vy; if(p.x<0)p.x=c.width;if(p.x>c.width)p.x=0;if(p.y<0)p.y=c.height;if(p.y>c.height)p.y=0; ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,'+p.a+')';ctx.fill(); });
    requestAnimationFrame(draw);
  }
  draw();
}

function startDesktop() {
  var d=document.getElementById('desktop');
  d.style.display='block'; d.style.opacity='0'; d.style.transition='opacity 0.5s';
  setTimeout(function(){d.style.opacity='1';},50);
  initDesktopCanvas(); tickClock(); setInterval(tickClock,1000); setInterval(siPoll,2500);
  setTimeout(function(){showNotif('welcome','Double-click icons to open apps. Right-click desktop for options.');},900);
}

/* =====================================================
   VIRTUAL FILESYSTEM
   ===================================================== */
var FS = { '/':{ type:'dir', children:{
  home:{type:'dir',children:{cameron:{type:'dir',children:{
    readme:{type:'file',content:'Welcome to CamOS v3.0!\nBuilt by Cameron.\n\nTry: ls, cd, cat readme, mkdir test, neofetch'},
    notes:{type:'file',content:'# Notes\n\n- NEXUS platform\n- CamOS browser\n'},
    '.camshrc':{type:'file',content:'export USER=cameron\nexport HOME=/home/cameron\nalias ll="ls"\nalias cls="clear"'},
    projects:{type:'dir',children:{nexus:{type:'file',content:'NEXUS — realtime chat platform\nStack: Firebase + vanilla JS'}}}
  }}}},
  etc:{type:'dir',children:{hostname:{type:'file',content:'camos'},'os-release':{type:'file',content:'NAME="CamOS"\nVERSION="3.0"'}}},
  tmp:{type:'dir',children:{}}
}}};
var CWD='/home/cameron'; var HIST=[]; var HISTI=-1;

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
  help:function(){return 'camsh 3.0\n\n  ls [path]    list directory\n  cd [path]    change directory\n  pwd          print directory\n  cat <file>   print file\n  echo <text>  print text\n  mkdir <dir>  make directory\n  touch <file> create file\n  rm <name>    remove file/dir\n  clear        clear terminal\n  date         current date\n  whoami       show user\n  uname        system info\n  uptime       system uptime\n  neofetch     system summary';},
  pwd:function(){return CWD;},
  whoami:function(){return 'cameron';},
  hostname:function(){return 'camos';},
  uname:function(){return 'CamOS 3.0 '+(navigator.platform||'Browser')+' HTML5';},
  date:function(){return new Date().toString();},
  uptime:function(){var s=Math.floor((Date.now()-appStartTime)/1000);return'up '+Math.floor(s/60)+'m '+(s%60)+'s, 1 user';},
  clear:function(){document.getElementById('t-out').innerHTML='';return null;},
  ls:function(args){
    var path=args[0]?resolvePath(args[0]):CWD; var node=getNode(path);
    if(!node)return'ls: '+args[0]+': No such file or directory';
    if(node.type!=='dir')return args[0]||path;
    var items=Object.entries(node.children); if(!items.length)return'';
    return items.map(function(e){var col=e[1].type==='dir'?'#8888ff':'#33ff88';return'<span style="color:'+col+'">'+e[0]+(e[1].type==='dir'?'/':'')+'</span>';}).join('  ');
  },
  cd:function(args){var path=resolvePath(args[0]||'~');var node=getNode(path);if(!node)return'cd: '+(args[0]||'')+': No such file or directory';if(node.type!=='dir')return'cd: '+args[0]+': Not a directory';CWD=path||'/';return'';},
  cat:function(args){if(!args[0])return'cat: missing operand';var node=getNode(resolvePath(args[0]));if(!node)return'cat: '+args[0]+': No such file or directory';if(node.type==='dir')return'cat: '+args[0]+': Is a directory';return node.content;},
  echo:function(args){return args.join(' ');},
  mkdir:function(args){if(!args[0])return'mkdir: missing operand';var p=cwdNode();if(!p)return'error';if(p.children[args[0]])return'mkdir: '+args[0]+': File exists';p.children[args[0]]={type:'dir',children:{}};return'';},
  touch:function(args){if(!args[0])return'touch: missing operand';var p=cwdNode();if(!p)return'error';if(!p.children[args[0]])p.children[args[0]]={type:'file',content:''};return'';},
  rm:function(args){if(!args[0])return'rm: missing operand';var p=cwdNode();if(!p||!p.children[args[0]])return'rm: '+args[0]+': No such file or directory';delete p.children[args[0]];return'';},
  neofetch:function(){return'<span style="color:#7F77DD">   /\\    </span>  <span style="color:#9090dd">cameron</span><span style="color:#555">@</span><span style="color:#9090dd">camos</span>\n<span style="color:#7F77DD">  /  \\   </span>  ---------------\n<span style="color:#534AB7"> / /\\ \\  </span>  <span style="color:#555">OS:</span> CamOS 3.0\n<span style="color:#534AB7">/_/  \\_\\ </span>  <span style="color:#555">Shell:</span> camsh 3.0\n           <span style="color:#555">CPU:</span> '+(navigator.hardwareConcurrency||'?')+' threads\n           <span style="color:#555">Res:</span> '+window.screen.width+'x'+window.screen.height;}
};

function runCmd(line){
  line=line.trim(); if(!line)return'';
  var parts=line.split(/\s+/); var cmd=parts[0]; var args=parts.slice(1);
  var aliases={ll:'ls',cls:'clear'}; if(aliases[cmd])cmd=aliases[cmd];
  if(CMDS[cmd])return CMDS[cmd](args);
  return'<span style="color:#e05d5d">'+cmd+': command not found</span>';
}

/* =====================================================
   BROWSER ENGINE
   Core philosophy:
   - ALL elements exist in DOM from load. We only show/hide.
   - Each tab stores its own content (html string) so switching
     tabs restores the page without re-fetching.
   - URL bar only updates when a page finishes loading, not on
     tab switch (unless you switch to a tab that has a URL).
   ===================================================== */
var brTabs = [];
var brCurTab = -1;

/* Safe element getter scoped to browser window */
function $br(id) {
  var win = document.getElementById('win-browser');
  return win ? win.querySelector('#'+id) : null;
}

/* ---- Download manager ---- */
var downloads = [];

function brDownload(url, filename) {
  if (!filename) {
    var parts = url.split('/'); filename = parts[parts.length-1] || 'download';
    filename = filename.split('?')[0];
  }
  showNotif('download', 'Downloading: ' + filename);
  var entry = { url: url, name: filename, status: 'fetching', blob: null, link: null };
  downloads.push(entry);
  brShowDlPanel();
  brRenderDlPanel();

  fetch(url)
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.blob();
    })
    .then(function(blob) {
      var objUrl = URL.createObjectURL(blob);
      entry.blob = objUrl;
      entry.status = 'done';
      entry.size = blob.size;
      var a = document.createElement('a');
      a.href = objUrl; a.download = filename; a.style.display = 'none';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      brRenderDlPanel();
      showNotif('download', 'Downloaded: ' + filename);
    })
    .catch(function(err) {
      /* Try via proxy */
      fetch(PROXIES[0](url))
        .then(function(r){ return r.blob(); })
        .then(function(blob){
          var objUrl = URL.createObjectURL(blob);
          entry.blob = objUrl; entry.status = 'done'; entry.size = blob.size;
          var a = document.createElement('a');
          a.href = objUrl; a.download = filename; a.style.display = 'none';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          brRenderDlPanel();
          showNotif('download', 'Downloaded: ' + filename);
        })
        .catch(function(){ entry.status='error'; brRenderDlPanel(); showNotif('error','Download failed: ' + filename); });
    });
}

function brShowDlPanel() {
  var p = $br('dl-panel'); if(p) p.classList.add('vis');
}
function brHideDlPanel() {
  var p = $br('dl-panel'); if(p) p.classList.remove('vis');
}
function brRenderDlPanel() {
  var list = $br('dl-list'); if (!list) return;
  list.innerHTML = '';
  downloads.slice().reverse().forEach(function(d) {
    var item = document.createElement('div'); item.className = 'dl-item';
    var ext = d.name.split('.').pop().toLowerCase();
    var icon = ['mp3','wav','ogg','flac'].indexOf(ext)>-1?'ti-music':['mp4','webm','mkv','avi'].indexOf(ext)>-1?'ti-video':['jpg','jpeg','png','gif','webp','svg'].indexOf(ext)>-1?'ti-photo':['zip','rar','7z','tar','gz'].indexOf(ext)>-1?'ti-archive':['pdf'].indexOf(ext)>-1?'ti-file-type-pdf':'ti-file';
    var sizeStr = d.size ? (d.size > 1048576 ? (d.size/1048576).toFixed(1)+'MB' : (d.size/1024).toFixed(0)+'KB') : '';
    item.innerHTML =
      '<i class="ti '+icon+' dl-icon"></i>' +
      '<span class="dl-name">'+d.name+'</span>' +
      '<span class="dl-size">'+sizeStr+'</span>' +
      (d.status==='done' && d.blob ? '<a class="dl-btn" href="'+d.blob+'" download="'+d.name+'">Save</a><span class="dl-status">Done</span>' : '') +
      (d.status==='fetching' ? '<span class="dl-status" style="color:#888">Fetching...</span>' : '') +
      (d.status==='error' ? '<span class="dl-status" style="color:#e05d5d">Failed</span>' : '');
    list.appendChild(item);
  });
}

/* ---- Tab management ---- */
function newBrTab(url) {
  var tab = { url: '', title: 'New Tab', html: '', hist: [], hidx: -1 };
  brTabs.push(tab);
  brCurTab = brTabs.length - 1;
  renderBrTabs();
  if (url) { brNavTo(url); }
  else { brShow('home'); brSetUrl(''); brSetTitle('Home'); }
}

function closeBrTab(idx, evt) {
  if (evt) { evt.stopPropagation(); evt.preventDefault(); }
  brTabs.splice(idx, 1);
  if (!brTabs.length) { brCurTab=-1; newBrTab(); return; }
  if (brCurTab >= brTabs.length) brCurTab = brTabs.length-1;
  renderBrTabs();
  brLoadTab(brCurTab);
}

function switchBrTab(idx) {
  if (idx === brCurTab) return;
  brCurTab = idx;
  renderBrTabs();
  brLoadTab(idx);
}

/* Load a tab's saved state into the viewport */
function brLoadTab(idx) {
  var t = brTabs[idx]; if (!t) return;
  brSetTitle(t.title);
  if (!t.url) { brShow('home'); brSetUrl(''); return; }
  brSetUrl(t.url);
  if (t.html) {
    brInjectHTML(t.html, t.url, true); /* silent=true: skip history push */
  } else {
    brNavTo(t.url, true);
  }
}

function renderBrTabs() {
  var inner = $br('br-tabs-inner'); if (!inner) return;
  inner.innerHTML = '';
  brTabs.forEach(function(t, i) {
    var el = document.createElement('div');
    el.className = 'br-tab' + (i===brCurTab ? ' active' : '');

    var fav = document.createElement('i');
    fav.className = 'ti ti-world br-tab-favicon';

    var lbl = document.createElement('span');
    lbl.className = 'br-tab-label';
    var title = t.title || 'New Tab';
    lbl.textContent = title.length > 16 ? title.slice(0,16)+'…' : title;

    var x = document.createElement('span');
    x.className = 'br-tab-x';
    x.innerHTML = '<i class="ti ti-x"></i>';
    x.addEventListener('mousedown', function(e) { e.stopPropagation(); closeBrTab(i, e); });

    el.appendChild(fav); el.appendChild(lbl); el.appendChild(x);
    el.addEventListener('click', function(e) {
      if (!e.target.closest('.br-tab-x')) switchBrTab(i);
    });
    inner.appendChild(el);
  });
  /* Scroll active tab into view */
  var active = inner.querySelector('.active');
  if (active) active.scrollIntoView({ block:'nearest', inline:'nearest', behavior:'smooth' });
}

function brSetTitle(title) {
  var t = brTabs[brCurTab]; if (t) t.title = title;
  var el = $br('br-win-title');
  if (el) el.textContent = (title||'Browser').slice(0,32);
  renderBrTabs();
}

function brSetUrl(url) {
  /* Only update bar if the user is not currently typing in it */
  var el = $br('br-url');
  if (el && document.activeElement !== el) el.value = url || '';
  /* Security indicator */
  var sec = $br('br-security');
  if (sec) {
    if (!url) { sec.innerHTML=''; }
    else if (url.startsWith('https://')) { sec.innerHTML='<i class="ti ti-lock"></i>'; sec.className=''; sec.id='br-security'; }
    else { sec.innerHTML='<i class="ti ti-lock-open"></i>'; sec.className='insecure'; sec.id='br-security'; }
  }
}

/* ---- Show/hide content panels ---- */
function brShow(which) {
  var panels = ['home','loading','err'];
  panels.forEach(function(p) {
    var el = $br('br-'+p);
    if (el) el.classList.toggle('vis', p===which);
  });
  var iframe = $br('br-iframe');
  if (iframe) iframe.style.display = (which==='content') ? 'block' : 'none';
}

/* ---- Navigation ---- */
async function brNavTo(url, skipHistory) {
  if (!url) return;
  /* If looks like a search query (no dot or spaces), go to search */
  if (!url.startsWith('http') && (url.indexOf(' ') > -1 || url.indexOf('.') === -1)) {
    url = 'https://search.brave.com/search?q=' + encodeURIComponent(url);
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;

  var t = brTabs[brCurTab];
  if (t && !skipHistory) {
    t.hist = t.hist.slice(0, t.hidx+1);
    t.hist.push(url); t.hidx = t.hist.length-1; t.url = url;
  } else if (t) {
    t.url = url;
  }

  brSetUrl(url);
  brShow('loading');
  var loadingMsg = $br('br-loading-msg');
  if (loadingMsg) loadingMsg.textContent = 'Connecting...';

  /* Try each proxy */
  var fetched = false;
  for (var pi = 0; pi < PROXIES.length; pi++) {
    try {
      if (loadingMsg) loadingMsg.textContent = 'Trying proxy ' + (pi+1) + ' of ' + PROXIES.length + '...';
      var proxyUrl = PROXIES[pi](url);
      var resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) continue;
      var html = await resp.text();
      if (!html || html.length < 100) continue;
      brInjectHTML(html, url);
      fetched = true;
      break;
    } catch(e) { /* try next */ }
  }

  if (!fetched) {
    brShowError(url);
    if (t) { t.title='Error'; brSetTitle('Error'); }
  }
}

function brInjectHTML(html, baseUrl, silent) {
  /* Extract title */
  var tm = html.match(/<title[^>]*>([^<]{0,120})<\/title>/i);
  var title = tm ? tm[1].trim().replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>') : baseUrl;

  /* Remove scripts that do history manipulation or break in srcdoc */
  html = html.replace(/<script[^>]*>[^]*?<\/script>/gi, function(m) {
    if (m.indexOf('history.replaceState')>-1 || m.indexOf('history.pushState')>-1) return '';
    return m;
  });

  /* Patch all links to go through browser instead of navigating srcdoc */
  var intercept = '<script>document.addEventListener("click",function(e){var a=e.target.closest("a");if(a&&a.href&&!a.href.startsWith("javascript")&&!a.href.startsWith("#")){e.preventDefault();e.stopPropagation();window.parent&&window.parent.brGo&&window.parent.brGo(a.href);}});<\/script>';

  /* Inject base tag + fixes */
  var inject = '<base href="'+baseUrl+'"><style>*{max-width:100%;box-sizing:border-box}body{font-family:system-ui;overflow-x:hidden}img{max-width:100%;height:auto}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#333;border-radius:3px}<\/style>' + intercept;
  if (html.indexOf('<head')>-1) {
    html = html.replace(/<head([^>]*)>/i, function(m){ return m+inject; });
  } else {
    html = '<head>'+inject+'</head>'+html;
  }

  var iframe = $br('br-iframe');
  if (!iframe) return;

  /* Use srcdoc — remove allow-same-origin to avoid escape warning, keep allow-scripts */
  iframe.removeAttribute('sandbox');
  iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups');
  iframe.srcdoc = html;
  brShow('content');

  var t = brTabs[brCurTab];
  if (t) { t.title = title; t.html = html; t.url = baseUrl; }
  brSetTitle(title);
  brSetUrl(baseUrl);
}

function brShowError(url) {
  brShow('err');
  var link = $br('br-open-ext'); if (link) { link.href=url||'#'; link.textContent='Open '+url+' in browser'; }
  var dl = $br('br-dl-link'); if (dl) dl.setAttribute('data-url', url||'');
  /* Update error text */
  var p = $br('br-err-detail');
  if (p) p.textContent = 'All 3 proxies failed for this URL. The site may block proxies. You can try opening it directly.';
}

/* ---- Controls ---- */
function brGo(url) {
  var u = url;
  if (!u) { var el=$br('br-url'); u = el ? el.value.trim() : ''; }
  if (!u) return;
  if (!brTabs.length) newBrTab(u);
  else brNavTo(u);
}
function brBack() {
  var t=brTabs[brCurTab]; if(!t||t.hidx<=0)return;
  t.hidx--; var u=t.hist[t.hidx]; t.url=u; brNavTo(u,true);
}
function brFwd() {
  var t=brTabs[brCurTab]; if(!t||t.hidx>=t.hist.length-1)return;
  t.hidx++; var u=t.hist[t.hidx]; t.url=u; brNavTo(u,true);
}
function brReload() {
  var t=brTabs[brCurTab]; if(t&&t.url){t.html='';brNavTo(t.url,true);}
}
function brHome() { brShow('home'); brSetUrl(''); brSetTitle('Home'); var t=brTabs[brCurTab];if(t){t.url='';t.html='';} }
function brBookmark() {
  var t=brTabs[brCurTab]; if(!t||!t.url)return;
  showNotif('bookmark','Bookmarked: '+(t.title||t.url).slice(0,40));
}

function brOpenExt() {
  var link=$br('br-open-ext'); if(link&&link.href&&link.href!=='#')window.open(link.href,'_blank','noopener');
}
function brDlPage() {
  var t=brTabs[brCurTab]; if(!t||!t.url)return;
  brDownload(t.url);
}
function brDlFromErr() {
  var link=$br('br-dl-link'); if(!link)return;
  var url=link.getAttribute('data-url'); if(url)brDownload(url);
}

/* =====================================================
   NOTEPAD
   ===================================================== */
var npFiles={}, npCurrent='untitled.txt', npWrap=false;

function npUpdate(){
  var ta=document.getElementById('np-ta'); if(!ta)return;
  var v=ta.value; var words=v.trim()?v.trim().split(/\s+/).length:0;
  var wc=document.getElementById('np-wc'); if(wc)wc.textContent=words+' words';
  var cc=document.getElementById('np-cc'); if(cc)cc.textContent=v.length+' chars';
  var before=v.slice(0,ta.selectionStart);
  var ln=before.split('\n').length; var col=before.split('\n').pop().length+1;
  var pos=document.getElementById('np-pos'); if(pos)pos.textContent='Ln '+ln+' Col '+col;
}
function npNew(){showModal('New File','Enter filename:','untitled.txt',function(n){if(!n)return;npFiles[n]='';npCurrent=n;var ta=document.getElementById('np-ta');if(ta)ta.value='';npUpdate();showNotif('notepad','New file: '+n);});}
function npSave(){var ta=document.getElementById('np-ta');if(!ta)return;npFiles[npCurrent]=ta.value;var fn=getNode('/home/cameron');if(fn)fn.children[npCurrent]={type:'file',content:ta.value};showNotif('notepad','Saved: '+npCurrent);}
function npOpen(){
  var opts=Object.keys(npFiles); var fn=getNode('/home/cameron');
  if(fn)Object.keys(fn.children).forEach(function(k){if(fn.children[k].type==='file'&&opts.indexOf(k)===-1)opts.push(k);});
  if(!opts.length){showNotif('notepad','No saved files.');return;}
  showModal('Open File','Files: '+opts.join(', '),opts[0],function(n){
    if(!n)return; var c=npFiles[n]; if(c===undefined){var nd=getNode('/home/cameron/'+n);c=nd?nd.content:null;}
    if(c===null||c===undefined){showNotif('notepad','File not found: '+n);return;}
    npCurrent=n; var ta=document.getElementById('np-ta');if(ta)ta.value=c; npUpdate(); showNotif('notepad','Opened: '+n);
  });
}
function npCopy(){var ta=document.getElementById('np-ta');if(!ta)return;navigator.clipboard.writeText(ta.value).catch(function(){});showNotif('notepad','Copied to clipboard');}
function npToggleWrap(){npWrap=!npWrap;var ta=document.getElementById('np-ta');if(ta)ta.style.whiteSpace=npWrap?'pre-wrap':'pre';showNotif('notepad','Word wrap: '+(npWrap?'ON':'OFF'));}
function npWC(){var ta=document.getElementById('np-ta');if(!ta)return;var v=ta.value;var w=v.trim()?v.trim().split(/\s+/).length:0;showNotif('notepad',w+' words, '+v.length+' chars, '+v.split('\n').length+' lines');}
function npFind(){
  showModal('Find','Search for:','',function(term){
    if(!term)return;
    showModal('Replace with','Replace "'+term+'" with:','',function(rep){
      var ta=document.getElementById('np-ta');if(!ta)return;
      var count=ta.value.split(term).length-1;
      ta.value=ta.value.split(term).join(rep||'');
      npUpdate(); showNotif('notepad','Replaced '+count+' occurrence(s)');
    });
  });
}

/* =====================================================
   SYSINFO
   ===================================================== */
function fillSysInfo(){
  function sv(id,val){var el=document.getElementById(id);if(el)el.textContent=val;}
  sv('si-plat',navigator.platform||'Unknown');
  sv('si-cores',(navigator.hardwareConcurrency||'?')+' threads');
  sv('si-mem',performance&&performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576)+'MB / '+Math.round(performance.memory.jsHeapSizeLimit/1048576)+'MB':'N/A');
  sv('si-res',window.screen.width+'x'+window.screen.height);
  var ua=navigator.userAgent; var eng=ua.includes('Chrome')?'Blink (Chrome/Edge)':ua.includes('Firefox')?'Gecko (Firefox)':ua.includes('Safari')?'WebKit (Safari)':'Unknown';
  sv('si-eng',eng); sv('si-lang',navigator.language||'en'); sv('si-net',navigator.onLine?'Connected':'Offline');
  var s=Math.floor((Date.now()-appStartTime)/1000); sv('si-up',Math.floor(s/60)+'m '+(s%60)+'s');
}
function siPoll(){
  if(!document.getElementById('win-sysinfo').classList.contains('open'))return;
  fillSysInfo(); var pct=Math.floor(Math.random()*28+4);
  var fill=document.getElementById('si-cpu-fill'); if(fill)fill.style.width=pct+'%';
  var pctEl=document.getElementById('si-cpu-pct'); if(pctEl)pctEl.textContent=pct+'%';
}

/* =====================================================
   WINDOW MANAGEMENT
   ===================================================== */
var zTop=10, maxed={}, savedBounds={};

function openApp(id){
  var win=document.getElementById('win-'+id); var tb=document.getElementById('tb-'+id);
  if(!win||!tb)return; win.classList.add('open'); tb.classList.add('open'); focusApp(id);
  if(id==='sysinfo')fillSysInfo();
  if(id==='terminal'){var ti=document.getElementById('t-in');if(ti)ti.focus();}
  if(id==='notepad')npUpdate();
  if(id==='browser'&&!brTabs.length)newBrTab();
}
function closeApp(id){
  var win=document.getElementById('win-'+id); var tb=document.getElementById('tb-'+id);
  if(win)win.classList.remove('open'); if(tb)tb.classList.remove('open','focused'); maxed[id]=false;
}
function minApp(id){
  var win=document.getElementById('win-'+id); var tb=document.getElementById('tb-'+id);
  if(win)win.classList.remove('open'); if(tb)tb.classList.remove('focused');
}
function maxApp(id){
  var win=document.getElementById('win-'+id); if(!win)return;
  if(maxed[id]){
    var b=savedBounds[id]; win.style.width=b.w;win.style.height=b.h;win.style.top=b.t;win.style.left=b.l;win.style.borderRadius='10px'; maxed[id]=false;
  } else {
    savedBounds[id]={w:win.style.width,h:win.style.height,t:win.style.top,l:win.style.left};
    win.style.width='100vw';win.style.height='calc(100vh - 44px)';win.style.top='0';win.style.left='0';win.style.borderRadius='0'; maxed[id]=true;
  }
  focusApp(id);
}
function focusApp(id){
  zTop++; var win=document.getElementById('win-'+id); if(!win)return;
  win.style.zIndex=zTop; win.style.display='flex'; win.classList.add('open');
  document.querySelectorAll('.tb-app').forEach(function(el){el.classList.remove('focused');});
  var tb=document.getElementById('tb-'+id); if(tb)tb.classList.add('focused');
}
function tbClick(id){
  var win=document.getElementById('win-'+id); if(!win)return;
  if(!win.classList.contains('open'))openApp(id); else minApp(id);
}
function initDrag(id){
  var bar=document.getElementById('drag-'+id); var win=document.getElementById('win-'+id);
  if(!bar||!win)return; var drag=false,ox=0,oy=0;
  bar.addEventListener('mousedown',function(e){if(e.target.classList.contains('wb'))return;if(maxed[id])return;drag=true;ox=e.clientX-win.offsetLeft;oy=e.clientY-win.offsetTop;focusApp(id);e.preventDefault();});
  document.addEventListener('mousemove',function(e){if(!drag)return;var mx=window.innerWidth-win.offsetWidth,my=window.innerHeight-win.offsetHeight-44;win.style.left=Math.max(0,Math.min(e.clientX-ox,mx))+'px';win.style.top=Math.max(0,Math.min(e.clientY-oy,my))+'px';});
  document.addEventListener('mouseup',function(){drag=false;});
  win.addEventListener('mousedown',function(){focusApp(id);});
}

/* =====================================================
   MENUS / WALLPAPER / CLOCK / NOTIF / MODAL
   ===================================================== */
function toggleMenu(){document.getElementById('smenu').classList.toggle('open');}
function closeMenu(){document.getElementById('smenu').classList.remove('open');}
function hideCtx(){document.getElementById('ctxmenu').style.display='none';}

var WP=['linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)','linear-gradient(135deg,#0d1117,#161b22,#1f2937)','linear-gradient(160deg,#1a0a2e,#2d1b4e,#3c1f6e)','linear-gradient(135deg,#0a1628,#0f2744,#143d6b)','linear-gradient(135deg,#1a1a1a,#2a1a2e,#1a2a1a)','linear-gradient(135deg,#0a1a0a,#0f2a18,#0a2a12)','linear-gradient(135deg,#1a0a0a,#2e1616,#400f0f)'];
var wpIdx=0;
function changeWallpaper(){wpIdx=(wpIdx+1)%WP.length;document.getElementById('desktop').style.background=WP[wpIdx];showNotif('wallpaper','Wallpaper changed!');}

function tickClock(){var d=new Date();var ck=document.getElementById('tb-clock');if(ck)ck.textContent=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});var dt=document.getElementById('tb-date');if(dt)dt.textContent=d.toLocaleDateString([],{month:'short',day:'numeric'});}

var NICONS={welcome:'ti-device-desktop',bookmark:'ti-bookmark',notepad:'ti-file-text',wallpaper:'ti-palette',info:'ti-info-circle',error:'ti-alert-circle',download:'ti-download'};
var ntimer=null;
function showNotif(type,msg){
  var n=document.getElementById('notif');if(!n)return;
  var ic=NICONS[type]||'ti-bell';
  var tEl=document.getElementById('notif-title'); if(tEl)tEl.innerHTML='<i class="ti '+ic+'"></i>'+type.charAt(0).toUpperCase()+type.slice(1);
  var bEl=document.getElementById('notif-body'); if(bEl)bEl.textContent=msg;
  n.style.display='block';n.style.opacity='1';n.style.transition='none';
  clearTimeout(ntimer); ntimer=setTimeout(function(){n.style.transition='opacity 0.4s';n.style.opacity='0';setTimeout(function(){n.style.display='none';},400);},3500);
}

var modalCB=null;
function showModal(title,desc,placeholder,cb){
  modalCB=cb;
  var h=document.getElementById('modal-h');if(h)h.textContent=title;
  var p=document.getElementById('modal-p');if(p)p.textContent=desc;
  var inp=document.getElementById('modal-input');if(inp){inp.style.display='block';inp.value=placeholder||'';inp.placeholder=placeholder||'';}
  var ov=document.getElementById('modal-overlay');if(ov)ov.classList.add('open');
  setTimeout(function(){if(inp)inp.focus();},50);
  if(inp){inp.onkeydown=function(e){if(e.key==='Enter')closeModal(inp.value);if(e.key==='Escape')closeModal(null);};}
}
function closeModal(val){
  var ov=document.getElementById('modal-overlay');if(ov)ov.classList.remove('open');
  if(modalCB&&val!==null&&val!==undefined)modalCB(val); modalCB=null;
}

/* =====================================================
   INIT
   ===================================================== */
document.addEventListener('DOMContentLoaded',function(){
  initBootCanvas();
  setTimeout(bootStep,700);

  document.getElementById('login-go').addEventListener('click',doLogin);
  document.getElementById('login-pw').addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});

  /* Terminal */
  var tIn=document.getElementById('t-in');
  var tOut=document.getElementById('t-out');
  var tPS=document.getElementById('t-ps');
  if(tIn){tIn.addEventListener('keydown',function(e){
    if(e.key==='Enter'){
      var val=this.value;
      if(val.trim()){HIST.unshift(val);HISTI=-1;}
      tOut.innerHTML+='<span style="color:#7F77DD">cameron@camos:'+CWD+'$</span> '+val+'\n';
      var res=runCmd(val); if(res!==null&&res!==undefined&&res!=='')tOut.innerHTML+=res+'\n';
      tPS.textContent='cameron@camos:'+CWD+'$'; this.value='';
      var tb=document.getElementById('t-body');if(tb)tb.scrollTop=tb.scrollHeight;
    } else if(e.key==='ArrowUp'){e.preventDefault();if(HISTI<HIST.length-1){HISTI++;this.value=HIST[HISTI];}}
      else if(e.key==='ArrowDown'){e.preventDefault();if(HISTI>0){HISTI--;this.value=HIST[HISTI];}else{HISTI=-1;this.value='';}}
  });}

  /* Browser URL bar — Enter to go */
  var brUrlEl=document.getElementById('br-url');
  if(brUrlEl){brUrlEl.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();brGo(this.value.trim());}});}

  /* Notepad */
  var npTa=document.getElementById('np-ta');
  if(npTa){
    npTa.addEventListener('input',npUpdate); npTa.addEventListener('keyup',npUpdate); npTa.addEventListener('click',npUpdate);
    npTa.addEventListener('keydown',function(e){if(e.key==='Tab'){e.preventDefault();var s=this.selectionStart;this.value=this.value.slice(0,s)+'  '+this.value.slice(this.selectionEnd);this.selectionStart=this.selectionEnd=s+2;npUpdate();}});
  }

  /* Window drag */
  ['terminal','browser','notepad','sysinfo'].forEach(initDrag);

  /* Desktop events */
  var desktop=document.getElementById('desktop');
  if(desktop){
    desktop.addEventListener('click',function(e){
      if(!e.target.closest('#smenu')&&!e.target.closest('#start-btn'))closeMenu();
      if(!e.target.closest('#ctxmenu'))hideCtx();
    });
    desktop.addEventListener('contextmenu',function(e){
      if(e.target.closest('.win')||e.target.closest('#taskbar'))return;
      e.preventDefault();
      var m=document.getElementById('ctxmenu');
      m.style.left=Math.min(e.clientX,window.innerWidth-190)+'px';
      m.style.top=Math.min(e.clientY,window.innerHeight-180)+'px';
      m.style.display='block';
    });
  }

  var ov=document.getElementById('modal-overlay');
  if(ov)ov.addEventListener('click',function(e){if(e.target===this)closeModal(null);});
});
