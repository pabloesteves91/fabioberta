/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly PUBLIC_FIREBASE_API_KEY?: string;
  readonly PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
  readonly PUBLIC_FIREBASE_PROJECT_ID?: string;
  readonly PUBLIC_FIREBASE_STORAGE_BUCKET?: string;
  readonly PUBLIC_FIREBASE_APP_ID?: string;
  readonly PUBLIC_FIREBASE_EMULATOR?: string;
  readonly FIREBASE_PROJECT_ID?: string;
  readonly FIREBASE_CLIENT_EMAIL?: string;
  readonly FIREBASE_PRIVATE_KEY?: string;
  readonly STRIPE_SECRET_KEY?: string;
  readonly STRIPE_WEBHOOK_SECRET?: string;
  readonly RESEND_API_KEY?: string;
  readonly NOTIFY_EMAIL?: string;
  readonly MAIL_FROM?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
