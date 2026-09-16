import { Request, Response } from "express";
import { prisma } from "../db";

export async function listExercises(req: Request, res: Response) {
  const items = await prisma.exerciseLibraryItem.findMany({ where: { teamId: req.user!.teamId }, orderBy: { name: "asc" } });
  res.json(items);
}

export async function addExercise(req: Request, res: Response) {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "name is required" });
  const item = await prisma.exerciseLibraryItem.upsert({
    where: { teamId_name: { teamId: req.user!.teamId, name: name.trim() } },
    update: {},
    create: { teamId: req.user!.teamId, name: name.trim() },
  });
  res.status(201).json(item);
}

export async function updateExercise(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const item = await prisma.exerciseLibraryItem.findUnique({ where: { id: req.params.id } });
  if (!item || item.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.exerciseLibraryItem.update({
    where: { id: item.id },
    data: {
      regressions: req.body.regressions !== undefined ? req.body.regressions : item.regressions as any,
      progressions: req.body.progressions !== undefined ? req.body.progressions : item.progressions as any,
    },
  });
  res.json(updated);
}

export async function deleteExercise(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const item = await prisma.exerciseLibraryItem.findUnique({ where: { id: req.params.id } });
  if (!item || item.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });
  await prisma.exerciseLibraryItem.delete({ where: { id: item.id } });
  res.status(204).send();
}
