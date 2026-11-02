import { getCollection } from 'astro:content';
import { marked } from 'marked';
import type { Lang } from '../i18n/routes';

export interface Post {
  id?: string;
  slug: string;
  lang: Lang;
  translationKey: string;
  title: string;
  description: string;
  date: Date;
  cover: string;
  tags: string[];
  /** Markdown */
  body: string;
  published?: boolean;
}

/** Standard-Beiträge aus src/content/journal (werden ersetzt, sobald in Firebase Beiträge angelegt sind). */
export async function defaultPosts(): Promise<Post[]> {
  const entries = await getCollection('journal');
  return entries.map((e) => ({ ...e.data, date: e.data.date, body: e.body ?? '' }));
}

export const renderMarkdown = (md: string) => marked.parse(md, { async: false, gfm: true }) as string;
