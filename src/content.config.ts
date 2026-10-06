import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const image = z.object({
  member: z.enum(['karina', 'giselle', 'winter', 'ningning', 'group']),
  kind: z.enum(['local', 'remote']),
  src: z.string().optional(),
  remote: z.string().url().optional(),
  pageUrl: z.string().url().nullable(),
  credit: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  tags: z.array(z.string()),
  license: z.string().optional(),
  licenseUrl: z.string().nullable().optional(),
}).refine(i => (i.kind === 'local' ? !!i.src : !!i.remote), { message: 'local needs src, remote needs remote' });

const video = z.object({
  ytId: z.string().regex(/^[\w-]{11}$/), title: z.string(), channel: z.string().nullable(),
  kind: z.enum(['mv', 'performance', 'fancam', 'other']), views: z.number(), member: z.string().nullable(),
});

const eras = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/eras/_generated' }),
  schema: z.object({
    slug: z.string(), title: z.string(), releaseDate: z.string(), generatedAt: z.string(),
    videos: z.array(video),
    images: z.object({ karina: z.array(image), giselle: z.array(image), winter: z.array(image), ningning: z.array(image), group: z.array(image) }),
  }),
});

export const collections = { eras };
