-- CreateEnum
CREATE TYPE "NoticeAudience" AS ENUM ('ALL', 'OWNERS', 'TENANTS');

-- AlterTable
ALTER TABLE "notices"
  ADD COLUMN "audience" "NoticeAudience" NOT NULL DEFAULT 'ALL',
  ADD COLUMN "category" TEXT;

-- CreateTable
CREATE TABLE "notice_reads" (
  "id" TEXT NOT NULL,
  "societyId" TEXT NOT NULL,
  "noticeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notice_reads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notice_reads_societyId_idx" ON "notice_reads"("societyId");
CREATE INDEX "notice_reads_noticeId_idx" ON "notice_reads"("noticeId");
CREATE UNIQUE INDEX "notice_reads_noticeId_userId_key" ON "notice_reads"("noticeId", "userId");

-- AddForeignKey
ALTER TABLE "notice_reads" ADD CONSTRAINT "notice_reads_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "societies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notice_reads" ADD CONSTRAINT "notice_reads_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
