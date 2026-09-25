import { Request, Response } from "express";
import { prisma } from "../db";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export async function createProgram(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Only coaches can create programs" });
  const { name } = req.body;
  const program = await prisma.program.create({
    data: { name, teamId: req.user!.teamId, createdById: req.user!.userId },
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

// For the given athlete, finds the day in each of their assigned programs
// whose week has a start date set and lines up with "today" (the date the
// frontend passes, computed the same way the workout-logging date field
// already defaults itself) -- so the athlete's dashboard can show "today's
// workout" and the program page can highlight it, without anyone having to
// click through Phases > Weeks > Days by hand. A week with no start date
// is skipped, since there's nothing to line it up against.
export async function getToday(req: Request, res: Response) {
  let athleteId: string;
  if (req.user!.role === "ATHLETE") {
    athleteId = req.user!.userId;
  } else {
    athleteId = String(req.query.athleteId || "");
    if (!athleteId) return res.status(400).json({ error: "athleteId is required" });
    const athlete = await prisma.user.findUnique({ where: { id: athleteId } });
    if (!athlete || athlete.teamId !== req.user!.teamId || athlete.role !== "ATHLETE") {
      return res.status(404).json({ error: "Athlete not found on your team" });
    }
  }

  const dateParam = String(req.query.date || "");
  const today = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : new Date().toISOString().slice(0, 10);
  const todayStart = new Date(`${today}T00:00:00.000Z`);

  const programs = await prisma.program.findMany({
    where: { teamId: req.user!.teamId, assignments: { some: { athleteId } } },
    include: {
      phases: {
        orderBy: { order: "asc" },
        include: {
          microcycles: {
            where: { startDate: { not: null } },
            include: { days: { include: { exercises: { select: { exerciseName: true } } } } },
          },
        },
      },
    },
  });

  const matches: { item: any; exerciseNames: string[] }[] = [];
  for (const program of programs) {
    for (const phase of program.phases) {
      for (const week of phase.microcycles) {
        if (!week.startDate) continue;
        const weekStart = new Date(week.startDate);
        weekStart.setUTCHours(0, 0, 0, 0);
        const offsetDays = Math.round((todayStart.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
        if (offsetDays < 0 || offsetDays > 6) continue;
        const day = week.days.find((d) => d.dayOfWeek === offsetDays);
        if (!day) continue;
        matches.push({
          item: {
            programId: program.id,
            programName: program.name,
            phaseId: phase.id,
            phaseName: phase.name,
            weekId: week.id,
            weekName: week.name,
            dayId: day.id,
            dayLabel: day.label,
            dayName: day.name,
            isRestDay: day.exercises.length === 0,
            exerciseCount: day.exercises.length,
          },
          exerciseNames: day.exercises.map((e) => e.exerciseName),
        });
      }
    }
  }

  if (matches.length === 0) return res.json({ date: today, items: [] });

  // Best-effort "already logged today" check: matched by exercise name +
  // date, the same loose link the rest of the app already uses for things
  // like personal records -- there's no direct foreign key from a logged
  // set back to the specific program day it was prescribed on.
  const allNames = Array.from(new Set(matches.flatMap((m) => m.exerciseNames)));
  const logsToday = allNames.length
    ? await prisma.workoutLog.findMany({
        where: { athleteId, date: todayStart, exerciseName: { in: allNames } },
        select: { exerciseName: true },
      })
    : [];
  const loggedNames = new Set(logsToday.map((l) => l.exerciseName));

  const items = matches.map((m) => ({
    ...m.item,
    loggedCount: m.exerciseNames.filter((n) => loggedNames.has(n)).length,
  }));

  res.json({ date: today, items });
}

const fullInclude = {
  phases: {
    orderBy: { order: "asc" as const },
    include: {
      microcycles: {
        include: { days: { include: { exercises: { orderBy: { order: "asc" as const } } } } },
      },
    },
  },
  assignments: { include: { athlete: { select: { id: true, name: true } } } },
  // Only used to show the team name at the top of a printed day sheet —
  // every other screen already gets the team name from the logged-in user.
  team: { select: { name: true } },
};

export async function getProgram(req: Request, res: Response) {
  const program = await prisma.program.findUnique({ where: { id: req.params.id }, include: fullInclude });
  if (!program || program.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });

  if (req.user!.role === "ATHLETE") {
    const isAssigned = program.assignments.some((a) => a.athleteId === req.user!.userId);
    if (!isAssigned) return res.status(403).json({ error: "This program hasn't been assigned to you" });
  }
  res.json(program);
}

export async function deleteProgram(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const program = await prisma.program.findUnique({ where: { id: req.params.id } });
  if (!program || program.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });
  await prisma.program.delete({ where: { id: program.id } });
  res.status(204).send();
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

// ---------- phases (mesocycles) ----------

export async function addPhase(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const program = await prisma.program.findUnique({ where: { id: req.params.id }, include: { phases: true } });
  if (!program || program.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });
  const { name, weeks, goal } = req.body;
  const phase = await prisma.programPhase.create({
    data: { programId: program.id, name, weeks: weeks ? Number(weeks) : null, goal, order: program.phases.length },
  });
  res.status(201).json(phase);
}

export async function updatePhase(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const phase = await prisma.programPhase.findUnique({ where: { id: req.params.phaseId }, include: { program: true } });
  if (!phase || phase.program.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });

  const updated = await prisma.programPhase.update({
    where: { id: phase.id },
    data: {
      name: req.body.name !== undefined ? req.body.name : phase.name,
      goal: req.body.goal !== undefined ? req.body.goal : phase.goal,
      weeks: req.body.weeks !== undefined ? (req.body.weeks ? Number(req.body.weeks) : null) : phase.weeks,
    },
  });
  res.json(updated);
}

export async function deletePhase(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const phase = await prisma.programPhase.findUnique({ where: { id: req.params.phaseId }, include: { program: true } });
  if (!phase || phase.program.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });
  await prisma.programPhase.delete({ where: { id: phase.id } });
  res.status(204).send();
}

// ---------- weeks (microcycles) — auto-creates 7 days ----------

export async function addWeek(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const phase = await prisma.programPhase.findUnique({
    where: { id: req.params.phaseId },
    include: { program: true, microcycles: true },
  });
  if (!phase || phase.program.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });

  const name = req.body.name || `Week ${phase.microcycles.length + 1}`;
  const week = await prisma.programWeek.create({
    data: {
      programId: phase.programId,
      phaseId: phase.id,
      weekNumber: phase.microcycles.length + 1,
      name,
      startDate: req.body.startDate ? new Date(req.body.startDate) : null,
      days: { create: DAY_LABELS.map((label, i) => ({ dayOfWeek: i, label })) },
    },
    include: { days: { include: { exercises: true } } },
  });
  res.status(201).json(week);
}

export async function updateWeek(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const week = await prisma.programWeek.findUnique({ where: { id: req.params.weekId }, include: { program: true } });
  if (!week || week.program.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });

  const updated = await prisma.programWeek.update({
    where: { id: week.id },
    data: {
      name: req.body.name !== undefined ? req.body.name : week.name,
      startDate: req.body.startDate !== undefined ? (req.body.startDate ? new Date(req.body.startDate) : null) : week.startDate,
    },
  });
  res.json(updated);
}

export async function duplicateWeek(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const week = await prisma.programWeek.findUnique({
    where: { id: req.params.weekId },
    include: { program: true, days: { include: { exercises: true } } },
  });
  if (!week || week.program.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });

  const nextStartDate = week.startDate ? new Date(week.startDate.getTime() + 7 * 24 * 60 * 60 * 1000) : null;

  const cloned = await prisma.programWeek.create({
    data: {
      programId: week.programId,
      phaseId: week.phaseId,
      weekNumber: week.weekNumber + 1,
      name: `${week.name || "Week"} copy`,
      startDate: nextStartDate,
      days: {
        create: week.days.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          label: d.label,
          name: d.name,
          exercises: {
            create: d.exercises.map((ex) => ({
              exerciseName: ex.exerciseName, type: ex.type, mode: ex.mode, sets: ex.sets, reps: ex.reps,
              percentOfMax: ex.percentOfMax, weight: ex.weight, setDetails: ex.setDetails as any, methodName: ex.methodName, band: ex.band,
              distance: ex.distance, resisted: ex.resisted, resistance: ex.resistance, restSeconds: ex.restSeconds,
              isWarmup: ex.isWarmup, isTest: ex.isTest, groupId: ex.groupId, groupLabel: ex.groupLabel, order: ex.order,
              notes: ex.notes,
            })),
          },
        })),
      },
    },
    include: { days: { include: { exercises: true } } },
  });
  res.status(201).json(cloned);
}

export async function deleteWeek(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const week = await prisma.programWeek.findUnique({ where: { id: req.params.weekId }, include: { program: true } });
  if (!week || week.program.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });
  await prisma.programWeek.delete({ where: { id: week.id } });
  res.status(204).send();
}

// ---------- exercises ----------

async function verifyDayOwnership(dayId: string, teamId: string) {
  const day = await prisma.programDay.findUnique({ where: { id: dayId }, include: { week: { include: { program: true } } } });
  if (!day || day.week.program.teamId !== teamId) return null;
  return day;
}

export async function addExercise(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const day = await verifyDayOwnership(req.params.dayId, req.user!.teamId);
  if (!day) return res.status(404).json({ error: "Not found" });

  const b = req.body;
  const siblingCount = await prisma.programExercise.count({ where: { dayId: day.id } });
  const exercise = await prisma.programExercise.create({
    data: {
      dayId: day.id,
      exerciseName: b.exerciseName || "",
      type: b.type || "weighted",
      mode: b.mode || "percent",
      sets: b.sets ? Number(b.sets) : null,
      reps: b.reps ? Number(b.reps) : null,
      duration: b.duration ? Number(b.duration) : null,
      percentOfMax: b.percentOfMax ? Number(b.percentOfMax) : null,
      weight: b.weight ? Number(b.weight) : null,
      setDetails: b.setDetails !== undefined ? b.setDetails : null,
      methodName: b.methodName || null,
      band: b.band || null,
      distance: b.distance || null,
      resisted: !!b.resisted,
      resistance: b.resistance || null,
      restSeconds: b.restSeconds || null,
      isWarmup: !!b.isWarmup,
      isTest: !!b.isTest,
      notes: b.notes || null,
      order: siblingCount,
    },
  });
  res.status(201).json(exercise);
}

export async function updateExercise(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const existing = await prisma.programExercise.findUnique({
    where: { id: req.params.exerciseId },
    include: { day: { include: { week: { include: { program: true } } } } },
  });
  if (!existing || existing.day.week.program.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });

  const b = req.body;
  const updated = await prisma.programExercise.update({
    where: { id: existing.id },
    data: {
      exerciseName: b.exerciseName ?? existing.exerciseName,
      type: b.type ?? existing.type,
      mode: b.mode ?? existing.mode,
      sets: b.sets !== undefined ? (b.sets ? Number(b.sets) : null) : existing.sets,
      reps: b.reps !== undefined ? (b.reps ? Number(b.reps) : null) : existing.reps,
      duration: b.duration !== undefined ? (b.duration ? Number(b.duration) : null) : existing.duration,
      percentOfMax: b.percentOfMax !== undefined ? (b.percentOfMax ? Number(b.percentOfMax) : null) : existing.percentOfMax,
      weight: b.weight !== undefined ? (b.weight ? Number(b.weight) : null) : existing.weight,
      setDetails: b.setDetails !== undefined ? b.setDetails : existing.setDetails,
      methodName: b.methodName !== undefined ? b.methodName : existing.methodName,
      band: b.band !== undefined ? b.band : existing.band,
      distance: b.distance !== undefined ? b.distance : existing.distance,
      resisted: b.resisted !== undefined ? !!b.resisted : existing.resisted,
      resistance: b.resistance !== undefined ? b.resistance : existing.resistance,
      restSeconds: b.restSeconds !== undefined ? b.restSeconds : existing.restSeconds,
      isWarmup: b.isWarmup !== undefined ? !!b.isWarmup : existing.isWarmup,
      isTest: b.isTest !== undefined ? !!b.isTest : existing.isTest,
      groupId: b.groupId !== undefined ? b.groupId : existing.groupId,
      groupLabel: b.groupLabel !== undefined ? b.groupLabel : existing.groupLabel,
      notes: b.notes !== undefined ? b.notes : existing.notes,
      order: b.order !== undefined ? Number(b.order) : existing.order,
    },
  });
  res.json(updated);
}

export async function deleteExercise(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const existing = await prisma.programExercise.findUnique({
    where: { id: req.params.exerciseId },
    include: { day: { include: { week: { include: { program: true } } } } },
  });
  if (!existing || existing.day.week.program.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });
  await prisma.programExercise.delete({ where: { id: existing.id } });
  res.status(204).send();
}

// reorder every exercise in a day in one shot — used by drag-and-drop reordering
export async function reorderExercises(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const day = await verifyDayOwnership(req.params.dayId, req.user!.teamId);
  if (!day) return res.status(404).json({ error: "Not found" });
  const { order } = req.body as { order: string[] };
  if (!Array.isArray(order)) return res.status(400).json({ error: "order must be an array of exercise ids" });

  await prisma.$transaction(
    order.map((exerciseId, index) =>
      prisma.programExercise.updateMany({
        where: { id: exerciseId, dayId: day.id },
        data: { order: index },
      })
    )
  );
  res.status(200).json({ ok: true });
}

// group / ungroup a set of exercises within the same day into a labeled superset
export async function groupExercises(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const day = await verifyDayOwnership(req.params.dayId, req.user!.teamId);
  if (!day) return res.status(404).json({ error: "Not found" });
  const { exerciseIds, label } = req.body as { exerciseIds: string[]; label: string };
  const groupId = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await prisma.programExercise.updateMany({
    where: { id: { in: exerciseIds }, dayId: day.id },
    data: { groupId, groupLabel: label || "Group" },
  });
  res.status(200).json({ groupId });
}

export async function ungroupExercises(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Forbidden" });
  const day = await verifyDayOwnership(req.params.dayId, req.user!.teamId);
  if (!day) return res.status(404).json({ error: "Not found" });
  await prisma.programExercise.updateMany({
    where: { dayId: day.id, groupId: req.params.groupId },
    data: { groupId: null, groupLabel: null },
  });
  res.status(204).send();
}
