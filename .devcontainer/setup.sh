#!/usr/bin/env bash
# Wird beim Erstellen des Codespaces einmal ausgeführt.
set -e
npm ci
# Geheime Schlüssel aus den Codespaces-Secrets (GitHub → Settings → Codespaces → Secrets) in .env übernehmen
: > .env
for key in FIREBASE_PROJECT_ID FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET RESEND_API_KEY NOTIFY_EMAIL MAIL_FROM; do
  if [ -n "${!key}" ]; then printf '%s=%q\n' "$key" "${!key}" >> .env; fi
done
echo "Fertig. Die Website startet gleich automatisch auf Port 4321."
