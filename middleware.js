// Vercel Routing Middleware: refuses page loads from IP addresses an admin has blocked
// (public.blocked_ips, managed from the admin moderation panel).
// Fails open: if Supabase is slow or unreachable, the page is served normally.

export const config = {
  // pages only: skip static files (anything with a dot), assets and the API
  matcher: ['/((?!api/|assets/|.*\\..*).*)'],
};

const TTL_MS = 60_000;
const cache = new Map(); // ip -> { blocked, at }

const BLOCKED_PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>FRIEND+ Sport Phuket</title></head>
<body style="font-family:system-ui,sans-serif;background:#FBF6EC;color:#0B2E2B;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px;text-align:center">
<div><h1>Accès bloqué · Access blocked</h1>
<p>Cet accès a été bloqué pour non-respect des règles de FRIEND+ Sport Phuket.</p>
<p>This access has been blocked for breaking the FRIEND+ Sport Phuket rules.</p></div></body></html>`;

async function isBlocked(ip) {
  const hit = cache.get(ip);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.blocked;
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 800);
  try {
    const res = await fetch(`${url}/rest/v1/rpc/ip_blocked`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_ip: ip }),
      signal: ctrl.signal,
    });
    const blocked = res.ok && (await res.json()) === true;
    if (cache.size > 5000) cache.clear();
    cache.set(ip, { blocked, at: Date.now() });
    return blocked;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export default async function middleware(request) {
  const ip = request.headers.get('x-real-ip') || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  if (ip && (await isBlocked(ip))) {
    return new Response(BLOCKED_PAGE, {
      status: 403,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  // nothing returned: the request continues to the site
}
