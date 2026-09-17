-- CreateTable
CREATE TABLE "TestTypeLibraryItem" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestTypeLibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TestTypeLibraryItem_teamId_name_key" ON "TestTypeLibraryItem"("teamId", "name");

-- AddForeignKey
ALTER TABLE "TestTypeLibraryItem" ADD CONSTRAINT "TestTypeLibraryItem_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
