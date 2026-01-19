import { Request, Response } from "express";
import { ZodError } from "zod";
import { DistanceMatrixRequestSchema } from "./nearby.schemas";
import { getDistanceMatrix } from "./nearby.service";

function handleError(err: unknown, res: Response) {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(", ");
    return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
  }
  if (err instanceof Error) {
    return res.status(400).json({ ok: false, error: { message: err.message, code: "BAD_REQUEST" } });
  }
  return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}

export async function distanceMatrixHandler(req: Request, res: Response) {
  try {
    const payload = DistanceMatrixRequestSchema.parse(req.body);
    const data = await getDistanceMatrix(payload);
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}
