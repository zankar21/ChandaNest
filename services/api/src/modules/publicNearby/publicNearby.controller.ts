import { Request, Response } from "express";
import { ZodError } from "zod";
import { PublicNearbyParamsSchema } from "./publicNearby.schemas";
import { getPublicNearby } from "./publicNearby.service";

function handleError(err: unknown, res: Response) {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(", ");
    return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
  }
  if (err instanceof Error) {
    const code = err.message === "Not found" ? "NOT_FOUND" : "BAD_REQUEST";
    const status = code === "NOT_FOUND" ? 404 : 400;
    return res.status(status).json({ ok: false, error: { message: err.message, code } });
  }
  return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}

export async function publicNearbyHandler(req: Request, res: Response) {
  try {
    const params = PublicNearbyParamsSchema.parse(req.params);
    const data = await getPublicNearby(params.propertyId);
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}
