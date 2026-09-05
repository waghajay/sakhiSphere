-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "media_thumbnails" TEXT[] DEFAULT ARRAY[]::TEXT[];
