-- CreateTable
CREATE TABLE "ProgramPhase" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weeks" INTEGER,
    "goal" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProgramPhase_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProgramPhase" ADD CONSTRAINT "ProgramPhase_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable ProgramWeek: add optional phaseId link
ALTER TABLE "ProgramWeek" ADD COLUMN "phaseId" TEXT;
ALTER TABLE "ProgramWeek" ADD CONSTRAINT "ProgramWeek_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "ProgramPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable ProgramDay: add label
ALTER TABLE "ProgramDay" ADD COLUMN "label" TEXT;

-- AlterTable ProgramExercise: loosen sets/reps to optional, add new fields
ALTER TABLE "ProgramExercise" ALTER COLUMN "sets" DROP NOT NULL;
ALTER TABLE "ProgramExercise" ALTER COLUMN "reps" DROP NOT NULL;
ALTER TABLE "ProgramExercise" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'weighted';
ALTER TABLE "ProgramExercise" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'percent';
ALTER TABLE "ProgramExercise" ADD COLUMN "weight" DOUBLE PRECISION;
ALTER TABLE "ProgramExercise" ADD COLUMN "methodName" TEXT;
ALTER TABLE "ProgramExercise" ADD COLUMN "band" TEXT;
ALTER TABLE "ProgramExercise" ADD COLUMN "distance" TEXT;
ALTER TABLE "ProgramExercise" ADD COLUMN "resisted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProgramExercise" ADD COLUMN "resistance" TEXT;
ALTER TABLE "ProgramExercise" ADD COLUMN "restSeconds" TEXT;
ALTER TABLE "ProgramExercise" ADD COLUMN "isWarmup" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProgramExercise" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProgramExercise" ADD COLUMN "groupId" TEXT;
ALTER TABLE "ProgramExercise" ADD COLUMN "groupLabel" TEXT;
ALTER TABLE "ProgramExercise" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
