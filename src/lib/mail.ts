/** Versand von Benachrichtigungen über Resend (https://resend.com). */
export const escapeHtml = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export async function sendMail(opts: { subject: string; html: string; replyTo?: string; to?: string }) {
  const key = import.meta.env.RESEND_API_KEY;
  const to = opts.to ?? import.meta.env.NOTIFY_EMAIL;
  const from = import.meta.env.MAIL_FROM ?? 'Fabio Berta Website <onboarding@resend.dev>';
  if (!key || !to) {
    console.warn('[mail] RESEND_API_KEY oder NOTIFY_EMAIL fehlt – E-Mail nicht versendet.');
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject: opts.subject, html: opts.html, reply_to: opts.replyTo }),
  });
  if (!res.ok) console.error('[mail] Resend-Fehler', res.status, await res.text());
  return res.ok;
}
