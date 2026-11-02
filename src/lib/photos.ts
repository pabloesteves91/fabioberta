import local from '../data/photos.json';
import { getDb, cached } from './firebase';
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

const localPhotos = (local as unknown as (Omit<Photo, 'category'> & { category: string })[]).filter(
  (p) => p.category !== '_site',
) as Photo[];

/** Alle veröffentlichten Fotos – aus Firestore, sonst lokale Platzhalter. */
export async function getPhotos(): Promise<Photo[]> {
  const db = getDb();
  if (db) {
    try {
      const photos = await cached('photos', 60_000, async () => {
        const snap = await db.collection('photos').where('published', '==', true).get();
        return snap.docs.map((d) => toPhoto(d.id, d.data())).sort((a, b) => a.sort - b.sort);
      });
      if (photos.length) return photos;
    } catch (err) {
      console.error('[photos] Firestore-Fehler, nutze lokale Bilder:', err);
    }
  }
  return [...localPhotos].sort((a, b) => a.sort - b.sort);
}

function toPhoto(id: string, d: FirebaseFirestore.DocumentData): Photo {
  return {
    id,
    slug: d.slug,
    category: d.category,
    title: { de: d.title?.de ?? '', en: d.title?.en || d.title?.de || '' },
    alt: { de: d.alt?.de || d.title?.de || '', en: d.alt?.en || d.alt?.de || d.title?.de || '' },
    location: d.location ?? '',
    featured: Boolean(d.featured),
    forSale: Boolean(d.forSale),
    sort: Number(d.sort ?? 0),
    src: d.src,
    thumb: d.thumb || d.src,
    width: Number(d.width),
    height: Number(d.height),
    color: d.color || '#1a1a1a',
  };
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
