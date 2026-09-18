-- CreateTable
CREATE TABLE "group_post_likes" (
    "id" SERIAL NOT NULL,
    "group_post_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_post_comments" (
    "id" SERIAL NOT NULL,
    "group_post_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_post_likes_user_id_created_at_idx" ON "group_post_likes"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "group_post_likes_group_post_id_user_id_key" ON "group_post_likes"("group_post_id", "user_id");

-- CreateIndex
CREATE INDEX "group_post_comments_group_post_id_created_at_idx" ON "group_post_comments"("group_post_id", "created_at");

-- CreateIndex
CREATE INDEX "group_post_comments_parent_id_idx" ON "group_post_comments"("parent_id");

-- AddForeignKey
ALTER TABLE "group_post_likes" ADD CONSTRAINT "group_post_likes_group_post_id_fkey" FOREIGN KEY ("group_post_id") REFERENCES "group_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_post_likes" ADD CONSTRAINT "group_post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_post_comments" ADD CONSTRAINT "group_post_comments_group_post_id_fkey" FOREIGN KEY ("group_post_id") REFERENCES "group_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_post_comments" ADD CONSTRAINT "group_post_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_post_comments" ADD CONSTRAINT "group_post_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "group_post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
