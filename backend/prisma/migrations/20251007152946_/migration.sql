/*
  Warnings:

  - Made the column `isVerified` on table `RefactoringSuggestion` required. This step will fail if there are existing NULL values in that column.
  - Made the column `verificationBadge` on table `RefactoringSuggestion` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "RefactoringSuggestion" ALTER COLUMN "isVerified" SET NOT NULL,
ALTER COLUMN "verificationBadge" SET NOT NULL,
ALTER COLUMN "validationLayers" SET DATA TYPE JSONB;

-- CreateIndex
CREATE INDEX "RefactoringSuggestion_isVerified_idx" ON "RefactoringSuggestion"("isVerified");
