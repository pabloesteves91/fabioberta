# Einrichtung & Livegang – Schritt für Schritt

Diese Anleitung führt dich vom Code zur fertigen Website unter **fabioberta.com**, ohne Adobe Portfolio.
Rechne mit etwa 1–2 Stunden. Alles läuft im Gratiskontingent. Stripe verlangt nur Gebühren pro Verkauf, und Firebase Storage braucht eine hinterlegte Kreditkarte (Blaze-Tarif), kostet bei dieser Seitengrösse aber nichts.

---

## 1. Firebase (Datenbank, Bildspeicher, Login)

1. <https://console.firebase.google.com> → **Projekt hinzufügen** (z. B. `fabioberta`); Google Analytics brauchst du nicht
2. **Build → Firestore Database → Datenbank erstellen**
   - Standort: **eur3 (Europe)** oder `europe-west6 (Zürich)`
   - Im **Produktionsmodus** starten
3. **Build → Storage → Jetzt starten** (gleicher Standort).
   - Dafür verlangt Firebase den Blaze-Tarif. Es braucht eine hinterlegte Kreditkarte, bei dieser Seitengrösse bleibst du aber im Gratiskontingent (5 GB Speicher). Setz zur Sicherheit ein Budget-Limit, z. B. CHF 5.
4. **Build → Authentication → Jetzt starten**
   - Anbieter **E-Mail/Passwort** aktivieren, optional zusätzlich **Google** (dann reicht ein Klick zum Anmelden)
   - **Users → Nutzer hinzufügen**: `fabioberta@me.com` + sicheres Passwort
   - **Einstellungen → Nutzeraktionen**: «Registrierung zulassen» **deaktivieren**, damit niemand sonst ein Konto erstellen kann
   - **Einstellungen → Autorisierte Domains**: `fabioberta.com` hinzufügen
5. **Admin-Recht vergeben:** Firestore → **Sammlung starten** → Sammlungs-ID `admins` → Dokument-ID **`fabioberta@me.com`** (klein geschrieben) → ein beliebiges Feld, z. B. `role` = `owner` → Speichern
6. **Sicherheitsregeln einfügen**
   - Firestore → **Regeln**: Inhalt von [`firebase/firestore.rules`](firebase/firestore.rules) einfügen → **Veröffentlichen**
   - Storage → **Regeln**: Inhalt von [`firebase/storage.rules`](firebase/storage.rules) einfügen → **Veröffentlichen**
   - Weitere Admin-E-Mails trägst du in `storage.rules` **und** als Dokument in `admins` ein.
7. **Web-App registrieren:** Projekteinstellungen (⚙️) → Allgemein → «Meine Apps» → **Web `</>`** → Namen eingeben → die angezeigte `firebaseConfig` übernimmst du für Schritt 4:
   - `apiKey` → `PUBLIC_FIREBASE_API_KEY`
   - `authDomain` → `PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `PUBLIC_FIREBASE_PROJECT_ID`
   - `storageBucket` → `PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `appId` → `PUBLIC_FIREBASE_APP_ID`
8. **Server-Schlüssel:** Projekteinstellungen → **Dienstkonten** → **Neuen privaten Schlüssel generieren** (JSON-Datei, **geheim halten!**)
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (den ganzen Text inkl. `-----BEGIN…`; in Vercel einfach so einfügen)

> Die Website liest die Inhalte über den Server-Schlüssel, Besucher brauchen also kein Login. Ohne diese Werte zeigt die Seite automatisch die Platzhalterbilder.

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

## Das Admin-Tool: `fabioberta.com/admin`

**Erster Start:** Anmelden → auf der Übersicht **«Inhalte jetzt übernehmen»** klicken. Damit landen alle bisherigen 73 Bilder, Leistungen, Events, Ausstellungen, Journal-Beiträge und Preise in Firebase und sind ab dann im Admin bearbeitbar.

| Bereich | Was du dort machst |
|---|---|
| **Übersicht** | Neue Anfragen und Bestellungen, Umsatz des Monats, Schnellzugriff |
| **Fotos** | Hochladen per Drag & Drop (auch direkt aufs Browserfenster), Titel und Bildbeschreibung DE/EN, Serie, Ort; Schalter für «sichtbar», «Startseite» und «Print-Shop»; Reihenfolge per Ziehen; Bild ersetzen; Suche und Filter; **Mehrere auswählen** für Sammelaktionen (verstecken, in den Shop, Serie ändern, löschen) |
| **Leistungen** | Texte, Titelbild und Galerie, Highlights, **Pakete & Shooting-Preise**, häufige Fragen (erscheinen auch bei Google), SEO-Titel und -Beschreibung; neue Leistungen anlegen (z. B. Hochzeiten), Reihenfolge ändern, ausblenden |
| **Events** | Neue Events mit Titelbild und **Link zur Teilnehmer-Galerie** |
| **Ausstellungen** | Mit eigenem Plakat-Upload oder einem Portfolio-Bild |
| **Journal** | Beiträge mit Formatier-Knöpfen und Vorschau, Entwürfe, Verknüpfung DE ↔ EN |
| **Preise** | Print-Preise, Formate (hinzufügen/entfernen), Material an/aus, Versandkosten |
| **Anfragen** | Kontaktanfragen lesen, mit einem Klick per E-Mail antworten, als erledigt markieren |
| **Bestellungen** | Shop-Bestellungen mit Adresse; Status «In Produktion» → «Versendet» |

Tipps:
- Bilder kannst du direkt aus Lightroom exportieren (JPG in voller Grösse). Sie werden automatisch auf 1920 px und 960 px als WebP verkleinert.
- Bilder mit dem roten Hinweis **«Beschreibung?»** brauchen noch eine Bildbeschreibung. Die ist wichtig für die Google-Bildersuche.
- `Ctrl/Cmd + S` speichert im offenen Bearbeitungsfenster, `Esc` schliesst es.
- Das Admin-Tool funktioniert auch auf dem Handy (Navigation unten).
- Änderungen sind nach spätestens **5 Minuten** auf der Website live (Cache).

## Lokal entwickeln

```bash
npm install
cp .env.example .env   # Werte eintragen (optional – ohne Firebase laufen die Platzhalterbilder)
npm run dev            # http://localhost:4321
npm run build
```

**Lokal mit Firebase-Emulator testen** (ohne echtes Projekt, braucht Java):

```bash
npm run emulators                                   # Terminal 1
# .env: PUBLIC_FIREBASE_PROJECT_ID=demo-fabioberta, PUBLIC_FIREBASE_EMULATOR=true (+ beliebige Demo-Werte)
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run dev  # Terminal 2
```
