import { z } from 'zod';
import { serviceOptions, budgetOptions, timelineOptions } from './form-options';

const values = <T extends { value: string }>(list: T[]) => list.map((o) => o.value) as [string, ...string[]];

const trimmed = (min: number, max: number, requiredMsg: string, maxMsg: string) =>
  z
    .string({ error: requiredMsg })
    .trim()
    .min(min, { error: requiredMsg })
    .max(max, { error: maxMsg });

/** "example.com" and "https://example.com" are both accepted. */
const looseUrl = z
  .string()
  .trim()
  .max(200, { error: 'Indirizzo troppo lungo.' })
  .refine((v) => v === '' || /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}([/?#].*)?$/i.test(v), {
    error: 'Inserisci un indirizzo valido, per esempio example.com.',
  });

const phone = z
  .string()
  .trim()
  .max(30, { error: 'Numero troppo lungo.' })
  .refine((v) => v === '' || /^[+()\d\s./-]{6,30}$/.test(v), {
    error: 'Inserisci un numero valido, per esempio +39 333 123 4567.',
  });

export const contactSchema = z.object({
  name: trimmed(2, 120, 'Inserisci nome e cognome.', 'Nome troppo lungo.'),
  email: z
    .string({ error: 'Inserisci la tua email.' })
    .trim()
    .min(1, { error: 'Inserisci la tua email.' })
    .max(200, { error: 'Email troppo lunga.' })
    .pipe(z.email({ error: 'Inserisci un’email valida, per esempio nome@azienda.it.' })),
  company: trimmed(2, 160, 'Indica il nome dell’azienda.', 'Nome azienda troppo lungo.'),
  phone: phone.optional().default(''),
  website: looseUrl.optional().default(''),
  service: z.enum(values(serviceOptions), { error: 'Scegli il servizio di cui hai bisogno.' }),
  budget: z.enum(values(budgetOptions), { error: 'Scegli un budget indicativo.' }),
  timeline: z.enum(values(timelineOptions), { error: 'Scegli le tempistiche.' }),
  message: trimmed(20, 3000, 'Raccontaci il progetto in qualche riga.', 'Descrizione troppo lunga (massimo 3.000 caratteri).').pipe(
    z.string().min(20, { error: 'Servono almeno 20 caratteri: raccontaci obiettivo e contesto.' }),
  ),
  source: z.string().trim().max(200, { error: 'Testo troppo lungo.' }).optional().default(''),
  privacy: z.literal(true, { error: 'Per procedere devi confermare di aver letto l’informativa privacy.' }),
  marketing: z.boolean().optional().default(false),
  /** Honeypot: real users never see or fill this field. */
  hp: z.string().max(500).optional().default(''),
});

export type ContactInput = z.input<typeof contactSchema>;
export type ContactData = z.output<typeof contactSchema>;
export type FieldName = keyof ContactInput;
export type FieldErrors = Partial<Record<FieldName, string>>;

/** Field order used to focus the first error and to order the summary. */
export const fieldOrder: FieldName[] = [
  'name',
  'email',
  'company',
  'phone',
  'website',
  'service',
  'budget',
  'timeline',
  'message',
  'source',
  'privacy',
  'marketing',
];

export function flattenErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as FieldName | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export function validateContact(input: unknown):
  | { success: true; data: ContactData }
  | { success: false; errors: FieldErrors } {
  const parsed = contactSchema.safeParse(input);
  if (parsed.success) return { success: true, data: parsed.data };
  return { success: false, errors: flattenErrors(parsed.error) };
}

/** Validates one field in isolation (used for progressive client-side validation). */
export function validateField(name: FieldName, input: unknown): string | undefined {
  const result = contactSchema.safeParse(input);
  if (result.success) return undefined;
  return flattenErrors(result.error)[name];
}
