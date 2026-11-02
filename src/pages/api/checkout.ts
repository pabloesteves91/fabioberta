import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getPhotos } from '../../lib/photos';
import { findVariant, sizeLabel } from '../../lib/prints';
import { getPrintConfig } from '../../lib/data';
import { r, photoUrl } from '../../i18n/routes';

export const prerender = false;

const json = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request, url }) => {
  const key = import.meta.env.STRIPE_SECRET_KEY;
  if (!key) return json({ error: 'stripe_not_configured' }, 503);

  let body: { slug?: string; material?: string; size?: string; quantity?: number; lang?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const lang = body.lang === 'en' ? 'en' : 'de';
  const quantity = Math.min(10, Math.max(1, Math.floor(Number(body.quantity) || 1)));
  const photo = (await getPhotos()).find((p) => p.slug === body.slug && p.forSale);
  const cfg = await getPrintConfig();
  const shipping = cfg.shipping;
  const variant = findVariant(cfg, String(body.material), String(body.size));
  if (!photo || !variant) return json({ error: 'invalid_product' }, 400);

  const { material, size } = variant;
  const portrait = photo.height > photo.width;
  const subtotal = size.price * quantity;
  // Hinter einem Proxy (z. B. GitHub Codespaces) die öffentliche Adresse verwenden
  const fwdHost = request.headers.get('x-forwarded-host');
  const origin = fwdHost ? `https://${fwdHost.split(',')[0].trim()}` : url.origin;
  const abs = (p: string) => new URL(p, origin).toString();
  const rate = (label: string, amount: number, min: number, max: number): Stripe.Checkout.SessionCreateParams.ShippingOption => ({
    shipping_rate_data: {
      type: 'fixed_amount',
      display_name: label,
      fixed_amount: { amount: amount * 100, currency: 'chf' },
      delivery_estimate: { minimum: { unit: 'business_day', value: min }, maximum: { unit: 'business_day', value: max } },
    },
  });
  const free = subtotal >= shipping.freeFrom;

  const stripe = new Stripe(key);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: lang,
      line_items: [
        {
          quantity,
          price_data: {
            currency: 'chf',
            unit_amount: size.price * 100,
            product_data: {
              name: `«${photo.title[lang]}» – ${material.name[lang]}, ${sizeLabel(size, portrait)}`,
              description: material.description[lang],
              images: [abs(photo.thumb)],
              metadata: { slug: photo.slug, material: material.id, size: size.id },
            },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: ['CH', 'LI', 'DE', 'AT', 'FR', 'IT', 'NL', 'BE', 'LU'] },
      shipping_options: free
        ? [rate(lang === 'de' ? 'Gratisversand' : 'Free shipping', 0, 7, 12)]
        : [rate(shipping.ch.label[lang], shipping.ch.price, 7, 10), rate(shipping.eu.label[lang], shipping.eu.price, 10, 15)],
      allow_promotion_codes: true,
      metadata: { slug: photo.slug, material: material.id, size: size.id, quantity: String(quantity), lang },
      success_url: `${abs(r('shopThanks', lang))}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: abs(photoUrl(photo.slug, lang)),
    });
    return json({ url: session.url });
  } catch (err) {
    console.error('[checkout]', err);
    return json({ error: 'stripe_error' }, 502);
  }
};
