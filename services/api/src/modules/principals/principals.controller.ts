import { Request, Response } from "express";
import { ZodError } from "zod";
import { AugmentedRequest } from "../../types";
import { getMyPrincipals } from "./principals.service";

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

export async function principalsMeHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const tenantId = req.params.tenantId;
    if (user.tenantId !== tenantId && user.role !== "platform_admin") {
      return res.status(403).json({ ok: false, error: { message: "Forbidden", code: "FORBIDDEN" } });
    }
    const data = await getMyPrincipals({ tenantId, user });
    res.json(data);
  } catch (err) {
    handleError(err, res);
  }
}
