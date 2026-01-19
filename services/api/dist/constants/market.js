"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIXED_PARTNER = exports.TARGET_CITIES = exports.TARGET_CITY_SLUGS = void 0;
exports.isTargetCitySlug = isTargetCitySlug;
exports.TARGET_CITY_SLUGS = ["chandrapur", "gadchiroli", "nagpur", "wardha", "yavatmal"];
exports.TARGET_CITIES = {
    chandrapur: { slug: "chandrapur", name: "Chandrapur", state: "Maharashtra" },
    gadchiroli: { slug: "gadchiroli", name: "Gadchiroli", state: "Maharashtra" },
    nagpur: { slug: "nagpur", name: "Nagpur", state: "Maharashtra" },
    wardha: { slug: "wardha", name: "Wardha", state: "Maharashtra" },
    yavatmal: { slug: "yavatmal", name: "Yavatmal", state: "Maharashtra" }
};
exports.FIXED_PARTNER = {
    id: "chandrapur-real-estate-solutions",
    name: "Chandrapur Real Estate Solutions Pvt Ltd"
};
function isTargetCitySlug(x) {
    return exports.TARGET_CITY_SLUGS.includes(x);
}
