# Einrichtung & Livegang – Schritt für Schritt

Diese Anleitung führt dich vom Code zur fertigen Website unter **fabioberta.com**, ohne Adobe Portfolio.
Rechne mit etwa 1–2 Stunden. Alles läuft mit kostenlosen Plänen (Stripe verlangt nur Gebühren pro Verkauf).

---

## 1. Supabase (Datenbank + Bildspeicher)

1. Konto erstellen auf <https://supabase.com> → **New project**
   - Region: **Central EU (Frankfurt)** oder **Zurich**, falls verfügbar
2. **SQL Editor** → Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen → **Run**
   - Legt die Tabellen `photos`, `inquiries`, `orders` und `admins` an, dazu den Speicher-Bucket `photos` und alle Sicherheitsregeln.
   - Deine E-Mail `fabioberta@me.com` ist als Admin eingetragen. Wenn du eine andere E-Mail nutzt, in der Datei vorher ändern.
3. **SQL Editor** → Inhalt von [`supabase/seed.sql`](supabase/seed.sql) einfügen → **Run**
   - Übernimmt die 73 bestehenden Bilder als Startinhalt.
4. **Authentication → Users → Add user → Create new user**
   - E-Mail: `fabioberta@me.com`, sicheres Passwort, «Auto Confirm User» aktivieren.
5. **Project Settings → API**: Folgende Werte kopierst du für Schritt 4:
   - `Project URL` → `PUBLIC_SUPABASE_URL`
   - `anon public` → `PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (geheim!) → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Stripe (Print-Shop)

Du hast bereits ein Stripe-Konto.

1. **Entwickler → API-Schlüssel**: `Geheimer Schlüssel` (`sk_live_…`) → `STRIPE_SECRET_KEY`
   - Zum Testen zuerst `sk_test_…` verwenden.
2. **Einstellungen → Zahlungsmethoden**: **TWINT**, Apple Pay und Google Pay aktivieren.
3. **Entwickler → Webhooks → Endpunkt hinzufügen**
   - URL: `https://fabioberta.com/api/stripe-webhook`
   - Ereignis: `checkout.session.completed`
   - Danach das **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`
4. Optional: **Produkte → Gutscheine** anlegen. Gutscheincodes sind im Checkout bereits aktiviert.

Preise und Formate änderst du in [`src/lib/prints.ts`](src/lib/prints.ts).

## 3. Resend (E-Mail-Benachrichtigungen)

1. Konto auf <https://resend.com> (kostenlos bis 3'000 Mails/Monat)
2. **Domains → Add domain** → `fabioberta.com` → die angezeigten DNS-Einträge beim Domain-Anbieter eintragen
3. **API Keys → Create** → `RESEND_API_KEY`
4. `MAIL_FROM` = `Fabio Berta Website <website@fabioberta.com>`, `NOTIFY_EMAIL` = `fabioberta@me.com`

## 4. Vercel (Hosting)

1. Auf <https://vercel.com> mit GitHub anmelden → **Add New → Project** → Repository `fabioberta` importieren
   - Framework wird automatisch als **Astro** erkannt, keine weiteren Einstellungen nötig.
2. **Settings → Environment Variables**: alle Werte aus [`.env.example`](.env.example) eintragen
3. **Deploy**
4. **Analytics** im Projekt aktivieren (cookiefrei, kein Cookie-Banner nötig)

## 5. Domain von Adobe Portfolio umziehen

1. Vercel → **Settings → Domains** → `fabioberta.com` und `www.fabioberta.com` hinzufügen
2. Beim Domain-Anbieter (dort, wo die Domain registriert ist) die DNS-Einträge setzen, die Vercel anzeigt:
   - `A`-Record `@` → `76.76.21.21`
   - `CNAME` `www` → `cname.vercel-dns.com`
   - Die alten Einträge, die auf Adobe/myportfolio zeigen, löschen.
3. Adobe Portfolio → **Domain-Einstellungen** → eigene Domain entfernen
4. Die alten URLs (`/arbeit`, `/about-me`, `/contact`, `/snbf-2024`) leiten automatisch per 301 auf die neuen Seiten weiter. So bleibt das Google-Ranking erhalten.
5. **Adobe Portfolio erst kündigen, wenn die neue Seite läuft.** Alle Bilder sind bereits in diesem Repository gesichert.

## 6. Google (Auffindbarkeit)

1. **Google Search Console** (<https://search.google.com/search-console>)
   - Property `fabioberta.com` hinzufügen (Domain-Bestätigung per DNS)
   - **Sitemaps** → `https://fabioberta.com/sitemap.xml` einreichen
2. **Google Business Profile** (<https://business.google.com>), **sehr wichtig für «Fotograf Zürich»**
   - Kategorie: *Fotograf*, Zusatzkategorien: *Eventfotograf*, *Porträtstudio*
   - Einzugsgebiet: Zürich, Winterthur, Zug, Luzern, Basel, Bern
   - Website: `https://fabioberta.com`, 10–20 Fotos hochladen, Kunden um Bewertungen bitten
3. In [`src/lib/site.ts`](src/lib/site.ts) die Adresse ergänzen (fürs Impressum und für Google)

## 7. Rechtliches vor dem Livegang

- [`src/views/Legal.astro`](src/views/Legal.astro): Platzhalter `[Strasse Nr.]`, `[PLZ]` und UID ersetzen
- Impressum, Datenschutz und AGB sind **Vorlagen**. Lass sie idealerweise kurz prüfen, besonders wegen des Shops.
- **Recht am eigenen Bild:** Im Shop sind nur Bilder ohne klar erkennbare Personen als Print freigeschaltet. Weitere Bilder schaltest du im Admin frei, wenn eine Einwilligung vorliegt.

---

## Bilder verwalten: `/admin`

1. `https://fabioberta.com/admin` öffnen → mit der Supabase-E-Mail und dem Passwort anmelden
2. **Bilder hochladen:** Serie und Ort wählen, Bilder per Drag & Drop hineinziehen
   - Die Bilder werden automatisch auf 1920 px und 960 px als WebP verkleinert. Du kannst also direkt aus Lightroom exportierte JPGs nehmen.
3. Für jedes Bild **Titel und Alt-Text (DE/EN)** ausfüllen. Der Alt-Text ist wichtig für die Google-Bildersuche.
4. Mit den Schaltern legst du fest, ob ein Bild sichtbar ist, auf der Startseite erscheint oder im Print-Shop angeboten wird.
5. Die Reihenfolge änderst du mit ↑ ↓.
6. Änderungen sind nach spätestens **5 Minuten** live (Cache).

Unter **Anfragen** und **Bestellungen** siehst du alle Kontaktanfragen und Shop-Bestellungen.

## Lokal entwickeln

```bash
npm install
cp .env.example .env   # Werte eintragen (optional – ohne Supabase laufen die Platzhalterbilder)
npm run dev            # http://localhost:4321
npm run build
```
