/**
 * Öffentliche Firebase-Web-Konfiguration (Projekt «fabioberta-b6326»).
 * Diese Werte sind nicht geheim – sie stehen in jeder Firebase-Web-App im Browser.
 * Die Sicherheit kommt aus den Regeln in /firebase/*.rules. Umgebungsvariablen haben Vorrang.
 */
const env = import.meta.env;

export const publicFirebaseConfig = {
  apiKey: env.PUBLIC_FIREBASE_API_KEY || 'AIzaSyBopcTkpdNxS56THGfHLIMFfpc9e9_oDv4',
  authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN || 'fabioberta-b6326.firebaseapp.com',
  projectId: env.PUBLIC_FIREBASE_PROJECT_ID || 'fabioberta-b6326',
  storageBucket: env.PUBLIC_FIREBASE_STORAGE_BUCKET || 'fabioberta-b6326.firebasestorage.app',
  messagingSenderId: '844004105619',
  appId: env.PUBLIC_FIREBASE_APP_ID || '1:844004105619:web:8d1966fd6e9d2d5402dc66',
};
