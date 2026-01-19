"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.hashToken = hashToken;
const crypto_1 = __importDefault(require("crypto"));
function generateToken(bytes = 32) {
    const raw = crypto_1.default.randomBytes(bytes);
    return raw.toString("base64url");
}
function hashToken(token, salt) {
    return crypto_1.default.createHash("sha256").update(`${salt}:${token}`).digest("hex");
}
