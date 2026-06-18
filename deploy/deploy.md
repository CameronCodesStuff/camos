# CamOS Proxy - Cloudflare Worker

## Deploy in ~3 minutes

### Option A - Use the already added proxy.
Go straight to https://cameroncodesstuff.github.io/camos/ with everyhing ready!

### Option B - Dashboard (no install)
1. Go to https://dash.cloudflare.com -> Workers & Pages -> Create -> Create Worker.
2. Name it `camos-proxy`, click Deploy.
3. Click Edit code, delete the sample, paste ALL of `worker.js`, click Deploy.
4. Copy your URL, e.g. `https://camos-proxy.YOURNAME.workers.dev`.

### Option C - Wrangler CLI (uses module format)
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
