"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicNearby = getPublicNearby;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const env_1 = require("../../config/env");
const firebase_1 = require("../../config/firebase");
const logger_1 = require("../../utils/logger");
const properties_service_1 = require("../properties/properties.service");
const curatedAnchors_1 = require("./curatedAnchors");
const CACHE_COLLECTION = "nearbyCache";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_DISTANCE_MATRIX_DESTINATIONS = 10;
const CATEGORY_CONFIG = {
    atm: {
        title: "ATM",
        radiusMeters: 2000,
        limit: 1,
        types: ["atm"],
        walkingFirst: true
    },
    grocery: {
        title: "Grocery",
        radiusMeters: 3000,
        limit: 2,
        types: ["supermarket"],
        walkingFirst: true
    },
    pharmacy: {
        title: "Pharmacy",
        radiusMeters: 3000,
        limit: 1,
        types: ["pharmacy"],
        drivingFirst: true
    },
    school: {
        title: "School",
        radiusMeters: 7000,
        limit: 2,
        types: ["school"],
        drivingFirst: true
    },
    hospital: {
        title: "Hospital",
        radiusMeters: 10000,
        limit: 2,
        types: ["hospital"],
        drivingFirst: true
    },
    college: {
        title: "College",
        radiusMeters: 10000,
        limit: 1,
        types: ["university"],
        drivingFirst: true
    },
    market: {
        title: "Market",
        radiusMeters: 5000,
        limit: 1,
        types: ["shopping_mall"],
        drivingFirst: true
    },
    police: {
        title: "Police Station",
        radiusMeters: 5000,
        limit: 1,
        types: ["police"],
        drivingFirst: true
    },
    railway: {
        title: "Railway Station",
        radiusMeters: 15000,
        limit: 1,
        types: ["train_station"],
        drivingFirst: true
    },
    bus: {
        title: "Bus Stand",
        radiusMeters: 12000,
        limit: 1,
        types: ["bus_station"],
        drivingFirst: true
    },
    restaurant: {
        title: "Restaurant / Cafe",
        radiusMeters: 5000,
        limit: 1,
        types: ["restaurant", "cafe"],
        drivingFirst: true
    },
    park: {
        title: "Park",
        radiusMeters: 5000,
        limit: 1,
        types: ["park"],
        drivingFirst: true
    }
};
const CATEGORY_ORDER = [
    "hospital",
    "school",
    "railway",
    "market",
    "bus",
    "police",
    "college",
    "atm",
    "grocery",
    "pharmacy",
    "restaurant",
    "park"
];
function normalizeCityKey(value) {
    if (!value)
        return "";
    return value.toString().trim().toLowerCase();
}
function toDate(value) {
    if (!value)
        return null;
    if (value instanceof Date)
        return value;
    if (typeof value.toDate === "function")
        return value.toDate();
    return null;
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
function buildMapsUrl(lat, lng, placeId) {
    const base = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    return placeId ? `${base}&destination_place_id=${placeId}` : base;
}
function cacheDocId(propertyId, category, placeId, mode) {
    return `${propertyId}_${category}_${placeId}_${mode}`.replace(/[^\w-]/g, "_");
}
async function fetchPlaces(lat, lng, radiusMeters, type) {
    if (!env_1.env.googlePlacesApiKey)
        return [];
    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius", `${radiusMeters}`);
    url.searchParams.set("type", type);
    url.searchParams.set("key", env_1.env.googlePlacesApiKey);
    const res = await fetch(url.toString());
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload) {
        logger_1.logger.warn("Places API error", { status: res.status, type });
        return [];
    }
    if (payload.status && payload.status !== "OK" && payload.status !== "ZERO_RESULTS") {
        logger_1.logger.warn("Places API response status", { status: payload.status, type });
        return [];
    }
    return Array.isArray(payload.results) ? payload.results : [];
}
function passesFilters(category, place) {
    if (place?.business_status && place.business_status !== "OPERATIONAL")
        return false;
    const rating = typeof place?.rating === "number" ? place.rating : null;
    const reviews = typeof place?.user_ratings_total === "number" ? place.user_ratings_total : null;
    if (category === "restaurant") {
        return rating !== null && reviews !== null && rating >= 4.0 && reviews >= 30;
    }
    if (category === "hospital") {
        return (rating !== null && rating >= 3.7) || (reviews !== null && reviews >= 30);
    }
    if (category === "school") {
        if (reviews !== null && reviews < 25)
            return false;
        if (rating !== null && rating < 3.7)
            return false;
        return reviews !== null ? reviews >= 25 : true;
    }
    if (category === "college") {
        return reviews !== null ? reviews >= 15 : true;
    }
    return true;
}
function fromCurated(place, category, originLat, originLng) {
    const placeId = place.id || `${category}_${place.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    const distanceKm = roundKm(haversineKm(originLat, originLng, place.lat, place.lng));
    return {
        placeId,
        name: place.name,
        type: place.kind,
        address: null,
        rating: null,
        reviews: null,
        source: "curated",
        location: { lat: place.lat, lng: place.lng },
        googleMapsUrl: buildMapsUrl(place.lat, place.lng, place.id),
        distanceKm
    };
}
function fromPlacesResult(place, originLat, originLng) {
    const location = place?.geometry?.location;
    if (typeof location?.lat !== "number" || typeof location?.lng !== "number")
        return null;
    const distanceKm = roundKm(haversineKm(originLat, originLng, location.lat, location.lng));
    return {
        placeId: place.place_id,
        name: place.name,
        type: place?.types?.[0],
        address: place.vicinity ?? null,
        rating: typeof place?.rating === "number" ? place.rating : null,
        reviews: typeof place?.user_ratings_total === "number" ? place.user_ratings_total : null,
        source: "places",
        location: { lat: location.lat, lng: location.lng },
        googleMapsUrl: buildMapsUrl(location.lat, location.lng, place.place_id),
        distanceKm
    };
}
async function resolveCategoryPlaces(category, originLat, originLng, cityKey) {
    const curated = curatedAnchors_1.curatedAnchors?.[cityKey]?.[category];
    if (curated && curated.length > 0) {
        return curated.map((place) => fromCurated(place, category, originLat, originLng));
    }
    const config = CATEGORY_CONFIG[category];
    const batches = await Promise.all(config.types.map((type) => fetchPlaces(originLat, originLng, config.radiusMeters, type)));
    const merged = new Map();
    batches.flat().forEach((place) => {
        if (!passesFilters(category, place))
            return;
        const mapped = fromPlacesResult(place, originLat, originLng);
        if (!mapped)
            return;
        if (!merged.has(mapped.placeId)) {
            merged.set(mapped.placeId, mapped);
        }
    });
    return Array.from(merged.values()).sort((a, b) => a.distanceKm - b.distanceKm);
}
function preferredMinutes(place, config) {
    if (config.walkingFirst && place.walk?.minutes !== null && place.walk?.minutes !== undefined) {
        if (place.walk.minutes <= 25)
            return place.walk.minutes;
    }
    if (config.drivingFirst && place.drive?.minutes !== null && place.drive?.minutes !== undefined) {
        return place.drive.minutes;
    }
    if (place.drive?.minutes !== null && place.drive?.minutes !== undefined)
        return place.drive.minutes;
    if (place.walk?.minutes !== null && place.walk?.minutes !== undefined)
        return place.walk.minutes;
    return 9999;
}
function scorePlace(place, config) {
    const preferred = preferredMinutes(place, config);
    const driveKm = place.drive?.km ?? place.distanceKm;
    return preferred + 0.2 * driveKm;
}
function tieBreak(a, b) {
    const reviewsA = a.reviews ?? 0;
    const reviewsB = b.reviews ?? 0;
    if (reviewsA !== reviewsB)
        return reviewsB - reviewsA;
    const ratingA = a.rating ?? 0;
    const ratingB = b.rating ?? 0;
    return ratingB - ratingA;
}
async function resolveDistanceMatrix(propertyId, category, origin, places, mode) {
    const refs = places.map((place) => firebase_1.firestore.collection(CACHE_COLLECTION).doc(cacheDocId(propertyId, category, place.placeId, mode)));
    const snaps = await firebase_1.firestore.getAll(...refs);
    const now = new Date();
    const cached = new Map();
    snaps.forEach((snap) => {
        if (!snap.exists)
            return;
        const data = snap.data();
        const expiresAt = toDate(data?.expiresAt);
        if (!expiresAt || expiresAt <= now)
            return;
        if (data.originLat !== origin.lat ||
            data.originLng !== origin.lng ||
            data.destLat === undefined ||
            data.destLng === undefined) {
            return;
        }
        cached.set(data.placeId, data);
    });
    const missing = places.filter((place) => !cached.has(place.placeId));
    let fetched = new Map();
    if (missing.length > 0) {
        if (!env_1.env.googleMapsServerKey) {
            missing.forEach((place) => {
                const km = roundKm(haversineKm(origin.lat, origin.lng, place.location.lat, place.location.lng));
                fetched.set(place.placeId, {
                    propertyId,
                    category,
                    placeId: place.placeId,
                    mode,
                    originLat: origin.lat,
                    originLng: origin.lng,
                    destLat: place.location.lat,
                    destLng: place.location.lng,
                    km,
                    minutes: null,
                    status: "FALLBACK",
                    fetchedAt: firebase_admin_1.default.firestore.Timestamp.fromDate(now),
                    expiresAt: firebase_admin_1.default.firestore.Timestamp.fromDate(new Date(now.getTime() + CACHE_TTL_MS))
                });
            });
        }
        else {
            const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
            url.searchParams.set("origins", `${origin.lat},${origin.lng}`);
            url.searchParams.set("destinations", missing.map((place) => `${place.location.lat},${place.location.lng}`).join("|"));
            url.searchParams.set("mode", mode);
            url.searchParams.set("key", env_1.env.googleMapsServerKey);
            try {
                const res = await fetch(url.toString());
                const payload = await res.json().catch(() => null);
                if (!res.ok || !payload) {
                    throw new Error("Distance Matrix API error");
                }
                if (payload.status && payload.status !== "OK") {
                    throw new Error(`Distance Matrix status: ${payload.status}`);
                }
                const elements = payload.rows?.[0]?.elements || [];
                elements.forEach((element, idx) => {
                    const place = missing[idx];
                    if (!place)
                        return;
                    if (element?.status === "OK" && element.distance?.value !== undefined) {
                        const km = roundKm(element.distance.value / 1000);
                        const minutes = typeof element.duration?.value === "number"
                            ? Math.max(1, Math.round(element.duration.value / 60))
                            : null;
                        fetched.set(place.placeId, {
                            propertyId,
                            category,
                            placeId: place.placeId,
                            mode,
                            originLat: origin.lat,
                            originLng: origin.lng,
                            destLat: place.location.lat,
                            destLng: place.location.lng,
                            km,
                            minutes,
                            status: "OK",
                            fetchedAt: firebase_admin_1.default.firestore.Timestamp.fromDate(now),
                            expiresAt: firebase_admin_1.default.firestore.Timestamp.fromDate(new Date(now.getTime() + CACHE_TTL_MS))
                        });
                    }
                    else {
                        const km = roundKm(haversineKm(origin.lat, origin.lng, place.location.lat, place.location.lng));
                        fetched.set(place.placeId, {
                            propertyId,
                            category,
                            placeId: place.placeId,
                            mode,
                            originLat: origin.lat,
                            originLng: origin.lng,
                            destLat: place.location.lat,
                            destLng: place.location.lng,
                            km,
                            minutes: null,
                            status: element?.status || "FALLBACK",
                            fetchedAt: firebase_admin_1.default.firestore.Timestamp.fromDate(now),
                            expiresAt: firebase_admin_1.default.firestore.Timestamp.fromDate(new Date(now.getTime() + CACHE_TTL_MS))
                        });
                    }
                });
            }
            catch (err) {
                logger_1.logger.warn("Distance Matrix failed, using fallback", err);
                missing.forEach((place) => {
                    const km = roundKm(haversineKm(origin.lat, origin.lng, place.location.lat, place.location.lng));
                    fetched.set(place.placeId, {
                        propertyId,
                        category,
                        placeId: place.placeId,
                        mode,
                        originLat: origin.lat,
                        originLng: origin.lng,
                        destLat: place.location.lat,
                        destLng: place.location.lng,
                        km,
                        minutes: null,
                        status: "FALLBACK",
                        fetchedAt: firebase_admin_1.default.firestore.Timestamp.fromDate(now),
                        expiresAt: firebase_admin_1.default.firestore.Timestamp.fromDate(new Date(now.getTime() + CACHE_TTL_MS))
                    });
                });
            }
        }
    }
    const writes = [];
    fetched.forEach((value, key) => {
        const ref = firebase_1.firestore.collection(CACHE_COLLECTION).doc(cacheDocId(propertyId, category, key, mode));
        writes.push(ref.set(value));
    });
    if (writes.length) {
        await Promise.all(writes);
    }
    const all = new Map();
    cached.forEach((value, key) => all.set(key, value));
    fetched.forEach((value, key) => all.set(key, value));
    return all;
}
async function getPublicNearby(propertyId) {
    const property = (await (0, properties_service_1.getPublicProperty)(propertyId));
    const geo = property?.location?.geo ?? null;
    const originLat = typeof geo?.lat === "number" ? geo.lat : null;
    const originLng = typeof geo?.lng === "number" ? geo.lng : null;
    if (originLat === null || originLng === null) {
        return { available: false, reason: "missing_geo" };
    }
    const cityKey = normalizeCityKey(property?.location?.citySlug || property?.location?.city);
    const origin = { lat: originLat, lng: originLng };
    const categoryBuckets = {
        atm: [],
        grocery: [],
        pharmacy: [],
        school: [],
        hospital: [],
        college: [],
        market: [],
        police: [],
        railway: [],
        bus: [],
        restaurant: [],
        park: []
    };
    for (const category of CATEGORY_ORDER) {
        const places = await resolveCategoryPlaces(category, originLat, originLng, cityKey);
        const config = CATEGORY_CONFIG[category];
        const candidateLimit = Math.max(config.limit, 3);
        categoryBuckets[category] = places.slice(0, candidateLimit);
    }
    const selected = [];
    for (const category of CATEGORY_ORDER) {
        if (selected.length >= MAX_DISTANCE_MATRIX_DESTINATIONS)
            break;
        const places = categoryBuckets[category];
        if (places.length > 0) {
            selected.push({ category, place: { ...places[0] } });
        }
    }
    for (const category of CATEGORY_ORDER) {
        if (selected.length >= MAX_DISTANCE_MATRIX_DESTINATIONS)
            break;
        const places = categoryBuckets[category].slice(1);
        for (const place of places) {
            if (selected.length >= MAX_DISTANCE_MATRIX_DESTINATIONS)
                break;
            selected.push({ category, place: { ...place } });
        }
    }
    const grouped = new Map();
    selected.forEach(({ category, place }) => {
        if (!grouped.has(category))
            grouped.set(category, []);
        grouped.get(category)?.push(place);
    });
    for (const category of Array.from(grouped.keys())) {
        const places = grouped.get(category) || [];
        if (places.length === 0)
            continue;
        const driveMap = await resolveDistanceMatrix(propertyId, category, origin, places, "driving");
        const walkMap = await resolveDistanceMatrix(propertyId, category, origin, places, "walking");
        places.forEach((place) => {
            const drive = driveMap.get(place.placeId);
            const walk = walkMap.get(place.placeId);
            if (drive)
                place.drive = { km: drive.km, minutes: drive.minutes, status: drive.status };
            if (walk)
                place.walk = { km: walk.km, minutes: walk.minutes, status: walk.status };
        });
        const config = CATEGORY_CONFIG[category];
        const ranked = places
            .slice()
            .sort((a, b) => {
            const scoreA = scorePlace(a, config);
            const scoreB = scorePlace(b, config);
            const diff = scoreA - scoreB;
            if (Math.abs(diff) <= 3) {
                return tieBreak(a, b);
            }
            return diff;
        })
            .slice(0, config.limit);
        grouped.set(category, ranked);
    }
    const categories = CATEGORY_ORDER.map((category) => ({
        key: category,
        title: CATEGORY_CONFIG[category].title,
        radiusMeters: CATEGORY_CONFIG[category].radiusMeters,
        items: grouped.get(category) ?? []
    }));
    return {
        available: true,
        propertyId,
        origin,
        categories
    };
}
