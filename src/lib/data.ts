/**
 * Zentrale Lade-Funktionen für alle Inhalte.
 * Quelle ist Firestore (im Admin gepflegt); ohne Firebase-Verbindung oder bei leerer Sammlung
 * werden die Standardinhalte aus dem Code verwendet.
 */
import { getDb, cached } from './firebase';
import { defaultEvents, defaultExhibitions, type EventItem, type Exhibition } from './content';
import { defaultPosts, type Post } from './posts';
import { defaultPrintConfig, type PrintConfig } from './prints';
import type { Lang } from '../i18n/routes';

const TTL = 60_000;

async function loadCollection<T>(name: string, map: (id: string, d: FirebaseFirestore.DocumentData) => T): Promise<T[] | null> {
  const db = getDb();
  if (!db) return null;
  try {
    return await cached(name, TTL, async () => {
      const snap = await db.collection(name).get();
      return snap.docs.map((d) => map(d.id, d.data()));
    });
  } catch (err) {
    console.error(`[data] Firestore-Fehler (${name}):`, err);
    return null;
  }
}

const ts = (v: unknown) => (v && typeof v === 'object' && 'toDate' in v ? (v as { toDate(): Date }).toDate() : new Date(String(v)));

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
  const db = getDb();
  if (!db) return defaultPrintConfig;
  try {
    return await cached('prints', TTL, async () => {
      const doc = await db.collection('settings').doc('prints').get();
      const d = doc.data() as Partial<PrintConfig> | undefined;
      if (!d?.materials?.length) return defaultPrintConfig;
      return { materials: d.materials, shipping: { ...defaultPrintConfig.shipping, ...d.shipping } } as PrintConfig;
    });
  } catch (err) {
    console.error('[data] Firestore-Fehler (prints):', err);
    return defaultPrintConfig;
  }
}
