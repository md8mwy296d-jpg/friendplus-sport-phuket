// Anonymous visit counter: adds 1 to today's count for the visitor's city.
// The city comes from Vercel's geo headers; no IP or identifier is stored.
// Needs the VISIT_SECRET env var (same value as public.visit_secret in Supabase).

// Public project values (also shipped in the site's JS bundle), used when the
// VITE_* variables are not exposed to the runtime.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fqrlyykadbzaxzjneupm.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxcmx5eWthZGJ6YXh6am5ldXBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwODYxNjMsImV4cCI6MjEwNTY2MjE2M30.Geptc2NrxreWT6Yv52MENiZMemeK9RokcnW0uTcogOI';

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i;

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

  try {
    await fetch(`${url}/rest/v1/rpc/record_visit`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_secret: secret, p_country: country, p_city: city }),
    });
  } catch {
    // counting is best-effort
  }
  return res.status(204).end();
}
