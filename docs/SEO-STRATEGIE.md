# SEO-Strategie fabioberta.com

Stand: November 2026 · Ziel: Bei Google als **Fotograf in Zürich und der Schweiz** gefunden werden (Events & Sport, Portrait & Business, Fine-Art-Prints).

## Ausgangslage (alte Adobe-Portfolio-Seite)

| Problem | Schwere | Im Relaunch gelöst |
|---|---|---|
| Seitentitel nur «Fabio Berta», ohne Keyword oder Ort | Kritisch | ✅ Eigener Titel pro Seite mit Keyword und «Zürich» |
| `lang="en-US"` bei deutschem Inhalt | Hoch | ✅ `de-CH` / `en` + hreflang |
| Canonical zeigt auf `http://` statt `https://` | Hoch | ✅ HTTPS-Canonical pro Seite |
| Keine H1, kaum Text, nur Bildraster | Kritisch | ✅ Eine H1 pro Seite, Texte und FAQ auf Leistungsseiten |
| Bilder ohne Alt-Text | Hoch | ✅ Beschreibende Alt-Texte DE/EN für alle 73 Bilder |
| Keine Leistungs- oder Preisseiten | Kritisch | ✅ Eigene Landingpages für Event/Sport und Portrait/Business |
| Keine strukturierten Daten | Mittel | ✅ LocalBusiness, Person, Service, FAQ, Product, Breadcrumb, Event, BlogPosting, ImageObject |
| Keine Sitemap / `twitter:site` = @AdobePortfolio | Mittel | ✅ `sitemap.xml` mit Bild- und Sprach-Alternativen, `robots.txt` |
| Cookie-Banner wegen Adobe-Tracking | Niedrig | ✅ Cookiefreie Vercel Analytics |
| Ladezeit: Adobe-CDN + Typekit | Mittel | ✅ WebP, Lazy Loading, lokale Schriften, gecachtes Server-Rendering |

## Keyword-Strategie

Generische Begriffe wie «Eventfotograf Zürich» werden von Plattformen wie Splento und Shootday dominiert. Die besten Chancen bieten **Nischen- und Long-Tail-Keywords** mit eigener Landingpage sowie das **Google Business Profile** (Local Pack).

| Keyword | Schwierigkeit | Chance | Intention | Zielseite |
|---|---|---|---|---|
| Fotograf Zürich | schwer | mittel | kommerziell | Startseite + Google Business Profile |
| Eventfotograf Zürich | schwer | hoch | transaktional | /leistungen/eventfotografie-sportfotografie |
| Sportfotograf Schweiz | mittel | hoch | transaktional | /leistungen/eventfotografie-sportfotografie |
| Bodybuilding Fotograf Schweiz | leicht | **sehr hoch** | transaktional | Event-Seite + Events/SNBF |
| Kampfsport / Kickboxen Fotograf | leicht | hoch | transaktional | Event-Seite |
| Fotograf Meisterschaft Schweiz | leicht | hoch | transaktional | Event-Seite |
| Firmenevent Fotograf Zürich | mittel | hoch | transaktional | Event-Seite |
| Businessfotos Zürich | mittel | hoch | transaktional | /leistungen/portrait-businessfotografie |
| Business Headshots Zürich | mittel | hoch | transaktional | Portrait-Seite |
| Portraitfotograf Zürich | mittel | mittel | transaktional | Portrait-Seite |
| Bewerbungsfotos Zürich outdoor | leicht | mittel | transaktional | Portrait-Seite (neuer Abschnitt) |
| Streetfotografie Zürich | leicht | **sehr hoch** | informativ | Portfolio + Journal-Artikel |
| Fine Art Prints kaufen Schweiz | mittel | hoch | transaktional | /shop |
| Fotokunst Zürich kaufen | leicht | hoch | transaktional | /shop |
| Wandbild Alu-Dibond Schweiz Landschaft | mittel | mittel | transaktional | Foto-Detailseiten |
| Was kostet ein Eventfotograf? | leicht | hoch | informativ | FAQ + Journal |
| Was kosten Businessfotos Zürich? | leicht | hoch | informativ | FAQ |
| Eventfotograf in Zürich buchen Tipps | leicht | mittel | informativ | Journal |
| Fine-Art-Print oder Leinwand | leicht | mittel | informativ | Journal |
| Street photographer Zurich (EN) | leicht | hoch | kommerziell | /en/portfolio |
| Event photographer Zurich (EN) | mittel | hoch | transaktional | /en/services/… |

## Content-Plan (nächste 3 Monate)

| Thema | Format | Priorität | Aufwand |
|---|---|---|---|
| SNBF 2024 als Fallstudie mit 10–15 Bildern | Event-Seite ausbauen | Hoch | ½ Tag |
| «Bodybuilding-Fotografie: So entstehen Bühnenfotos» | Journal | Hoch | ½ Tag |
| Bewerbungsfotos outdoor in Zürich | Abschnitt auf Portrait-Seite + Journal | Hoch | ½ Tag |
| «Hanoi Train Street – Streetfotografie in Vietnam» | Journal | Mittel | 2 h |
| «Die besten Fotospots in Zürich bei Nebel» | Journal | Mittel | 2 h |
| Kundenstimmen / Referenzen | Abschnitt Startseite + Leistungsseiten | Hoch | 1 h (Zitate einholen) |

## Quick Wins nach dem Livegang

1. **Google Business Profile** anlegen und verifizieren (grösster Hebel für «Fotograf Zürich»)
2. **Search Console** und Sitemap einreichen
3. Instagram-Bio-Link auf `fabioberta.com` setzen und in Posts gezielt auf Prints verlinken
4. **Backlinks:** SNBF-Website, Photo Schweiz (Ausstellerliste), Vereine und Kunden um einen Link bitten
5. Nach jedem Event: kurzer Journal-Beitrag + Event-Seite → wiederkehrender, frischer Content
6. Alt-Texte bei neuen Uploads im Admin **immer** ausfüllen (Ort + Motiv + Stil)

## Technisch umgesetzt

- Server-gerendert (Astro) mit 5-Minuten-Cache (ISR), dadurch schnell und immer aktuell
- `sitemap.xml` inkl. Bild-Sitemap und hreflang (DE/EN), `robots.txt`
- Canonical-, OG- und Twitter-Tags pro Seite, Geo-Meta für Zürich
- JSON-LD: `ProfessionalService/LocalBusiness`, `Person`, `WebSite`, `Service` + `Offer`, `FAQPage`, `Product` + `AggregateOffer`, `ImageObject` (mit Lizenzangaben → «Lizenzierbar»-Badge in der Google-Bildersuche), `BreadcrumbList`, `Event`, `ExhibitionEvent`, `Blog/BlogPosting`
- 301-Weiterleitungen der alten Adobe-URLs
- WebP-Bilder in 2 Grössen, `width`/`height` gegen Layout-Verschiebung, LCP-Bild vorgeladen
- Barrierefreiheit: WCAG-2.1-AA-Kontraste, Tastatur-Navigation, `prefers-reduced-motion`, pausierbare Slideshow

> Für genaue Suchvolumen-Daten: Connector zu einem SEO-Tool (z. B. Ahrefs) verbinden und diese Tabelle aktualisieren.
