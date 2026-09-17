import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db";
import { checkCanEditAthlete, autoGrantIfRestricted } from "../utils/permissions";

// Every coach on the team can see every athlete, but a RESTRICTED coach can
// only EDIT the ones they've been granted (see utils/permissions.ts). This
// figures out, for the requesting coach, which athletes that is — so the
// frontend can grey out Edit/Delete for the ones they can't touch.
async function loadEditableAthleteIds(coachId: string): Promise<Set<string> | null> {
  const coach = await prisma.user.findUnique({ where: { id: coachId }, select: { accessLevel: true } });
  if (coach?.accessLevel !== "RESTRICTED") return null; // null = "can edit everyone"
  const grants = await prisma.coachAthleteAccess.findMany({ where: { coachId }, select: { athleteId: true } });
  return new Set(grants.map((g) => g.athleteId));
}

export async function listAthletes(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const athletes = await prisma.user.findMany({
    where: { teamId: req.user!.teamId, role: "ATHLETE" },
    select: { id: true, name: true, email: true },
  });
  const editable = await loadEditableAthleteIds(req.user!.userId);
  const withAccess = athletes.map((a) => ({ ...a, canEdit: editable === null ? true : editable.has(a.id) }));
  res.json(withAccess);
}

// One athlete's profile plus the coach-only notes fields — used by the
// Notes tab. Every coach can view this regardless of edit permission.
export async function getAthlete(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const athlete = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, name: true, email: true, teamId: true, role: true,
      injuryHistory: true, needsAnalysis: true, archetype: true, generalNotes: true,
    },
  });
  if (!athlete || athlete.teamId !== req.user!.teamId || athlete.role !== "ATHLETE") {
    return res.status(404).json({ error: "Not found" });
  }
  const check = await checkCanEditAthlete(req, req.params.id);
  const { teamId, role, ...rest } = athlete;
  res.json({ ...rest, canEdit: check.ok });
}

export async function createAthlete(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  const athlete = await prisma.user.create({
    data: { email, passwordHash, name, role: "ATHLETE", teamId: req.user!.teamId },
    select: { id: true, name: true, email: true },
  });
  // If the coach adding this athlete is a RESTRICTED co-coach, they
  // automatically get edit access to the athlete they just brought on —
  // otherwise they'd have added someone they can't do anything with.
  await autoGrantIfRestricted(req.user!.userId, athlete.id);
  res.status(201).json(athlete);
}

// Coach edits one of their athletes: name, email (their login username), and/or
// resets their password. Any field left out is left unchanged.
export async function updateAthlete(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const athlete = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!athlete || athlete.teamId !== req.user!.teamId || athlete.role !== "ATHLETE") {
    return res.status(404).json({ error: "Not found" });
  }
  const permission = await checkCanEditAthlete(req, athlete.id);
  if (!permission.ok) return res.status(permission.status).json({ error: permission.error });

  const { name, email, password } = req.body;
  const data: any = {};
  if (name !== undefined && name.trim()) data.name = name.trim();
  if (email !== undefined && email.trim() && email.trim() !== athlete.email) {
    const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (existing) return res.status(409).json({ error: "Email already in use" });
    data.email = email.trim();
  }
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const updated = await prisma.user.update({ where: { id: athlete.id }, data, select: { id: true, name: true, email: true } });
  res.json(updated);
}

// The four coach-only free-text fields about an athlete — never shown to
// the athlete themselves. Gated the same as any other edit: a RESTRICTED
// coach needs to have been granted this specific athlete.
export async function updateAthleteNotes(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const athlete = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!athlete || athlete.teamId !== req.user!.teamId || athlete.role !== "ATHLETE") {
    return res.status(404).json({ error: "Not found" });
  }
  const permission = await checkCanEditAthlete(req, athlete.id);
  if (!permission.ok) return res.status(permission.status).json({ error: permission.error });

  const { injuryHistory, needsAnalysis, archetype, generalNotes } = req.body;
  const updated = await prisma.user.update({
    where: { id: athlete.id },
    data: {
      injuryHistory: injuryHistory !== undefined ? (injuryHistory || null) : undefined,
      needsAnalysis: needsAnalysis !== undefined ? (needsAnalysis || null) : undefined,
      archetype: archetype !== undefined ? (archetype || null) : undefined,
      generalNotes: generalNotes !== undefined ? (generalNotes || null) : undefined,
    },
    select: { id: true, injuryHistory: true, needsAnalysis: true, archetype: true, generalNotes: true },
  });
  res.json(updated);
}

// Permanently removes an athlete and (via cascading foreign keys) all of
// their workout logs, test results, and wearable data.
export async function deleteAthlete(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const athlete = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!athlete || athlete.teamId !== req.user!.teamId || athlete.role !== "ATHLETE") {
    return res.status(404).json({ error: "Not found" });
  }
  const permission = await checkCanEditAthlete(req, athlete.id);
  if (!permission.ok) return res.status(permission.status).json({ error: permission.error });

  await prisma.user.delete({ where: { id: athlete.id } });
  res.status(204).send();
}
