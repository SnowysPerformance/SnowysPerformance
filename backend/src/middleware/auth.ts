import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "../utils/jwt";
import { prisma } from "../db";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// Verifies the JWT, then checks the account fresh from the database on
// every request (not just at login) — so a suspension by the admin takes
// effect immediately, instead of waiting for a token to expire (tokens
// last 7 days).
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  let payload: TokenPayload;
  try {
    payload = verifyToken(header.slice(7));
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    const dbUser = await prisma.user.findUnique({ where: { id: payload.userId }, select: { suspended: true } });
    if (!dbUser) return res.status(401).json({ error: "This account no longer exists" });
    if (dbUser.suspended) return res.status(403).json({ error: "This account has been suspended." });
  } catch {
    return res.status(500).json({ error: "Could not verify account status" });
  }

  req.user = payload;
  next();
}

export function requireRole(...roles: Array<"COACH" | "ATHLETE">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
