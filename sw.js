const CACHE_NAME = 'wanhuyul-v4-pwa';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './offline.html'
];

// 설치 시 앱쉘 캐시
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting(); // ④ 업데이트 자동 적용
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null))
    )
  );
  self.clients.claim(); // 전체화면 앱 느낌 강화 - 즉시 제어
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // 외부 API (Supabase, Kakao)는 캐시 안 함 - 네트워크만
  if (url.origin !== self.location.origin) {
    return;
  }

  // HTML 네비게이션: 네트워크 우선, 실패시 캐시 -> offline.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const offline = await caches.match('./offline.html');
          return offline || caches.match('./index.html');
        })
    );
    return;
  }

  // 정적 파일: 캐시 우선, 없으면 네트워크
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(res => {
          // 성공하면 캐시 저장
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => {
          // 이미지 실패시 빈 응답 방지
          if (event.request.destination === 'image') {
            return new Response('', { status: 204 });
          }
        });
    })
  );
});

// 푸시 알림 대비 (⑤ 단계 준비)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
