/**
 * Lesezugriff auf Firestore für die öffentliche Website.
 * - Mit Server-Schlüssel (FIREBASE_CLIENT_EMAIL/PRIVATE_KEY): Admin-SDK
 * - Ohne Schlüssel: öffentlicher Web-Zugang (firestore/lite) – liest nur, was die Regeln erlauben (veröffentlichte Inhalte)
 */
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, setLogLevel, collection, getDocs, query, where, doc, getDoc, type Firestore } from 'firebase/firestore/lite';
import { getDb } from './firebase';
import { publicFirebaseConfig } from './firebase-config';

type Data = Record<string, any>;

let lite: Firestore | null = null;
function getLite() {
  if (!lite) {
    const app = getApps().find((a) => a.name === 'public-reader') ?? initializeApp(publicFirebaseConfig, 'public-reader');
    lite = getFirestore(app);
    setLogLevel('silent'); // Fehler behandeln wir selbst (Fallback auf Standardinhalte)
    const emu = process.env.FIRESTORE_EMULATOR_HOST;
    if (emu) {
      const [host, port] = emu.split(':');
      connectFirestoreEmulator(lite, host, Number(port));
    }
  }
  return lite;
}

/** Alle veröffentlichten Dokumente einer Sammlung (Admin-SDK liefert alle; die Datenschicht filtert ohnehin). */
export async function listPublished(name: string): Promise<{ id: string; data: Data }[]> {
  const admin = getDb();
  if (admin) {
    const snap = await admin.collection(name).get();
    return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
  }
  const snap = await getDocs(query(collection(getLite(), name), where('published', '==', true)));
  return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
}

export async function readDoc(col: string, id: string): Promise<Data | undefined> {
  const admin = getDb();
  if (admin) return (await admin.collection(col).doc(id).get()).data();
  const snap = await getDoc(doc(getLite(), col, id));
  return snap.exists() ? snap.data() : undefined;
}
