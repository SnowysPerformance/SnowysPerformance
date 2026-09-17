import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const team = await prisma.team.create({ data: { name: "Snowy's Performance" } });

  const coachPasswordHash = await bcrypt.hash("password123", 10);
  const coach = await prisma.user.create({
    data: { email: "coach@example.com", passwordHash: coachPasswordHash, name: "Coach Snow", role: "COACH", teamId: team.id, isHeadCoach: true },
  });

  const athletePasswordHash = await bcrypt.hash("password123", 10);
  const athlete = await prisma.user.create({
    data: { email: "athlete@example.com", passwordHash: athletePasswordHash, name: "Alex Athlete", role: "ATHLETE", teamId: team.id },
  });

  await prisma.program.create({
    data: {
      name: "Off-Season Strength Block",
      teamId: team.id,
      createdById: coach.id,
      weeks: {
        create: [
          {
            weekNumber: 1,
            name: "Week 1",
            days: {
              create: [
                {
                  dayOfWeek: 1,
                  name: "Squat Day",
                  exercises: { create: [{ exerciseName: "Back Squat", sets: 5, reps: 5, percentOfMax: 75 }] },
                },
                {
                  dayOfWeek: 3,
                  name: "Bench Day",
                  exercises: { create: [{ exerciseName: "Bench Press", sets: 5, reps: 5, percentOfMax: 75 }] },
                },
              ],
            },
          },
        ],
      },
    },
  });

  const today = new Date();
  for (let i = 0; i < 10; i++) {
    const d = new Date(today.getTime() - i * 2 * 24 * 60 * 60 * 1000);
    const weight = 225 + i;
    await prisma.workoutLog.create({
      data: {
        teamId: team.id,
        athleteId: athlete.id,
        date: d,
        exerciseName: "Back Squat",
        sets: [{ weight, reps: 5 }, { weight, reps: 5 }, { weight, reps: 5 }],
        volumeLoad: weight * 5 * 3,
      },
    });
  }

  await prisma.testResult.create({
    data: { teamId: team.id, athleteId: athlete.id, testType: "Vertical Jump", value: 28, unit: "in", date: today },
  });

  await prisma.wearableData.create({
    data: { teamId: team.id, athleteId: athlete.id, source: "WHOOP", date: today, recovery: 62, strain: 11.4, sleepScore: 78, restingHR: 54 },
  });

  console.log("Seed complete.");
  console.log("Coach login:   coach@example.com / password123");
  console.log("Athlete login: athlete@example.com / password123");
  console.log("To add another athlete, sign in as the coach and use \"Invite an Athlete\" on the Athletes page.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
