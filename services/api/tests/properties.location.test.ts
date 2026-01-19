import test from "node:test";
import assert from "node:assert/strict";
import { LocationSchema } from "../src/modules/properties/properties.schemas";
import { deepStripUndefined } from "../src/modules/properties/properties.service";

test("LocationSchema accepts geo shape", () => {
  const result = LocationSchema.parse({
    citySlug: "chandrapur",
    locality: "civil-lines",
    geo: { lat: 19.95, lng: 79.29 }
  });
  assert.equal(result.geo?.lat, 19.95);
  assert.equal(result.geo?.lng, 79.29);
  assert.equal(result.lat, undefined);
  assert.equal(result.lng, undefined);
});

test("LocationSchema accepts legacy lat/lng", () => {
  const result = LocationSchema.parse({
    citySlug: "chandrapur",
    locality: "civil-lines",
    lat: 19.95,
    lng: 79.29
  });
  assert.equal(result.geo?.lat, 19.95);
  assert.equal(result.geo?.lng, 79.29);
  assert.equal(result.lat, undefined);
  assert.equal(result.lng, undefined);
});

test("LocationSchema prefers geo when both provided", () => {
  const result = LocationSchema.parse({
    citySlug: "chandrapur",
    locality: "civil-lines",
    geo: { lat: 19.11, lng: 79.22 },
    lat: 9,
    lng: 9
  });
  assert.equal(result.geo?.lat, 19.11);
  assert.equal(result.geo?.lng, 79.22);
  assert.equal(result.lat, undefined);
  assert.equal(result.lng, undefined);
});

test("LocationSchema allows missing coordinates", () => {
  const result = LocationSchema.parse({
    citySlug: "chandrapur",
    locality: "civil-lines"
  });
  assert.equal(result.geo, undefined);
});

test("LocationSchema validates latitude/longitude ranges", () => {
  assert.throws(() => {
    LocationSchema.parse({
      citySlug: "chandrapur",
      locality: "civil-lines",
      geo: { lat: 120, lng: 79.29 }
    });
  });
  assert.throws(() => {
    LocationSchema.parse({
      citySlug: "chandrapur",
      locality: "civil-lines",
      lat: 19.95,
      lng: 190
    });
  });
});

test("deepStripUndefined removes undefined keys and empty objects", () => {
  const result = deepStripUndefined({
    location: {
      citySlug: "chandrapur",
      locality: undefined,
      geo: {
        lat: 19.95,
        lng: undefined
      }
    },
    media: undefined,
    tags: [undefined, "a", undefined],
    emptyObj: {}
  });

  assert.deepEqual(result, {
    location: {
      citySlug: "chandrapur",
      geo: {
        lat: 19.95
      }
    },
    tags: ["a"]
  });
});
