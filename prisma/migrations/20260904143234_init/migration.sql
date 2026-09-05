-- AlterTable
ALTER TABLE "verification_requests" ADD COLUMN     "document_public_id" VARCHAR(255),
ADD COLUMN     "reviewed_by" INTEGER;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
