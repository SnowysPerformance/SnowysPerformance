-- Let deleting an athlete clean up their workout/test/wearable history
-- automatically, instead of the delete failing because old records still
-- point at them.
ALTER TABLE "WorkoutLog" DROP CONSTRAINT "WorkoutLog_athleteId_fkey";
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TestResult" DROP CONSTRAINT "TestResult_athleteId_fkey";
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WearableData" DROP CONSTRAINT "WearableData_athleteId_fkey";
ALTER TABLE "WearableData" ADD CONSTRAINT "WearableData_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WearableAccountLink" DROP CONSTRAINT "WearableAccountLink_athleteId_fkey";
ALTER TABLE "WearableAccountLink" ADD CONSTRAINT "WearableAccountLink_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
