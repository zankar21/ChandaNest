import { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger";

// Basic Express error handler to surface consistent JSON errors
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = typeof (err as any)?.status === "number" ? (err as any).status : 500;
  const message = (err as any)?.message ?? "Internal Server Error";

  logger.error("Unhandled error", err);
  res.status(status).json({ message });
}
