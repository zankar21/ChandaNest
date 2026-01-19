import crypto from "crypto";

export function generateToken(bytes = 32) {
  const raw = crypto.randomBytes(bytes);
  return raw.toString("base64url");
}

export function hashToken(token: string, salt: string) {
  return crypto.createHash("sha256").update(`${salt}:${token}`).digest("hex");
}
