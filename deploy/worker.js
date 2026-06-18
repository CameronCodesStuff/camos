/* ============================================================
   CamOS Browser Proxy - Cloudflare Worker (Service Worker format)
   ------------------------------------------------------------
   This format uses addEventListener and works in the Cloudflare
   dashboard editor without needing module mode. Paste the whole
   file into a new Worker and deploy.
   ============================================================ */

const PROXY_PARAM = "u";

addEventListener("fetch", function (event) {
  event.respondWith(handle(event.request));
});

async function handle(request) {
  const reqUrl = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  const target = reqUrl.searchParams.get(PROXY_PARAM);
  if (!target) {
    return new Response(
      "CamOS Proxy is running. Usage: ?" + PROXY_PARAM + "=https://example.com",
      { status: 200, headers: mergeHeaders({ "content-type": "text/plain" }) }
    );
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch (e) {
    return new Response("Invalid URL", { status: 400, headers: corsHeaders() });
  }

  const upstreamHeaders = new Headers();
  upstreamHeaders.set("User-Agent", request.headers.get("User-Agent") || "Mozilla/5.0 (CamOS)");
  upstreamHeaders.set("Accept", request.headers.get("Accept") || "*/*");
  const al = request.headers.get("Accept-Language");
  if (al) upstreamHeaders.set("Accept-Language", al);
  upstreamHeaders.set("Referer", targetUrl.origin + "/");

  let body = null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.arrayBuffer();
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: upstreamHeaders,
      body: body,
      redirect: "follow",
    });
  } catch (e) {
    return new Response("Upstream fetch failed: " + e.message, { status: 502, headers: corsHeaders() });
  }

  const contentType = (upstream.headers.get("content-type") || "").toLowerCase();
  const respHeaders = corsHeaders();
  const ct = upstream.headers.get("content-type");
  if (ct) respHeaders.set("content-type", ct);

  const base = reqUrl.origin + reqUrl.pathname;

  if (contentType.indexOf("text/html") !== -1) {
    let html = await upstream.text();
    html = rewriteHtml(html, targetUrl, base);
    return new Response(html, { status: upstream.status, headers: respHeaders });
  }

  if (contentType.indexOf("text/css") !== -1) {
    let css = await upstream.text();
    css = rewriteCss(css, targetUrl, base);
    return new Response(css, { status: upstream.status, headers: respHeaders });
  }

  const buf = await upstream.arrayBuffer();
  return new Response(buf, { status: upstream.status, headers: respHeaders });
}

function corsHeaders() {
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
  h.set("Access-Control-Allow-Headers", "*");
  return h;
}

function mergeHeaders(obj) {
  const h = corsHeaders();
  for (const k in obj) h.set(k, obj[k]);
  return h;
}

function proxUrl(base, absUrl) {
  return base + "?" + PROXY_PARAM + "=" + encodeURIComponent(absUrl);
}

function absolutize(url, targetUrl) {
  try {
    return new URL(url, targetUrl).toString();
  } catch (e) {
    return url;
  }
}

function rewriteCss(css, targetUrl, base) {
  css = css.replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi, function (m, u) {
    if (u.indexOf("data:") === 0 || u.charAt(0) === "#") return m;
    return "url(" + proxUrl(base, absolutize(u, targetUrl)) + ")";
  });
  css = css.replace(/@import\s+['"]([^'"]+)['"]/gi, function (m, u) {
    return '@import "' + proxUrl(base, absolutize(u, targetUrl)) + '"';
  });
  return css;
}

function rewriteHtml(html, targetUrl, base) {
  html = html.replace(/<base\b[^>]*>/gi, "");

  html = html.replace(/\b(href|src|action|poster)\s*=\s*"([^"]*)"/gi, function (m, attr, val) {
    if (!val || val.indexOf("data:") === 0 || val.indexOf("javascript:") === 0 || val.indexOf("mailto:") === 0 || val.charAt(0) === "#" || val.indexOf("blob:") === 0) return m;
    return attr + '="' + proxUrl(base, absolutize(val, targetUrl)) + '"';
  });
  html = html.replace(/\b(href|src|action|poster)\s*=\s*'([^']*)'/gi, function (m, attr, val) {
    if (!val || val.indexOf("data:") === 0 || val.indexOf("javascript:") === 0 || val.indexOf("mailto:") === 0 || val.charAt(0) === "#" || val.indexOf("blob:") === 0) return m;
    return attr + "='" + proxUrl(base, absolutize(val, targetUrl)) + "'";
  });

  html = html.replace(/\bsrcset\s*=\s*"([^"]*)"/gi, function (m, val) {
    const parts = val.split(",").map(function (p) {
      const seg = p.trim().split(/\s+/);
      if (seg[0]) seg[0] = proxUrl(base, absolutize(seg[0], targetUrl));
      return seg.join(" ");
    });
    return 'srcset="' + parts.join(", ") + '"';
  });

  html = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, function (m, attrs, css) {
    return "<style" + attrs + ">" + rewriteCss(css, targetUrl, base) + "</style>";
  });

  const hook = "<script>(function(){" +
    "var PROXY=" + JSON.stringify(base) + ";" +
    "var TARGET=" + JSON.stringify(targetUrl.toString()) + ";" +
    "function abs(u){try{return new URL(u,TARGET).toString();}catch(e){return u;}}" +
    "function px(u){if(!u||u.indexOf(PROXY)===0||u.indexOf('data:')===0||u.indexOf('blob:')===0||u.indexOf('javascript:')===0)return u;return PROXY+'?u='+encodeURIComponent(abs(u));}" +
    "var of=window.fetch;" +
    "window.fetch=function(input,init){try{if(typeof input==='string')input=px(input);else if(input&&input.url)input=new Request(px(input.url),input);}catch(e){}return of.call(this,input,init);};" +
    "var ox=window.XMLHttpRequest.prototype.open;" +
    "window.XMLHttpRequest.prototype.open=function(m,u){try{u=px(u);}catch(e){}return ox.apply(this,[m,u].concat([].slice.call(arguments,2)));};" +
    "document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href');if(!h||h.charAt(0)==='#'||h.indexOf('javascript:')===0)return;if(a.hasAttribute('download')){e.preventDefault();parent.postMessage({type:'CAMOS_DL',url:abs(h),name:a.getAttribute('download')||''},'*');}},true);" +
    "document.addEventListener('DOMContentLoaded',function(){parent.postMessage({type:'CAMOS_TITLE',title:document.title},'*');});" +
    "})();<\/script>";

  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, function (m) { return m + hook; });
  } else {
    html = hook + html;
  }

  return html;
}
