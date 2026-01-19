import { Request, Response } from "express";
import { ZodError } from "zod";
import { AugmentedRequest } from "../../types";
import {
  createInventoryItem,
  getInventoryItem,
  listInventoryItems,
  updateInventoryItem,
  updateInventoryStatus
} from "./enterpriseInventory.service";
import {
  InventoryCreateSchema,
  InventoryPatchSchema,
  InventoryStatusPatchSchema
} from "./enterpriseInventory.schemas";

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

export async function createInventoryItemHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = InventoryCreateSchema.parse(req.body);
    const data = await createInventoryItem({
      tenantId: req.params.tenantId,
      enterpriseId: req.params.enterpriseId,
      projectId: req.params.projectId,
      user,
      body: payload
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function listInventoryItemsHandler(req: Request, res: Response) {
  try {
    const data = await listInventoryItems({
      tenantId: req.params.tenantId,
      enterpriseId: req.params.enterpriseId,
      projectId: req.params.projectId,
      query: req.query
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function getInventoryItemHandler(req: Request, res: Response) {
  try {
    const data = await getInventoryItem({
      tenantId: req.params.tenantId,
      enterpriseId: req.params.enterpriseId,
      projectId: req.params.projectId,
      itemId: req.params.itemId
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function updateInventoryItemHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = InventoryPatchSchema.parse(req.body);
    const data = await updateInventoryItem({
      tenantId: req.params.tenantId,
      enterpriseId: req.params.enterpriseId,
      projectId: req.params.projectId,
      itemId: req.params.itemId,
      user,
      body: payload
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function updateInventoryStatusHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = InventoryStatusPatchSchema.parse(req.body);
    const data = await updateInventoryStatus({
      tenantId: req.params.tenantId,
      enterpriseId: req.params.enterpriseId,
      projectId: req.params.projectId,
      itemId: req.params.itemId,
      user,
      body: payload
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}
