import { Request, Response } from "express";
import { prisma } from "../db";
import { WearableSource } from "@prisma/client";

// ---------------------------------------------------------------------------
// WHOOP  (https://developer.whoop.com)
// Register an app there, then set WHOOP_CLIENT_ID / WHOOP_CLIENT_SECRET /
// WHOOP_REDIRECT_URI in .env. The two-step OAuth flow below is scaffolded
// but the actual token exchange is left as a clearly marked TODO since it
// needs real credentials to test against.
// ---------------------------------------------------------------------------

export function whoopAuthorizeUrl(req: Request, res: Response) {
  const clientId = process.env.WHOOP_CLIENT_ID || "";
  const redirectUri = process.env.WHOOP_REDIRECT_URI || "";
  const state = req.user!.userId; // used to re-associate the callback with this athlete
  const url =
    `https://api.prod.whoop.com/oauth/oauth2/auth?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code` +
    `&scope=read:recovery read:sleep read:cycles&state=${state}`;
  res.json({ url });
}

export async function whoopCallback(req: Request, res: Response) {
  const { code, state } = req.query as { code?: string; state?: string };
  if (!code || !state) return res.status(400).json({ error: "Missing code or state" });

  // TODO once WHOOP_CLIENT_ID/SECRET are set: exchange `code` for tokens via
  //   POST https://api.prod.whoop.com/oauth/oauth2/token
  //   body: { grant_type: "authorization_code", code, client_id, client_secret, redirect_uri }
  // then call GET https://api.prod.whoop.com/developer/v1/user/profile/basic
  // to get WHOOP's own user id, and upsert the link below with the real tokens.
  const fakeExternalUserId = `pending-${state}`;

  await prisma.wearableAccountLink.upsert({
    where: { source_externalUserId: { source: WearableSource.WHOOP, externalUserId: fakeExternalUserId } },
    update: {},
    create: { athleteId: state, source: WearableSource.WHOOP, externalUserId: fakeExternalUserId },
  });

  res.json({ linked: true, note: "Replace the TODO in whoopCallback with a real token exchange once WHOOP credentials are configured." });
}

export async function whoopWebhook(req: Request, res: Response) {
  // WHOOP posts events such as `recovery.updated` keyed by their user id.
  // In production, verify the X-WHOOP-Signature header before trusting this body.
  const payload = req.body;
  await ingestWearablePayload(WearableSource.WHOOP, payload.user_id, payload);
  res.status(200).send("ok");
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
