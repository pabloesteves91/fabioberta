export const locales = ['de', 'en'] as const;
export type Lang = (typeof locales)[number];
export const defaultLang: Lang = 'de';

type RouteMap = Record<Lang, string>;

export const routes = {
  home: { de: '/', en: '/en' },
  portfolio: { de: '/portfolio', en: '/en/portfolio' },
  services: { de: '/leistungen', en: '/en/services' },
  shop: { de: '/shop', en: '/en/shop' },
  shopThanks: { de: '/shop/danke', en: '/en/shop/thank-you' },
  events: { de: '/events', en: '/en/events' },
  exhibitions: { de: '/ausstellungen', en: '/en/exhibitions' },
  about: { de: '/ueber-mich', en: '/en/about' },
  journal: { de: '/journal', en: '/en/journal' },
  contact: { de: '/kontakt', en: '/en/contact' },
  imprint: { de: '/impressum', en: '/en/imprint' },
  privacy: { de: '/datenschutz', en: '/en/privacy' },
  terms: { de: '/agb', en: '/en/terms' },
} satisfies Record<string, RouteMap>;

export type RouteKey = keyof typeof routes;

export const r = (key: RouteKey, lang: Lang) => routes[key][lang];

export const photoUrl = (slug: string, lang: Lang) => `${routes.portfolio[lang]}/${slug}`;
export const eventUrl = (slug: string, lang: Lang) => `${routes.events[lang]}/${slug}`;

export function getLangFromUrl(url: URL): Lang {
  return url.pathname === '/en' || url.pathname.startsWith('/en/') ? 'en' : 'de';
}
