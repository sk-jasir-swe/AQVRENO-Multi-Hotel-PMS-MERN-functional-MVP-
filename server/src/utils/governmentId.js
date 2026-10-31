import { createCipheriv, createHash, randomBytes } from "node:crypto";

function encryptionKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret)
    throw new Error("JWT_SECRET is required to encrypt government ID numbers");
  return createHash("sha256")
    .update(`StayPro government ID encryption v1:${secret}`)
    .digest();
}

export function normalizeGovernmentId(type, value) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s/g, "").toUpperCase();
  const valid =
    type === "aadhaar"
      ? /^\d{12}$/.test(normalized)
      : type === "pan"
        ? /^[A-Z]{5}\d{4}[A-Z]$/.test(normalized)
        : type === "passport"
          ? /^[A-Z0-9]{6,12}$/.test(normalized)
          : false;
  return valid ? normalized : null;
}

export function encryptGovernmentId(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}
