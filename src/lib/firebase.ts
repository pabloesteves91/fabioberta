/**
 * Firebase Admin (nur Server). Liest/schreibt Firestore unabhängig von den Security Rules.
 * Konfiguration über Umgebungsvariablen – siehe SETUP.md.
 */
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const projectId = import.meta.env.FIREBASE_PROJECT_ID || import.meta.env.PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = import.meta.env.FIREBASE_CLIENT_EMAIL;
const privateKey = import.meta.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

// Lokale Entwicklung mit dem Firebase Emulator (FIRESTORE_EMULATOR_HOST gesetzt) braucht keinen Schlüssel
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

export const firebaseEnabled = Boolean(projectId && ((clientEmail && privateKey) || emulator));

let app: App | null = null;
let db: Firestore | null = null;

export function getDb(): Firestore | null {
  if (!firebaseEnabled) return null;
  if (!db) {
    app = getApps()[0] ?? initializeApp(emulator ? { projectId } : { credential: cert({ projectId, clientEmail, privateKey }) });
    db = getFirestore(app);
  }
  return db;
}

/** Kleiner In-Memory-Cache pro Server-Instanz, damit nicht jede Anfrage Firestore liest. */
const cache = new Map<string, { at: number; value?: unknown; error?: unknown }>();
export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  // Fehler werden 30 Sekunden gemerkt, damit nicht jede Seite erneut auf eine Zeitüberschreitung wartet
  if (hit && Date.now() - hit.at < (hit.error ? 30_000 : ttlMs)) {
    if (hit.error) throw hit.error;
    return hit.value as T;
  }
  try {
    const value = await load();
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch (error) {
    cache.set(key, { at: Date.now(), error });
    throw error;
  }
}
