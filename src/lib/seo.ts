import { site } from './site';
import type { Lang } from '../i18n/routes';

export const abs = (path: string) => new URL(path, site.url).toString();

export function businessSchema(lang: Lang) {
  return {
    '@context': 'https://schema.org',
    '@type': ['ProfessionalService', 'LocalBusiness'],
    '@id': `${site.url}/#business`,
    name: site.brand,
    alternateName: site.name,
    url: site.url,
    image: abs(site.ogImage),
    logo: abs('/favicon.svg'),
    description:
      lang === 'de'
        ? 'Fotograf in Zürich für Event- und Sportfotografie, Portraits, Businessfotos sowie Street- und Landschaftsfotografie als Fine-Art-Prints.'
        : 'Photographer in Zurich for event and sports photography, portraits, business photos as well as street and landscape fine art prints.',
    priceRange: 'CHF 290 – CHF 1900',
    address: { '@type': 'PostalAddress', addressLocality: site.city, addressRegion: site.region, addressCountry: site.country },
    areaServed: site.areaServed.map((name) => ({ '@type': name === 'Schweiz' ? 'Country' : 'City', name })),
    sameAs: [site.instagram],
    founder: { '@id': `${site.url}/#person` },
    knowsAbout: ['Eventfotografie', 'Sportfotografie', 'Portraitfotografie', 'Businessfotografie', 'Streetfotografie', 'Landschaftsfotografie'],
  };
}

export function personSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${site.url}/#person`,
    name: site.name,
    jobTitle: 'Fotograf',
    url: site.url,
    image: abs('/photos/fabio-berta-fotograf-zuerich-960.webp'),
    sameAs: [site.instagram],
    homeLocation: { '@type': 'Place', name: 'Zürich' },
  };
}

export function websiteSchema(lang: Lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    url: site.url,
    name: site.brand,
    inLanguage: lang === 'de' ? 'de-CH' : 'en',
    publisher: { '@id': `${site.url}/#business` },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.url) })),
  };
}

export function faqSchema(faq: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function imageSchema(p: { src: string; title: string; alt: string; location: string }, pageUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    contentUrl: abs(p.src),
    name: p.title,
    description: p.alt,
    contentLocation: p.location ? { '@type': 'Place', name: p.location } : undefined,
    creator: { '@type': 'Person', name: site.name },
    copyrightHolder: { '@type': 'Person', name: site.name },
    creditText: site.name,
    copyrightNotice: `© ${site.name}`,
    license: abs('/agb'),
    acquireLicensePage: abs(pageUrl),
  };
}
