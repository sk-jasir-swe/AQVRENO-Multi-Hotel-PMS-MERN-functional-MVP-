import { env } from "../config/env.js";

const trustedOrigins = env.clientUrl
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function requireTrustedOrigin(req, res, next) {
  if (safeMethods.has(req.method)) return next();

  const origin = req.get("origin");
  if (origin) {
    let requestOrigin;
    try {
      requestOrigin = new URL(origin).origin;
    } catch {
      return res.status(403).json({ message: "Request origin is not allowed" });
    }
    if (!trustedOrigins.some((trusted) => {
      try {
        return new URL(trusted).origin === requestOrigin;
      } catch {
        return false;
      }
    }))
      return res.status(403).json({ message: "Request origin is not allowed" });
  } else if (req.get("sec-fetch-site") === "cross-site") {
    return res.status(403).json({ message: "Cross-site request is not allowed" });
  }

  return next();
}
