import { Request, Response } from "express";
import { prisma } from "../db";

// Team-wide test type library — mirrors library.controller.ts's exercise
// library. Lets a coach (or the "Custom…" entry flow on the Testing tab)
// define a test type once so it's a normal dropdown option everywhere else
// on the team from then on, instead of free-text every time.

export async function listTestTypes(req: Request, res: Response) {
  const items = await prisma.testTypeLibraryItem.findMany({ where: { teamId: req.user!.teamId }, orderBy: { name: "asc" } });
  res.json(items);
}

export async function addTestType(req: Request, res: Response) {
  const { name, unit } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "name is required" });
  const item = await prisma.testTypeLibraryItem.upsert({
    where: { teamId_name: { teamId: req.user!.teamId, name: name.trim() } },
    update: unit !== undefined && unit !== null ? { unit } : {},
    create: { teamId: req.user!.teamId, name: name.trim(), unit: unit || "" },
  });
  res.status(201).json(item);
}

export async function deleteTestType(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const item = await prisma.testTypeLibraryItem.findUnique({ where: { id: req.params.id } });
  if (!item || item.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });
  await prisma.testTypeLibraryItem.delete({ where: { id: item.id } });
  res.status(204).send();
}
