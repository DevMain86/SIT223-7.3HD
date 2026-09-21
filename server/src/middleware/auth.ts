// Auth middleware: strict (requires login) and relaxed (optional login)
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Reads "Authorization: Bearer <token>" and returns the token.
// Returns null when missing or malformed.
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token;
}

// Enforces authentication. Rejects with 401 when token is absent or invalid.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: "You must be logged in to do that." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as {
      userId: string;
      email: string;
    };
    req.user = decoded;   // attach verified user
    next();
  } catch {
    // Covers invalid or expired tokens
    return res.status(401).json({ message: "Invalid or expired session. Please log in again." });
  }
}

// Allows both guests and logged-in users. Adds req.user only when valid.
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return next();   // guest access
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as {
      userId: string;
      email: string;
    };
    req.user = decoded;
  } catch {
    // Invalid tokens behave like no token
  }

  next();   // always continue
}
