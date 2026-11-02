# fabioberta.com

Portfolio, Leistungen und Print-Shop von **Fabio Berta – Fotograf in Zürich**.
Ersetzt die bisherige Adobe-Portfolio-Seite.

**Stack:** [Astro 7](https://astro.build) · [Supabase](https://supabase.com) (Datenbank, Bildspeicher, Login) · [Stripe](https://stripe.com) (Checkout inkl. TWINT) · [Resend](https://resend.com) (E-Mails) · [Vercel](https://vercel.com) (Hosting, cookiefreie Analytics)

## Funktionen

- **Design:** dunkel und cineastisch, Instrument Serif + Manrope (lokal gehostet), Filmkorn
- **Animationen:** Intro-Preloader, Hero-Slideshow mit Ken-Burns-Effekt, wortweise eingeblendete Überschriften, Clip-Reveal für Bilder, Parallax, Smooth Scroll (Lenis), horizontale Scroll-Serie, Marquee, magnetische Buttons, eigener Cursor, Seitenübergänge (View Transitions), Lightbox, animierter Galerie-Filter. Alles respektiert `prefers-reduced-motion`.
- **Seiten (DE + EN):** Start, Portfolio (Filter + Lightbox), Foto-Detail mit Print-Konfigurator, Leistungen (Event & Sport, Portrait & Business) mit Paketen und FAQ, Print-Shop, Events (SNBF 2024), Ausstellungen, Über mich, Journal, Kontakt, Impressum, Datenschutz, AGB
- **SEO:** siehe [`docs/SEO-STRATEGIE.md`](docs/SEO-STRATEGIE.md)
- **Admin unter `/admin`:** Bilder per Drag & Drop hochladen (automatische WebP-Optimierung im Browser), Titel und Alt-Texte bearbeiten, sortieren, für Shop oder Startseite freischalten; Anfragen und Bestellungen einsehen
- **Ohne Konfiguration lauffähig:** Solange Supabase nicht verbunden ist, zeigt die Seite die 73 Platzhalterbilder aus `src/data/photos.json`.

## Einrichtung

➡️ **[SETUP.md](SETUP.md)**: Schritt-für-Schritt-Anleitung für Supabase, Stripe, Resend, Vercel, den Domain-Umzug und Google

```bash
npm install
npm run dev     # http://localhost:4321
npm run build
```

## Wo ändere ich was?

| Was | Datei |
|---|---|
| Bilder (nach Supabase-Setup) | `/admin` |
| Print-Preise, Formate, Versand | `src/lib/prints.ts` |
| Leistungen, Pakete, FAQ, Events, Ausstellungen | `src/lib/content.ts` |
| Journal-Beiträge | `src/content/journal/{de,en}/*.md` |
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
  lib/          Daten (Fotos, Leistungen, Prints), SEO-Schemas, Supabase, Mail
  scripts/      motion.ts (Animationen), admin.ts (Admin-Oberfläche)
  data/         Platzhalter-Manifest der bestehenden Bilder
public/photos/  Optimierte Bilder (WebP 1920/960 px)
supabase/       schema.sql + seed.sql
```
