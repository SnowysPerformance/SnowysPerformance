-- Velocity-based training (VBT). goalBarSpeed (added earlier) is the low end
-- of a coach's prescribed bar-speed zone; these add the high end and an
-- optional velocity-loss cutoff (%) per planned exercise.
ALTER TABLE "ProgramExercise" ADD COLUMN "goalBarSpeedMax" DOUBLE PRECISION;
ALTER TABLE "ProgramExercise" ADD COLUMN "velocityLossPct" DOUBLE PRECISION;

-- A snapshot of that prescription on each logged workout, so a log can show
-- whether its sets hit the zone even if the plan is edited later. Each set's
-- measured speed is stored inside the existing "sets" JSON as "velocity".
ALTER TABLE "WorkoutLog" ADD COLUMN "vbtMin" DOUBLE PRECISION;
ALTER TABLE "WorkoutLog" ADD COLUMN "vbtMax" DOUBLE PRECISION;
ALTER TABLE "WorkoutLog" ADD COLUMN "vbtLossPct" DOUBLE PRECISION;
