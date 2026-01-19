import { Request, Response } from "express";
import { AuthUser } from "../../types";
import { GenerateAiDescriptionSchema } from "./aiDescriptions.schema";
import { generateListingDescription } from "./aiDescriptions.service";

export async function generateAiDescriptionHandler(req: Request, res: Response) {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { listingId } = req.params;
    const tenantId = typeof req.query.tenantId === "string" ? req.query.tenantId : user.tenantId;
    const body = GenerateAiDescriptionSchema.parse(req.body || {});
    const result = await generateListingDescription({
      tenantId,
      listingId,
      user,
      setActive: body.setActive,
      force: body.force
    });
    return res.json({ ok: true, data: result });
  } catch (err: any) {
    if (err?.message === "Forbidden") {
      return res.status(403).json({ ok: false, error: { message: "Forbidden", code: "FORBIDDEN" } });
    }
    if (err?.message === "NotFound") {
      return res.status(404).json({ ok: false, error: { message: "Listing not found", code: "NOT_FOUND" } });
    }
    if (err?.name === "ZodError") {
      return res.status(400).json({ ok: false, error: { message: "Invalid input", code: "BAD_REQUEST", issues: err.errors } });
    }
    return res.status(500).json({ ok: false, error: { message: "Failed to generate description", code: "INTERNAL_ERROR" } });
  }
}
