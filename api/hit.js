// Visit tracking, once per browser session:
//  - adds 1 to today's count for the visitor's city (public.visit_stats, anonymous);
//  - writes a connection log line: IP, city, device (public.visit_log, admin-only,
//    deleted automatically after 30 days; must be mentioned in the privacy policy).
// City and country come from Vercel's geo headers.
// Needs the VISIT_SECRET env var (same value as public.visit_secret in Supabase).

// Public project values (also shipped in the site's JS bundle), used when the
// VITE_* variables are not exposed to the runtime.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fqrlyykadbzaxzjneupm.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxcmx5eWthZGJ6YXh6am5ldXBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwODYxNjMsImV4cCI6MjEwNTY2MjE2M30.Geptc2NrxreWT6Yv52MENiZMemeK9RokcnW0uTcogOI';

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i;

function deviceOf(ua) {
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  return '';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  const secret = process.env.VISIT_SECRET;
  const url = SUPABASE_URL;
  const key = SUPABASE_ANON_KEY;
  if (!secret || !url || !key || BOTS.test(req.headers['user-agent'] ?? '')) return res.status(204).end();

  const decode = (v) => {
    try { return decodeURIComponent(String(v ?? '')); } catch { return ''; }
  };
  const country = decode(req.headers['x-vercel-ip-country']).slice(0, 2);
  const city = decode(req.headers['x-vercel-ip-city']).slice(0, 80);

  const ip = String(req.headers['x-real-ip'] ?? String(req.headers['x-forwarded-for'] ?? '').split(',')[0]).trim();
  const device = deviceOf(String(req.headers['user-agent'] ?? ''));

  const rpc = (name, body) => fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  // best-effort: a failure never affects the visitor
  await Promise.allSettled([
    rpc('record_visit', { p_secret: secret, p_country: country, p_city: city }),
    rpc('record_visit_log', { p_secret: secret, p_ip: ip, p_country: country, p_city: city, p_device: device }),
  ]);
  return res.status(204).end();
}
