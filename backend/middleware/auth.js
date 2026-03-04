/**
 * JWT Authentication Middleware
 * 
 * Verifies Bearer token and attaches user to req.user
 */
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "rebook-dev-secret-change-in-production";

/**
 * Required authentication – returns 401 if no valid token
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Optional authentication – attaches user if token present, continues either way
 */
export function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      // Invalid token – proceed without user
    }
  }
  next();
}

/**
 * Admin-only middleware – must be used after requireAuth
 */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
