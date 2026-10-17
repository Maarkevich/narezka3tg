/**
 * Project: Narezka3TG — Telegram Mini App
 * File: sw.js
 * Version: 1.0.4
 */

const CACHE_NAME = 'narezka3tg-v1.0.4';

const urlsToCache = [
    './',
    './index.html?v=1.0.4',
    './styles.css?v=1.0.4',
    './app.js?v=1.0.4',
    './manifest.json?v=1.0.4',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(names => Promise.all(
            names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});