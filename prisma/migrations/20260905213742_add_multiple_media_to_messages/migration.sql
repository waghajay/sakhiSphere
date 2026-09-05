/*
  Warnings:

  - You are about to drop the column `media_url` on the `messages` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "messages" DROP COLUMN "media_url",
ADD COLUMN     "media_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];
