import assert from "node:assert/strict";
import test from "node:test";
import { calculateUnitAvailabilityDelta } from "../src/modules/projects/projects.service";

test("unit availability delta increments available when moving to available", () => {
  const delta = calculateUnitAvailabilityDelta("sold", "available");
  assert.equal(delta.availableDelta, 1);
  assert.equal(delta.totalDelta, 0);
});

test("unit availability delta decrements available when moving away", () => {
  const delta = calculateUnitAvailabilityDelta("available", "sold");
  assert.equal(delta.availableDelta, -1);
  assert.equal(delta.totalDelta, 0);
});

test("unit availability delta counts new unit", () => {
  const delta = calculateUnitAvailabilityDelta(undefined, "available");
  assert.equal(delta.totalDelta, 1);
  assert.equal(delta.availableDelta, 1);
});
