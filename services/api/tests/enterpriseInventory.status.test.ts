import assert from "node:assert/strict";
import test from "node:test";
import { InventoryStatusSchema } from "../src/modules/enterpriseInventory/enterpriseInventory.schemas";

test("inventory status schema rejects invalid status", () => {
  assert.throws(() => InventoryStatusSchema.parse("invalid"));
});

test("inventory status schema accepts booked", () => {
  assert.equal(InventoryStatusSchema.parse("booked"), "booked");
});
