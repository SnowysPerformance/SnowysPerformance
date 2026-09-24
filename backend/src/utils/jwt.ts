import jwt from "jsonwebtoken";
import crypto from "crypto";

// JWT_SECRET should always come from Railway's environment variables in
// production. If it is ever missing, generate a random secret just for
// this one running process instead of falling back to a hardcoded,
// guessable string. The server keeps working (no crash, no downtime),
// but every restart without a real JWT_SECRET set will sign everyone
// out -- a safe, visible nudge to go set a permanent one in Railway.
const configuredSecret = process.env.JWT_SECRET;
if (!configuredSecret) {
  console.error(
    "WARNING: JWT_SECRET is not set. Using a temporary secret generated for this run only -- everyone will be signed out on every server restart until a permanent JWT_SECRET is set in Railway's environment variables."
    );
}
export const JWT_SECRET = configuredSecret || crypto.randomBytes(48).toString("hex");

export interface TokenPayload {
  userId: string;
  role: "COACH" | "ATHLETE";
  teamId: string;
}

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
