/**
 * Zentrale Lade-Funktionen für alle Inhalte.
 * Quelle ist Firestore (im Admin gepflegt); ohne Firebase-Verbindung oder bei leerer Sammlung
 * werden die Standardinhalte aus dem Code verwendet.
 */
import { cached } from './firebase';
import { listPublished, readDoc } from './store';
import { defaultEvents, defaultExhibitions, defaultServices, type EventItem, type Exhibition, type Service } from './content';
import { defaultPosts, type Post } from './posts';
import { defaultPrintConfig, type PrintConfig } from './prints';
import type { Lang } from '../i18n/routes';

const TTL = 60_000;

async function loadCollection<T>(name: string, map: (id: string, d: Record<string, any>) => T): Promise<T[] | null> {
  try {
    return await cached(name, TTL, async () => (await listPublished(name)).map((r) => map(r.id, r.data)));
  } catch (err) {
    console.error(`[data] Firestore nicht erreichbar (${name}):`, (err as Error).message);
    return null;
  }
}

const ts = (v: unknown) => (v && typeof v === 'object' && 'toDate' in v ? (v as { toDate(): Date }).toDate() : new Date(String(v)));

export async function getServices(): Promise<Service[]> {
  const rows = await loadCollection('services', (id, d) => ({ ...d, id }) as Service);
  const list = rows && rows.length ? rows.filter((s) => s.published !== false) : defaultServices;
  return [...list].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

export async function getService(id: string) {
  return (await getServices()).find((s) => s.id === id) ?? null;
}

export async function getServiceBySlug(slug: string, lang: Lang) {
  return (await getServices()).find((s) => s.slug?.[lang] === slug) ?? null;
}

/** Link einer Leistung: «Fine-Art-Prints» führt in den Shop, alle anderen auf ihre eigene Seite. */
export const serviceHref = (s: Service, lang: Lang, base: string, shop: string) => (s.id === 'fine-art' ? shop : `${base}/${s.slug[lang]}`);

export async function getEvents(): Promise<EventItem[]> {
  const rows = await loadCollection('events', (id, d) => ({ id, ...d }) as EventItem);
  const list = rows && rows.length ? rows.filter((e) => e.published !== false) : defaultEvents;
  return [...list].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getEvent(slug: string) {
  return (await getEvents()).find((e) => e.slug === slug) ?? null;
}

export async function getExhibitions(): Promise<Exhibition[]> {
  const rows = await loadCollection('exhibitions', (id, d) => ({ id, ...d }) as Exhibition);
  const list = rows && rows.length ? rows.filter((e) => e.published !== false) : defaultExhibitions;
  return [...list].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPosts(lang?: Lang): Promise<Post[]> {
  const rows = await loadCollection('posts', (id, d) => ({ ...d, id, date: ts(d.date), tags: d.tags ?? [] }) as Post);
  const list = rows && rows.length ? rows.filter((p) => p.published !== false) : await defaultPosts();
  return list.filter((p) => !lang || p.lang === lang).sort((a, b) => +b.date - +a.date);
}

export async function getPost(lang: Lang, slug: string) {
  return (await getPosts(lang)).find((p) => p.slug === slug) ?? null;
}

export async function getPrintConfig(): Promise<PrintConfig> {
  try {
    return await cached('prints', TTL, async () => {
      const d = (await readDoc('settings', 'prints')) as Partial<PrintConfig> | undefined;
      if (!d?.materials?.length) return defaultPrintConfig;
      return { materials: d.materials, shipping: { ...defaultPrintConfig.shipping, ...d.shipping } } as PrintConfig;
    });
  } catch (err) {
    console.error('[data] Firestore nicht erreichbar (prints):', (err as Error).message);
    return defaultPrintConfig;
  }
}
