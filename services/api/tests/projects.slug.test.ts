import assert from "node:assert/strict";
import test from "node:test";
import { slugify } from "../src/utils/slugify";
import { computeUniqueSlug } from "../src/modules/projects/projects.service";

test("slugify produces URL-safe slug", () => {
  const slug = slugify("Sunrise Residency - Phase 2!", 80);
  assert.equal(slug, "sunrise-residency-phase-2");
});

test("computeUniqueSlug prevents collisions", () => {
  const base = "sunrise-residency";
  const existing = ["sunrise-residency", "sunrise-residency-2", "sunrise-residency-3"];
  const next = computeUniqueSlug(base, existing);
  assert.equal(next, "sunrise-residency-4");
});
