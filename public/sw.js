self.addEventListener("install", e => e.waitUntil(caches.open("r1").then(c => c.addAll(["/", "/icon.svg"]))));
self.addEventListener("fetch", e => { if (e.request.url.includes("/api/")) return; e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); });
