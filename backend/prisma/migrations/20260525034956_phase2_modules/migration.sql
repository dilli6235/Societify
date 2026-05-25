-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'BIKE', 'SCOOTER', 'BICYCLE', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('MAID', 'COOK', 'DRIVER', 'GARDENER', 'SECURITY', 'ELECTRICIAN', 'PLUMBER', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentVisibility" AS ENUM ('ALL_RESIDENTS', 'COMMITTEE', 'ADMIN_ONLY');

-- CreateEnum
CREATE TYPE "SosType" AS ENUM ('MEDICAL', 'FIRE', 'SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "SosStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL DEFAULT 'CAR',
    "registrationNumber" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "color" TEXT,
    "parkingSlot" TEXT,
    "ownerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_members" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "StaffRole" NOT NULL DEFAULT 'OTHER',
    "photoUrl" TEXT,
    "idProofUrl" TEXT,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_attendance" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "direction" "CheckDirection" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gateName" TEXT,
    "recordedById" TEXT NOT NULL,

    CONSTRAINT "staff_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "visibility" "DocumentVisibility" NOT NULL DEFAULT 'ALL_RESIDENTS',
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_alerts" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "type" "SosType" NOT NULL DEFAULT 'OTHER',
    "message" TEXT,
    "location" TEXT,
    "status" "SosStatus" NOT NULL DEFAULT 'ACTIVE',
    "raisedById" TEXT NOT NULL,
    "acknowledgedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sos_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicles_societyId_idx" ON "vehicles"("societyId");

-- CreateIndex
CREATE INDEX "vehicles_unitId_idx" ON "vehicles"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_societyId_registrationNumber_key" ON "vehicles"("societyId", "registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_code_key" ON "staff_members"("code");

-- CreateIndex
CREATE INDEX "staff_members_societyId_idx" ON "staff_members"("societyId");

-- CreateIndex
CREATE INDEX "staff_attendance_societyId_idx" ON "staff_attendance"("societyId");

-- CreateIndex
CREATE INDEX "staff_attendance_staffId_idx" ON "staff_attendance"("staffId");

-- CreateIndex
CREATE INDEX "staff_attendance_societyId_timestamp_idx" ON "staff_attendance"("societyId", "timestamp");

-- CreateIndex
CREATE INDEX "documents_societyId_idx" ON "documents"("societyId");

-- CreateIndex
CREATE INDEX "sos_alerts_societyId_idx" ON "sos_alerts"("societyId");

-- CreateIndex
CREATE INDEX "sos_alerts_societyId_status_idx" ON "sos_alerts"("societyId", "status");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "societies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "societies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "societies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "societies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "societies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
