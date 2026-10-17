/**
 * Project: Narezka3TG — Telegram Mini App
 * File: sw.js
 * Version: 1.1.0
 *
 * Стратегия кэширования выбрана так, чтобы Telegram WebView не залипал
 * на старой версии: HTML/JS/CSS всегда берутся из сети (network-first),
 * а кэш используется только как офлайн-резерв.
 */

const APP_VERSION = '1.1.0';
const CACHE_NAME = `narezka3tg-v${APP_VERSION}`;

const PRECACHE = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './version.json',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
    if (event.data === 'GET_VERSION' && event.source) {
        event.source.postMessage({ type: 'VERSION', version: APP_VERSION });
    }
});

function isAppShell(request) {
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return false;
    return /\.(html|js|css|json)$/.test(url.pathname) || url.pathname.endsWith('/');
}

self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;

    // Код приложения — сначала сеть, чтобы обновления доходили сразу.
    if (isAppShell(request)) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request).then(hit => hit || caches.match('./index.html')))
        );
        return;
    }

    // Статика (иконки) — сначала кэш.
    event.respondWith(
        caches.match(request).then(hit => hit || fetch(request).then(response => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
            return response;
        }))
    );
});
