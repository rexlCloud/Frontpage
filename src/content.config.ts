import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Guides in src/content/docs/<lang>/<slug>.md; both languages have the same slugs
const docs = defineCollection({
  loader: glob({ base: './src/content/docs', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    group: z.enum(['start', 'operate', 'develop']),
    order: z.number(),
  }),
});

export const collections = { docs };
