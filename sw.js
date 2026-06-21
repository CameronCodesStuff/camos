/* CamOS Service Worker - offline caching (network-first for app shell) */
var CACHE='camos-v4';
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

  // Never touch proxy traffic or browser API calls - always straight to network
  if(url.search.indexOf('?u=')>-1||/workers\.dev|corsproxy|allorigins|codetabs|duckduckgo/.test(url.host)){
    return;
  }

  var isAppShell=(url.origin===location.origin);

  if(isAppShell){
    // NETWORK-FIRST: always try fresh so updates show immediately.
    // Fall back to cache only when offline.
    e.respondWith(
      fetch(req).then(function(res){
        if(res&&res.status===200){
          var copy=res.clone();
          caches.open(CACHE).then(function(c){c.put(req,copy);});
        }
        return res;
      }).catch(function(){
        return caches.match(req).then(function(cached){
          return cached||caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Cross-origin static assets (e.g. icon font CDN): cache-first is fine.
  e.respondWith(
    caches.match(req).then(function(cached){
      if(cached)return cached;
      return fetch(req).then(function(res){
        if(res&&res.status===200){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy);});}
        return res;
      }).catch(function(){return cached;});
    })
  );
});
