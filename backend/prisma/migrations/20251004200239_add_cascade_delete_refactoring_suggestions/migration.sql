-- DropForeignKey
ALTER TABLE "RefactoringSuggestion" DROP CONSTRAINT "RefactoringSuggestion_issueId_fkey";

-- AddForeignKey
ALTER TABLE "RefactoringSuggestion" ADD CONSTRAINT "RefactoringSuggestion_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
