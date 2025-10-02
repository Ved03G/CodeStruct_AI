-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "className" TEXT,
ADD COLUMN     "confidence" INTEGER NOT NULL DEFAULT 75,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "duplicateGroupId" TEXT,
ADD COLUMN     "lineEnd" INTEGER,
ADD COLUMN     "lineStart" INTEGER,
ADD COLUMN     "recommendation" TEXT,
ADD COLUMN     "severity" TEXT NOT NULL DEFAULT 'Medium';

-- CreateIndex
CREATE INDEX "Issue_projectId_idx" ON "Issue"("projectId");

-- CreateIndex
CREATE INDEX "Issue_issueType_idx" ON "Issue"("issueType");

-- CreateIndex
CREATE INDEX "Issue_severity_idx" ON "Issue"("severity");

-- CreateIndex
CREATE INDEX "Issue_duplicateGroupId_idx" ON "Issue"("duplicateGroupId");
