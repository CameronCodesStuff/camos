var appStartTime = Date.now();

var PROXIES = [
  function(u){return 'https://corsproxy.io/?'+encodeURIComponent(u);},
  function(u){return 'https://api.allorigins.win/raw?url='+encodeURIComponent(u);},
  function(u){return 'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(u);},
  function(u){return 'https://thingproxy.freeboard.io/fetch/'+u;},
  function(u){return 'https://api.allorigins.win/get?url='+encodeURIComponent(u);}
];

var FS = {
  '/': {type:'dir',children:{
    home:{type:'dir',children:{cameron:{type:'dir',children:{
      readme:{type:'file',content:'Welcome to CamOS v3.0\nBuilt by Cameron.\n\nTry: ls, cd, cat readme, neofetch, help'},
      notes:{type:'file',content:'# My Notes\n\n- NEXUS platform\n- CamOS browser\n- Game dev projects\n'},
      '.camshrc':{type:'file',content:'export USER=cameron\nexport HOME=/home/cameron\nexport PATH=/usr/bin:/bin'},
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
  'linear-gradient(135deg,#0d1117 0%,#161b22 50%,#1a1a2e 100%)',
  'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)',
  'linear-gradient(160deg,#1a0a2e,#2d1b4e,#3c1f6e)',
  'linear-gradient(135deg,#0a1628,#0f2744,#143d6b)',
  'linear-gradient(135deg,#0a1a0a,#0f2a18,#0a2a12)',
  'linear-gradient(135deg,#1a0a0a,#2e1616,#3a0f0f)',
  'linear-gradient(135deg,#0a0a1a,#0a1a2a,#0a2a2a)'
];
var NICONS={welcome:'ti-device-desktop',bookmark:'ti-bookmark',notepad:'ti-file-text',wallpaper:'ti-palette',info:'ti-info-circle',error:'ti-alert-circle',download:'ti-download'};
var ntimer=null, modalCB=null, bootIdx=0, bootAnimId=null;
var BOOT_STEPS=[
  {s:'Initializing UEFI firmware...'},
  {s:'CPU detected: CamOS Virtual x86_64'},
  {s:'Memory test: 16384 MB OK'},
  {s:'Storage controller: /dev/vda1 ready'},
  {s:'Mounting virtual filesystem [OK]'},
  {s:'Loading kernel modules [OK]'},
  {s:'Starting network subsystem [OK]'},
  {s:'Launching cam-wm 3.0 [OK]'},
  {s:'Loading user environment [OK]'},
  {s:'Starting desktop session [OK]'}
];

function initBootCanvas() {
  var canvas = document.getElementById('boot-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  var W = canvas.width, H = canvas.height;
  var cols = Math.floor(W / 14);
  var drops = [];
  for (var i = 0; i < cols; i++) drops[i] = Math.random() * -60;
  var chars = '01アイウカキクケコタチツナニネABCDEF0123456789<>{}[]|/\\';

  function frame() {
    W = canvas.width; H = canvas.height;
    ctx.fillStyle = 'rgba(0,2,8,0.15)';
    ctx.fillRect(0, 0, W, H);
    ctx.font = '12px monospace';
    for (var i = 0; i < drops.length; i++) {
      var y = drops[i] * 14;
      var ch = chars[Math.floor(Math.random() * chars.length)];
      var r = Math.random();
      if (r > 0.97) ctx.fillStyle = '#fff';
      else if (r > 0.88) ctx.fillStyle = 'rgba(127,119,221,0.9)';
      else if (r > 0.6) ctx.fillStyle = 'rgba(83,74,183,0.5)';
      else ctx.fillStyle = 'rgba(83,74,183,0.12)';
      if (y >= 0) ctx.fillText(ch, i * 14, y);
      if (y > H && Math.random() > 0.975) drops[i] = 0;
      drops[i] += 0.4;
    }
    bootAnimId = requestAnimationFrame(frame);
  }
  frame();
}

function stopBootCanvas() {
  if (bootAnimId) { cancelAnimationFrame(bootAnimId); bootAnimId = null; }
}

function bootStep() {
  if (bootIdx >= BOOT_STEPS.length) {
    stopBootCanvas();
    setTimeout(function() {
      var bs = document.getElementById('boot');
      bs.style.transition = 'opacity 0.5s';
      bs.style.opacity = '0';
      setTimeout(function() { bs.style.display = 'none'; showLogin(); }, 500);
    }, 300);
    return;
  }
  var s = BOOT_STEPS[bootIdx].s;
  var progress = Math.round((bootIdx + 1) / BOOT_STEPS.length * 100);

  var fill = document.getElementById('boot-bar-fill');
  var pct = document.getElementById('boot-pct');
  var log = document.getElementById('boot-log');
  var statusEl = document.getElementById('boot-status');
  var pl = document.getElementById('boot-pl');

  if (fill) fill.style.width = progress + '%';
  if (pct) pct.textContent = progress + '%';
  if (statusEl) statusEl.textContent = s;
  if (pl) pl.textContent = progress + '% COMPLETE';

  if (log) {
    var line = document.createElement('div');
    line.className = 'bl';
    var ok = bootIdx > 2 ? ' <span style="color:#1a7a3a">OK</span>' : '';
    line.innerHTML = '<span class="bp">[' + String(bootIdx + 1).padStart(2,'0') + ']</span> ' + s + ok;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  var stepsEl = document.getElementById('boot-steps-right');
  if (stepsEl) {
    stepsEl.innerHTML = '';
    BOOT_STEPS.forEach(function(step, idx) {
      var d = document.createElement('div');
      d.className = 'bsr' + (idx < bootIdx ? ' done' : idx === bootIdx ? ' active' : '');
      d.textContent = step.s;
      stepsEl.appendChild(d);
    });
  }

  bootIdx++;
  setTimeout(bootStep, 220 + Math.random() * 180);
}

function showLogin() {
  var ls = document.getElementById('login');
  ls.style.display = 'flex'; ls.style.opacity = '0'; ls.style.transition = 'opacity 0.5s';
  setTimeout(function() { ls.style.opacity = '1'; document.getElementById('login-pw').focus(); }, 50);
  tickLoginClock();
  window._lci = setInterval(tickLoginClock, 1000);
}
function tickLoginClock() {
  var d = new Date();
  var t = document.getElementById('login-time');
  var dt = document.getElementById('login-date');
  if (t) t.textContent = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  if (dt) dt.textContent = d.toLocaleDateString([], {weekday:'long', month:'long', day:'numeric'});
}
function doLogin() {
  var pw = document.getElementById('login-pw').value;
  if (pw === '' || pw === '1234') {
    clearInterval(window._lci);
    var ls = document.getElementById('login');
    ls.style.transition = 'opacity 0.4s'; ls.style.opacity = '0';
    setTimeout(function() { ls.style.display = 'none'; startDesktop(); }, 400);
  } else {
    var err = document.getElementById('login-err');
    err.textContent = 'Incorrect password';
    document.getElementById('login-pw').value = '';
    setTimeout(function() { err.textContent = ''; }, 3000);
  }
}
function doLogout() {
  closeMenu();
  ['terminal','browser','notepad','sysinfo'].forEach(closeApp);
  var d = document.getElementById('desktop');
  d.style.transition = 'opacity 0.4s'; d.style.opacity = '0';
  setTimeout(function() {
    d.style.display = 'none'; d.style.opacity = '1';
    document.getElementById('login-pw').value = '';
    showLogin();
  }, 400);
}

function initDesktopCanvas() {
  var c = document.getElementById('desktop-canvas');
  if (!c) return;
  var ctx = c.getContext('2d'), pts = [];
  function resize() { c.width = window.innerWidth; c.height = window.innerHeight - 44; }
  resize(); window.addEventListener('resize', resize);
  for (var i = 0; i < 28; i++) pts.push({x:Math.random()*c.width,y:Math.random()*c.height,vx:(Math.random()-0.5)*0.1,vy:(Math.random()-0.5)*0.1,r:Math.random()+0.2,a:Math.random()*0.12+0.03});
  function draw() {
    ctx.clearRect(0,0,c.width,c.height);
    pts.forEach(function(p) { p.x+=p.vx; p.y+=p.vy; if(p.x<0)p.x=c.width; if(p.x>c.width)p.x=0; if(p.y<0)p.y=c.height; if(p.y>c.height)p.y=0; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,'+p.a+')'; ctx.fill(); });
    requestAnimationFrame(draw);
  }
  draw();
}
function startDesktop() {
  var d = document.getElementById('desktop');
  d.style.display = 'block'; d.style.opacity = '0'; d.style.transition = 'opacity 0.5s';
  setTimeout(function() { d.style.opacity = '1'; }, 50);
  initDesktopCanvas();
  tickClock(); setInterval(tickClock, 1000);
  setInterval(siPoll, 2500);
  setTimeout(function() { showNotif('welcome', 'Welcome to CamOS! Double-click icons to open apps.'); }, 900);
}

function resolvePath(p) {
  if (!p || p === '~') return '/home/cameron';
  if (!p.startsWith('/')) p = CWD + '/' + p;
  var parts = p.split('/').filter(Boolean), stack = [];
  parts.forEach(function(s) { if (s === '..') stack.pop(); else if (s !== '.') stack.push(s); });
  return '/' + stack.join('/');
}
function getNode(path) {
  var parts = path.split('/').filter(Boolean), node = FS['/'];
  for (var i = 0; i < parts.length; i++) { if (!node || !node.children) return null; node = node.children[parts[i]]; if (!node) return null; }
  return node;
}
function cwdNode() { return getNode(CWD); }

var CMDS = {
  help: function() { return 'Commands: ls  cd  pwd  cat  echo  mkdir  touch  rm  clear  date  whoami  uname  uptime  neofetch'; },
  pwd: function() { return CWD; },
  whoami: function() { return 'cameron'; },
  hostname: function() { return 'camos'; },
  uname: function() { return 'CamOS 3.0 ' + (navigator.platform || 'Browser'); },
  date: function() { return new Date().toString(); },
  uptime: function() { var s = Math.floor((Date.now()-appStartTime)/1000); return 'up ' + Math.floor(s/60) + 'm ' + (s%60) + 's'; },
  clear: function() { document.getElementById('t-out').innerHTML = ''; return null; },
  ls: function(args) {
    var path = args[0] ? resolvePath(args[0]) : CWD, node = getNode(path);
    if (!node) return 'ls: ' + args[0] + ': No such file or directory';
    if (node.type !== 'dir') return args[0] || path;
    var items = Object.entries(node.children);
    if (!items.length) return '';
    return items.map(function(e) { return '<span style="color:' + (e[1].type==='dir'?'#8888ff':'#33ff88') + '">' + e[0] + (e[1].type==='dir'?'/':'') + '</span>'; }).join('  ');
  },
  cd: function(args) { var path = resolvePath(args[0]||'~'), node = getNode(path); if (!node) return 'cd: ' + (args[0]||'') + ': No such directory'; if (node.type !== 'dir') return 'cd: ' + args[0] + ': Not a directory'; CWD = path || '/'; return ''; },
  cat: function(args) { if (!args[0]) return 'cat: missing operand'; var node = getNode(resolvePath(args[0])); if (!node) return 'cat: ' + args[0] + ': No such file'; if (node.type === 'dir') return 'cat: ' + args[0] + ': Is a directory'; return node.content; },
  echo: function(args) { return args.join(' '); },
  mkdir: function(args) { if (!args[0]) return 'mkdir: missing operand'; var p = cwdNode(); if (!p) return 'error'; if (p.children[args[0]]) return 'mkdir: ' + args[0] + ': exists'; p.children[args[0]] = {type:'dir',children:{}}; return ''; },
  touch: function(args) { if (!args[0]) return 'touch: missing operand'; var p = cwdNode(); if (!p) return 'error'; if (!p.children[args[0]]) p.children[args[0]] = {type:'file',content:''}; return ''; },
  rm: function(args) { if (!args[0]) return 'rm: missing operand'; var p = cwdNode(); if (!p || !p.children[args[0]]) return 'rm: ' + args[0] + ': No such file'; delete p.children[args[0]]; return ''; },
  neofetch: function() { return '<span style="color:#7F77DD">   /\\    </span>  <span style="color:#9090dd">cameron</span><span style="color:#555">@</span><span style="color:#9090dd">camos</span>\n<span style="color:#534AB7">  /  \\   </span>  OS: CamOS 3.0\n<span style="color:#534AB7"> / /\\ \\  </span>  Shell: camsh 3.0\n<span style="color:#3c34a0">/_/  \\_\\ </span>  CPU: ' + (navigator.hardwareConcurrency||'?') + ' threads\n           Res: ' + window.screen.width + 'x' + window.screen.height; }
};
function runCmd(line) {
  line = line.trim(); if (!line) return '';
  var parts = line.split(/\s+/), cmd = parts[0], args = parts.slice(1);
  var al = {ll:'ls', cls:'clear'}; if (al[cmd]) cmd = al[cmd];
  if (CMDS[cmd]) return CMDS[cmd](args);
  return '<span style="color:#e05d5d">' + cmd + ': command not found</span>';
}

function $br(id) {
  var win = document.getElementById('win-browser');
  return win ? win.querySelector('#' + id) : null;
}

window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'CAMOS_NAVIGATE' && typeof e.data.url === 'string') {
    brGo(e.data.url);
  }
});

function brDownload(url, filename) {
  if (!filename) { var p = url.split('/'); filename = p[p.length-1] || 'download'; filename = filename.split('?')[0] || 'download'; }
  showNotif('download', 'Downloading: ' + filename);
  var entry = {url:url, name:filename, status:'fetching', blob:null, size:0};
  downloads.push(entry); brShowDlPanel(); brRenderDlPanel();
  function tryFetch(u) { return fetch(u).then(function(r) { if (!r.ok) throw new Error(); return r.blob(); }); }
  tryFetch(url).catch(function() { return tryFetch(PROXIES[0](url)); }).catch(function() { return tryFetch(PROXIES[1](url)); })
    .then(function(blob) {
      entry.blob = URL.createObjectURL(blob); entry.status = 'done'; entry.size = blob.size;
      var a = document.createElement('a'); a.href = entry.blob; a.download = filename; a.style.display = 'none';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      brRenderDlPanel(); showNotif('download', 'Done: ' + filename);
    })
    .catch(function() { entry.status = 'error'; brRenderDlPanel(); showNotif('error', 'Download failed: ' + filename); });
}
function brShowDlPanel() { var p = $br('dl-panel'); if (p) p.classList.add('vis'); }
function brHideDlPanel() { var p = $br('dl-panel'); if (p) p.classList.remove('vis'); }
function brRenderDlPanel() {
  var list = $br('dl-list'); if (!list) return;
  list.innerHTML = '';
  downloads.slice().reverse().forEach(function(d) {
    var ext = (d.name.split('.').pop() || '').toLowerCase();
    var icon = ['mp3','wav','ogg'].indexOf(ext)>-1?'ti-music':['mp4','webm'].indexOf(ext)>-1?'ti-video':['jpg','jpeg','png','gif','webp'].indexOf(ext)>-1?'ti-photo':['zip','rar','7z'].indexOf(ext)>-1?'ti-archive':'ti-file';
    var sz = d.size > (1<<20) ? (d.size/(1<<20)).toFixed(1)+'MB' : d.size > 1024 ? (d.size>>10)+'KB' : '';
    var item = document.createElement('div'); item.className = 'dl-item';
    item.innerHTML = '<i class="ti '+icon+' dl-icon"></i><span class="dl-name">'+d.name+'</span><span class="dl-size">'+sz+'</span>'+(d.status==='done'&&d.blob?'<a class="dl-btn" href="'+d.blob+'" download="'+d.name+'">Save</a><span class="dl-ok">Done</span>':'')+(d.status==='fetching'?'<span class="dl-pend">Fetching...</span>':'')+(d.status==='error'?'<span class="dl-fail">Failed</span>':'');
    list.appendChild(item);
  });
}

function newBrTab(url) {
  var tab = {url:'', title:'New Tab', html:'', hist:[], hidx:-1};
  brTabs.push(tab); brCurTab = brTabs.length - 1;
  renderBrTabs();
  if (url) brNavTo(url);
  else { brShow('home'); brSetUrl(''); brSetTitle('Home'); }
}
function closeBrTab(idx, evt) {
  if (evt) { evt.stopPropagation(); evt.preventDefault(); }
  brTabs.splice(idx, 1);
  if (!brTabs.length) { brCurTab = -1; newBrTab(); return; }
  if (brCurTab >= brTabs.length) brCurTab = brTabs.length - 1;
  renderBrTabs(); brLoadTab(brCurTab);
}
function switchBrTab(idx) {
  if (idx === brCurTab) return;
  brCurTab = idx; renderBrTabs(); brLoadTab(idx);
}
function brLoadTab(idx) {
  var t = brTabs[idx]; if (!t) return;
  brSetTitle(t.title);
  if (!t.url) { brShow('home'); brSetUrl(''); return; }
  brSetUrl(t.url);
  if (t.html) brInjectHTML(t.html, t.url, true);
  else brNavTo(t.url, true);
}
function renderBrTabs() {
  var inner = $br('br-tabs-inner'); if (!inner) return;
  inner.innerHTML = '';
  brTabs.forEach(function(t, i) {
    var el = document.createElement('div');
    el.className = 'br-tab' + (i === brCurTab ? ' active' : '');
    var fav = document.createElement('i'); fav.className = 'ti ti-world br-tab-favicon';
    var lbl = document.createElement('span'); lbl.className = 'br-tab-label';
    var title = t.title || 'New Tab'; lbl.textContent = title.length > 16 ? title.slice(0, 16) + '...' : title;
    var x = document.createElement('span'); x.className = 'br-tab-x'; x.innerHTML = '<i class="ti ti-x"></i>';
    x.addEventListener('mousedown', function(e) { e.stopPropagation(); closeBrTab(i, e); });
    el.appendChild(fav); el.appendChild(lbl); el.appendChild(x);
    el.addEventListener('click', function(e) { if (!e.target.closest('.br-tab-x')) switchBrTab(i); });
    inner.appendChild(el);
  });
  var active = inner.querySelector('.active');
  if (active) active.scrollIntoView({block:'nearest', inline:'nearest', behavior:'smooth'});
}
function brSetTitle(title) {
  var t = brTabs[brCurTab]; if (t) t.title = title;
  var el = $br('br-win-title'); if (el) el.textContent = (title || 'Browser').slice(0, 32);
  renderBrTabs();
}
function brSetUrl(url) {
  var el = $br('br-url');
  if (el && document.activeElement !== el) el.value = url || '';
  var sec = $br('br-security');
  if (sec) {
    if (!url) sec.innerHTML = '';
    else if (url.startsWith('https://')) sec.innerHTML = '<i class="ti ti-lock" style="color:#33a05a;font-size:11px"></i>';
    else sec.innerHTML = '<i class="ti ti-lock-open" style="color:#888;font-size:11px"></i>';
  }
}
function brShow(which) {
  ['home','loading','err'].forEach(function(p) { var el = $br('br-' + p); if (el) el.classList.toggle('vis', p === which); });
  var iframe = $br('br-iframe'); if (iframe) iframe.style.display = (which === 'content') ? 'block' : 'none';
}

async function brNavTo(url, skipHistory) {
  if (!url) return;
  url = url.trim();
  var isSearch = !url.startsWith('http') && (url.indexOf(' ') > -1 || !url.match(/\.\w{2,}/));
  if (isSearch) url = 'https://lite.duckduckgo.com/lite/?q=' + encodeURIComponent(url);
  else if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;

  var t = brTabs[brCurTab];
  if (t && !skipHistory) { t.hist = t.hist.slice(0, t.hidx + 1); t.hist.push(url); t.hidx = t.hist.length - 1; t.url = url; }
  else if (t) { t.url = url; }
  brSetUrl(url); brShow('loading');

  var lmsg = $br('br-loading-msg');
  var fetched = false;
  for (var pi = 0; pi < PROXIES.length; pi++) {
    try {
      if (lmsg) lmsg.textContent = 'Trying proxy ' + (pi + 1) + ' of ' + PROXIES.length + '...';
      var resp = await fetch(PROXIES[pi](url), {signal: AbortSignal.timeout(10000)});
      if (!resp.ok) continue;
      var html = await resp.text();
      if (!html || html.length < 80) continue;
      if (html.startsWith('{') && html.indexOf('"contents"') > -1) {
        try { var j = JSON.parse(html); if (j.contents) html = j.contents; } catch(e) {}
      }
      brInjectHTML(html, url);
      fetched = true; break;
    } catch(e) {}
  }
  if (!fetched) {
    brShowErr(url);
    var t2 = brTabs[brCurTab]; if (t2) { t2.title = 'Error'; brSetTitle('Error'); }
  }
}

function brInjectHTML(html, baseUrl, silent) {
  var tm = html.match(/<title[^>]*>([^<]{0,120})<\/title>/i);
  var title = tm ? tm[1].trim().replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>') : baseUrl;

  html = html.replace(/<script\b[^>]*src\s*=[^>]*>\s*<\/script>/gi, '');
  html = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, function(m, body) {
    if (!body) return '';
    if (/history\.|replaceState|pushState|window\.top|window\.parent|window\.opener/.test(body)) return '';
    if (body.length > 12000) return '';
    return m;
  });

  var postNav = '<script>(function(){'
    + 'document.addEventListener("click",function(e){'
    + 'var a=e.target.closest("a[href]");'
    + 'if(!a)return;'
    + 'var h=a.getAttribute("href");'
    + 'if(!h||h.charAt(0)==="#"||h.indexOf("javascript:")===0||h.indexOf("mailto:")===0)return;'
    + 'e.preventDefault();e.stopPropagation();'
    + 'var abs=a.href||h;'
    + 'try{window.parent.postMessage({type:"CAMOS_NAVIGATE",url:abs},"*");}catch(x){}'
    + '});'
    + 'document.addEventListener("submit",function(e){'
    + 'var f=e.target;if(!f)return;'
    + 'if(f.method&&f.method.toLowerCase()==="get"){'
    + 'e.preventDefault();'
    + 'var action=f.action||location.href;'
    + 'var fd=new FormData(f);'
    + 'var qs=new URLSearchParams(fd).toString();'
    + 'var url=action+(action.indexOf("?")>-1?"&":"?")+qs;'
    + 'try{window.parent.postMessage({type:"CAMOS_NAVIGATE",url:url},"*");}catch(x){}}'
    + '});'
    + '})();<\/script>';

  var styles = '<style>'
    + 'html,body{max-width:100%!important;}'
    + '*{box-sizing:border-box;}'
    + 'body{font-family:system-ui,sans-serif;overflow-x:hidden;}'
    + 'img{max-width:100%!important;height:auto;}'
    + '::-webkit-scrollbar{width:6px;}'
    + '::-webkit-scrollbar-track{background:#f0f0f0;}'
    + '::-webkit-scrollbar-thumb{background:#bbb;border-radius:3px;}'
    + 'a[href]{cursor:pointer;}'
    + '<\/style>';

  var inject = '<base href="' + baseUrl + '">' + styles + postNav;
  if (html.indexOf('<head') > -1) html = html.replace(/<head([^>]*)>/i, function(m) { return m + inject; });
  else html = '<head>' + inject + '</head>' + html;

  var iframe = $br('br-iframe'); if (!iframe) return;
  iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-same-origin');
  iframe.srcdoc = html;
  brShow('content');
  var t = brTabs[brCurTab];
  if (t) { t.title = title; t.html = html; t.url = baseUrl; }
  brSetTitle(title); brSetUrl(baseUrl);
}

function brShowErr(url) {
  brShow('err');
  var link = $br('br-open-ext'); if (link) link.href = url || '#';
  var dl = $br('br-dl-link'); if (dl) dl.setAttribute('data-url', url || '');
}
function brGo(url) {
  var u = url;
  if (u === undefined || u === null) { var el = $br('br-url'); u = el ? el.value.trim() : ''; }
  if (typeof u !== 'string') u = String(u);
  u = u.trim(); if (!u) return;
  if (!brTabs.length) { newBrTab(); setTimeout(function() { brNavTo(u); }, 0); }
  else brNavTo(u);
}
function brBack() { var t = brTabs[brCurTab]; if (!t || t.hidx <= 0) return; t.hidx--; brNavTo(t.hist[t.hidx], true); }
function brFwd() { var t = brTabs[brCurTab]; if (!t || t.hidx >= t.hist.length - 1) return; t.hidx++; brNavTo(t.hist[t.hidx], true); }
function brReload() { var t = brTabs[brCurTab]; if (t && t.url) { t.html = ''; brNavTo(t.url, true); } }
function brHome() { brShow('home'); brSetUrl(''); brSetTitle('Home'); var t = brTabs[brCurTab]; if (t) { t.url = ''; t.html = ''; } }
function brBookmark() { var t = brTabs[brCurTab]; if (!t || !t.url) return; showNotif('bookmark', 'Bookmarked: ' + (t.title || t.url).slice(0, 40)); }
function brOpenExt() { var link = $br('br-open-ext'); if (link && link.href && link.href !== '#') window.open(link.href, '_blank', 'noopener'); }
function brDlPage() { var t = brTabs[brCurTab]; if (!t || !t.url) return; brDownload(t.url); }
function brDlFromErr() { var link = $br('br-dl-link'); if (!link) return; var url = link.getAttribute('data-url'); if (url) brDownload(url); }

function npUpdate() {
  var ta = document.getElementById('np-ta'); if (!ta) return;
  var v = ta.value, words = v.trim() ? v.trim().split(/\s+/).length : 0;
  var wc = document.getElementById('np-wc'); if (wc) wc.textContent = words + ' words';
  var cc = document.getElementById('np-cc'); if (cc) cc.textContent = v.length + ' chars';
  var before = v.slice(0, ta.selectionStart), ln = before.split('\n').length, col = before.split('\n').pop().length + 1;
  var pos = document.getElementById('np-pos'); if (pos) pos.textContent = 'Ln ' + ln + ' Col ' + col;
}
function npNew() { showModal('New File', 'Filename:', 'untitled.txt', function(n) { if (!n) return; npFiles[n] = ''; npCurrent = n; var ta = document.getElementById('np-ta'); if (ta) ta.value = ''; npUpdate(); showNotif('notepad', 'New: ' + n); }); }
function npSave() { var ta = document.getElementById('np-ta'); if (!ta) return; npFiles[npCurrent] = ta.value; var fn = getNode('/home/cameron'); if (fn) fn.children[npCurrent] = {type:'file',content:ta.value}; showNotif('notepad', 'Saved: ' + npCurrent); }
function npOpen() {
  var opts = Object.keys(npFiles), fn = getNode('/home/cameron');
  if (fn) Object.keys(fn.children).forEach(function(k) { if (fn.children[k].type === 'file' && opts.indexOf(k) === -1) opts.push(k); });
  if (!opts.length) { showNotif('notepad', 'No files.'); return; }
  showModal('Open', 'Files: ' + opts.join(', '), opts[0], function(n) {
    if (!n) return; var c = npFiles[n]; if (c === undefined) { var nd = getNode('/home/cameron/' + n); c = nd ? nd.content : null; }
    if (c === null || c === undefined) { showNotif('notepad', 'Not found: ' + n); return; }
    npCurrent = n; var ta = document.getElementById('np-ta'); if (ta) ta.value = c; npUpdate(); showNotif('notepad', 'Opened: ' + n);
  });
}
function npCopy() { var ta = document.getElementById('np-ta'); if (!ta) return; navigator.clipboard.writeText(ta.value).catch(function(){}); showNotif('notepad', 'Copied'); }
function npToggleWrap() { npWrap = !npWrap; var ta = document.getElementById('np-ta'); if (ta) ta.style.whiteSpace = npWrap ? 'pre-wrap' : 'pre'; showNotif('notepad', 'Wrap: ' + (npWrap?'ON':'OFF')); }
function npWC() { var ta = document.getElementById('np-ta'); if (!ta) return; var v = ta.value, w = v.trim() ? v.trim().split(/\s+/).length : 0; showNotif('notepad', w + ' words, ' + v.length + ' chars, ' + v.split('\n').length + ' lines'); }
function npFind() {
  showModal('Find', 'Search for:', '', function(term) {
    if (!term) return;
    showModal('Replace', 'Replace with:', '', function(rep) {
      var ta = document.getElementById('np-ta'); if (!ta) return;
      var count = ta.value.split(term).length - 1;
      ta.value = ta.value.split(term).join(rep || '');
      npUpdate(); showNotif('notepad', 'Replaced ' + count + ' occurrence(s)');
    });
  });
}

function fillSysInfo() {
  function sv(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  sv('si-plat', navigator.platform || 'Unknown');
  sv('si-cores', (navigator.hardwareConcurrency || '?') + ' threads');
  sv('si-mem', performance && performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576) + 'MB / ' + Math.round(performance.memory.jsHeapSizeLimit/1048576) + 'MB' : 'N/A');
  sv('si-res', window.screen.width + 'x' + window.screen.height);
  var ua = navigator.userAgent;
  sv('si-eng', ua.includes('Chrome') ? 'Blink (Chrome/Edge)' : ua.includes('Firefox') ? 'Gecko (Firefox)' : ua.includes('Safari') ? 'WebKit (Safari)' : 'Unknown');
  sv('si-lang', navigator.language || 'en');
  sv('si-net', navigator.onLine ? 'Connected' : 'Offline');
  var s = Math.floor((Date.now()-appStartTime)/1000); sv('si-up', Math.floor(s/60) + 'm ' + (s%60) + 's');
}
function siPoll() {
  if (!document.getElementById('win-sysinfo').classList.contains('open')) return;
  fillSysInfo();
  var pct = Math.floor(Math.random() * 28 + 4);
  var fill = document.getElementById('si-cpu-fill'); if (fill) fill.style.width = pct + '%';
  var pe = document.getElementById('si-cpu-pct'); if (pe) pe.textContent = pct + '%';
}

function openApp(id) {
  var win = document.getElementById('win-' + id), tb = document.getElementById('tb-' + id);
  if (!win || !tb) return;
  win.style.display = ''; win.classList.add('open'); tb.classList.add('open'); focusApp(id);
  if (id === 'sysinfo') fillSysInfo();
  if (id === 'terminal') { var ti = document.getElementById('t-in'); if (ti) ti.focus(); }
  if (id === 'notepad') npUpdate();
  if (id === 'browser' && !brTabs.length) newBrTab();
}
function closeApp(id) {
  var win = document.getElementById('win-' + id), tb = document.getElementById('tb-' + id);
  if (win) { win.classList.remove('open'); win.style.display = ''; }
  if (tb) tb.classList.remove('open', 'focused');
  maxed[id] = false;
}
function minApp(id) {
  var win = document.getElementById('win-' + id), tb = document.getElementById('tb-' + id);
  if (win) { win.classList.remove('open'); win.style.display = ''; }
  if (tb) tb.classList.remove('focused');
}
function maxApp(id) {
  var win = document.getElementById('win-' + id); if (!win) return;
  if (maxed[id]) {
    var b = savedBounds[id];
    win.style.width = b.w; win.style.height = b.h; win.style.top = b.t; win.style.left = b.l;
    win.style.borderRadius = '10px'; maxed[id] = false;
  } else {
    savedBounds[id] = {w:win.style.width, h:win.style.height, t:win.style.top, l:win.style.left};
    win.style.width = '100vw'; win.style.height = 'calc(100vh - 44px)';
    win.style.top = '0'; win.style.left = '0'; win.style.borderRadius = '0'; maxed[id] = true;
  }
  focusApp(id);
}
function focusApp(id) {
  zTop++;
  var win = document.getElementById('win-' + id); if (!win) return;
  win.style.zIndex = zTop; win.classList.add('open');
  document.querySelectorAll('.tb-app').forEach(function(el) { el.classList.remove('focused'); });
  var tb = document.getElementById('tb-' + id); if (tb) tb.classList.add('focused');
}
function tbClick(id) {
  var win = document.getElementById('win-' + id); if (!win) return;
  if (!win.classList.contains('open')) openApp(id); else minApp(id);
}
function initDrag(id) {
  var bar = document.getElementById('drag-' + id), win = document.getElementById('win-' + id);
  if (!bar || !win) return;
  var drag = false, ox = 0, oy = 0;
  bar.addEventListener('mousedown', function(e) {
    if (e.target.classList.contains('wb')) return;
    if (maxed[id]) return;
    drag = true; ox = e.clientX - win.offsetLeft; oy = e.clientY - win.offsetTop;
    focusApp(id); e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!drag) return;
    win.style.left = Math.max(0, Math.min(e.clientX - ox, window.innerWidth - win.offsetWidth)) + 'px';
    win.style.top = Math.max(0, Math.min(e.clientY - oy, window.innerHeight - win.offsetHeight - 44)) + 'px';
  });
  document.addEventListener('mouseup', function() { drag = false; });
  win.addEventListener('mousedown', function() { focusApp(id); });
}

function toggleMenu() { document.getElementById('smenu').classList.toggle('open'); }
function closeMenu() { document.getElementById('smenu').classList.remove('open'); }
function hideCtx() { document.getElementById('ctxmenu').style.display = 'none'; }
function changeWallpaper() { wpIdx = (wpIdx + 1) % WP.length; document.getElementById('desktop').style.background = WP[wpIdx]; showNotif('wallpaper', 'Wallpaper changed!'); }
function tickClock() {
  var d = new Date();
  var ck = document.getElementById('tb-clock'); if (ck) ck.textContent = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  var dt = document.getElementById('tb-date'); if (dt) dt.textContent = d.toLocaleDateString([], {month:'short', day:'numeric'});
}
function showNotif(type, msg) {
  var n = document.getElementById('notif'); if (!n) return;
  var ic = NICONS[type] || 'ti-bell';
  var tEl = document.getElementById('notif-title'); if (tEl) tEl.innerHTML = '<i class="ti ' + ic + '"></i>' + type.charAt(0).toUpperCase() + type.slice(1);
  var bEl = document.getElementById('notif-body'); if (bEl) bEl.textContent = msg;
  n.style.display = 'block'; n.style.opacity = '1'; n.style.transition = 'none';
  clearTimeout(ntimer);
  ntimer = setTimeout(function() { n.style.transition = 'opacity 0.4s'; n.style.opacity = '0'; setTimeout(function() { n.style.display = 'none'; }, 400); }, 3500);
}
function showModal(title, desc, placeholder, cb) {
  modalCB = cb;
  var h = document.getElementById('modal-h'); if (h) h.textContent = title;
  var p = document.getElementById('modal-p'); if (p) p.textContent = desc;
  var inp = document.getElementById('modal-input');
  if (inp) { inp.style.display = 'block'; inp.value = placeholder || ''; inp.placeholder = placeholder || ''; }
  var ov = document.getElementById('modal-overlay'); if (ov) ov.classList.add('open');
  setTimeout(function() { if (inp) inp.focus(); }, 50);
  if (inp) { inp.onkeydown = function(e) { if (e.key === 'Enter') closeModal(inp.value); if (e.key === 'Escape') closeModal(null); }; }
}
function closeModal(val) {
  var ov = document.getElementById('modal-overlay'); if (ov) ov.classList.remove('open');
  if (modalCB && val !== null && val !== undefined) modalCB(val); modalCB = null;
}

document.addEventListener('DOMContentLoaded', function() {
  initBootCanvas();

  var cpuEl = document.getElementById('boot-cpu-val');
  if (cpuEl) cpuEl.textContent = '0x' + Math.floor(Math.random()*0xFFFF).toString(16).toUpperCase();
  var biosDate = document.getElementById('boot-bios-date');
  if (biosDate) biosDate.textContent = new Date().toLocaleDateString([], {year:'numeric', month:'2-digit', day:'2-digit'});
  (function btick() {
    var el = document.getElementById('boot-clock');
    if (el) el.textContent = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    setTimeout(btick, 1000);
  })();

  setTimeout(bootStep, 700);

  document.getElementById('login-go').addEventListener('click', doLogin);
  document.getElementById('login-pw').addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });

  var tIn = document.getElementById('t-in'), tOut = document.getElementById('t-out'), tPS = document.getElementById('t-ps');
  if (tIn) {
    tIn.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var val = this.value; if (val.trim()) { HIST.unshift(val); HISTI = -1; }
        tOut.innerHTML += '<span style="color:#7F77DD">cameron@camos:' + CWD + '$</span> ' + val + '\n';
        var res = runCmd(val); if (res !== null && res !== undefined && res !== '') tOut.innerHTML += res + '\n';
        tPS.textContent = 'cameron@camos:' + CWD + '$'; this.value = '';
        var tb = document.getElementById('t-body'); if (tb) tb.scrollTop = tb.scrollHeight;
      } else if (e.key === 'ArrowUp') { e.preventDefault(); if (HISTI < HIST.length - 1) { HISTI++; this.value = HIST[HISTI]; } }
        else if (e.key === 'ArrowDown') { e.preventDefault(); if (HISTI > 0) { HISTI--; this.value = HIST[HISTI]; } else { HISTI = -1; this.value = ''; } }
    });
  }

  var brUrlEl = document.getElementById('br-url');
  if (brUrlEl) brUrlEl.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); brGo(this.value.trim()); } });

  var npTa = document.getElementById('np-ta');
  if (npTa) {
    npTa.addEventListener('input', npUpdate); npTa.addEventListener('keyup', npUpdate); npTa.addEventListener('click', npUpdate);
    npTa.addEventListener('keydown', function(e) { if (e.key === 'Tab') { e.preventDefault(); var s = this.selectionStart; this.value = this.value.slice(0, s) + '  ' + this.value.slice(this.selectionEnd); this.selectionStart = this.selectionEnd = s + 2; npUpdate(); } });
  }

  ['terminal','browser','notepad','sysinfo'].forEach(initDrag);

  var desktop = document.getElementById('desktop');
  if (desktop) {
    desktop.addEventListener('click', function(e) {
      if (!e.target.closest('#smenu') && !e.target.closest('#start-btn')) closeMenu();
      if (!e.target.closest('#ctxmenu')) hideCtx();
    });
    desktop.addEventListener('contextmenu', function(e) {
      if (e.target.closest('.win') || e.target.closest('#taskbar')) return;
      e.preventDefault();
      var m = document.getElementById('ctxmenu');
      m.style.left = Math.min(e.clientX, window.innerWidth - 190) + 'px';
      m.style.top = Math.min(e.clientY, window.innerHeight - 180) + 'px';
      m.style.display = 'block';
    });
  }

  var ov = document.getElementById('modal-overlay');
  if (ov) ov.addEventListener('click', function(e) { if (e.target === this) closeModal(null); });
});
