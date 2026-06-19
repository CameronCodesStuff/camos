# CamOS Proxy - Cloudflare Worker

The real fix for browsing. Runs server-side, so it rewrites every URL
(links, images, fonts, scripts, runtime fetch/XHR) and strips CORS /
X-Frame-Options headers that block public proxies.

## About the "Unexpected token '*'" error
That happens when the Cloudflare editor parses the Worker in the OLD
"Service Worker" mode, which doesn't allow `export default`. This file
is written in Service Worker format (`addEventListener("fetch", ...)`),
so it works in the dashboard editor WITHOUT needing module mode. Just
paste and deploy.

## Deploy in ~3 minutes

### Option A - Dashboard (no install)
1. Go to https://dash.cloudflare.com -> Workers & Pages -> Create -> Create Worker.
2. Name it `camos-proxy`, click Deploy.
3. Click Edit code, delete the sample, paste ALL of `worker.js`, click Deploy.
4. Copy your URL, e.g. `https://camos-proxy.YOURNAME.workers.dev`.

### Option B - Wrangler CLI (uses module format)
If you prefer the CLI, it supports modern module syntax. Use Option A's
file as-is (it works either way), or run:
```bash
npm install -g wrangler
wrangler login
cd worker
wrangler deploy
```

## Connect it to CamOS
Open `script.js` and set the URL at the very top:
```js
var CAMOS_PROXY = "https://camos-proxy.YOURNAME.workers.dev";
```
CamOS routes everything through your Worker first, falling back to public
proxies only if it's blank or unreachable.

## Test
Visit `https://camos-proxy.YOURNAME.workers.dev/?u=https://example.com`
-> you should see Example.com's HTML. If you do, browsing will work.

## Notes
- Free tier = 100,000 requests/day. Plenty for personal use.
- The injected runtime hook re-routes JS-initiated requests, which is why
  heavy sites (GitHub, OSM) work through this but not through public proxies.

## IMPORTANT: Redeploy after updates
If you already deployed an earlier version, paste the NEW `worker.js` over
your existing Worker and redeploy. This version fixes:
- JS/binary files are passed through untouched (no more "Unexpected
  identifier 'Proxy'" syntax errors from corrupted scripts).
- CORS now echoes your origin instead of "*", so credentialed requests work.
- The history API is neutralized inside the frame (no more replaceState
  SecurityError spam).
- Pages now load via the iframe's real src (Worker origin) instead of
  srcdoc, so module scripts and relative URLs resolve correctly.

## Reality check on heavy sites
Even with the Worker, the most complex single-page apps (the GitHub web app,
Google properties) may not be 100% interactive - they ship megabytes of
module-graph JS that assumes its own origin and CDN. Content-heavy and
"normal" sites (Wikipedia, news, blogs, docs, forums, most game portals)
work well: they render, you can click links, submit searches, and navigate.
