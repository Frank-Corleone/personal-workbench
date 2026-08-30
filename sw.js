/* =========================================================
   Service Worker：缓存应用外壳，支持离线打开与秒加载
   版本号递增即可让客户端在下次访问时刷新全部缓存
   ========================================================= */
const CACHE = 'pwb-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/seed.js',
  './js/utils.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; /* GitHub API 等跨域请求不走缓存 */

  /* 页面导航：网络优先，离线回退缓存 */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => { const c = res.clone(); caches.open(CACHE).then(cache => cache.put('./index.html', c)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  /* 静态资源：缓存优先，后台更新 */
  e.respondWith(
    caches.match(e.request).then(hit => {
      const fetching = fetch(e.request)
        .then(res => { const c = res.clone(); caches.open(CACHE).then(cache => cache.put(e.request, c)); return res; })
        .catch(() => hit);
      return hit || fetching;
    })
  );
});
