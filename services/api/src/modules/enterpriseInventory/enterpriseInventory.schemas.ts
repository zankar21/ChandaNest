import { z } from "zod";

export const InventoryStatusSchema = z.enum(["available", "hold", "booked", "sold"]);

export const InventoryTypeSchema = z.enum([
  "unit",
  "plot",
  "shop",
  "office",
  "other"
]);

export const InventoryCreateSchema = z.object({
  inventoryType: InventoryTypeSchema,
  code: z.string().min(1),
  title: z.string().min(1).optional(),
  areaSqFt: z.number().positive().optional(),
  areaSqM: z.number().positive().optional(),
  facing: z.string().min(1).optional(),
  floor: z.number().int().min(0).optional(),
  priceTotal: z.number().positive().optional(),
  attributes: z.record(z.any()).optional(),
  status: InventoryStatusSchema.default("available")
});

export const InventoryPatchSchema = InventoryCreateSchema.partial();

export const InventoryStatusPatchSchema = z.object({
  status: InventoryStatusSchema
});

export const InventoryQuerySchema = z.object({
  status: InventoryStatusSchema.optional(),
  inventoryType: InventoryTypeSchema.optional()
});
