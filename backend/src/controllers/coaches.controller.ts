import { Request, Response } from "express";
import { prisma } from "../db";

// Lists every coach on the requesting coach's own team, along with their
// access level and — for a RESTRICTED coach — exactly which athletes
// they've been granted. Any coach can view this list (so a restricted
// coach can at least see who else is on the team), but only a FULL-access
// coach can change anything (enforced in updateCoachAccess below).
export async function listCoaches(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const coaches = await prisma.user.findMany({
    where: { teamId: req.user!.teamId, role: "COACH" },
    select: { id: true, name: true, email: true, accessLevel: true, isHeadCoach: true },
    orderBy: [{ isHeadCoach: "desc" }, { name: "asc" }],
  });
  const grants = await prisma.coachAthleteAccess.findMany({
    where: { coachId: { in: coaches.map((c) => c.id) } },
    select: { coachId: true, athleteId: true },
  });
  const grantsByCoach = new Map<string, string[]>();
  for (const g of grants) {
    if (!grantsByCoach.has(g.coachId)) grantsByCoach.set(g.coachId, []);
    grantsByCoach.get(g.coachId)!.push(g.athleteId);
  }
  res.json(
    coaches.map((c) => ({
      ...c,
      athleteIds: c.accessLevel === "RESTRICTED" ? grantsByCoach.get(c.id) || [] : [],
      isMe: c.id === req.user!.userId,
    }))
  );
}

// Change an assistant coach's access level and/or which athletes they can
// edit. Only the head coach may do this, and nobody (including the head
// coach) can change their own level here — the head coach is always full
// access, and there's only ever one of them per team.
export async function updateCoachAccess(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const me = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { isHeadCoach: true } });
  if (!me?.isHeadCoach) {
    return res.status(403).json({ error: "Only the head coach can change coach permissions." });
  }
  if (req.params.id === req.user!.userId) {
    return res.status(400).json({ error: "You can't change your own access level." });
  }

  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target || target.teamId !== req.user!.teamId || target.role !== "COACH") {
    return res.status(404).json({ error: "Not found" });
  }
  if (target.isHeadCoach) {
    return res.status(400).json({ error: "The head coach always has full access." });
  }

  const accessLevel = req.body.accessLevel === "RESTRICTED" ? "RESTRICTED" : "FULL";
  let athleteIds: string[] = [];
  if (accessLevel === "RESTRICTED") {
    const requested = Array.isArray(req.body.athleteIds) ? req.body.athleteIds.filter((x: any) => typeof x === "string") : [];
    const valid = await prisma.user.findMany({
      where: { id: { in: requested }, teamId: req.user!.teamId, role: "ATHLETE" },
      select: { id: true },
    });
    athleteIds = valid.map((v) => v.id);
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: target.id }, data: { accessLevel } }),
    prisma.coachAthleteAccess.deleteMany({ where: { coachId: target.id } }),
    ...(athleteIds.length
      ? [prisma.coachAthleteAccess.createMany({ data: athleteIds.map((athleteId) => ({ coachId: target.id, athleteId })), skipDuplicates: true })]
      : []),
  ]);

  res.json({ id: target.id, accessLevel, athleteIds });
}
