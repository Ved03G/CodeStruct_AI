-- CreateTable
CREATE TABLE "RefactoringSuggestion" (
    "id" SERIAL NOT NULL,
    "issueId" INTEGER NOT NULL,
    "originalCode" TEXT NOT NULL,
    "refactoredCode" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 75,
    "changes" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefactoringSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RefactoringSuggestion_issueId_idx" ON "RefactoringSuggestion"("issueId");

-- CreateIndex
CREATE INDEX "RefactoringSuggestion_status_idx" ON "RefactoringSuggestion"("status");

-- AddForeignKey
ALTER TABLE "RefactoringSuggestion" ADD CONSTRAINT "RefactoringSuggestion_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
