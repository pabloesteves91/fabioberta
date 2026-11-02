import type { Lang } from '../i18n/routes';

type L = Record<Lang, string>;

export interface Service {
  id: 'event-sport' | 'portrait-business' | 'fine-art';
  slug: L;
  title: L;
  kicker: L;
  seoTitle: L;
  seoDescription: L;
  intro: L;
  cover: string; // Foto-Slug
  gallery: string[];
  highlights: Record<Lang, string[]>;
  packages: { name: L; price: string | L; features: Record<Lang, string[]>; popular?: boolean }[];
  faq: { q: L; a: L }[];
}

export const services: Service[] = [
  {
    id: 'event-sport',
    slug: { de: 'eventfotografie-sportfotografie', en: 'event-sports-photography' },
    title: { de: 'Event- & Sportfotografie', en: 'Event & Sports Photography' },
    kicker: { de: 'Meisterschaften · Firmenevents · Kampfsport', en: 'Championships · Corporate events · Combat sports' },
    seoTitle: {
      de: 'Eventfotograf & Sportfotograf Zürich | Fabio Berta',
      en: 'Event & Sports Photographer Zurich | Fabio Berta',
    },
    seoDescription: {
      de: 'Eventfotograf in Zürich & der ganzen Schweiz: Meisterschaften, Bodybuilding, Kampfsport, Firmenevents. Online-Galerie, schnelle Lieferung.',
      en: 'Event photographer in Zurich & all of Switzerland: championships, bodybuilding, combat sports, corporate events. Online gallery, fast delivery.',
    },
    intro: {
      de: 'Ich halte die Momente fest, die man nicht wiederholen kann: den Jubel nach dem Sieg, die Anspannung vor dem Auftritt, die Energie im Saal. Als offizieller Fotograf der SNBF International Open Championship weiss ich, worauf es bei Meisterschaften und Events ankommt: Tempo, Diskretion und Bilder, die Emotionen tragen.',
      en: 'I capture the moments that cannot be repeated: the cheer after a win, the tension before stepping on stage, the energy in the room. As official photographer of the SNBF International Open Championship I know what matters at championships and events: speed, discretion and images that carry emotion.',
    },
    cover: 'im-ring',
    gallery: ['im-ring', 'funkenregen', 'jubel-zuerich', 'siegesschrei-zuerich', 'feiernacht-zuerich', 'burnout'],
    highlights: {
      de: ['Offizieller Fotograf SNBF 2024', 'Online-Galerie für alle Teilnehmer', 'Erste Auswahl innert 48 Stunden', 'Ganze Schweiz, Basis Zürich'],
      en: ['Official photographer SNBF 2024', 'Online gallery for all participants', 'First selection within 48 hours', 'All of Switzerland, based in Zurich'],
    },
    packages: [
      {
        name: { de: 'Halbtag', en: 'Half day' },
        price: 'CHF 890',
        features: {
          de: ['Bis 4 Stunden vor Ort', 'Ca. 150 bearbeitete Bilder', 'Online-Galerie mit Download', 'Lieferung innert 5 Tagen'],
          en: ['Up to 4 hours on site', 'Approx. 150 edited images', 'Online gallery with download', 'Delivery within 5 days'],
        },
      },
      {
        name: { de: 'Ganztag', en: 'Full day' },
        price: 'CHF 1’490',
        popular: true,
        features: {
          de: ['Bis 8 Stunden vor Ort', 'Ca. 350 bearbeitete Bilder', 'Highlights innert 48 Stunden', 'Nutzungsrechte für Social Media & PR'],
          en: ['Up to 8 hours on site', 'Approx. 350 edited images', 'Highlights within 48 hours', 'Usage rights for social media & PR'],
        },
      },
      {
        name: { de: 'Meisterschaft', en: 'Championship' },
        price: { de: 'ab CHF 1’900', en: 'from CHF 1,900' },
        features: {
          de: ['Ganzer Wettkampf, mehrere Tage möglich', 'Galerie für Athletinnen & Athleten', 'Bühnen-, Backstage- & Siegerfotos', 'Optional: Bildverkauf an Teilnehmende'],
          en: ['Entire competition, multiple days possible', 'Gallery for athletes', 'Stage, backstage & winner photos', 'Optional: photo sales to participants'],
        },
      },
    ],
    faq: [
      {
        q: { de: 'Was kostet ein Eventfotograf in Zürich?', en: 'How much does an event photographer in Zurich cost?' },
        a: {
          de: 'Ein Halbtag (bis 4 Stunden) startet bei CHF 890, ein Ganztag bei CHF 1’490. Für Meisterschaften und mehrtägige Events erstelle ich dir ein individuelles Angebot.',
          en: 'A half day (up to 4 hours) starts at CHF 890, a full day at CHF 1,490. For championships and multi-day events I prepare an individual quote.',
        },
      },
      {
        q: { de: 'Wie schnell bekomme ich die Bilder?', en: 'How quickly will I receive the images?' },
        a: {
          de: 'Eine erste Auswahl für Social Media erhältst du innert 48 Stunden, die komplette Galerie in der Regel innert 5 Arbeitstagen.',
          en: 'A first selection for social media within 48 hours, the complete gallery usually within 5 working days.',
        },
      },
      {
        q: { de: 'Fotografierst du auch ausserhalb von Zürich?', en: 'Do you work outside of Zurich?' },
        a: {
          de: 'Ja, ich bin in der ganzen Schweiz unterwegs – von Basel über Bern und Luzern bis ins Tessin. Reisekosten ausserhalb des Kantons Zürich werden transparent ausgewiesen.',
          en: 'Yes, I work all over Switzerland – from Basel to Bern, Lucerne and Ticino. Travel costs outside the canton of Zurich are listed transparently.',
        },
      },
      {
        q: { de: 'Können Teilnehmende ihre Fotos selbst herunterladen?', en: 'Can participants download their own photos?' },
        a: {
          de: 'Ja. Für Meisterschaften richte ich eine Online-Galerie ein, in der alle Teilnehmenden ihre Bilder finden und herunterladen oder kaufen können.',
          en: 'Yes. For championships I set up an online gallery where every participant can find, download or purchase their images.',
        },
      },
    ],
  },
  {
    id: 'portrait-business',
    slug: { de: 'portrait-businessfotografie', en: 'portrait-business-photography' },
    title: { de: 'Portrait- & Businessfotografie', en: 'Portrait & Business Photography' },
    kicker: { de: 'Portraits · Headshots · Teamfotos', en: 'Portraits · Headshots · Team photos' },
    seoTitle: {
      de: 'Portraitfotograf & Businessfotos Zürich | Fabio Berta',
      en: 'Portrait & Business Photographer Zurich | Fabio Berta',
    },
    seoDescription: {
      de: 'Natürliche Portraits, Business-Headshots und Teamfotos in Zürich – on location in der Stadt oder in deinem Büro. Authentisch, ungestellt, ab CHF 290.',
      en: 'Natural portraits, business headshots and team photos in Zurich – on location in the city or at your office. Authentic and unposed, from CHF 290.',
    },
    intro: {
      de: 'Meine Portraits entstehen dort, wo das Leben spielt: in den Gassen von Zürich, im Atelier oder direkt in deinem Büro. Aus der Streetfotografie bringe ich den Blick für echte Momente mit – das Ergebnis sind Bilder, auf denen du dich wiedererkennst, statt steife Studiofotos.',
      en: 'My portraits are made where life happens: in the streets of Zurich, in the studio or right at your office. From street photography I bring an eye for genuine moments – resulting in images you recognise yourself in, rather than stiff studio shots.',
    },
    cover: 'der-herr-zuerich',
    gallery: ['der-herr-zuerich', 'ink', 'laecheln', 'die-pfeife', 'lachen-zuerich', 'rot-zuerich'],
    highlights: {
      de: ['On location in Zürich oder bei dir', 'Natürliche, ungestellte Bildsprache', 'Professionelle Retusche inklusive', 'Ideal für LinkedIn, Website & Presse'],
      en: ['On location in Zurich or at your place', 'Natural, unposed visual style', 'Professional retouching included', 'Ideal for LinkedIn, website & press'],
    },
    packages: [
      {
        name: { de: 'Portrait', en: 'Portrait' },
        price: 'CHF 290',
        features: {
          de: ['60 Minuten Shooting', '1 Location in Zürich', '10 bearbeitete Bilder', 'Online-Galerie'],
          en: ['60-minute session', '1 location in Zurich', '10 edited images', 'Online gallery'],
        },
      },
      {
        name: { de: 'Business-Headshots', en: 'Business headshots' },
        price: 'CHF 390',
        popular: true,
        features: {
          de: ['Bis 3 Personen', 'Bei dir im Büro oder outdoor', '3 retuschierte Bilder pro Person', 'Kommerzielle Nutzungsrechte'],
          en: ['Up to 3 people', 'At your office or outdoors', '3 retouched images per person', 'Commercial usage rights'],
        },
      },
      {
        name: { de: 'Team & Corporate', en: 'Team & corporate' },
        price: { de: 'ab CHF 890', en: 'from CHF 890' },
        features: {
          de: ['Ganze Teams, einheitlicher Look', 'Teamfoto & Arbeitssituationen', 'Mobiles Licht-Setup', 'Lieferung innert 5 Tagen'],
          en: ['Entire teams, consistent look', 'Team photo & work situations', 'Mobile lighting setup', 'Delivery within 5 days'],
        },
      },
    ],
    faq: [
      {
        q: { de: 'Was kosten Business-Fotos in Zürich?', en: 'How much do business photos in Zurich cost?' },
        a: {
          de: 'Ein Portrait-Shooting kostet CHF 290, Business-Headshots für bis zu 3 Personen CHF 390. Teamshootings biete ich ab CHF 890 an.',
          en: 'A portrait session costs CHF 290, business headshots for up to 3 people CHF 390. Team shoots start from CHF 890.',
        },
      },
      {
        q: { de: 'Wo findet das Shooting statt?', en: 'Where does the shoot take place?' },
        a: {
          de: 'Am liebsten draussen in Zürich – Altstadt, Kreis 5 oder am See – oder direkt bei dir im Büro. Ich bringe mobiles Licht mit.',
          en: 'Preferably outdoors in Zurich – old town, district 5 or by the lake – or at your office. I bring mobile lighting.',
        },
      },
      {
        q: { de: 'Ich stehe nicht gerne vor der Kamera – geht das trotzdem?', en: "I don't like being photographed – will it still work?" },
        a: {
          de: 'Genau dafür bin ich da. Wir gehen locker durch die Stadt, reden, und die besten Bilder entstehen, wenn du die Kamera vergisst.',
          en: "That's exactly what I'm here for. We walk through the city, chat, and the best images happen when you forget the camera.",
        },
      },
    ],
  },
  {
    id: 'fine-art',
    slug: { de: 'fine-art-prints', en: 'fine-art-prints' },
    title: { de: 'Fine-Art-Prints', en: 'Fine Art Prints' },
    kicker: { de: 'Street · Landschaft · Reisen', en: 'Street · Landscape · Travel' },
    seoTitle: { de: 'Fine-Art-Prints kaufen – Fotokunst aus Zürich | Fabio Berta', en: 'Buy Fine Art Prints – Photo Art from Zurich | Fabio Berta' },
    seoDescription: {
      de: 'Fotokunst für deine Wand: Streetfotografie aus Zürich und Schweizer Landschaften als signierte Fine-Art-Prints, Alu-Dibond, Leinwand oder gerahmt.',
      en: 'Photo art for your wall: Zurich street photography, Swiss landscapes and travel images as hand-signed fine art prints, aluminium, canvas or framed.',
    },
    intro: {
      de: 'Ausgewählte Bilder aus meinem Portfolio gibt es als hochwertige Prints – produziert in der Schweiz und von mir handsigniert. Bereits ausgestellt an der Photo Schweiz.',
      en: 'Selected images from my portfolio are available as high-quality prints – produced in Switzerland and hand-signed by me. Previously exhibited at Photo Schweiz.',
    },
    cover: 'spiegelung',
    gallery: [],
    highlights: { de: [], en: [] },
    packages: [],
    faq: [],
  },
];

export const serviceBySlug = (slug: string, lang: Lang) => services.find((s) => s.slug[lang] === slug);

export const packagePrice = (p: Service['packages'][number], lang: Lang) =>
  typeof p.price === 'string' ? p.price : p.price[lang];

export interface EventItem {
  id?: string;
  slug: string;
  title: string;
  date: string;
  location: string;
  /** Foto-Slug aus dem Portfolio */
  cover: string;
  galleryUrl?: string;
  summary: L;
  body: L;
  published?: boolean;
}

/** Standard-Events (werden ersetzt, sobald in Firebase Events angelegt sind). */
export const defaultEvents: EventItem[] = [
  {
    slug: 'snbf-2024',
    title: 'SNBF International Open Championship 2024',
    date: '2024-11-09',
    location: 'Schweiz',
    cover: 'im-ring',
    // TODO: Link zur Teilnehmer-Galerie eintragen
    galleryUrl: '',
    summary: {
      de: 'Offizieller Fotograf der SNBF International Open Championship 2024 – Bühne, Backstage und Siegerehrungen.',
      en: 'Official photographer of the SNBF International Open Championship 2024 – stage, backstage and award ceremonies.',
    },
    body: {
      de: 'Es war mir eine Freude, als offizieller Fotograf die SNBF International Open Championship 2024 begleiten zu dürfen. Vielen Dank an alle Teilnehmenden und Besucher für das grossartige Event und die inspirierenden Momente auf der Bühne! Die Fotos sind für eine gewisse Zeit online verfügbar – klick einfach auf den Button, um direkt zu deinen Bildern zu gelangen.',
      en: 'It was a pleasure to be the official photographer for the SNBF International Open Championship 2024. Thank you to all participants and attendees for an incredible event and inspiring moments on stage! The photos are available online for a limited time – simply click the button to view your images.',
    },
  },
];

export interface Exhibition {
  id?: string;
  title: string;
  date: string;
  dateLabel: L;
  venue: string;
  city: string;
  /** Bild-URL (z. B. Plakat) */
  image: string;
  imageAlt?: L;
  /** optional: verlinktes Portfolio-Bild */
  photoSlug?: string;
  text: L;
  url?: string;
  published?: boolean;
}

/** Standard-Ausstellungen (werden ersetzt, sobald in Firebase Ausstellungen angelegt sind). */
export const defaultExhibitions: Exhibition[] = [
  {
    title: 'Photo Schweiz 2021',
    date: '2021-07-02',
    dateLabel: { de: '2.–11. Juli 2021', en: '2–11 July 2021' },
    venue: 'Halle 550',
    city: 'Zürich-Oerlikon',
    image: '/photos/photo-schweiz-2021-ausstellung-960.webp',
    imageAlt: {
      de: 'Ausstellungsplakat Photo Schweiz 2021 mit Brandungsbild von Fabio Berta',
      en: 'Photo Schweiz 2021 exhibition poster with surf image by Fabio Berta',
    },
    photoSlug: 'brandung',
    url: 'https://www.photo-schweiz.ch',
    text: {
      de: 'Der erste Schritt ist vollbracht: Als Aussteller an der Photo Schweiz, der grössten Werkschau der Schweizer Fotografie, zeigte ich «Brandung» – ein Bild, das spontan an der Küste Montenegros entstanden ist.',
      en: 'The first step is done: as an exhibitor at Photo Schweiz, the largest showcase of Swiss photography, I showed «Surf» – an image taken spontaneously on the coast of Montenegro.',
    },
  },
];
