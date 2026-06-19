/* ============================================================
   CamOS Browser Proxy - Cloudflare Worker (Service Worker format)
   ------------------------------------------------------------
   Fetches any URL server-side, strips CORS/frame headers, and
   rewrites ONLY html/css so links, images, fonts and runtime
   fetch/XHR route back through the proxy. JS and binaries are
   passed through untouched.
   ============================================================ */

const PROXY_PARAM = "u";

addEventListener("fetch", function (event) {
  event.respondWith(handle(event.request));
});

async function handle(request) {
  const reqUrl = new URL(request.url);
  const origin = request.headers.get("Origin") || "*";

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  const target = reqUrl.searchParams.get(PROXY_PARAM);
  if (!target) {
    return new Response(
      "CamOS Proxy is running. Usage: ?" + PROXY_PARAM + "=https://example.com",
      { status: 200, headers: withCt(corsHeaders(origin), "text/plain") }
    );
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch (e) {
    return new Response("Invalid URL: " + target, { status: 400, headers: corsHeaders(origin) });
  }

  // Build upstream request
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
    return new Response("Upstream fetch failed: " + e.message, { status: 502, headers: corsHeaders(origin) });
  }

  const contentType = (upstream.headers.get("content-type") || "").toLowerCase();
  const respHeaders = corsHeaders(origin);

  // Preserve original content-type EXACTLY (critical: JS must stay JS)
  const ct = upstream.headers.get("content-type");
  if (ct) respHeaders.set("content-type", ct);

  // The proxy's own absolute base, e.g. https://camos-proxy.you.workers.dev/
  const base = reqUrl.origin + reqUrl.pathname;

  // Only rewrite HTML and CSS. Everything else (JS, JSON, fonts, images,
  // wasm, binaries) is passed through byte-for-byte so it can't be corrupted.
  const isHtml = contentType.indexOf("text/html") !== -1;
  const isCss = contentType.indexOf("text/css") !== -1;

  if (isHtml) {
    let html = await upstream.text();
    html = rewriteHtml(html, targetUrl, base);
    return new Response(html, { status: upstream.status, headers: respHeaders });
  }
  if (isCss) {
    let css = await upstream.text();
    css = rewriteCss(css, targetUrl, base);
    return new Response(css, { status: upstream.status, headers: respHeaders });
  }

  const buf = await upstream.arrayBuffer();
  return new Response(buf, { status: upstream.status, headers: respHeaders });
}

function corsHeaders(origin) {
  const h = new Headers();
  // Echo the requesting origin (not "*") so credentialed requests are allowed.
  h.set("Access-Control-Allow-Origin", origin || "*");
  h.set("Access-Control-Allow-Credentials", "true");
  h.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH");
  h.set("Access-Control-Allow-Headers", "*");
  h.set("Vary", "Origin");
  return h;
}

function withCt(h, ct) {
  h.set("content-type", ct);
  return h;
}

function proxUrl(base, absUrl) {
  return base + "?" + PROXY_PARAM + "=" + encodeURIComponent(absUrl);
}

function absolutize(url, targetUrl) {
  try {
    return new URL(url, targetUrl).toString();
  } catch (e) {
    return null;
  }
}

function rewriteCss(css, targetUrl, base) {
  css = css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, function (m, q, u) {
    if (!u || u.indexOf("data:") === 0 || u.charAt(0) === "#") return m;
    var abs = absolutize(u, targetUrl);
    if (!abs) return m;
    return "url(" + proxUrl(base, abs) + ")";
  });
  css = css.replace(/@import\s+(['"])([^'"]+)\1/gi, function (m, q, u) {
    var abs = absolutize(u, targetUrl);
    if (!abs) return m;
    return '@import "' + proxUrl(base, abs) + '"';
  });
  return css;
}

function rewriteHtml(html, targetUrl, base) {
  // Drop existing <base> tags (we set our own)
  html = html.replace(/<base\b[^>]*>/gi, "");

  // Rewrite URL-bearing attributes
  html = html.replace(/\b(href|src|action|poster)\s*=\s*"([^"]*)"/gi, function (m, attr, val) {
    if (skipVal(val)) return m;
    var abs = absolutize(val, targetUrl);
    if (!abs) return m;
    return attr + '="' + proxUrl(base, abs) + '"';
  });
  html = html.replace(/\b(href|src|action|poster)\s*=\s*'([^']*)'/gi, function (m, attr, val) {
    if (skipVal(val)) return m;
    var abs = absolutize(val, targetUrl);
    if (!abs) return m;
    return attr + "='" + proxUrl(base, abs) + "'";
  });

  // srcset (comma separated)
  html = html.replace(/\bsrcset\s*=\s*"([^"]*)"/gi, function (m, val) {
    var parts = val.split(",").map(function (p) {
      var seg = p.trim().split(/\s+/);
      if (seg[0] && !skipVal(seg[0])) {
        var abs = absolutize(seg[0], targetUrl);
        if (abs) seg[0] = proxUrl(base, abs);
      }
      return seg.join(" ");
    });
    return 'srcset="' + parts.join(", ") + '"';
  });

  // Inline <style> blocks
  html = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, function (m, attrs, css) {
    return "<style" + attrs + ">" + rewriteCss(css, targetUrl, base) + "</style>";
  });

  // Runtime hook (runs first, before site scripts)
  var hook =
    "<script>(function(){" +
    "var PROXY=" + JSON.stringify(base) + ";" +
    "var TARGET=" + JSON.stringify(targetUrl.toString()) + ";" +
    "function abs(u){try{return new URL(u,TARGET).toString();}catch(e){return null;}}" +
    "function px(u){try{" +
    "if(!u)return u;" +
    "if(typeof u!=='string')u=String(u);" +
    "if(u.indexOf(PROXY)===0)return u;" +
    "if(u.indexOf('data:')===0||u.indexOf('blob:')===0||u.indexOf('javascript:')===0||u.charAt(0)==='#')return u;" +
    "var a=abs(u);if(!a)return u;" +
    "return PROXY+'?u='+encodeURIComponent(a);" +
    "}catch(e){return u;}}" +
    // wrap fetch
    "var of=window.fetch;" +
    "window.fetch=function(input,init){try{" +
    "if(typeof input==='string')input=px(input);" +
    "else if(input&&input.url){input=new Request(px(input.url),input);}" +
    "}catch(e){}return of.call(this,input,init);};" +
    // wrap XHR
    "var ox=window.XMLHttpRequest.prototype.open;" +
    "window.XMLHttpRequest.prototype.open=function(m,u){var args=[].slice.call(arguments);try{args[1]=px(u);}catch(e){}return ox.apply(this,args);};" +
    // neutralize history API (srcdoc can't use it - prevents SecurityError spam)
    // Wrap history API so cross-origin errors are swallowed but the SPA's
    // router still gets a working call (prevents YouTube-style blank pages).
    "try{var _rs=history.replaceState.bind(history);history.replaceState=function(s,t,u){try{return _rs(s,t,u);}catch(e){return;}};var _ps=history.pushState.bind(history);history.pushState=function(s,t,u){try{return _ps(s,t,u);}catch(e){return;}};}catch(e){}" +
    // link clicks -> tell parent to navigate; downloads -> tell parent to download
    "document.addEventListener('click',function(e){" +
    "var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;" +
    "var h=a.getAttribute('href');if(!h||h.charAt(0)==='#'||h.indexOf('javascript:')===0)return;" +
    "var u=abs(h);if(!u)return;" +
    "if(a.hasAttribute('download')){e.preventDefault();parent.postMessage({type:'CAMOS_DL',url:u,name:a.getAttribute('download')||''},'*');return;}" +
    "e.preventDefault();parent.postMessage({type:'CAMOS_NAV',url:u},'*');" +
    "},true);" +
    // GET forms -> navigate parent
    "document.addEventListener('submit',function(e){var f=e.target;if(!f)return;" +
    "var method=(f.getAttribute('method')||'get').toLowerCase();" +
    "var action=abs(f.getAttribute('action')||TARGET);if(!action)return;" +
    "if(method==='get'){e.preventDefault();try{var fd=new FormData(f);var qs=new URLSearchParams(fd).toString();var url=action.split('#')[0];url+=(url.indexOf('?')>-1?'&':'?')+qs;parent.postMessage({type:'CAMOS_NAV',url:url},'*');}catch(x){}}" +
    "},true);" +
    "document.addEventListener('DOMContentLoaded',function(){try{parent.postMessage({type:'CAMOS_TITLE',title:document.title},'*');}catch(e){}});" +
    "})();<\/script>";

  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, function (m) { return m + hook; });
  } else if (/<html[^>]*>/i.test(html)) {
    html = html.replace(/<html([^>]*)>/i, function (m) { return m + "<head>" + hook + "</head>"; });
  } else {
    html = hook + html;
  }

  return html;
}

function skipVal(val) {
  if (!val) return true;
  return (
    val.indexOf("data:") === 0 ||
    val.indexOf("javascript:") === 0 ||
    val.indexOf("mailto:") === 0 ||
    val.indexOf("tel:") === 0 ||
    val.indexOf("blob:") === 0 ||
    val.charAt(0) === "#"
  );
}
