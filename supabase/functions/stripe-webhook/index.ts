// Reçoit les événements Stripe et marque la réservation « payée » : c'est le SEUL chemin
// vers ce statut (le navigateur du client n'est jamais cru sur parole).
// À déployer SANS vérification JWT (Stripe n'envoie pas de jeton Supabase) ; la signature
// Stripe est vérifiée avec STRIPE_WEBHOOK_SECRET.
// Événements à cocher dans Stripe : checkout.session.completed, checkout.session.async_payment_succeeded.
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const signature = req.headers.get('stripe-signature');
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!signature || !secret) return new Response('missing signature', { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, secret, undefined, cryptoProvider);
  } catch (err) {
    console.error('bad signature', (err as Error).message);
    return new Response('bad signature', { status: 400 });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.booking_id ?? session.client_reference_id;
    if (session.payment_status === 'paid' && bookingId) {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data, error } = await admin.rpc('mark_booking_paid', {
        p_booking: bookingId,
        p_session: session.id,
        p_intent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
        p_amount_thb: Math.round((session.amount_total ?? 0) / 100),
      });
      if (error) {
        console.error('mark_booking_paid failed', error.message);
        return new Response('retry', { status: 500 }); // Stripe renverra l'événement
      }
      console.log('booking', bookingId, data);
    }
  }
  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
