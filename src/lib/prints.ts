import type { Lang } from '../i18n/routes';

/**
 * Print-Produkte & Preise (CHF).
 * Diese Werte sind nur der Standard – sobald Firebase verbunden ist, werden die Preise im Admin unter «Preise» gepflegt.
 * Grössen sind für Querformat angegeben; bei Hochformat werden sie automatisch gedreht.
 */
export interface PrintSize {
  id: string;
  w: number;
  h: number;
  price: number;
}
export interface PrintMaterial {
  id: string;
  name: Record<Lang, string>;
  description: Record<Lang, string>;
  active?: boolean;
  sizes: PrintSize[];
}
export interface PrintConfig {
  materials: PrintMaterial[];
  shipping: {
    ch: { label: Record<Lang, string>; price: number };
    eu: { label: Record<Lang, string>; price: number };
    freeFrom: number;
  };
}

export const defaultPrintConfig: PrintConfig = {
  materials: [
    {
      id: 'fineart',
      name: { de: 'Fine-Art-Papier', en: 'Fine art paper' },
      description: {
        de: 'Hahnemühle Photo Rag 308 g/m², museumstauglich, ungerahmt mit weissem Rand.',
        en: 'Hahnemühle Photo Rag 308 gsm, museum grade, unframed with white border.',
      },
      sizes: [
        { id: '30x20', w: 30, h: 20, price: 79 },
        { id: '45x30', w: 45, h: 30, price: 119 },
        { id: '60x40', w: 60, h: 40, price: 169 },
        { id: '90x60', w: 90, h: 60, price: 259 },
      ],
    },
    {
      id: 'alu',
      name: { de: 'Alu-Dibond', en: 'Aluminium Dibond' },
      description: {
        de: 'Direkt auf Aluminium-Verbundplatte kaschiert, mit Aufhängung. Modern und randlos.',
        en: 'Mounted on aluminium composite panel with hanging rail. Modern and borderless.',
      },
      sizes: [
        { id: '45x30', w: 45, h: 30, price: 189 },
        { id: '60x40', w: 60, h: 40, price: 249 },
        { id: '90x60', w: 90, h: 60, price: 369 },
        { id: '120x80', w: 120, h: 80, price: 549 },
      ],
    },
    {
      id: 'framed',
      name: { de: 'Gerahmt', en: 'Framed' },
      description: {
        de: 'Fine-Art-Print mit Passepartout im schwarzen Holzrahmen, entspiegeltes Glas.',
        en: 'Fine art print with mat in a black wooden frame, anti-reflective glass.',
      },
      sizes: [
        { id: '45x30', w: 45, h: 30, price: 229 },
        { id: '60x40', w: 60, h: 40, price: 299 },
        { id: '90x60', w: 90, h: 60, price: 449 },
      ],
    },
    {
      id: 'canvas',
      name: { de: 'Leinwand', en: 'Canvas' },
      description: {
        de: 'Auf 2 cm Keilrahmen gespannt, matte Oberfläche, bereit zum Aufhängen.',
        en: 'Stretched on a 2 cm frame, matte finish, ready to hang.',
      },
      sizes: [
        { id: '45x30', w: 45, h: 30, price: 149 },
        { id: '60x40', w: 60, h: 40, price: 199 },
        { id: '90x60', w: 90, h: 60, price: 299 },
        { id: '120x80', w: 120, h: 80, price: 429 },
      ],
    },
  ],
  shipping: {
    ch: { label: { de: 'Versand Schweiz & Liechtenstein', en: 'Shipping Switzerland & Liechtenstein' }, price: 15 },
    eu: { label: { de: 'Versand Europa', en: 'Shipping Europe' }, price: 35 },
    freeFrom: 300,
  },
};

export const activeMaterials = (cfg: PrintConfig) => cfg.materials.filter((m) => m.active !== false && m.sizes.length > 0);

export const minPrice = (cfg: PrintConfig) => Math.min(...activeMaterials(cfg).flatMap((m) => m.sizes.map((s) => s.price)));
export const maxPrice = (cfg: PrintConfig) => Math.max(...activeMaterials(cfg).flatMap((m) => m.sizes.map((s) => s.price)));

export function findVariant(cfg: PrintConfig, materialId: string, sizeId: string) {
  const material = activeMaterials(cfg).find((m) => m.id === materialId);
  const size = material?.sizes.find((s) => s.id === sizeId);
  return material && size ? { material, size } : null;
}

export const sizeLabel = (s: PrintSize, portrait: boolean) => (portrait ? `${s.h} × ${s.w} cm` : `${s.w} × ${s.h} cm`);

export const chf = (n: number, lang: Lang = 'de') =>
  new Intl.NumberFormat(lang === 'de' ? 'de-CH' : 'en-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(n);
