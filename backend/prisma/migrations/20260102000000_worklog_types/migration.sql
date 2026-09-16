-- AlterTable
ALTER TABLE "WorkoutLog" ADD COLUMN "label" TEXT;
ALTER TABLE "WorkoutLog" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'weighted';
ALTER TABLE "WorkoutLog" ADD COLUMN "methodName" TEXT;
ALTER TABLE "WorkoutLog" ADD COLUMN "band" TEXT;
ALTER TABLE "WorkoutLog" ADD COLUMN "distance" TEXT;
ALTER TABLE "WorkoutLog" ADD COLUMN "resisted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkoutLog" ADD COLUMN "resistance" TEXT;
ALTER TABLE "WorkoutLog" ADD COLUMN "restSeconds" TEXT;
ALTER TABLE "WorkoutLog" ADD COLUMN "isWarmup" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkoutLog" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;
