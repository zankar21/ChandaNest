import { Request, Response } from "express";
import { ZodError, z } from "zod";
import { createSignedGetUrls } from "../media/media.service";
import { isSafeObjectPath } from "../../utils/objectPath";

const PublicMediaSignGetSchema = z.object({
  paths: z.array(z.string().min(5)).min(1).max(50)
});

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

function extractTenantFromPath(path: string): string | null {
  const match = /^tenants\/([^/]+)\/(properties|listings|projects)\/[^/]+\/media\/.+$/.exec(path);
  return match ? match[1] : null;
}

function validatePublicPath(path: string): string | null {
  if (!isSafeObjectPath(path)) {
    return "Invalid path";
  }
  if (!/^[A-Za-z0-9._/\\-]+$/.test(path)) {
    return "Invalid characters in path";
  }
  if (/^https?:\/\//i.test(path) || path.toLowerCase().includes("gs://")) {
    return "Invalid path";
  }
  if (!/^tenants\/[^/]+\/(properties|listings|projects)\/[^/]+\/media\/.+$/.test(path)) {
    return "Path not allowed";
  }
  return null;
}

function respondInvalidCharacters(res: Response, badPath: string) {
  const details =
    process.env.NODE_ENV !== "production" ? { details: { badPath } } : {};
  return res.status(400).json({
    ok: false,
    error: {
      code: "BAD_REQUEST",
      message: "Invalid characters in path",
      ...details
    }
  });
}

// Example: curl -X POST http://localhost:8080/v1/public/media/sign-get -H "Content-Type: application/json" -d "{\"paths\":[\"tenants/demo/properties/prop123/media/hero.webp\"]}"
export async function publicSignGet(req: Request, res: Response) {
  try {
    const payload = PublicMediaSignGetSchema.parse(req.body);
    const firstPath = payload.paths[0];
    const firstError = validatePublicPath(firstPath);
    if (firstError) {
      if (firstError === "Invalid characters in path") {
        return respondInvalidCharacters(res, firstPath);
      }
      throw new Error(firstError);
    }
    const tenantId = extractTenantFromPath(firstPath);
    if (!tenantId) {
      throw new Error("Invalid path");
    }
    for (const p of payload.paths) {
      const error = validatePublicPath(p);
      if (error) {
        if (error === "Invalid characters in path") {
          return respondInvalidCharacters(res, p);
        }
        throw new Error(error);
      }
      const t = extractTenantFromPath(p);
      if (t !== tenantId) {
        throw new Error("All paths must be under the same tenant");
      }
    }

    const data = await createSignedGetUrls(
      { tenantId, paths: payload.paths },
      { expiresMs: 5 * 60 * 1000 }
    );
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}
