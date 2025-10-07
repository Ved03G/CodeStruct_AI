-- Add RefactoringMirror validation fields to RefactoringSuggestion
ALTER TABLE "RefactoringSuggestion" ADD COLUMN "isVerified" BOOLEAN DEFAULT false;
ALTER TABLE "RefactoringSuggestion" ADD COLUMN "verificationBadge" TEXT DEFAULT 'failed';
ALTER TABLE "RefactoringSuggestion" ADD COLUMN "validationLayers" JSON;