import { Request, Response } from "express";
import { prisma } from "../db";

// ---------- export ----------

const fullProgramInclude = {
  phases: {
    orderBy: { order: "asc" as const },
    include: {
      microcycles: {
        include: { days: { include: { exercises: { orderBy: { order: "asc" as const } } } } },
      },
    },
  },
};

// Strips a program down to just the "content" fields (no ids, no team/day/
// week foreign keys) so it can be handed to another team, or re-imported as
// a brand new program, without colliding with anything that already exists.
function serializeProgram(program: any) {
  return {
    name: program.name,
    phases: (program.phases || []).map((phase: any) => ({
      name: phase.name,
      weeks: phase.weeks,
      goal: phase.goal,
      microcycles: (phase.microcycles || []).map((week: any) => ({
        name: week.name,
        startDate: week.startDate,
        days: (week.days || []).map((day: any) => ({
          dayOfWeek: day.dayOfWeek,
          label: day.label,
          name: day.name,
          exercises: (day.exercises || []).map((ex: any) => ({
            exerciseName: ex.exerciseName,
            type: ex.type,
            mode: ex.mode,
            sets: ex.sets,
            reps: ex.reps,
            percentOfMax: ex.percentOfMax,
            weight: ex.weight,
            methodName: ex.methodName,
            band: ex.band,
            distance: ex.distance,
            resisted: ex.resisted,
            resistance: ex.resistance,
            restSeconds: ex.restSeconds,
            isWarmup: ex.isWarmup,
            isTest: ex.isTest,
            testUnit: ex.testUnit,
            groupId: ex.groupId,
            groupLabel: ex.groupLabel,
            order: ex.order,
            notes: ex.notes,
          })),
        })),
      })),
    })),
  };
}

export async function exportProgram(req: Request, res: Response) {
  const program = await prisma.program.findUnique({ where: { id: req.params.id }, include: fullProgramInclude });
  if (!program || program.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });

  if (req.user!.role === "ATHLETE") {
    const isAssigned = await prisma.programAssignment.findFirst({ where: { programId: program.id, athleteId: req.user!.userId } });
    if (!isAssigned) return res.status(403).json({ error: "This program hasn't been assigned to you" });
  }

  res.json({ exportedAt: new Date().toISOString(), kind: "program", program: serializeProgram(program) });
}

export async function exportAthlete(req: Request, res: Response) {
  const athleteId = req.params.id;
  if (req.user!.role === "ATHLETE" && req.user!.userId !== athleteId) {
    return res.status(403).json({ error: "You can only export your own data" });
  }
  const athlete = await prisma.user.findUnique({ where: { id: athleteId } });
  if (!athlete || athlete.teamId !== req.user!.teamId) return res.status(404).json({ error: "Not found" });

  const [workoutLogs, testResults, assignments] = await Promise.all([
    prisma.workoutLog.findMany({ where: { athleteId }, orderBy: { date: "asc" } }),
    prisma.testResult.findMany({ where: { athleteId }, orderBy: { date: "asc" } }),
    prisma.programAssignment.findMany({ where: { athleteId }, include: { program: { select: { id: true, name: true } } } }),
  ]);

  res.json({
    exportedAt: new Date().toISOString(),
    kind: "athlete",
    athlete: { name: athlete.name, email: athlete.email },
    assignedPrograms: assignments.map((a) => a.program),
    workoutLogs,
    testResults,
  });
}

export async function exportTeam(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Only coaches can export the whole team" });
  const teamId = req.user!.teamId;

  const [team, athletes, programs, exerciseLibrary, testTypeLibrary, workoutLogs, testResults] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamId } }),
    prisma.user.findMany({ where: { teamId, role: "ATHLETE" }, select: { name: true, email: true } }),
    prisma.program.findMany({ where: { teamId }, include: fullProgramInclude }),
    prisma.exerciseLibraryItem.findMany({ where: { teamId } }),
    prisma.testTypeLibraryItem.findMany({ where: { teamId } }),
    prisma.workoutLog.findMany({ where: { teamId } }),
    prisma.testResult.findMany({ where: { teamId } }),
  ]);

  res.json({
    exportedAt: new Date().toISOString(),
    kind: "team",
    team: { name: team?.name },
    athletes,
    programs: programs.map(serializeProgram),
    exerciseLibrary: exerciseLibrary.map((i) => ({ name: i.name, regressions: i.regressions, progressions: i.progressions })),
    testTypeLibrary: testTypeLibrary.map((i) => ({ name: i.name, unit: i.unit })),
    workoutLogs,
    testResults,
  });
}

// ---------- import ----------

async function createProgramFromExport(teamId: string, createdById: string, programData: any) {
  const newProgram = await prisma.program.create({
    data: { teamId, createdById, name: (programData?.name || "Imported Program") + " (imported)" },
  });
  for (const phase of programData?.phases || []) {
    const newPhase = await prisma.programPhase.create({
      data: { programId: newProgram.id, name: phase.name || "Phase", weeks: phase.weeks ?? null, goal: phase.goal ?? null },
    });
    for (const week of phase.microcycles || []) {
      const newWeek = await prisma.programWeek.create({
        data: {
          programId: newProgram.id,
          phaseId: newPhase.id,
          weekNumber: 0,
          name: week.name || "Week",
          startDate: week.startDate ? new Date(week.startDate) : null,
        },
      });
      for (const day of week.days || []) {
        const newDay = await prisma.programDay.create({
          data: { weekId: newWeek.id, dayOfWeek: day.dayOfWeek ?? 0, label: day.label ?? null, name: day.name ?? null },
        });
        for (const ex of day.exercises || []) {
          await prisma.programExercise.create({
            data: {
              dayId: newDay.id,
              exerciseName: ex.exerciseName || "",
              type: ex.type || "weighted",
              mode: ex.mode || "percent",
              sets: ex.sets ?? null,
              reps: ex.reps ?? null,
              percentOfMax: ex.percentOfMax ?? null,
              weight: ex.weight ?? null,
              methodName: ex.methodName ?? null,
              band: ex.band ?? null,
              distance: ex.distance ?? null,
              resisted: !!ex.resisted,
              resistance: ex.resistance ?? null,
              restSeconds: ex.restSeconds ?? null,
              isWarmup: !!ex.isWarmup,
              isTest: !!ex.isTest,
              testUnit: ex.testUnit ?? null,
              groupId: ex.groupId ?? null,
              groupLabel: ex.groupLabel ?? null,
              order: ex.order ?? 0,
              notes: ex.notes ?? null,
            },
          });
        }
      }
    }
  }
  return newProgram;
}

export async function importData(req: Request, res: Response) {
  if (req.user!.role !== "COACH") return res.status(403).json({ error: "Only coaches can import data" });
  const teamId = req.user!.teamId;
  const createdById = req.user!.userId;
  const body = req.body || {};

  if (body.kind === "program" && body.program) {
    const program = await createProgramFromExport(teamId, createdById, body.program);
    return res.status(201).json({ imported: "program", programId: program.id });
  }

  if (body.kind === "team") {
    let programsImported = 0;
    for (const programData of body.programs || []) {
      await createProgramFromExport(teamId, createdById, programData);
      programsImported++;
    }

    let libraryImported = 0;
    for (const item of body.exerciseLibrary || []) {
      if (!item?.name?.trim()) continue;
      await prisma.exerciseLibraryItem.upsert({
        where: { teamId_name: { teamId, name: item.name.trim() } },
        update: { regressions: item.regressions ?? undefined, progressions: item.progressions ?? undefined },
        create: { teamId, name: item.name.trim(), regressions: item.regressions ?? undefined, progressions: item.progressions ?? undefined },
      });
      libraryImported++;
    }

    let testTypesImported = 0;
    for (const item of body.testTypeLibrary || []) {
      if (!item?.name?.trim()) continue;
      await prisma.testTypeLibraryItem.upsert({
        where: { teamId_name: { teamId, name: item.name.trim() } },
        update: { unit: item.unit || "" },
        create: { teamId, name: item.name.trim(), unit: item.unit || "" },
      });
      testTypesImported++;
    }

    return res.status(201).json({ imported: "team", programsImported, libraryImported, testTypesImported });
  }

  return res.status(400).json({ error: "That doesn't look like a Snowy's Performance export file." });
}
