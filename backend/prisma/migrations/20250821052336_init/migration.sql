-- CreateTable
CREATE TABLE "FileAst" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "astFormat" TEXT NOT NULL,
    "ast" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAst_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FileAst_projectId_idx" ON "FileAst"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "FileAst_projectId_filePath_key" ON "FileAst"("projectId", "filePath");

-- AddForeignKey
ALTER TABLE "FileAst" ADD CONSTRAINT "FileAst_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
