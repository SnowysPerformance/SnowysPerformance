-- Add indexes on foreign-key and commonly-filtered columns so team-scoped
-- and athlete-scoped queries stay fast as data volume grows (more clients,
-- more years of workout/test/wearable history). Prisma does not
-- auto-index foreign key columns for this project, so without these,
-- lookups like "all workout logs for this athlete" or "everything for
-- this team" do a full table scan once the tables get large.

CREATE INDEX "User_teamId_idx" ON "User"("teamId");

CREATE INDEX "Program_teamId_idx" ON "Program"("teamId");

CREATE INDEX "ProgramPhase_programId_idx" ON "ProgramPhase"("programId");

CREATE INDEX "ProgramWeek_programId_idx" ON "ProgramWeek"("programId");
CREATE INDEX "ProgramWeek_phaseId_idx" ON "ProgramWeek"("phaseId");

CREATE INDEX "ProgramDay_weekId_idx" ON "ProgramDay"("weekId");

CREATE INDEX "ProgramExercise_dayId_idx" ON "ProgramExercise"("dayId");

CREATE INDEX "WorkoutLog_athleteId_date_idx" ON "WorkoutLog"("athleteId", "date");
CREATE INDEX "WorkoutLog_teamId_idx" ON "WorkoutLog"("teamId");

CREATE INDEX "TestResult_athleteId_date_idx" ON "TestResult"("athleteId", "date");
CREATE INDEX "TestResult_teamId_idx" ON "TestResult"("teamId");

CREATE INDEX "WearableData_athleteId_date_idx" ON "WearableData"("athleteId", "date");
CREATE INDEX "WearableData_teamId_idx" ON "WearableData"("teamId");

CREATE INDEX "WearableAccountLink_athleteId_idx" ON "WearableAccountLink"("athleteId");

CREATE INDEX "ProgramAssignment_athleteId_idx" ON "ProgramAssignment"("athleteId");
