const CACHE_NAME = 'kumch-v3';
const CORE_ASSETS = [
  '/kumch-unit3/',
  '/kumch-unit3/index.html',
  '/kumch-unit3/manifest.json',
  '/kumch-unit3/icon-192.png',
  '/kumch-unit3/icon-512.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(CORE_ASSETS);
    }).catch(function(err){ console.log('Cache install error:', err); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  var url = e.request.url;
  if(url.includes('supabase.co') || url.includes('supabase.in')){
    e.respondWith(
      fetch(e.request).catch(function(){
        return new Response(JSON.stringify({error:'offline'}),
          {headers:{'Content-Type':'application/json'}});
      })
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached){
      var networkFetch = fetch(e.request).then(function(response){
        if(response && response.status === 200){
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function(){ return cached; });
      return cached || networkFetch;
    })
  );
});

self.addEventListener('message', function(e){
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Push Notifications ──
self.addEventListener('push', function(e){
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err){ data = {title:'KuMCH Unit 3', body: e.data ? e.data.text() : 'New notification'}; }

  var title = data.title || 'KuMCH Unit 3';
  var options = {
    body: data.body || 'New notification',
    icon: data.icon || '/kumch-unit3/icon-192.png',
    badge: '/kumch-unit3/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'kumch-notification',
    renotify: true,
    data: { url: data.url || '/kumch-unit3/' },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  e.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  if(e.action === 'close') return;
  var url = (e.notification.data && e.notification.data.url) || '/kumch-unit3/';
  e.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(function(clientList){
      for(var i=0; i<clientList.length; i++){
        var client = clientList[i];
        if(client.url.includes('kumch-unit3') && 'focus' in client){
          return client.focus();
        }
      }
      if(clients.openWindow) return clients.openWindow(url);
    })
  );
});
