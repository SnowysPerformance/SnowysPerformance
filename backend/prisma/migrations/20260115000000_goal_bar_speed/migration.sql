-- A target bar speed (velocity-based training), in meters/second, that a
-- coach can set per exercise in the plan builder alongside/instead of a
-- weight or %1RM target.
ALTER TABLE "ProgramExercise" ADD COLUMN "goalBarSpeed" DOUBLE PRECISION;
