import { Request, Response } from "express";
import { prisma } from "../db";

// One shared thread per athlete. Any coach on the team can read/write it
// (same as every coach already seeing that athlete's plans/progress —
// this is communication, not athlete data, so it isn't gated by the
// per-athlete edit permission). The athlete can only read/write their own
// thread.
async function loadThreadAthlete(req: Request, res: Response, athleteId: string) {
  const athlete = await prisma.user.findUnique({ where: { id: athleteId } });
  if (!athlete || athlete.teamId !== req.user!.teamId || athlete.role !== "ATHLETE") {
    res.status(404).json({ error: "Not found" });
    return null;
  }
  if (req.user!.role === "ATHLETE" && req.user!.userId !== athleteId) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return athlete;
}

export async function listMessages(req: Request, res: Response) {
  const athlete = await loadThreadAthlete(req, res, req.params.athleteId);
  if (!athlete) return;
  const messages = await prisma.message.findMany({
    where: { athleteId: athlete.id },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });
  res.json(messages);
}

export async function sendMessage(req: Request, res: Response) {
  const athlete = await loadThreadAthlete(req, res, req.params.athleteId);
  if (!athlete) return;
  const body = (req.body.body || "").trim();
  if (!body) return res.status(400).json({ error: "Message can't be empty" });

  const message = await prisma.message.create({
    data: { teamId: athlete.teamId, athleteId: athlete.id, senderId: req.user!.userId, body },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });
  res.status(201).json(message);
}
