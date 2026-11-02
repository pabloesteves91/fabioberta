import type { APIRoute } from 'astro';
import { getServiceClient } from '../../lib/supabase';
import { sendMail, escapeHtml } from '../../lib/mail';

export const prerender = false;

const TYPES = ['event', 'portrait', 'print', 'other'];
const hits = new Map<string, number[]>();

const json = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // einfaches Rate-Limit pro Instanz: max. 5 Anfragen / 10 Minuten
  const ip = clientAddress ?? 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 600_000);
  if (recent.length >= 5) return json({ error: 'rate_limited' }, 429);
  hits.set(ip, [...recent, now]);

  let data: Record<string, string>;
  try {
    data = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (data.website) return json({ ok: true }); // Honeypot → Bot

  const name = String(data.name ?? '').trim().slice(0, 120);
  const email = String(data.email ?? '').trim().slice(0, 200);
  const message = String(data.message ?? '').trim().slice(0, 5000);
  const phone = String(data.phone ?? '').trim().slice(0, 40);
  const date = String(data.date ?? '').trim().slice(0, 20);
  const type = TYPES.includes(data.type) ? data.type : 'other';
  const lang = data.lang === 'en' ? 'en' : 'de';
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10) return json({ error: 'validation' }, 422);

  const db = getServiceClient();
  let stored = false;
  if (db) {
    const { error } = await db.from('inquiries').insert({ name, email, phone: phone || null, type, event_date: date || null, message, lang });
    if (error) console.error('[contact] Supabase', error.message);
    else stored = true;
  }

  const mailed = await sendMail({
    subject: `Neue Anfrage (${type}) von ${name}`,
    replyTo: email,
    html: `<h2>Neue Anfrage über fabioberta.com</h2>
      <p><strong>Art:</strong> ${escapeHtml(type)}<br><strong>Name:</strong> ${escapeHtml(name)}<br>
      <strong>E-Mail:</strong> ${escapeHtml(email)}<br><strong>Telefon:</strong> ${escapeHtml(phone || '–')}<br>
      <strong>Datum:</strong> ${escapeHtml(date || '–')}<br><strong>Sprache:</strong> ${lang}</p>
      <p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
  });

  if (!stored && !mailed) {
    if (import.meta.env.DEV) {
      console.info('[contact] (dev) Anfrage:', { name, email, type, message });
      return json({ ok: true, dev: true });
    }
    return json({ error: 'not_configured' }, 503);
  }
  return json({ ok: true });
};
