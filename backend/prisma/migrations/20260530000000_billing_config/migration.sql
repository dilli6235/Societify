-- CreateEnum
CREATE TYPE "MaintenanceMethod" AS ENUM ('FIXED', 'PER_SQFT');

-- AlterTable
ALTER TABLE "societies"
  ADD COLUMN "gstin" TEXT,
  ADD COLUMN "maintenanceMethod" "MaintenanceMethod" NOT NULL DEFAULT 'FIXED',
  ADD COLUMN "maintenanceFixedAmount" DECIMAL(12,2),
  ADD COLUMN "maintenanceRatePerSqft" DECIMAL(10,2),
  ADD COLUMN "dueDay" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "gracePeriodDays" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "lateFee" DECIMAL(12,2) NOT NULL DEFAULT 0;
