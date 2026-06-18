/* ============================================================
   CamOS Browser Proxy — Cloudflare Worker
   ------------------------------------------------------------
   Deploy this to Cloudflare Workers (free tier is plenty).
   It fetches any URL server-side, strips CORS/frame headers,
   and rewrites HTML/CSS so that links, images, scripts, fonts,
   and runtime fetch/XHR requests all route back through itself.
   Result: pages render AND stay interactive inside CamOS.
   ============================================================ */

const PROXY_PARAM = "u";

export default {
  async fetch(request) {
    const reqUrl = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const target = reqUrl.searchParams.get(PROXY_PARAM);
    if (!target) {
      return new Response(
        "CamOS Proxy is running. Usage: ?" + PROXY_PARAM + "=https://example.com",
        { status: 200, headers: { "content-type": "text/plain", ...corsHeaders() } }
      );
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch (e) {
      return new Response("Invalid URL", { status: 400, headers: corsHeaders() });
    }

    // Build upstream request
    const upstreamHeaders = new Headers();
    upstreamHeaders.set("User-Agent", request.headers.get("User-Agent") || "Mozilla/5.0 (CamOS)");
    upstreamHeaders.set("Accept", request.headers.get("Accept") || "*/*");
    const al = request.headers.get("Accept-Language");
    if (al) upstreamHeaders.set("Accept-Language", al);
    // Pretend the request originates from the target site itself
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
        body,
        redirect: "follow",
      });
    } catch (e) {
      return new Response("Upstream fetch failed: " + e.message, { status: 502, headers: corsHeaders() });
    }

    const contentType = (upstream.headers.get("content-type") || "").toLowerCase();
    const respHeaders = corsHeaders();

    // Copy a safe subset of headers
    const ct = upstream.headers.get("content-type");
    if (ct) respHeaders.set("content-type", ct);

    const base = reqUrl.origin + reqUrl.pathname;

    // Rewrite HTML
    if (contentType.includes("text/html")) {
      let html = await upstream.text();
      html = rewriteHtml(html, targetUrl, base);
      return new Response(html, { status: upstream.status, headers: respHeaders });
    }

    // Rewrite CSS (url(...) and @import)
    if (contentType.includes("text/css")) {
      let css = await upstream.text();
      css = rewriteCss(css, targetUrl, base);
      return new Response(css, { status: upstream.status, headers: respHeaders });
    }

    // Everything else (images, fonts, scripts, json, binaries) — pass through
    const buf = await upstream.arrayBuffer();
    return new Response(buf, { status: upstream.status, headers: respHeaders });
  },
};

function corsHeaders() {
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
  h.set("Access-Control-Allow-Headers", "*");
  // Strip framing protection so it loads in the CamOS iframe
  h.delete("X-Frame-Options");
  h.delete("Content-Security-Policy");
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
  // url(...)
  css = css.replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi, function (m, u) {
    if (u.startsWith("data:") || u.startsWith("#")) return m;
    return "url(" + proxUrl(base, absolutize(u, targetUrl)) + ")";
  });
  // @import "..."
  css = css.replace(/@import\s+['"]([^'"]+)['"]/gi, function (m, u) {
    return '@import "' + proxUrl(base, absolutize(u, targetUrl)) + '"';
  });
  return css;
}

function rewriteHtml(html, targetUrl, base) {
  // Strip existing base tags
  html = html.replace(/<base\b[^>]*>/gi, "");

  // Rewrite attributes that hold URLs: href, src, srcset, action, poster
  html = html.replace(/\b(href|src|action|poster)\s*=\s*"([^"]*)"/gi, function (m, attr, val) {
    if (!val || val.startsWith("data:") || val.startsWith("javascript:") || val.startsWith("mailto:") || val.startsWith("#") || val.startsWith("blob:")) return m;
    return attr + '="' + proxUrl(base, absolutize(val, targetUrl)) + '"';
  });
  html = html.replace(/\b(href|src|action|poster)\s*=\s*'([^']*)'/gi, function (m, attr, val) {
    if (!val || val.startsWith("data:") || val.startsWith("javascript:") || val.startsWith("mailto:") || val.startsWith("#") || val.startsWith("blob:")) return m;
    return attr + "='" + proxUrl(base, absolutize(val, targetUrl)) + "'";
  });

  // Rewrite srcset (comma-separated "url size, url size")
  html = html.replace(/\bsrcset\s*=\s*"([^"]*)"/gi, function (m, val) {
    const parts = val.split(",").map(function (p) {
      const seg = p.trim().split(/\s+/);
      if (seg[0]) seg[0] = proxUrl(base, absolutize(seg[0], targetUrl));
      return seg.join(" ");
    });
    return 'srcset="' + parts.join(", ") + '"';
  });

  // Inline <style> blocks
  html = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, function (m, attrs, css) {
    return "<style" + attrs + ">" + rewriteCss(css, targetUrl, base) + "</style>";
  });

  // Runtime hook: rewrite fetch/XHR/links created by JS after load
  const hook = `<script>(function(){
    var PROXY=${JSON.stringify(base)};
    var TARGET=${JSON.stringify(targetUrl.toString())};
    function abs(u){try{return new URL(u,TARGET).toString();}catch(e){return u;}}
    function px(u){if(!u||u.indexOf(PROXY)===0||u.indexOf("data:")===0||u.indexOf("blob:")===0||u.indexOf("javascript:")===0)return u;return PROXY+"?u="+encodeURIComponent(abs(u));}
    var of=window.fetch;
    window.fetch=function(input,init){
      try{
        if(typeof input==="string")input=px(input);
        else if(input&&input.url)input=new Request(px(input.url),input);
      }catch(e){}
      return of.call(this,input,init);
    };
    var ox=window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open=function(m,u){
      try{u=px(u);}catch(e){}
      return ox.apply(this,[m,u].concat([].slice.call(arguments,2)));
    };
    document.addEventListener("click",function(e){
      var a=e.target.closest&&e.target.closest("a[href]");
      if(!a)return;
      var h=a.getAttribute("href");
      if(!h||h.charAt(0)==="#"||h.indexOf("javascript:")===0)return;
      if(a.hasAttribute("download")){
        e.preventDefault();
        parent.postMessage({type:"CAMOS_DL",url:abs(h),name:a.getAttribute("download")||""},"*");
        return;
      }
    },true);
    document.addEventListener("DOMContentLoaded",function(){
      parent.postMessage({type:"CAMOS_TITLE",title:document.title},"*");
    });
  })();</script>`;

  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, function (m) { return m + hook; });
  } else {
    html = hook + html;
  }

  return html;
}
