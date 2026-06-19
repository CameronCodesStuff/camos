/* CamOS Service Worker - offline caching */
var CACHE='camos-v3';
var ASSETS=[
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css'
];

self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){
    // Cache best-effort; don't fail install if a CDN asset is unreachable
    return Promise.allSettled(ASSETS.map(function(u){return c.add(u);}));
  }));
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){if(k!==CACHE)return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});

self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET'){return;}
  var url=new URL(req.url);
  // Never cache proxy traffic or cross-origin API calls - always go to network
  if(url.search.indexOf('?u=')>-1||/workers\.dev|corsproxy|allorigins|codetabs|duckduckgo/.test(url.host)){
    return; // let it hit the network normally
  }
  // Cache-first for our own app shell, network fallback
  e.respondWith(
    caches.match(req).then(function(cached){
      if(cached)return cached;
      return fetch(req).then(function(res){
        if(res&&res.status===200&&(url.origin===location.origin)){
          var copy=res.clone();
          caches.open(CACHE).then(function(c){c.put(req,copy);});
        }
        return res;
      }).catch(function(){return cached;});
    })
  );
});
