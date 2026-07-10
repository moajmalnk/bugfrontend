importScripts('https://www.gstatic.com/firebasejs/11.7.3/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.7.3/firebase-messaging-compat.js');

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

function toAbsoluteUrl(url) {
  if (!url) {
    return self.location.origin + '/';
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return self.location.origin + (url.charAt(0) === '/' ? url : '/' + url);
}

function resolveNotificationPayload(payload) {
  const data = payload && payload.data ? payload.data : {};
  const notification = payload && payload.notification ? payload.notification : {};

  return {
    title: data.title || notification.title || 'BugRicer',
    body: data.body || notification.body || 'You have a new update.',
    url: toAbsoluteUrl(data.click_action || data.url || '/notifications'),
    image: data.image || notification.image || '',
    icon: data.icon || toAbsoluteUrl('/notification-icon.png'),
    badge: data.badge || toAbsoluteUrl('/notification-badge.png'),
    tag: data.tag || ('bugricer-' + (data.bug_id || data.notification_id || Date.now())),
    unreadCount: Number(data.unread_count || 0),
    bugId: data.bug_id || '',
  };
}

function buildActions(data) {
  const entity = (data && (data.entity_type || data.type) || '').toLowerCase();
  const labels = {
    bug: 'View Bug',
    bug_created: 'View Bug',
    new_bug: 'View Bug',
    fix: 'View Bug',
    bug_fixed: 'View Bug',
    update: 'View Update',
    update_created: 'View Update',
    new_update: 'View Update',
    project: 'View Project',
    project_created: 'View Project',
    task: 'View Task',
    task_created: 'View Task',
    meet: 'Join Meet',
    meet_created: 'Join Meet',
    doc: 'Open Doc',
    doc_created: 'Open Doc',
    sheet: 'Open Sheet',
    sheet_created: 'Open Sheet',
    work_update: 'Open',
    work_check_in: 'View User',
    work_break: 'View User',
    overtime: 'Review OT',
    feedback: 'View Feedback',
    message: 'Open Chat',
    user: 'View User',
    user_registered: 'View User',
  };

  return [
    { action: 'view', title: labels[entity] || 'Open' },
    { action: 'dismiss', title: 'Dismiss' },
  ];
}

messaging.onBackgroundMessage(function (payload) {
  const resolved = resolveNotificationPayload(payload);
  const data = payload && payload.data ? payload.data : {};

  const options = {
    body: resolved.body,
    icon: resolved.icon,
    badge: resolved.badge,
    tag: resolved.tag,
    renotify: true,
    requireInteraction: true,
    vibrate: [120, 60, 120],
    data: {
      url: resolved.url,
      bugId: resolved.bugId,
    },
    actions: buildActions(data),
  };

  // Large image (Flipkart/Amazon style expanded notification)
  if (resolved.image) {
    options.image = resolved.image;
  }

  const badgeApi = self.registration && typeof self.registration.setAppBadge === 'function';
  if (badgeApi && resolved.unreadCount > 0) {
    self.registration.setAppBadge(resolved.unreadCount).catch(function () {});
  }

  return self.registration.showNotification(resolved.title, options);
});

function openTargetUrl(targetUrl) {
  const absoluteUrl = toAbsoluteUrl(targetUrl);

  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
    for (let i = 0; i < windowClients.length; i += 1) {
      const client = windowClients[i];
      // Reuse an existing BugRicer tab/window when possible
      if (client.url && client.url.indexOf(self.location.origin) === 0 && 'focus' in client) {
        if ('navigate' in client) {
          return client.navigate(absoluteUrl).then(function (navigated) {
            return (navigated || client).focus();
          });
        }
        return client.focus().then(function () {
          client.postMessage({ type: 'BUGRICER_NOTIFICATION_NAV', url: absoluteUrl });
          return client;
        });
      }
    }

    if (clients.openWindow) {
      return clients.openWindow(absoluteUrl);
    }
    return undefined;
  });
}

self.addEventListener('notificationclick', function (event) {
  const action = event.action || 'view';
  const notificationData = (event.notification && event.notification.data) || {};
  const targetUrl = notificationData.url || '/notifications';

  event.notification.close();

  if (action === 'dismiss') {
    return;
  }

  // Default tap or "View" / "View Bug"
  event.waitUntil(openTargetUrl(targetUrl));
});

self.addEventListener('notificationclose', function () {
  // no-op — reserved for analytics later
});
