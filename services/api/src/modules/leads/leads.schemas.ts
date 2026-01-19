import { z } from "zod";

export const LeadStageSchema = z.enum([
  "new",
  "contacted",
  "site_visit",
  "negotiation",
  "closed_won",
  "closed_lost"
]);

export const LeadSubjectKindSchema = z.enum(["property", "project", "general"]);

export const LeadPrioritySchema = z.enum(["low", "medium", "high"]);

export const LeadChannelSchema = z.enum(["web", "phone", "whatsapp", "agent", "import"]);

export const LeadSourcePageSchema = z.enum(["property", "project", "home", "map", "search"]).optional();

export const LeadUtmSchema = z.object({
  source: z.string().optional(),
  medium: z.string().optional(),
  campaign: z.string().optional()
});

export const LeadSubjectSchema = z.object({
  kind: LeadSubjectKindSchema,
  propertyId: z.string().optional(),
  projectId: z.string().optional(),
  projectSlug: z.string().optional(),
  title: z.string().optional(),
  href: z.string().optional(),
  city: z.string().optional(),
  area: z.string().optional()
});

export const LeadContactSchema = z.object({
  name: z.string().max(80).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  message: z.string().max(1000).optional()
});

export const PublicLeadCreateSchema = z.object({
  tenantId: z.string().optional(),
  subject: LeadSubjectSchema,
  contact: LeadContactSchema,
  source: z
    .object({
      page: LeadSourcePageSchema,
      utm: LeadUtmSchema.optional()
    })
    .optional(),
  website: z.string().optional()
});

export const AdminLeadCreateSchema = z.object({
  subject: LeadSubjectSchema,
  contact: LeadContactSchema,
  stage: LeadStageSchema.optional(),
  priority: LeadPrioritySchema.optional(),
  tags: z.array(z.string().max(32)).optional()
});

export const AdminLeadUpdateSchema = z.object({
  subject: LeadSubjectSchema.optional(),
  contact: LeadContactSchema.optional(),
  priority: LeadPrioritySchema.optional(),
  tags: z.array(z.string().max(32)).optional()
});

export const LeadAssignSchema = z.object({
  uid: z.string().min(1),
  name: z.string().optional(),
  role: z.string().optional()
});

export const LeadStageUpdateSchema = z.object({
  stage: LeadStageSchema,
  lostReason: z.string().min(3).max(200).optional()
});

export const LeadNoteCreateSchema = z.object({
  type: z.enum(["note", "call", "whatsapp", "email", "system"]),
  text: z.string().min(1).max(2000)
});

export const LeadQuerySchema = z.object({
  q: z.string().optional(),
  stage: LeadStageSchema.optional(),
  assignee: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().optional()
});
