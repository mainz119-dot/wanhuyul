// app.js - 서비스 워커 등록 및 푸시 알림 설정

(function() {
  'use strict';
  
  console.log('[App] Initializing push notification system...');
  
  // 서비스 워커 등록 및 푸시 알림 설정
  if ('serviceWorker' in navigator) {
    // 서비스 워커 등록
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        console.log('[App] Service Worker registered:', registration.scope);
        
        // 푸시 알림 권한 요청
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().then(function(permission) {
            console.log('[App] Notification permission:', permission);
          });
        }
        
        // 푸시 구독 설정
        setupPushSubscription(registration);
      })
      .catch(function(error) {
        console.error('[App] Service Worker registration failed:', error);
      });
    
    // 서비스 워커에서 온 메시지 수신
    navigator.serviceWorker.addEventListener('message', function(event) {
      console.log('[App] Message from SW:', event.data);
      
      if (event.data && event.data.type === 'VIDEO_CALL_ANSWER') {
        // 영상통화 수락 처리
        handleVideoCallAnswer(event.data.callId, event.data.from);
      }
      
      if (event.data && event.data.type === 'VIDEO_CALL_DECLINE') {
        // 영상통화 거절 처리
        handleVideoCallDecline(event.data.callId, event.data.from);
      }
      
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        // 알림 클릭 처리
        handleNotificationClick(event.data.notificationData);
      }
    });
  }
  
  // 푸시 구독 설정
  async function setupPushSubscription(registration) {
    try {
      // 기존 구독 확인
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // 새 구독 생성
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array('BKeqJrPPFWLRpKqQ9gAwfzXA3zJOz7oFqvTiVIhMcc7B0LoCekcSttYcBo5IlG6IceA4m8UEIxusNTKQIPztCHY') // Firebase Cloud Messaging 웹 푸시 공개 키
        });
        console.log('[App] Push subscription created:', subscription);
        
        // 서버에 구독 정보 전송
        await sendSubscriptionToServer(subscription);
      } else {
        console.log('[App] Push subscription exists:', subscription);
        
        // 구독이 만료되었는지 확인 (optional)
        if (isSubscriptionExpired(subscription)) {
          console.log('[App] Subscription expired, renewing...');
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array('BKeqJrPPFWLRpKqQ9gAwfzXA3zJOz7oFqvTiVIhMcc7B0LoCekcSttYcBo5IlG6IceA4m8UEIxusNTKQIPztCHY')
          });
          await sendSubscriptionToServer(subscription);
        }
      }
    } catch (error) {
      console.error('[App] Push subscription failed:', error);
    }
  }
  
  // 서버에 구독 정보 전송
  async function sendSubscriptionToServer(subscription) {
    try {
      const userId = getCurrentUserId();
      
      // TODO: 실제 서버 엔드포인트로 변경
      const response = await fetch('/api/save-push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription,
          userId: userId
        })
      });
      
      if (response.ok) {
        console.log('[App] Subscription saved to server');
      } else {
        console.error('[App] Failed to save subscription:', response.status);
      }
    } catch (error) {
      console.error('[App] Error saving subscription:', error);
    }
  }
  
  // 영상통화 수락 핸들러
  function handleVideoCallAnswer(callId, from) {
    console.log('[App] Video call answered:', callId, from);
    
    // WebRTC 통화 연결 로직 호출
    if (typeof window.answerVideoCall === 'function') {
      window.answerVideoCall(callId, from);
    } else {
      // 전역 함수가 없으면 커스텀 이벤트 발생
      window.dispatchEvent(new CustomEvent('video-call-answer', {
        detail: { callId: callId, from: from }
      }));
    }
  }
  
  // 영상통화 거절 핸들러
  function handleVideoCallDecline(callId, from) {
    console.log('[App] Video call declined:', callId, from);
    
    // WebRTC 통화 거절 로직 호출
    if (typeof window.declineVideoCall === 'function') {
      window.declineVideoCall(callId, from);
    } else {
      // 전역 함수가 없으면 커스텀 이벤트 발생
      window.dispatchEvent(new CustomEvent('video-call-decline', {
        detail: { callId: callId, from: from }
      }));
    }
  }
  
  // 알림 클릭 핸들러
  function handleNotificationClick(notificationData) {
    console.log('[App] Notification clicked:', notificationData);
    if (notificationData && notificationData.url) {
      window.location.href = notificationData.url;
    }
  }
  
  // 현재 사용자 ID 가져오기 (예시)
  function getCurrentUserId() {
    // TODO: 실제 사용자 ID 반환 로직 구현
    // 예: localStorage, sessionStorage, 또는 전역 변수에서 가져오기
    return window.currentUserId || 'user_' + Date.now();
  }
  
  // 구독 만료 확인 (optional)
  function isSubscriptionExpired(subscription) {
    if (!subscription || !subscription.expirationTime) {
      return false;
    }
    const now = Date.now();
    // 만료 1 일 전에 갱신
    return subscription.expirationTime < (now + 24 * 60 * 60 * 1000);
  }
  
  // VAPID 키 변환 유틸리티
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  
  // 푸시 구독 갱신 함수 (필요시 호출)
  window.refreshPushSubscription = async function() {
    const registration = await navigator.serviceWorker.ready;
    await setupPushSubscription(registration);
  };
  
  console.log('[App] Push notification system initialized');
})();
