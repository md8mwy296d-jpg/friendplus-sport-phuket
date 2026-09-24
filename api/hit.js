// Anonymous visit counter: adds 1 to today's count for the visitor's city.
// The city comes from Vercel's geo headers; no IP or identifier is stored.
// Needs the VISIT_SECRET env var (same value as public.visit_secret in Supabase).

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  const secret = process.env.VISIT_SECRET;
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
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
