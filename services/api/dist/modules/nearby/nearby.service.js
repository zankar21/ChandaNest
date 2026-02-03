"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDistanceMatrix = getDistanceMatrix;
const env_1 = require("../../config/env");
const logger_1 = require("../../utils/logger");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map();
function cacheKey(origin, destination, mode) {
    const round = (value) => value.toFixed(6);
    return `${round(origin.lat)},${round(origin.lng)}|${round(destination.lat)},${round(destination.lng)}|${mode}`;
}
function haversineKm(lat1, lng1, lat2, lng2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const radiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return radiusKm * c;
}
function roundKm(km) {
    return Math.round(km * 10) / 10;
}
function fallbackDistance(origin, destination, status) {
    const km = roundKm(haversineKm(origin.lat, origin.lng, destination.lat, destination.lng));
    return { km, minutes: null, status };
}
async function callDistanceMatrix(origin, destinations, mode) {
    const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
    url.searchParams.set("origins", `${origin.lat},${origin.lng}`);
    url.searchParams.set("destinations", destinations.map((d) => `${d.lat},${d.lng}`).join("|"));
    url.searchParams.set("mode", mode);
    url.searchParams.set("key", env_1.env.googleMapsServerKey);
    const res = await fetch(url.toString());
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload) {
        throw new Error("Distance Matrix API error");
    }
    if (payload.status && payload.status !== "OK") {
        throw new Error(`Distance Matrix status: ${payload.status}`);
    }
    const elements = payload.rows?.[0]?.elements || [];
    return elements;
}
async function getDistanceMatrix(payload) {
    const { origin, destinations, mode } = payload;
    const results = new Map();
    const now = Date.now();
    const missing = [];
    destinations.forEach((dest, index) => {
        const key = cacheKey(origin, dest, mode);
        const cached = cache.get(key);
        if (cached && cached.expiresAt > now) {
            results.set(key, cached.value);
        }
        else {
            missing.push({ index, dest });
        }
    });
    if (missing.length > 0) {
        if (!env_1.env.googleMapsServerKey) {
            missing.forEach(({ dest }) => {
                results.set(cacheKey(origin, dest, mode), fallbackDistance(origin, dest, "FALLBACK"));
            });
        }
        else {
            const toFetch = missing.map((item) => item.dest);
            try {
                const elements = await callDistanceMatrix(origin, toFetch, mode);
                elements.forEach((element, idx) => {
                    const dest = toFetch[idx];
                    const key = cacheKey(origin, dest, mode);
                    if (!dest)
                        return;
                    if (element?.status === "OK" && element.distance?.value !== undefined) {
                        const km = roundKm(element.distance.value / 1000);
                        const minutes = typeof element.duration?.value === "number"
                            ? Math.max(1, Math.round(element.duration.value / 60))
                            : null;
                        results.set(key, { km, minutes, status: "OK" });
                    }
                    else {
                        const status = typeof element?.status === "string" ? element.status : "FALLBACK";
                        results.set(key, fallbackDistance(origin, dest, status));
                    }
                });
            }
            catch (err) {
                logger_1.logger.warn("Distance Matrix fetch failed, using fallback", err);
                missing.forEach(({ dest }) => {
                    results.set(cacheKey(origin, dest, mode), fallbackDistance(origin, dest, "FALLBACK"));
                });
            }
        }
        const expiresAt = now + CACHE_TTL_MS;
        results.forEach((value, key) => {
            cache.set(key, { value, expiresAt });
        });
    }
    return destinations.map((dest) => {
        const key = cacheKey(origin, dest, mode);
        const result = results.get(key) || fallbackDistance(origin, dest, "FALLBACK");
        return {
            label: dest.label,
            type: dest.type,
            km: result.km,
            minutes: result.minutes ?? null,
            status: result.status
        };
    });
}
