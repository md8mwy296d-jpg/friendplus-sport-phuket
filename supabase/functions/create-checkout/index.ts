// Crée la page de paiement Stripe d'une réservation « pending_payment » du client connecté.
// Secrets requis (Supabase > Edge Functions > Secrets) : STRIPE_SECRET_KEY, SITE_URL.
// SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement.
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { corsHeaders, json } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  httpClient: Stripe.createFetchHttpClient(),
});
const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://www.friendplussport.center').replace(/\/$/, '');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!Deno.env.get('STRIPE_SECRET_KEY')) return json({ error: 'payments_not_configured' }, 503);

  // qui appelle ? (jeton de session Supabase du client)
  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'not_authenticated' }, 401);

  let bookingId = '';
  try {
    bookingId = String((await req.json()).booking_id ?? '');
  } catch {
    return json({ error: 'invalid_input' }, 400);
  }

  const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: b, error } = await admin
    .from('bookings')
    .select('id, ref, user_id, status, amount_thb, offer_title, start_date, end_date, start_time, qty, created_at, stripe_session_id, offers(photos)')
    .eq('id', bookingId)
    .maybeSingle();
  if (error || !b || b.user_id !== user.id) return json({ error: 'not_found' }, 404);
  if (b.status !== 'pending_payment') return json({ error: 'not_payable', status: b.status }, 409);

  // déjà une page de paiement ouverte ? on la réutilise (double clic, retour arrière)
  if (b.stripe_session_id) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(b.stripe_session_id);
      if (existing.status === 'open' && existing.url) return json({ url: existing.url });
    } catch { /* session introuvable : on en crée une nouvelle */ }
  }

  const photo = (b.offers as { photos?: string[] } | null)?.photos?.find((p) => p.startsWith('https://'));
  const dates = b.end_date ? `${b.start_date} → ${b.end_date}` : `${b.start_date}${b.start_time ? ` ${b.start_time}` : ''}`;
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email ?? undefined,
    client_reference_id: b.id,
    metadata: { booking_id: b.id, ref: b.ref },
    payment_intent_data: { metadata: { booking_id: b.id, ref: b.ref }, description: `${b.ref} · ${b.offer_title}` },
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'thb',
        unit_amount: b.amount_thb * 100, // le baht a 2 décimales (satang) chez Stripe
        product_data: {
          name: b.offer_title,
          description: `${b.ref} · ${dates} · ×${b.qty}`,
          ...(photo ? { images: [photo] } : {}),
        },
      },
    }],
    locale: 'auto',
    // la réservation expire 2 h après sa création : la page de paiement aussi (30 min minimum chez Stripe)
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    success_url: `${SITE_URL}/reservations/${b.id}?paid=1`,
    cancel_url: `${SITE_URL}/reservations/${b.id}?cancelled=1`,
  });

  await admin.rpc('attach_checkout_session', { p_booking: b.id, p_session: session.id });
  return json({ url: session.url });
});
