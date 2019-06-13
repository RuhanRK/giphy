// SW version
const VERSION = "1.0";

// Static cache
const appAssets = [
  "index.html",
  "main.js",
  "images/logo.png",
  "images/sync.png",
  "images/flame.png",
  "vendor/bootstrap.min.css",
  "vendor/jquery.min.js"
];

// SW Install
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(`static-${VERSION}`).then(cache => cache.addAll(appAssets))
  );
});

// SW Activate
self.addEventListener("activate", e => {
  // clean static cache
  let cleaned = caches.keys().then(keys => {
    keys.forEach(key => {
      if (key !== `static-${VERSION}` && key.match("static-")) {
        return caches.delete(key);
      }
    });
  });
  e.waitUntil(cleaned);
});

// Static cache startegy - Cache with Network Fallback
const staticCache = (req, cacheName = `static-${VERSION}`) => {
  return caches.match(req).then(cachedRes => {
    // Retun cached response if found
    if (cachedRes) return cachedRes;

    // Fall back to network
    return fetch(req).then(networkRes => {
      // Update cache with new response
      caches.open(cacheName).then(cache => cache.put(req, networkRes));

      // Return Clone of Network resonse
      return networkRes.clone();
    });
  });
};

// Network with Cache Fallback
const fallbackCache = req => {
  // Try Network
  return fetch(req)
    .then(networkRes => {
      // check res is OK, else go to cache
      if (!networkRes.ok) throw "Fetch Error";

      // update cache
      caches
        .open(`static-${VERSION}`)
        .then(cache => cache.put(req, networkRes));

      // Return clone of Network Response
      return networkRes.clone();
    })
    .catch(err => caches.match(req));
};

// Clean old Giphy from 'giphy' cache
const cleanGiphyCache = giphys => {
  caches.open("giphy").then(cache => {
    // Get all cache entries
    caches.keys().then(keys => {
      // loop entries
      keys.forEach(key => {
        // If entry is NOT part of current giphy
        if (!giphys.includes(key.url)) cache.delete(key);
      });
    });
  });
};

// SW Fetch
self.addEventListener("fetch", e => {
  // App shell
  if (e.request.url.match(location.origin)) {
    e.respondWith(staticCache(e.request));
  }
  // Giphy API
  else if (e.request.url.match("api.giphy.com/v1/gifs/trending")) {
    e.respondWith(fallbackCache(e.request));
  } else if (e.request.url.match("giphy.com/media")) {
    e.respondWith(staticCache(e.request, "giphy"));
  }
});

// Listen for message for client
self.addEventListener("message", e => {
  if (e.data.action === "cleanGiphyCache") cleanGiphyCache(e.data.giphys);
});
