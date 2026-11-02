import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const journal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/journal' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    lang: z.enum(['de', 'en']),
    slug: z.string(),
    translationKey: z.string(),
    cover: z.string(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { journal };
