import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '../../lib/firebase';
import { sendMail, escapeHtml } from '../../lib/mail';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const key = import.meta.env.STRIPE_SECRET_KEY;
  const secret = import.meta.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !secret) return new Response('not configured', { status: 503 });

  const stripe = new Stripe(key);
  const signature = request.headers.get('stripe-signature');
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature ?? '', secret);
  } catch (err) {
    console.error('[webhook] Signatur ungültig', err);
    return new Response('invalid signature', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session;
    const anyS = s as unknown as { collected_information?: { shipping_details?: unknown }; shipping_details?: unknown };
    const shippingDetails = (anyS.collected_information?.shipping_details ?? anyS.shipping_details ?? null) as {
      name?: string;
      address?: Record<string, string | null>;
    } | null;
    const order = {
      stripeSessionId: s.id,
      email: s.customer_details?.email ?? null,
      name: shippingDetails?.name ?? s.customer_details?.name ?? null,
      phone: s.customer_details?.phone ?? null,
      amountTotal: (s.amount_total ?? 0) / 100,
      currency: s.currency,
      photoSlug: s.metadata?.slug ?? null,
      material: s.metadata?.material ?? null,
      size: s.metadata?.size ?? null,
      quantity: Number(s.metadata?.quantity ?? 1),
      shippingAddress: shippingDetails?.address ?? null,
      status: 'paid',
    };
    const db = getDb();
    if (db) {
      try {
        // Session-ID als Dokument-ID → Webhook-Wiederholungen erzeugen keine Duplikate
        await db.collection('orders').doc(s.id).set({ ...order, createdAt: FieldValue.serverTimestamp() }, { merge: true });
      } catch (err) {
        console.error('[webhook] Firestore', err);
      }
    }
    const addr = order.shippingAddress ? Object.values(order.shippingAddress).filter(Boolean).join(', ') : '–';
    await sendMail({
      subject: `Neue Bestellung: ${order.photoSlug} (${order.material} ${order.size}) – CHF ${order.amountTotal}`,
      replyTo: order.email ?? undefined,
      html: `<h2>Neue Print-Bestellung 🎉</h2>
        <p><strong>Bild:</strong> ${escapeHtml(order.photoSlug)}<br><strong>Material:</strong> ${escapeHtml(order.material)}<br>
        <strong>Format:</strong> ${escapeHtml(order.size)}<br><strong>Anzahl:</strong> ${order.quantity}<br>
        <strong>Total:</strong> CHF ${order.amountTotal}</p>
        <p><strong>Kunde:</strong> ${escapeHtml(order.name)} (${escapeHtml(order.email)})<br><strong>Adresse:</strong> ${escapeHtml(addr)}</p>
        <p>Stripe-Session: ${escapeHtml(s.id)}</p>`,
    });
  }
  return new Response('ok');
};
