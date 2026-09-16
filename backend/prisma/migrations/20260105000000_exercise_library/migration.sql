-- CreateTable
CREATE TABLE "ExerciseLibraryItem" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regressions" JSONB,
    "progressions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExerciseLibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseLibraryItem_teamId_name_key" ON "ExerciseLibraryItem"("teamId", "name");

-- AddForeignKey
ALTER TABLE "ExerciseLibraryItem" ADD CONSTRAINT "ExerciseLibraryItem_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
