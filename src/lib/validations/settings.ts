import { z } from "zod";

export const settingsSchema = z.object({
  companyName: z.string().min(1).max(200),
  address: z.string().max(500),
  phone: z.string().max(20),
  license: z.string().max(50),
  email: z.string().email().or(z.literal("")),
  website: z.string().max(200),
  defaultLaborRate: z.number().min(0),
  defaultOverhead: z.number().min(0).max(1),
  defaultProfit: z.number().min(0).max(1),
  taxRate: z.number().min(0).max(1),
  defaultTerms: z.string(),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
