import local from '../data/photos.json';
import { getPublicClient } from './supabase';
import type { Lang } from '../i18n/routes';

export type Category = 'street' | 'landscape' | 'travel' | 'event' | 'portrait';
export const categories: Category[] = ['street', 'landscape', 'travel', 'event', 'portrait'];

export interface Photo {
  id: string;
  slug: string;
  category: Category;
  title: Record<Lang, string>;
  alt: Record<Lang, string>;
  location: string;
  featured: boolean;
  forSale: boolean;
  sort: number;
  src: string;
  thumb: string;
  width: number;
  height: number;
  color: string;
}

interface PhotoRow {
  id: string;
  slug: string;
  category: Category;
  title_de: string;
  title_en: string | null;
  alt_de: string;
  alt_en: string | null;
  location: string | null;
  featured: boolean;
  for_sale: boolean;
  sort: number;
  src: string;
  thumb: string | null;
  width: number;
  height: number;
  color: string | null;
}

const fromRow = (r: PhotoRow): Photo => ({
  id: r.id,
  slug: r.slug,
  category: r.category,
  title: { de: r.title_de, en: r.title_en || r.title_de },
  alt: { de: r.alt_de, en: r.alt_en || r.alt_de },
  location: r.location ?? '',
  featured: r.featured,
  forSale: r.for_sale,
  sort: r.sort,
  src: r.src,
  thumb: r.thumb || r.src,
  width: r.width,
  height: r.height,
  color: r.color || '#1a1a1a',
});

const localPhotos = (local as unknown as (Omit<Photo, 'category'> & { category: string })[]).filter(
  (p) => p.category !== '_site',
) as Photo[];

/** Alle veröffentlichten Fotos – aus Supabase, sonst lokale Platzhalter. */
export async function getPhotos(): Promise<Photo[]> {
  const db = getPublicClient();
  if (db) {
    const { data, error } = await db
      .from('photos')
      .select('*')
      .eq('published', true)
      .order('sort', { ascending: true });
    if (!error && data && data.length) return (data as PhotoRow[]).map(fromRow);
    if (error) console.error('[photos] Supabase-Fehler, nutze lokale Bilder:', error.message);
  }
  return [...localPhotos].sort((a, b) => a.sort - b.sort);
}

export async function getPhoto(slug: string) {
  const all = await getPhotos();
  const index = all.findIndex((p) => p.slug === slug);
  if (index === -1) return null;
  const photo = all[index];
  const series = all.filter((p) => p.category === photo.category);
  const si = series.findIndex((p) => p.slug === slug);
  return {
    photo,
    prev: series[(si - 1 + series.length) % series.length],
    next: series[(si + 1) % series.length],
    related: series.filter((p) => p.slug !== slug).slice(0, 6),
  };
}

/** Feste Seitenbilder (Portrait, Ausstellungsplakat). */
export function siteImage(slug: string) {
  const img = (local as unknown as Photo[]).find((p) => p.slug === slug);
  if (!img) throw new Error(`Seitenbild ${slug} fehlt`);
  return img;
}

/** Fotografie-Genre als Wort, z. B. «Landschaftsfotografie» / «Landscape photography» (SEO-Titel). */
export const genre: Record<Category, Record<Lang, string>> = {
  street: { de: 'Streetfotografie', en: 'Street photography' },
  landscape: { de: 'Landschaftsfotografie', en: 'Landscape photography' },
  travel: { de: 'Reisefotografie', en: 'Travel photography' },
  event: { de: 'Event- & Sportfotografie', en: 'Event & sports photography' },
  portrait: { de: 'Portraitfotografie', en: 'Portrait photography' },
};

export const srcset = (p: Pick<Photo, 'src' | 'thumb'>) =>
  p.thumb === p.src ? undefined : `${p.thumb} 960w, ${p.src} 1920w`;
