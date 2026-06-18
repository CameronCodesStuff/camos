/* =====================================================
   CamOS v3.0 — script.js
   ===================================================== */

/* ---- PROXIES (tried in order) ---- */
var PROXIES = [
  function(u){ return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u); },
  function(u){ return 'https://corsproxy.io/?' + encodeURIComponent(u); },
  function(u){ return 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u); }
];

/* ---- BOOT CANVAS ---- */
function initBootCanvas() {
  var c = document.getElementById('boot-canvas');
  if (!c) return;
  var ctx = c.getContext('2d');
  var pts = [];
  function resize() { c.width = window.innerWidth; c.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  for (var i = 0; i < 80; i++) {
    pts.push({
      x: Math.random() * c.width, y: Math.random() * c.height,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.4 + 0.3, a: Math.random() * 0.5 + 0.1
    });
  }
  function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0;
      if (p.y < 0) p.y = c.height; if (p.y > c.height) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(127,119,221,' + (p.a * 0.45) + ')';
      ctx.fill();
    }
    for (var i = 0; i < pts.length; i++) {
      for (var j = i + 1; j < pts.length; j++) {
        var dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 110) {
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = 'rgba(83,74,183,' + ((1 - d / 110) * 0.14) + ')';
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* ---- BOOT SEQUENCE ---- */
var BOOT_STEPS = [
  'Initializing UEFI firmware...',
  'Detecting hardware components...',
  'Initializing memory controller...',
  'Mounting virtual filesystem...',
  'Loading kernel modules...',
  'Starting network subsystem...',
  'Launching window manager...',
  'Loading user session...',
  'Starting desktop environment...',
  'System ready.'
];
var bootIdx = 0;
var appStartTime = Date.now();

function bootStep() {
  var fill = document.getElementById('boot-bar-fill');
  var msg  = document.getElementById('boot-msg');
  var log  = document.getElementById('boot-log');
  if (bootIdx >= BOOT_STEPS.length) {
    setTimeout(function() {
      var bs = document.getElementById('boot');
      bs.style.transition = 'opacity 0.7s'; bs.style.opacity = '0';
      setTimeout(function() { bs.style.display = 'none'; showLogin(); }, 700);
    }, 300);
    return;
  }
  var s = BOOT_STEPS[bootIdx];
  msg.textContent = s;
  fill.style.width = ((bootIdx + 1) / BOOT_STEPS.length * 100) + '%';
  var line = document.createElement('div');
  line.innerHTML = '<span class="ok">[ OK ]</span> <span class="tag">' + s + '</span>';
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
  bootIdx++;
  setTimeout(bootStep, 260 + Math.random() * 180);
}

/* ---- LOGIN ---- */
function showLogin() {
  var ls = document.getElementById('login');
  ls.style.display = 'flex'; ls.style.opacity = '0'; ls.style.transition = 'opacity 0.5s';
  setTimeout(function() { ls.style.opacity = '1'; document.getElementById('login-pw').focus(); }, 50);
  tickLoginClock();
  var lci = setInterval(tickLoginClock, 1000);
  window._loginClockInterval = lci;
}
function tickLoginClock() {
  var d = new Date();
  document.getElementById('login-time').textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('login-date').textContent = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}
function doLogin() {
  var pw = document.getElementById('login-pw').value;
  if (pw === '' || pw === '1234') {
    clearInterval(window._loginClockInterval);
    var ls = document.getElementById('login');
    ls.style.transition = 'opacity 0.4s'; ls.style.opacity = '0';
    setTimeout(function() { ls.style.display = 'none'; startDesktop(); }, 400);
  } else {
    var err = document.getElementById('login-err');
    err.textContent = 'Incorrect password — hint: 1234';
    document.getElementById('login-pw').value = '';
    setTimeout(function() { err.textContent = ''; }, 3000);
  }
}
function doLogout() {
  closeMenu();
  ['terminal', 'browser', 'notepad', 'sysinfo'].forEach(function(id) { closeApp(id); });
  var d = document.getElementById('desktop');
  d.style.transition = 'opacity 0.4s'; d.style.opacity = '0';
  setTimeout(function() {
    d.style.display = 'none'; d.style.opacity = '1';
    document.getElementById('login-pw').value = '';
    showLogin();
  }, 400);
}

/* ---- DESKTOP PARTICLES ---- */
function initDesktopCanvas() {
  var c = document.getElementById('desktop-canvas');
  if (!c) return;
  var ctx = c.getContext('2d');
  var pts = [];
  function resize() { c.width = window.innerWidth; c.height = window.innerHeight - 44; }
  resize(); window.addEventListener('resize', resize);
  for (var i = 0; i < 35; i++) {
    pts.push({ x: Math.random() * c.width, y: Math.random() * c.height, vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12, r: Math.random() + 0.2, a: Math.random() * 0.2 + 0.05 });
  }
  function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    pts.forEach(function(p) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0;
      if (p.y < 0) p.y = c.height; if (p.y > c.height) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + p.a + ')'; ctx.fill();
    });
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
  setTimeout(function() { showNotif('welcome', 'Double-click icons to open apps. Right-click desktop for menu.'); }, 900);
}

/* ---- FILESYSTEM ---- */
var FS = {
  '/': { type: 'dir', children: {
    home: { type: 'dir', children: {
      cameron: { type: 'dir', children: {
        readme:  { type: 'file', content: 'Welcome to CamOS v3.0!\nBuilt by Cameron.\n\nTry: ls, cd, cat readme, mkdir test, neofetch' },
        notes:   { type: 'file', content: '# Notes\n\n- NEXUS platform\n- CamOS browser\n- Game dev projects\n' },
        '.camshrc': { type: 'file', content: 'export USER=cameron\nexport HOME=/home/cameron\nalias ll="ls"\nalias cls="clear"' },
        projects: { type: 'dir', children: {
          nexus: { type: 'file', content: 'NEXUS — realtime chat platform\nStack: Firebase + vanilla JS' }
        }}
      }}
    }},
    etc: { type: 'dir', children: {
      hostname:   { type: 'file', content: 'camos' },
      'os-release': { type: 'file', content: 'NAME="CamOS"\nVERSION="3.0"\nPRETTY_NAME="CamOS 3.0"' }
    }},
    tmp: { type: 'dir', children: {} },
    bin: { type: 'dir', children: { sh: { type: 'file', content: 'camsh binary' } } }
  }}
};
var CWD = '/home/cameron';
var HIST = [], HISTI = -1;

function resolvePath(p) {
  if (!p || p === '~') return '/home/cameron';
  if (!p.startsWith('/')) p = CWD + '/' + p;
  var parts = p.split('/').filter(Boolean), stack = [];
  parts.forEach(function(s) { if (s === '..') stack.pop(); else if (s !== '.') stack.push(s); });
  return '/' + stack.join('/');
}
function getNode(path) {
  var parts = path.split('/').filter(Boolean), node = FS['/'];
  for (var i = 0; i < parts.length; i++) {
    if (!node || !node.children) return null;
    node = node.children[parts[i]];
    if (!node) return null;
  }
  return node;
}
function cwdNode() { return getNode(CWD); }

var CMDS = {
  help: function() {
    return 'camsh 3.0\n\n  ls [path]    list directory\n  cd [path]    change directory\n  pwd          print directory\n  cat <file>   print file\n  echo <text>  print text\n  mkdir <dir>  make directory\n  touch <file> create file\n  rm <name>    remove file/dir\n  clear        clear terminal\n  date         current date\n  whoami       current user\n  uname        system info\n  uptime       system uptime\n  neofetch     system summary';
  },
  pwd:     function() { return CWD; },
  whoami:  function() { return 'cameron'; },
  hostname:function() { return 'camos'; },
  uname:   function() { return 'CamOS 3.0 ' + (navigator.platform || 'Browser') + ' HTML5'; },
  date:    function() { return new Date().toString(); },
  uptime:  function() {
    var s = Math.floor((Date.now() - appStartTime) / 1000);
    return 'up ' + Math.floor(s / 60) + 'm ' + (s % 60) + 's, 1 user';
  },
  clear: function() {
    document.getElementById('t-out').innerHTML = '';
    return null;
  },
  ls: function(args) {
    var path = args[0] ? resolvePath(args[0]) : CWD;
    var node = getNode(path);
    if (!node) return 'ls: ' + (args[0] || path) + ': No such file or directory';
    if (node.type !== 'dir') return args[0] || path;
    var items = Object.entries(node.children);
    if (!items.length) return '';
    return items.map(function(e) {
      var col = e[1].type === 'dir' ? '#8888ff' : '#33ff88';
      return '<span style="color:' + col + '">' + e[0] + (e[1].type === 'dir' ? '/' : '') + '</span>';
    }).join('  ');
  },
  cd: function(args) {
    var path = resolvePath(args[0] || '~');
    var node = getNode(path);
    if (!node) return 'cd: ' + (args[0] || '') + ': No such file or directory';
    if (node.type !== 'dir') return 'cd: ' + args[0] + ': Not a directory';
    CWD = path || '/'; return '';
  },
  cat: function(args) {
    if (!args[0]) return 'cat: missing operand';
    var node = getNode(resolvePath(args[0]));
    if (!node) return 'cat: ' + args[0] + ': No such file or directory';
    if (node.type === 'dir') return 'cat: ' + args[0] + ': Is a directory';
    return node.content;
  },
  echo: function(args) { return args.join(' '); },
  mkdir: function(args) {
    if (!args[0]) return 'mkdir: missing operand';
    var p = cwdNode(); if (!p) return 'error';
    if (p.children[args[0]]) return 'mkdir: ' + args[0] + ': File exists';
    p.children[args[0]] = { type: 'dir', children: {} }; return '';
  },
  touch: function(args) {
    if (!args[0]) return 'touch: missing operand';
    var p = cwdNode(); if (!p) return 'error';
    if (!p.children[args[0]]) p.children[args[0]] = { type: 'file', content: '' }; return '';
  },
  rm: function(args) {
    if (!args[0]) return 'rm: missing operand';
    var p = cwdNode();
    if (!p || !p.children[args[0]]) return 'rm: ' + args[0] + ': No such file or directory';
    delete p.children[args[0]]; return '';
  },
  neofetch: function() {
    return '<span style="color:#7F77DD">   /\\    </span>  <span style="color:#9090dd">cameron</span><span style="color:#555">@</span><span style="color:#9090dd">camos</span>\n' +
           '<span style="color:#7F77DD">  /  \\   </span>  ---------------\n' +
           '<span style="color:#534AB7"> / /\\ \\  </span>  <span style="color:#555">OS:</span> CamOS 3.0\n' +
           '<span style="color:#534AB7">/_/  \\_\\ </span>  <span style="color:#555">Shell:</span> camsh 3.0\n' +
           '           <span style="color:#555">CPU:</span> ' + (navigator.hardwareConcurrency || '?') + ' threads\n' +
           '           <span style="color:#555">Res:</span> ' + window.screen.width + 'x' + window.screen.height;
  }
};

function runCmd(line) {
  line = line.trim(); if (!line) return '';
  var parts = line.split(/\s+/);
  var cmd = parts[0]; var args = parts.slice(1);
  var aliases = { ll: 'ls', cls: 'clear' };
  if (aliases[cmd]) cmd = aliases[cmd];
  if (CMDS[cmd]) return CMDS[cmd](args);
  return '<span style="color:#e05d5d">' + cmd + ': command not found</span>';
}

/* ---- BROWSER ---- */
var brTabs = [];
var brCurTab = -1;

function brGetEl(id) {
  var win = document.getElementById('win-browser');
  return win ? win.querySelector('#' + id) : null;
}

function newBrTab(url) {
  var tab = { url: url || '', hist: [], hidx: -1, title: 'New Tab' };
  brTabs.push(tab);
  brCurTab = brTabs.length - 1;
  renderBrTabs();
  if (url) brNavTo(url);
  else brShowHome();
}

function closeBrTab(idx, evt) {
  if (evt) evt.stopPropagation();
  brTabs.splice(idx, 1);
  if (!brTabs.length) { newBrTab(); return; }
  if (brCurTab >= brTabs.length) brCurTab = brTabs.length - 1;
  renderBrTabs();
  brRestoreTab();
}

function switchBrTab(idx) {
  brCurTab = idx;
  renderBrTabs();
  brRestoreTab();
}

function brRestoreTab() {
  var t = brTabs[brCurTab];
  if (!t) return;
  var urlEl = brGetEl('br-url');
  if (urlEl) urlEl.value = t.url || '';
  brSetTitle(t.title || 'Browser');
  if (t.url) brNavTo(t.url, true);
  else brShowHome();
}

function renderBrTabs() {
  var container = brGetEl('br-tabs-inner');
  if (!container) return;
  container.innerHTML = '';
  brTabs.forEach(function(t, i) {
    var el = document.createElement('div');
    el.className = 'br-tab' + (i === brCurTab ? ' active' : '');
    var lbl = document.createElement('span');
    lbl.className = 'br-tab-label';
    var title = t.title || 'New Tab';
    lbl.textContent = title.length > 18 ? title.slice(0, 18) + '…' : title;
    var x = document.createElement('span');
    x.className = 'br-tab-x';
    x.innerHTML = '<i class="ti ti-x"></i>';
    x.addEventListener('click', function(e) { closeBrTab(i, e); });
    el.appendChild(lbl); el.appendChild(x);
    el.addEventListener('click', function(e) {
      if (!e.target.closest('.br-tab-x')) switchBrTab(i);
    });
    container.appendChild(el);
  });
}

function brSetTitle(title) {
  var el = brGetEl('br-win-title');
  if (el) el.textContent = title.length > 30 ? title.slice(0, 30) + '…' : title;
}

function brShowHome() {
  var home    = brGetEl('br-home');
  var iframe  = brGetEl('br-iframe');
  var loading = brGetEl('br-loading');
  var err     = brGetEl('br-err');
  if (!home) return;
  if (iframe)  { iframe.style.display = 'none'; iframe.src = 'about:blank'; }
  if (loading) loading.classList.remove('visible');
  if (err)     err.classList.remove('visible');
  home.classList.add('visible');
  var urlEl = brGetEl('br-url');
  if (urlEl) urlEl.value = '';
  brSetTitle('Home');
}

function brShowLoading() {
  var home    = brGetEl('br-home');
  var iframe  = brGetEl('br-iframe');
  var loading = brGetEl('br-loading');
  var err     = brGetEl('br-err');
  if (home)    home.classList.remove('visible');
  if (iframe)  iframe.style.display = 'none';
  if (loading) loading.classList.add('visible');
  if (err)     err.classList.remove('visible');
}

function brShowIframe() {
  var home    = brGetEl('br-home');
  var iframe  = brGetEl('br-iframe');
  var loading = brGetEl('br-loading');
  var err     = brGetEl('br-err');
  if (home)    home.classList.remove('visible');
  if (iframe)  iframe.style.display = 'block';
  if (loading) loading.classList.remove('visible');
  if (err)     err.classList.remove('visible');
}

function brShowErr(url, reason) {
  var home    = brGetEl('br-home');
  var iframe  = brGetEl('br-iframe');
  var loading = brGetEl('br-loading');
  var err     = brGetEl('br-err');
  var eMsg    = brGetEl('br-err-msg');
  var eLink   = brGetEl('br-err-link');
  if (home)    home.classList.remove('visible');
  if (iframe)  { iframe.style.display = 'none'; iframe.src = 'about:blank'; }
  if (loading) loading.classList.remove('visible');
  if (err)     err.classList.add('visible');
  if (eMsg)    eMsg.textContent = reason || 'Could not load the page.';
  if (eLink)   { eLink.href = url || '#'; eLink.textContent = 'Open ' + (url || '') + ' in browser'; }
}

async function brNavTo(url, skipHistory) {
  if (!url) return;
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
  var urlEl = brGetEl('br-url');
  if (urlEl) urlEl.value = url;
  brShowLoading();
  brSetTitle('Loading…');

  var t = brTabs[brCurTab];
  if (t && !skipHistory) {
    t.hist = t.hist.slice(0, t.hidx + 1);
    t.hist.push(url); t.hidx = t.hist.length - 1; t.url = url;
  } else if (t) {
    t.url = url;
  }

  // Try proxy fetch — iterate proxies until one works
  var fetched = false;
  for (var pi = 0; pi < PROXIES.length; pi++) {
    try {
      var proxyUrl = PROXIES[pi](url);
      var resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) continue;
      var html = await resp.text();
      if (!html || html.length < 50) continue;
      brInjectHTML(html, url);
      fetched = true;
      break;
    } catch (e) { /* try next proxy */ }
  }
  if (!fetched) {
    brShowErr(url, 'All proxies failed for this URL. The site may be down or blocking all proxies.');
    if (t) { t.title = 'Error'; renderBrTabs(); brSetTitle('Error'); }
  }
}

function brInjectHTML(html, baseUrl) {
  // Extract title
  var titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  var title = titleMatch ? titleMatch[1].trim() : baseUrl;

  // Inject base + reset styles
  var inject = '<base href="' + baseUrl + '"><style>*{max-width:100%;box-sizing:border-box}body{font-family:system-ui;overflow-x:hidden}img{height:auto}</style>';
  html = html.replace(/<head([^>]*)>/i, function(m) { return m + inject; });
  if (html.indexOf('<head') === -1) html = '<head>' + inject + '</head>' + html;

  var iframe = brGetEl('br-iframe');
  if (!iframe) return;
  iframe.srcdoc = html;
  brShowIframe();

  var t = brTabs[brCurTab];
  if (t) { t.title = title; t.url = baseUrl; renderBrTabs(); }
  brSetTitle(title);
  var urlEl = brGetEl('br-url');
  if (urlEl) urlEl.value = baseUrl;
}

function brGo(url) {
  var u = url || (brGetEl('br-url') || {}).value || '';
  u = u.trim();
  if (!u) return;
  if (!brTabs.length) { newBrTab(u); return; }
  brNavTo(u);
}
function brBack() {
  var t = brTabs[brCurTab]; if (!t || t.hidx <= 0) return;
  t.hidx--; var u = t.hist[t.hidx]; t.url = u; brNavTo(u, true);
}
function brFwd() {
  var t = brTabs[brCurTab]; if (!t || t.hidx >= t.hist.length - 1) return;
  t.hidx++; var u = t.hist[t.hidx]; t.url = u; brNavTo(u, true);
}
function brReload() {
  var t = brTabs[brCurTab]; if (t && t.url) brNavTo(t.url, true);
}
function brHome() { brShowHome(); }
function brBookmark() {
  var t = brTabs[brCurTab];
  if (!t || !t.url) return;
  showNotif('bookmark', 'Bookmarked: ' + (t.title || t.url).slice(0, 40));
}

/* ---- NOTEPAD ---- */
var npFiles = {};
var npCurrent = 'untitled.txt';
var npWrap = false;

function npUpdate() {
  var ta = document.getElementById('np-ta');
  if (!ta) return;
  var v = ta.value;
  var words = v.trim() ? v.trim().split(/\s+/).length : 0;
  var el = document.getElementById('np-wc'); if (el) el.textContent = words + ' words';
  var ec = document.getElementById('np-cc'); if (ec) ec.textContent = v.length + ' chars';
  var before = v.slice(0, ta.selectionStart);
  var ln = before.split('\n').length;
  var col = before.split('\n').pop().length + 1;
  var ep = document.getElementById('np-pos'); if (ep) ep.textContent = 'Ln ' + ln + ' Col ' + col;
}

function npNew() {
  showModal('New File', 'Enter filename:', 'untitled.txt', function(name) {
    if (!name) return;
    npFiles[name] = '';
    npCurrent = name;
    var ta = document.getElementById('np-ta'); if (ta) ta.value = '';
    npUpdate();
    showNotif('notepad', 'New file: ' + name);
  });
}
function npSave() {
  var ta = document.getElementById('np-ta'); if (!ta) return;
  npFiles[npCurrent] = ta.value;
  var fsNode = getNode('/home/cameron');
  if (fsNode) fsNode.children[npCurrent] = { type: 'file', content: ta.value };
  showNotif('notepad', 'Saved: ' + npCurrent);
}
function npOpen() {
  var opts = Object.keys(npFiles);
  var fsNode = getNode('/home/cameron');
  if (fsNode) {
    Object.keys(fsNode.children).forEach(function(k) {
      if (fsNode.children[k].type === 'file' && opts.indexOf(k) === -1) opts.push(k);
    });
  }
  if (!opts.length) { showNotif('notepad', 'No saved files.'); return; }
  showModal('Open File', 'Available: ' + opts.join(', '), opts[0], function(name) {
    if (!name) return;
    var content = npFiles[name];
    if (content === undefined) {
      var fn = getNode('/home/cameron/' + name);
      content = fn ? fn.content : null;
    }
    if (content === null || content === undefined) { showNotif('notepad', 'File not found: ' + name); return; }
    npCurrent = name;
    var ta = document.getElementById('np-ta'); if (ta) ta.value = content;
    npUpdate();
    showNotif('notepad', 'Opened: ' + name);
  });
}
function npCopy() {
  var ta = document.getElementById('np-ta'); if (!ta) return;
  navigator.clipboard.writeText(ta.value).catch(function() {});
  showNotif('notepad', 'Copied to clipboard');
}
function npToggleWrap() {
  npWrap = !npWrap;
  var ta = document.getElementById('np-ta');
  if (ta) ta.style.whiteSpace = npWrap ? 'pre-wrap' : 'pre';
  showNotif('notepad', 'Word wrap: ' + (npWrap ? 'ON' : 'OFF'));
}
function npWC() {
  var ta = document.getElementById('np-ta'); if (!ta) return;
  var v = ta.value;
  var w = v.trim() ? v.trim().split(/\s+/).length : 0;
  showNotif('notepad', w + ' words · ' + v.length + ' chars · ' + v.split('\n').length + ' lines');
}
function npFind() {
  showModal('Find & Replace', 'Search for:', '', function(term) {
    if (!term) return;
    showModal('Replace with', 'Replace "' + term + '" with:', '', function(rep) {
      var ta = document.getElementById('np-ta'); if (!ta) return;
      var count = ta.value.split(term).length - 1;
      ta.value = ta.value.split(term).join(rep || '');
      npUpdate();
      showNotif('notepad', 'Replaced ' + count + ' occurrence(s)');
    });
  });
}

/* ---- SYSINFO ---- */
function fillSysInfo() {
  function sv(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  sv('si-plat',  navigator.platform || 'Unknown');
  sv('si-cores', (navigator.hardwareConcurrency || '?') + ' threads');
  sv('si-mem',   performance && performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB / ' + Math.round(performance.memory.jsHeapSizeLimit / 1048576) + 'MB' : 'N/A');
  sv('si-res',   window.screen.width + 'x' + window.screen.height);
  var ua = navigator.userAgent;
  var eng = ua.includes('Chrome') ? 'Blink (Chrome/Edge)' : ua.includes('Firefox') ? 'Gecko (Firefox)' : ua.includes('Safari') ? 'WebKit (Safari)' : 'Unknown';
  sv('si-eng',   eng);
  sv('si-lang',  navigator.language || 'en');
  sv('si-net',   navigator.onLine ? 'Connected' : 'Offline');
  var s = Math.floor((Date.now() - appStartTime) / 1000);
  sv('si-up', Math.floor(s / 60) + 'm ' + (s % 60) + 's');
}
function siPoll() {
  if (!document.getElementById('win-sysinfo').classList.contains('open')) return;
  fillSysInfo();
  var pct = Math.floor(Math.random() * 28 + 4);
  var fill = document.getElementById('si-cpu-fill');
  var pctEl = document.getElementById('si-cpu-pct');
  if (fill)  fill.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
}

/* ---- WINDOW MANAGEMENT ---- */
var zTop = 10;
var maxed = {};
var savedBounds = {};

function openApp(id) {
  var win = document.getElementById('win-' + id);
  var tb  = document.getElementById('tb-' + id);
  if (!win || !tb) return;
  win.classList.add('open');
  tb.classList.add('open');
  focusApp(id);
  if (id === 'sysinfo')  fillSysInfo();
  if (id === 'terminal') { var ti = document.getElementById('t-in'); if (ti) ti.focus(); }
  if (id === 'notepad')  npUpdate();
  if (id === 'browser' && !brTabs.length) { newBrTab(); }
}

function closeApp(id) {
  var win = document.getElementById('win-' + id);
  var tb  = document.getElementById('tb-' + id);
  if (win) win.classList.remove('open');
  if (tb)  tb.classList.remove('open', 'focused');
  maxed[id] = false;
}

function minApp(id) {
  var win = document.getElementById('win-' + id);
  var tb  = document.getElementById('tb-' + id);
  if (win) win.classList.remove('open');
  if (tb)  tb.classList.remove('focused');
}

function maxApp(id) {
  var win = document.getElementById('win-' + id);
  if (!win) return;
  if (maxed[id]) {
    var b = savedBounds[id];
    win.style.width = b.w; win.style.height = b.h;
    win.style.top = b.t; win.style.left = b.l;
    win.style.borderRadius = '10px';
    maxed[id] = false;
  } else {
    savedBounds[id] = { w: win.style.width, h: win.style.height, t: win.style.top, l: win.style.left };
    win.style.width = '100vw'; win.style.height = 'calc(100vh - 44px)';
    win.style.top = '0'; win.style.left = '0';
    win.style.borderRadius = '0';
    maxed[id] = true;
  }
  focusApp(id);
}

function focusApp(id) {
  zTop++;
  var win = document.getElementById('win-' + id);
  if (!win) return;
  win.style.zIndex = zTop;
  document.querySelectorAll('.tb-app').forEach(function(el) { el.classList.remove('focused'); });
  var tb = document.getElementById('tb-' + id);
  if (tb) tb.classList.add('focused');
}

function tbClick(id) {
  var win = document.getElementById('win-' + id);
  if (!win) return;
  if (!win.classList.contains('open')) openApp(id);
  else minApp(id);
}

/* ---- DRAG ---- */
function initDrag(id) {
  var bar = document.getElementById('drag-' + id);
  var win = document.getElementById('win-' + id);
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
    var mx = window.innerWidth - win.offsetWidth;
    var my = window.innerHeight - win.offsetHeight - 44;
    win.style.left = Math.max(0, Math.min(e.clientX - ox, mx)) + 'px';
    win.style.top  = Math.max(0, Math.min(e.clientY - oy, my)) + 'px';
  });
  document.addEventListener('mouseup', function() { drag = false; });
  win.addEventListener('mousedown', function() { focusApp(id); });
}

/* ---- START MENU / CTX ---- */
function toggleMenu() { document.getElementById('smenu').classList.toggle('open'); }
function closeMenu()  { document.getElementById('smenu').classList.remove('open'); }
function hideCtx()    { document.getElementById('ctxmenu').style.display = 'none'; }

/* ---- WALLPAPERS ---- */
var WP = [
  'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)',
  'linear-gradient(135deg,#0d1117,#161b22,#1f2937)',
  'linear-gradient(160deg,#1a0a2e,#2d1b4e,#3c1f6e)',
  'linear-gradient(135deg,#0a1628,#0f2744,#143d6b)',
  'linear-gradient(135deg,#1a1a1a,#2a1a2e,#1a2a1a)',
  'linear-gradient(135deg,#0a1a0a,#0f2a18,#0a2a12)',
  'linear-gradient(135deg,#1a0a0a,#2e1616,#400f0f)'
];
var wpIdx = 0;
function changeWallpaper() {
  wpIdx = (wpIdx + 1) % WP.length;
  document.getElementById('desktop').style.background = WP[wpIdx];
  showNotif('wallpaper', 'Wallpaper changed!');
}

/* ---- CLOCK ---- */
function tickClock() {
  var d = new Date();
  var ck = document.getElementById('tb-clock'); if (ck) ck.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  var dt = document.getElementById('tb-date');  if (dt) dt.textContent = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/* ---- NOTIFICATIONS ---- */
var NICONS = { welcome: 'ti-device-desktop', bookmark: 'ti-bookmark', notepad: 'ti-file-text', wallpaper: 'ti-palette', info: 'ti-info-circle', error: 'ti-alert-circle' };
var ntimer = null;
function showNotif(type, msg) {
  var n = document.getElementById('notif'); if (!n) return;
  var ic = NICONS[type] || 'ti-bell';
  var tEl = document.getElementById('notif-title');
  var bEl = document.getElementById('notif-body');
  if (tEl) tEl.innerHTML = '<i class="ti ' + ic + '"></i>' + type.charAt(0).toUpperCase() + type.slice(1);
  if (bEl) bEl.textContent = msg;
  n.style.display = 'block'; n.style.opacity = '1'; n.style.transition = 'none';
  clearTimeout(ntimer);
  ntimer = setTimeout(function() {
    n.style.transition = 'opacity 0.4s'; n.style.opacity = '0';
    setTimeout(function() { n.style.display = 'none'; }, 400);
  }, 3500);
}

/* ---- MODAL ---- */
var modalCB = null;
function showModal(title, desc, placeholder, cb) {
  modalCB = cb;
  var h = document.getElementById('modal-h'); if (h) h.textContent = title;
  var p = document.getElementById('modal-p'); if (p) p.textContent = desc;
  var inp = document.getElementById('modal-input');
  if (inp) { inp.style.display = 'block'; inp.value = placeholder || ''; inp.placeholder = placeholder || ''; }
  var ov = document.getElementById('modal-overlay');
  if (ov) ov.classList.add('open');
  setTimeout(function() { if (inp) inp.focus(); }, 50);
  if (inp) {
    inp.onkeydown = function(e) {
      if (e.key === 'Enter') closeModal(inp.value);
      if (e.key === 'Escape') closeModal(null);
    };
  }
}
function closeModal(val) {
  var ov = document.getElementById('modal-overlay'); if (ov) ov.classList.remove('open');
  if (modalCB && val !== null && val !== undefined) modalCB(val);
  modalCB = null;
}

/* ---- INIT ---- */
document.addEventListener('DOMContentLoaded', function() {
  initBootCanvas();
  setTimeout(bootStep, 700);

  // Login
  document.getElementById('login-go').addEventListener('click', doLogin);
  document.getElementById('login-pw').addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });

  // Terminal input
  var tIn = document.getElementById('t-in');
  var tOut = document.getElementById('t-out');
  var tPS  = document.getElementById('t-ps');
  if (tIn) {
    tIn.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var val = this.value;
        if (val.trim()) { HIST.unshift(val); HISTI = -1; }
        tOut.innerHTML += '<span style="color:#7F77DD">cameron@camos:' + CWD + '$</span> ' + val + '\n';
        var res = runCmd(val);
        if (res !== null && res !== undefined && res !== '') tOut.innerHTML += res + '\n';
        tPS.textContent = 'cameron@camos:' + CWD + '$';
        this.value = '';
        var tb = document.getElementById('t-body'); if (tb) tb.scrollTop = tb.scrollHeight;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (HISTI < HIST.length - 1) { HISTI++; this.value = HIST[HISTI]; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (HISTI > 0) { HISTI--; this.value = HIST[HISTI]; } else { HISTI = -1; this.value = ''; }
      }
    });
  }

  // Browser URL bar
  var brUrl = document.getElementById('br-url');
  if (brUrl) brUrl.addEventListener('keydown', function(e) { if (e.key === 'Enter') brGo(); });

  // Notepad
  var npTa = document.getElementById('np-ta');
  if (npTa) {
    npTa.addEventListener('input', npUpdate);
    npTa.addEventListener('keyup', npUpdate);
    npTa.addEventListener('click', npUpdate);
    npTa.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var s = this.selectionStart;
        this.value = this.value.slice(0, s) + '  ' + this.value.slice(this.selectionEnd);
        this.selectionStart = this.selectionEnd = s + 2;
        npUpdate();
      }
    });
  }

  // Window close/min/max buttons
  ['terminal', 'browser', 'notepad', 'sysinfo'].forEach(function(id) {
    initDrag(id);
  });

  // Desktop click handlers
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
      m.style.top  = Math.min(e.clientY, window.innerHeight - 180) + 'px';
      m.style.display = 'block';
    });
  }

  // Modal overlay click
  var ov = document.getElementById('modal-overlay');
  if (ov) ov.addEventListener('click', function(e) { if (e.target === this) closeModal(null); });
});
