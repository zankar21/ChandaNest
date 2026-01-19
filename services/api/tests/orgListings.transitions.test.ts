import assert from "node:assert/strict";
import test from "node:test";
import { transitionValidator } from "../src/modules/orgListings/orgListings.service";

test("submit from draft ok, submit from published rejected", () => {
  assert.equal(transitionValidator.assertTransition("draft", "submit"), true);
  assert.equal(transitionValidator.assertTransition("published", "submit"), false);
});

test("publish from approved ok, publish from draft rejected", () => {
  assert.equal(transitionValidator.assertTransition("approved", "publish"), true);
  assert.equal(transitionValidator.assertTransition("draft", "publish"), false);
});

test("unpublish from published ok", () => {
  assert.equal(transitionValidator.assertTransition("published", "unpublish"), true);
});
