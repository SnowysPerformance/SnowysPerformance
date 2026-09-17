-- Lets a coach pick a specific test type + unit when prescribing a test in
-- a plan (e.g. "Vertical Jump" in inches), same as how tests are recorded
-- everywhere else on the site.
ALTER TABLE "ProgramExercise" ADD COLUMN "testUnit" TEXT;
