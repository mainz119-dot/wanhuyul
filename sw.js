importScripts('https://cdn.jsdelivr.net/npm/workbox-sw@7.0.0/build/workbox-sw.min.js');

const workboxSW = new WorkboxSW();
workboxSW.precache([]);

// Keep service worker active
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated');
  self.clients.claim();
});

// Push notification handler
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push received:', event);
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[Service Worker] Push data:', data);
      
      // 메시지 타입에 따른 아이콘 및 설정
      let icon = data.icon || '/icon-192.png';
      let badge = '/icon-192.png';
      let vibratePattern = [100, 50, 100];
      
      // 영상통화인 경우 특별한 처리
      if (data.type === 'video-call') {
        vibratePattern = [200, 100, 200, 100, 200];
        icon = data.icon || '/icon-512.png';
      }
      
      const options = {
        body: data.body || '새로운 메시지가 도착했습니다.',
        icon: icon,
        badge: badge,
        vibrate: vibratePattern,
        tag: data.tag || 'wanhuyul-notification',
        requireInteraction: data.type === 'video-call',
        silent: false,
        data: {
          dateOfArrival: Date.now(),
          primaryKey: 1,
          url: data.url || '/',
          type: data.type || 'message',
          callId: data.callId || null,
          from: data.from || null
        },
        actions: [
          {
            action: 'open',
            title: '열기',
            icon: '/icon-192.png'
          },
          ...(data.type === 'video-call' ? [
            {
              action: 'answer',
              title: '통화',
              icon: '/icon-192.png'
            },
            {
              action: 'decline',
              title: '거절',
              icon: '/icon-192.png'
            }
          ] : [])
        ]
      };
      
      event.waitUntil(
        self.registration.showNotification(data.title || '완후유', options)
      );
    } catch (error) {
      console.error('[Service Worker] Error processing push:', error);
    }
  }
});

// Notification click handler
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked:', event.action);
  event.notification.close();
  
  const notificationData = event.notification.data;
  const urlToOpen = notificationData?.url || '/';
  
  // 영상통화 액션 처리
  if (event.action === 'answer' && notificationData?.type === 'video-call') {
    // 통화 수락 - 앱에 메시지 전송
    event.waitUntil(
      clients.matchAll({type: 'window'}).then(function(clientList) {
        clientList.forEach(client => {
          client.postMessage({
            type: 'VIDEO_CALL_ANSWER',
            callId: notificationData.callId,
            from: notificationData.from
          });
        });
        // 앱이 없으면 새 창 열기
        if (clientList.length === 0 && clients.openWindow) {
          return clients.openWindow(urlToOpen + '?call=' + notificationData.callId + '&action=answer');
        }
      })
    );
    return;
  }
  
  if (event.action === 'decline' && notificationData?.type === 'video-call') {
    // 통화 거절 - 앱에 메시지 전송
    event.waitUntil(
      clients.matchAll({type: 'window'}).then(function(clientList) {
        clientList.forEach(client => {
          client.postMessage({
            type: 'VIDEO_CALL_DECLINE',
            callId: notificationData.callId,
            from: notificationData.from
          });
        });
      })
    );
    return;
  }
  
  // 일반적인 알림 클릭 (열기)
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({type: 'window'}).then(function(clientList) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            // 기존 창이 있으면 포커스
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              notificationData: notificationData
            });
            return client.focus();
          }
        }
        // 새 창 열기
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Background sync for messages
self.addEventListener('sync', function(event) {
  console.log('[Service Worker] Sync event:', event.tag);
  if (event.tag === 'send-message') {
    event.waitUntil(sendQueuedMessages());
  }
});

async function sendQueuedMessages() {
  console.log('[Service Worker] Background sync: Sending queued messages');
  // 백그라운드에서 메시지 전송 로직
  // IndexedDB 에서 대기 중인 메시지 가져와서 전송
}

// 메시지 수신 대기 (앱에서 서비스워커로 메시지 전송)
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message from client:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({version: '1.0.0'});
  }
});

// Fetch 이벤트 - 네트워크 요청 인터셉트
self.addEventListener('fetch', (event) => {
  // 캐시 전략 구현 (필요시)
  // event.respondWith(...);
});
