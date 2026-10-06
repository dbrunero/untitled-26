import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const categories = {
  content: 'Foto & Video',
  social: 'Social & Ads',
  eventi: 'Eventi',
  ecommerce: 'Ecommerce',
  software: 'Software custom',
} as const;
export type CategoryKey = keyof typeof categories;

export const areas = { create: 'Create', grow: 'Grow', build: 'Build' } as const;

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** Slug used in the URL: /work/[slug]. Must match the file name. */
      slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      client: z.string(),
      year: z.number().int().min(2000).max(2100),
      category: z.enum(['content', 'social', 'eventi', 'ecommerce', 'software']),
      area: z.enum(['create', 'grow', 'build']),
      services: z.array(z.string()).min(1),
      excerpt: z.string().max(220),
      /** One-line outcome shown on cards. */
      result: z.string(),
      challenge: z.string(),
      solution: z.string(),
      cover: image(),
      coverAlt: z.string(),
      gallery: z
        .array(
          z.object({
            image: image(),
            alt: z.string(),
            caption: z.string().optional(),
            size: z.enum(['full', 'half', 'tall']).default('half'),
          }),
        )
        .default([]),
      videos: z
        .array(
          z.object({
            title: z.string(),
            /** Public path of an MP4, e.g. /media/loop.mp4. Optional: the poster is shown when missing. */
            src: z.string().optional(),
            poster: image(),
            alt: z.string(),
            vertical: z.boolean().default(false),
          }),
        )
        .default([]),
      metrics: z
        .array(
          z.object({
            value: z.string(),
            label: z.string(),
          }),
        )
        .default([]),
      featured: z.boolean().default(false),
      order: z.number().default(100),
      credits: z.array(z.object({ role: z.string(), name: z.string() })).default([]),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      /** true = placeholder case study created for the demo, to replace with real work. */
      demo: z.boolean().default(true),
    }),
});

export const collections = { projects };
