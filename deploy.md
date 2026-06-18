# CamOS Proxy — Cloudflare Worker

This is the **real fix** for the browser. It runs server-side, so it can
rewrite every URL (links, images, fonts, scripts, runtime fetch/XHR) and
strip the CORS / X-Frame-Options headers that block public proxies.

## Deploy in ~3 minutes

### Option A — Dashboard (no install)
1. Go to https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Create Worker**.
2. Name it `camos-proxy`, click **Deploy**.
3. Click **Edit code**, delete the sample, paste the entire contents of `worker.js`, click **Deploy**.
4. Copy your worker URL, e.g. `https://camos-proxy.YOURNAME.workers.dev`.

### Option B — Wrangler CLI
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

That's it. The browser will route everything through your Worker first and
fall back to the public proxies only if it's not set or is unreachable.

## Test
Visit `https://camos-proxy.YOURNAME.workers.dev/?u=https://example.com` —
you should see Example.com's HTML. If you do, CamOS browsing will work.

## Notes
- Free tier = 100,000 requests/day. Plenty for personal use.
- The Worker injects a runtime hook that re-routes JS-initiated requests,
  which is why GitHub/OSM-class sites work through it but not through the
  public proxies.
