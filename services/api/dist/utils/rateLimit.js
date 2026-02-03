"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashIp = hashIp;
exports.isRateLimited = isRateLimited;
const crypto_1 = __importDefault(require("crypto"));
const buckets = new Map();
function hashIp(ip, salt) {
    return crypto_1.default.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
function isRateLimited(key, limit, windowMs, now = Date.now()) {
    const existing = buckets.get(key) ?? [];
    const cutoff = now - windowMs;
    const recent = existing.filter((timestamp) => timestamp > cutoff);
    if (recent.length >= limit) {
        buckets.set(key, recent);
        return true;
    }
    recent.push(now);
    buckets.set(key, recent);
    return false;
}
