-- AlterTable
ALTER TABLE "residencies" ADD COLUMN     "depositAmount" DECIMAL(12,2),
ADD COLUMN     "leaseEndDate" TIMESTAMP(3),
ADD COLUMN     "leaseStartDate" TIMESTAMP(3),
ADD COLUMN     "rentAmount" DECIMAL(12,2);
