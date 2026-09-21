import { Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { WearableSource } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// ---------------------------------------------------------------------------
// WHOOP  (https://developer.whoop.com)
//
// Register an app at developer.whoop.com, then set these in Railway:
//   WHOOP_CLIENT_ID       — from the WHOOP developer dashboard
//   WHOOP_CLIENT_SECRET   — from the WHOOP developer dashboard
//   WHOOP_REDIRECT_URI    — must exactly match a redirect URL registered
//                           there, e.g. https://<this-backend>/api/integrations/whoop/callback
//   FRONTEND_URL          — where we send the athlete's browser back to
//                           once linking finishes, e.g. https://www.snowysperformance.com
//
// Flow: an athlete clicks "Connect WHOOP" in Settings -> GET /whoop/authorize
// hands the frontend a WHOOP consent URL -> the athlete approves on WHOOP's
// site -> WHOOP redirects here to /whoop/callback with a one-time code ->
// we exchange it for tokens and store them. From then on, WHOOP calls
// /whoop/webhook whenever new data is ready; that webhook only tells us
// *something changed*, so we fetch the real numbers from WHOOP's API and
// save them as WearableData.
// ---------------------------------------------------------------------------

const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const WHOOP_API_BASE = "https://api.prod.whoop.com/developer/v2";
// "offline" is required to get a refresh_token back at all; without it,
// WHOOP only hands us a short-lived access token with no way to renew it.
const WHOOP_SCOPES = "offline read:profile read:recovery read:sleep read:cycles";

export function whoopAuthorizeUrl(req: Request, res: Response) {
  if (req.user!.role !== "ATHLETE") {
    return res.status(403).json({ error: "Only an athlete can connect their own WHOOP account" });
  }
  const clientId = process.env.WHOOP_CLIENT_ID;
  const redirectUri = process.env.WHOOP_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return res.status(503).json({ error: "WHOOP isn't configured on this server yet." });
  }
  // A short-lived, signed state ties WHOOP's callback back to this specific
  // athlete without letting anyone forge a state for someone else's account.
  const state = jwt.sign({ athleteId: req.user!.userId }, JWT_SECRET, { expiresIn: "10m" });
  const url =
    `${WHOOP_AUTH_URL}?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code` +
    `&scope=${encodeURIComponent(WHOOP_SCOPES)}&state=${encodeURIComponent(state)}`;
  res.json({ url });
}

export async function whoopCallback(req: Request, res: Response) {
  const { code, state, error: whoopError } = req.query as { code?: string; state?: string; error?: string };
  const frontendUrl = process.env.FRONTEND_URL || "https://www.snowysperformance.com";

  function redirectWithStatus(status: "connected" | "error", message?: string) {
    const url = new URL(`${frontendUrl}/dashboard/settings`);
    url.searchParams.set("whoop", status);
    if (message) url.searchParams.set("whoop_message", message);
    res.redirect(url.toString());
  }

  if (whoopError) return redirectWithStatus("error", whoopError);
  if (!code || !state) return redirectWithStatus("error", "missing_code");

  let athleteId: string;
  try {
    athleteId = (jwt.verify(state, JWT_SECRET) as { athleteId: string }).athleteId;
  } catch {
    return redirectWithStatus("error", "invalid_or_expired_state");
  }

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const redirectUri = process.env.WHOOP_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return redirectWithStatus("error", "not_configured");
  }

  try {
    const athlete = await prisma.user.findUnique({ where: { id: athleteId }, select: { teamId: true } });
    if (!athlete) return redirectWithStatus("error", "athlete_not_found");

    const tokenRes = await fetch(WHOOP_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) {
      console.error("WHOOP token exchange failed:", tokenRes.status, await tokenRes.text());
      return redirectWithStatus("error", "token_exchange_failed");
    }
    const tokens = (await tokenRes.json()) as { access_token: string; refresh_token?: string; expires_in: number };

    const profileRes = await fetch(`${WHOOP_API_BASE}/user/profile/basic`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) {
      console.error("WHOOP profile fetch failed:", profileRes.status, await profileRes.text());
      return redirectWithStatus("error", "profile_fetch_failed");
    }
    const profile = (await profileRes.json()) as { user_id: number };
    const externalUserId = String(profile.user_id);
    const accessTokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // One athlete, one active WHOOP link at a time — drop any stale link
    // for this athlete under a different WHOOP account before creating
    // the new one (e.g. they connected the wrong WHOOP account before).
    await prisma.wearableAccountLink.deleteMany({
      where: { athleteId, source: WearableSource.WHOOP, NOT: { externalUserId } },
    });

    await prisma.wearableAccountLink.upsert({
      where: { source_externalUserId: { source: WearableSource.WHOOP, externalUserId } },
      update: {
        athleteId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        accessTokenExpiresAt,
      },
      create: {
        athleteId,
        source: WearableSource.WHOOP,
        externalUserId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        accessTokenExpiresAt,
      },
    });

    // Pull in the athlete's last week of data right away so their Progress
    // page isn't empty until the next webhook happens to fire.
    await backfillRecentWhoopData(athleteId, athlete.teamId, tokens.access_token).catch((err) =>
      console.error("WHOOP initial backfill failed:", err)
    );

    return redirectWithStatus("connected");
  } catch (err) {
    console.error("WHOOP callback failed:", err);
    return redirectWithStatus("error", "unexpected_error");
  }
}

export async function whoopStatus(req: Request, res: Response) {
  if (req.user!.role !== "ATHLETE") {
    return res.status(403).json({ error: "Only an athlete has their own WHOOP connection" });
  }
  const link = await prisma.wearableAccountLink.findFirst({
    where: { athleteId: req.user!.userId, source: WearableSource.WHOOP },
    select: { createdAt: true },
  });
  res.json({ connected: !!link, connectedAt: link?.createdAt ?? null });
}

export async function whoopDisconnect(req: Request, res: Response) {
  if (req.user!.role !== "ATHLETE") {
    return res.status(403).json({ error: "Only an athlete has their own WHOOP connection" });
  }
  await prisma.wearableAccountLink.deleteMany({ where: { athleteId: req.user!.userId, source: WearableSource.WHOOP } });
  res.status(204).send();
}

// If the stored access token is still good for at least another minute,
// reuse it; otherwise use the refresh token to get a new one and persist
// it. Returns null if we have no way to get a valid token right now (the
// caller should just skip that sync rather than fail loudly — the next
// webhook or backfill will try again).
async function getValidAccessToken(link: {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
}): Promise<string | null> {
  if (!link.accessToken) return null;
  const stillValid = link.accessTokenExpiresAt && link.accessTokenExpiresAt.getTime() - Date.now() > 60_000;
  if (stillValid) return link.accessToken;
  if (!link.refreshToken) return null;

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: link.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) {
    console.error("WHOOP token refresh failed:", res.status, await res.text());
    return null;
  }
  const tokens = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
  await prisma.wearableAccountLink.update({
    where: { id: link.id },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? link.refreshToken,
      accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });
  return tokens.access_token;
}

// Merges a partial day's data (recovery, strain, sleep, resting HR) into
// whatever we already have stored for that athlete/day, rather than
// overwriting it — a sleep.updated webhook and a later recovery.updated
// webhook for the same day should both contribute, not clobber each other.
async function upsertWearableDay(params: {
  athleteId: string;
  teamId: string;
  date: Date;
  recovery?: number | null;
  strain?: number | null;
  sleepScore?: number | null;
  restingHR?: number | null;
  raw: any;
}) {
  const dayStart = new Date(params.date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const existing = await prisma.wearableData.findFirst({
    where: { athleteId: params.athleteId, source: WearableSource.WHOOP, date: { gte: dayStart, lt: dayEnd } },
  });

  const data = {
    recovery: params.recovery ?? existing?.recovery ?? null,
    strain: params.strain ?? existing?.strain ?? null,
    sleepScore: params.sleepScore ?? existing?.sleepScore ?? null,
    restingHR: params.restingHR ?? existing?.restingHR ?? null,
    raw: params.raw,
  };

  if (existing) {
    await prisma.wearableData.update({ where: { id: existing.id }, data });
  } else {
    await prisma.wearableData.create({
      data: { teamId: params.teamId, athleteId: params.athleteId, source: WearableSource.WHOOP, date: dayStart, ...data },
    });
  }
}

// WHOOP v2's `sleep` object carries its own performance score plus a
// `cycle_id`, and that cycle is where strain and recovery live — so one
// sleep record is enough to pull a full day's picture together.
async function syncFromSleepObject(athleteId: string, teamId: string, accessToken: string, sleep: any) {
  if (!sleep || sleep.score_state !== "SCORED") return;

  let strain: number | null = null;
  let recovery: number | null = null;
  let restingHR: number | null = null;

  if (sleep.cycle_id) {
    try {
      const cycleRes = await fetch(`${WHOOP_API_BASE}/cycle/${sleep.cycle_id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (cycleRes.ok) {
        const cycle = await cycleRes.json();
        strain = cycle?.score?.strain ?? null;
      }
    } catch (err) {
      console.error("WHOOP cycle fetch failed:", err);
    }

    try {
      const recRes = await fetch(`${WHOOP_API_BASE}/cycle/${sleep.cycle_id}/recovery`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (recRes.ok) {
        const rec = await recRes.json();
        recovery = rec?.score?.recovery_score ?? null;
        restingHR = rec?.score?.resting_heart_rate ?? null;
      }
    } catch (err) {
      console.error("WHOOP recovery fetch failed:", err);
    }
  }

  await upsertWearableDay({
    athleteId,
    teamId,
    date: new Date(sleep.start),
    recovery,
    strain,
    sleepScore: sleep?.score?.sleep_performance_percentage ?? null,
    restingHR,
    raw: { sleep, cycle_id: sleep.cycle_id },
  });
}

async function syncFromSleepId(athleteId: string, teamId: string, accessToken: string, sleepId: string) {
  const sleepRes = await fetch(`${WHOOP_API_BASE}/activity/sleep/${sleepId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!sleepRes.ok) {
    console.error("WHOOP sleep fetch failed:", sleepRes.status, await sleepRes.text());
    return;
  }
  await syncFromSleepObject(athleteId, teamId, accessToken, await sleepRes.json());
}

async function backfillRecentWhoopData(athleteId: string, teamId: string, accessToken: string) {
  const res = await fetch(`${WHOOP_API_BASE}/activity/sleep?limit=7`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    console.error("WHOOP backfill fetch failed:", res.status, await res.text());
    return;
  }
  const data = (await res.json()) as { records?: any[] };
  for (const sleep of data.records || []) {
    await syncFromSleepObject(athleteId, teamId, accessToken, sleep);
  }
}

async function processWhoopEvent(event: { user_id: number; id: string; type: string }) {
  // Only "*.updated" events carry new data to fetch; "*.deleted" events
  // have nothing for us to sync (we simply leave the last-known value).
  if (!event.type?.endsWith(".updated")) return;

  const externalUserId = String(event.user_id);
  const link = await prisma.wearableAccountLink.findUnique({
    where: { source_externalUserId: { source: WearableSource.WHOOP, externalUserId } },
  });
  if (!link) return; // event for a WHOOP account we haven't linked to an athlete

  const athlete = await prisma.user.findUnique({ where: { id: link.athleteId }, select: { teamId: true } });
  if (!athlete) return;

  const accessToken = await getValidAccessToken(link);
  if (!accessToken) return;

  if (event.type === "sleep.updated" || event.type === "recovery.updated") {
    // For both event types, WHOOP's webhook `id` is the associated sleep's
    // UUID — recovery has no endpoint of its own to fetch by id directly.
    await syncFromSleepId(link.athleteId, athlete.teamId, accessToken, String(event.id));
  }
  // workout.updated isn't mapped to a stored metric here today.
}

export async function whoopWebhook(req: Request, res: Response) {
  const signature = req.header("X-WHOOP-Signature");
  const timestamp = req.header("X-WHOOP-Signature-Timestamp");
  const secret = process.env.WHOOP_CLIENT_SECRET;
  // Stashed by the verify() callback on express.json() in app.ts — HMAC
  // verification needs the exact raw bytes WHOOP signed, not our re-
  // serialized parse of them.
  const rawBody: Buffer | undefined = (req as any).rawBody;

  if (!secret || !signature || !timestamp || !rawBody) {
    return res.status(401).send("Missing signature");
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(timestamp + rawBody)
    .digest("base64");
  const signaturesMatch =
    expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!signaturesMatch) {
    return res.status(401).send("Invalid signature");
  }

  // Acknowledge immediately so WHOOP doesn't retry-storm us; do the actual
  // fetch-and-store work after responding.
  res.status(200).send("ok");

  const event = req.body as { user_id: number; id: string; type: string; trace_id?: string };
  processWhoopEvent(event).catch((err) => console.error("WHOOP webhook processing failed:", err));
}

// ---------------------------------------------------------------------------
// Garmin Health API (https://developer.garmin.com/gc-developer-program/health-api/)
// Garmin uses a push model: once a user authorizes your app, Garmin calls
// your webhook with new activity/health summaries. This endpoint just needs
// to be registered with Garmin as the "Ping" or "Push" callback URL.
// ---------------------------------------------------------------------------

export async function garminWebhook(req: Request, res: Response) {
  const payload = req.body;
  await ingestWearablePayload(WearableSource.GARMIN, payload.userId, payload);
  res.status(200).send("ok");
}

// ---------------------------------------------------------------------------
// Apple HealthKit
// HealthKit has no server-side OAuth — it's on-device only. The pattern is:
// the athlete's iOS app (or a Shortcut) reads HealthKit locally, then POSTs
// the relevant numbers here using the athlete's normal platform JWT.
// ---------------------------------------------------------------------------

export async function healthKitIngest(req: Request, res: Response) {
  await ingestWearablePayload(WearableSource.HEALTHKIT, undefined, req.body, req.user!.userId);
  res.status(201).json({ stored: true });
}

async function ingestWearablePayload(
  source: WearableSource,
  externalUserId: string | undefined,
  payload: any,
  directAthleteId?: string
) {
  let athleteId = directAthleteId;

  if (!athleteId && externalUserId) {
    const link = await prisma.wearableAccountLink.findUnique({
      where: { source_externalUserId: { source, externalUserId } },
    });
    if (!link) return; // event from an account we haven't linked to an athlete yet
    athleteId = link.athleteId;
  }
  if (!athleteId) return;

  const athlete = await prisma.user.findUnique({ where: { id: athleteId } });
  if (!athlete) return;

  await prisma.wearableData.create({
    data: {
      teamId: athlete.teamId,
      athleteId,
      source,
      date: payload.date ? new Date(payload.date) : new Date(),
      recovery: payload.recovery ?? null,
      strain: payload.strain ?? null,
      sleepScore: payload.sleepScore ?? null,
      restingHR: payload.restingHR ?? null,
      raw: payload,
    },
  });
}
