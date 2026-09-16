import { Request, Response } from "express";
import { prisma } from "../db";

export async function createProgram(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Only coaches can create programs" });
  const { name, weeks } = req.body;

  const program = await prisma.program.create({
    data: {
      name,
      teamId: req.user!.teamId,
      createdById: req.user!.userId,
      weeks: {
        create: (weeks || []).map((w: any) => ({
          weekNumber: w.weekNumber,
          name: w.name,
          days: {
            create: (w.days || []).map((d: any) => ({
              dayOfWeek: d.dayOfWeek,
              name: d.name,
              exercises: {
                create: (d.exercises || []).map((ex: any) => ({
                  exerciseName: ex.exerciseName,
                  sets: ex.sets,
                  reps: ex.reps,
                  percentOfMax: ex.percentOfMax,
                  notes: ex.notes,
                })),
              },
            })),
          },
        })),
      },
    },
    include: { weeks: { include: { days: { include: { exercises: true } } } } },
  });
  res.status(201).json(program);
}

export async function listPrograms(req: Request, res: Response) {
  if (req.user!.role === "ATHLETE") {
    const programs = await prisma.program.findMany({
      where: { teamId: req.user!.teamId, assignments: { some: { athleteId: req.user!.userId } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json(programs);
  }
  const programs = await prisma.program.findMany({
    where: { teamId: req.user!.teamId },
    orderBy: { createdAt: "desc" },
    include: { assignments: { include: { athlete: { select: { id: true, name: true } } } } },
  });
  res.json(programs);
}

export async function getProgram(req: Request, res: Response) {
  const program = await prisma.program.findUnique({
    where: { id: req.params.id },
    include: {
      weeks: { include: { days: { include: { exercises: true } } }, orderBy: { weekNumber: "asc" } },
      assignments: { include: { athlete: { select: { id: true, name: true } } } },
    },
  });
  if (!program || program.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });

  if (req.user!.role === "ATHLETE") {
    const isAssigned = program.assignments.some((a) => a.athleteId === req.user!.userId);
    if (!isAssigned) return res.status(403).json({ error: "This program hasn't been assigned to you" });
  }

  res.json(program);
}

export async function assignProgram(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const program = await prisma.program.findUnique({ where: { id: req.params.id } });
  if (!program || program.teamId !== req.user!.teamId) return res.status(404).json({ error: "Program not found" });

  const { athleteId } = req.body;
  const athlete = await prisma.user.findUnique({ where: { id: athleteId } });
  if (!athlete || athlete.teamId !== req.user!.teamId || athlete.role !== "ATHLETE") {
    return res.status(404).json({ error: "Athlete not found on your team" });
  }

  const assignment = await prisma.programAssignment.upsert({
    where: { programId_athleteId: { programId: program.id, athleteId } },
    update: {},
    create: { programId: program.id, athleteId },
  });
  res.status(201).json(assignment);
}

export async function unassignProgram(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const program = await prisma.program.findUnique({ where: { id: req.params.id } });
  if (!program || program.teamId !== req.user!.teamId) return res.status(404).json({ error: "Program not found" });

  await prisma.programAssignment.deleteMany({ where: { programId: program.id, athleteId: req.params.athleteId } });
  res.status(204).send();
}

export async function addWeek(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const program = await prisma.program.findUnique({ where: { id: req.params.id } });
  if (!program || program.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });

  const { weekNumber, name } = req.body;
  const week = await prisma.programWeek.create({ data: { programId: program.id, weekNumber, name } });
  res.status(201).json(week);
}

export async function addDay(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const { dayOfWeek, name } = req.body;
  const day = await prisma.programDay.create({ data: { weekId: req.params.weekId, dayOfWeek, name } });
  res.status(201).json(day);
}

export async function addExercise(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const { exerciseName, sets, reps, percentOfMax, notes } = req.body;
  const exercise = await prisma.programExercise.create({
    data: { dayId: req.params.dayId, exerciseName, sets, reps, percentOfMax, notes },
  });
  res.status(201).json(exercise);
}

export async function deleteProgram(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const program = await prisma.program.findUnique({ where: { id: req.params.id } });
  if (!program || program.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });
  await prisma.program.delete({ where: { id: program.id } });
  res.status(204).send();
}
