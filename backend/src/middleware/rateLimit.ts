import rateLimit from "express-rate-limit";

// Slows down password-guessing against login. A real person mistyping
// their password a few times never comes close to this limit; a script
// trying thousands of passwords per minute does. This is counted per IP
// address, on top of (not instead of) bcrypt already making each individual
// guess slow.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait a few minutes and try again." },
});

// The invite-lookup and invite-accept endpoints have to be public (the
// person accepting doesn't have an account yet), so they need their own
// limit too -- otherwise someone could script through the token space or
// hammer account creation. A little more headroom than login since a
// coach and a new hire might both be reloading the same invite page.
export const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});
