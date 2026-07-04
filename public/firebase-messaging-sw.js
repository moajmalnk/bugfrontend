importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCO46rN862Idvm5HHOvRBTey54SrZqjM-s",
  authDomain: "bugricer.firebaseapp.com",
  projectId: "bugricer",
  storageBucket: "bugricer.firebasestorage.app",
  messagingSenderId: "742715767753",
  appId: "1:742715767753:web:401e4d96371031323ac618",
  measurementId: "G-5F87RVVBXW"
});

const messaging = firebase.messaging();

function resolveNotificationPayload(payload) {
  const data = payload && payload.data ? payload.data : {};
  const notification = payload && payload.notification ? payload.notification : {};

  return {
    title: data.title || notification.title || 'BugRicer',
    body: data.body || notification.body || 'You have a new update.',
    url: data.click_action || data.url || '/',
    unreadCount: Number(data.unread_count || 0),
  };
}

messaging.onBackgroundMessage(function(payload) {
  const resolved = resolveNotificationPayload(payload);
  const data = payload && payload.data ? payload.data : {};
  const options = {
    body: resolved.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || ('bugricer-' + (data.bug_id || data.notification_id || 'update')),
    renotify: true,
    data: { url: resolved.url },
  };

  const badgeApi = self.registration && typeof self.registration.setAppBadge === 'function';
  if (badgeApi && resolved.unreadCount > 0) {
    self.registration.setAppBadge(resolved.unreadCount).catch(() => {});
  }

  return self.registration.showNotification(resolved.title, options);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i += 1) {
        const client = windowClients[i];
        if ('focus' in client) {
          if ('navigate' in client) {
            return client.navigate(targetUrl).then(() => client.focus());
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});