# fabioberta.com

Portfolio, Leistungen und Print-Shop von **Fabio Berta – Fotograf in Zürich**.
Ersetzt die bisherige Adobe-Portfolio-Seite.

**Stack:** [Astro 7](https://astro.build) · [Firebase](https://firebase.google.com) (Firestore, Storage, Auth) · [Stripe](https://stripe.com) (Checkout inkl. TWINT) · [Resend](https://resend.com) (E-Mails) · [Vercel](https://vercel.com) (Hosting, cookiefreie Analytics)

## Funktionen

- **Design:** dunkel und cineastisch, Instrument Serif + Manrope (lokal gehostet), Filmkorn
- **Animationen:** Intro-Preloader, Hero-Slideshow mit Ken-Burns-Effekt, wortweise eingeblendete Überschriften, Clip-Reveal für Bilder, Parallax, Smooth Scroll (Lenis), horizontale Scroll-Serie, Marquee, magnetische Buttons, eigener Cursor, Seitenübergänge (View Transitions), Lightbox, animierter Galerie-Filter. Alles respektiert `prefers-reduced-motion`.
- **Seiten (DE + EN):** Start, Portfolio (Filter + Lightbox), Foto-Detail mit Print-Konfigurator, Leistungen (Event & Sport, Portrait & Business) mit Paketen und FAQ, Print-Shop, Events (SNBF 2024), Ausstellungen, Über mich, Journal, Kontakt, Impressum, Datenschutz, AGB
- **SEO:** siehe [`docs/SEO-STRATEGIE.md`](docs/SEO-STRATEGIE.md)
- **Admin-Tool unter `/admin`:** Fotos (Drag & Drop, automatische WebP-Optimierung, Sortieren per Ziehen, Sammelaktionen, Bild ersetzen), Leistungen mit Paketen, Preisen, FAQ und SEO-Texten, Events mit Galerie-Link, Ausstellungen, Journal mit Vorschau, Print-Preise, Kontaktanfragen und Bestellungen. Login mit Google oder E-Mail, auch auf dem Handy nutzbar.
- **Ohne Konfiguration lauffähig:** Solange Firebase nicht verbunden ist, zeigt die Seite die 73 Platzhalterbilder aus `src/data/photos.json`.

## Einrichtung

➡️ **[SETUP.md](SETUP.md)**: Schritt-für-Schritt-Anleitung für Firebase, Stripe, Resend, Vercel, den Domain-Umzug und Google

```bash
npm install
npm run dev     # http://localhost:4321
npm run build
```

## Mit GitHub Codespaces testen (ohne Installation)

1. Auf GitHub im Repository: **Code → Codespaces → Create codespace on main**
2. Etwa 2 Minuten warten. Die Pakete werden installiert, die Website startet automatisch und öffnet sich in einem neuen Tab (Port 4321).
   Falls nicht: unten im Tab **Ports** bei «Website» auf das 🌐-Symbol klicken.
3. Admin: an die Adresse `/admin` anhängen und mit E-Mail und Passwort anmelden.

Für Kontaktformular und Shop: unter GitHub → **Settings → Codespaces → Secrets** die Werte `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` und `STRIPE_SECRET_KEY` (Testschlüssel `sk_test_…`) hinterlegen, dann den Codespace neu erstellen.
Codespaces ist für persönliche Konten bis 60 Stunden pro Monat gratis; den Codespace danach unter github.com/codespaces stoppen.

## Wo ändere ich was?

| Was | Datei |
|---|---|
| Bilder, Leistungen (Pakete, Preise, FAQ), Events, Ausstellungen, Journal, Print-Preise | **`/admin`** |
| Standardinhalte (bevor Firebase verbunden ist) | `src/lib/content.ts`, `src/lib/prints.ts`, `src/content/journal/` |
| Navigations- & Button-Texte | `src/i18n/ui.ts` |
| Kontaktdaten, Instagram, Adresse | `src/lib/site.ts` |
| Farben, Schriften, Animationen | `src/styles/global.css`, `src/scripts/motion.ts` |
| Rechtstexte | `src/views/Legal.astro` |

## Projektstruktur

```
src/
  pages/        Routen (DE im Root, EN unter /en), API unter /api, Admin unter /admin
  views/        Seiteninhalte, von DE- und EN-Route gemeinsam genutzt
  components/   Header, Footer, Buttons, PhotoCard, Lightbox …
  lib/          Daten (Fotos, Leistungen, Prints), SEO-Schemas, Firebase, Mail
  scripts/      motion.ts (Animationen), admin.ts (Admin-Tool)
  data/         Platzhalter-Manifest der bestehenden Bilder
public/photos/  Optimierte Bilder (WebP 1920/960 px)
firebase/       Sicherheitsregeln für Firestore & Storage
```
