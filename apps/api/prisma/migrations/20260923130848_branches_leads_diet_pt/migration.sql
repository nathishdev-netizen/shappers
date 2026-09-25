-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'TRIAL', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WALK_IN', 'WEBSITE', 'INSTAGRAM', 'REFERRAL', 'PHONE', 'OTHER');

-- CreateEnum
CREATE TYPE "DietGoal" AS ENUM ('FAT_LOSS', 'MUSCLE_GAIN', 'MAINTENANCE', 'PERFORMANCE');

-- CreateEnum
CREATE TYPE "PtSessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- AlterTable
ALTER TABLE "gym_classes" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "trainerId" TEXT;

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "membership_plans" ADD COLUMN     "ptSessionsIncluded" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "pt_sessions" ADD COLUMN     "durationMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "focus" TEXT,
ADD COLUMN     "status" "PtSessionStatus" NOT NULL DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "specialty" TEXT;

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "addressLine" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "openingHours" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'WALK_IN',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "interestedPlanId" TEXT,
    "assignedTrainerId" TEXT,
    "notes" TEXT,
    "followUpAt" TIMESTAMP(3),
    "convertedMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diet_plans" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "trainerId" TEXT,
    "title" TEXT NOT NULL,
    "goal" "DietGoal" NOT NULL DEFAULT 'MAINTENANCE',
    "dailyCalories" INTEGER,
    "proteinG" INTEGER,
    "carbsG" INTEGER,
    "fatG" INTEGER,
    "meals" JSONB NOT NULL,
    "notes" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diet_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branches_tenantId_name_key" ON "branches"("tenantId", "name");

-- CreateIndex
CREATE INDEX "leads_tenantId_status_idx" ON "leads"("tenantId", "status");

-- CreateIndex
CREATE INDEX "diet_plans_memberId_isActive_idx" ON "diet_plans"("memberId", "isActive");

-- CreateIndex
CREATE INDEX "members_tenantId_branchId_idx" ON "members"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "pt_sessions_trainerId_scheduledAt_idx" ON "pt_sessions"("trainerId", "scheduledAt");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_interestedPlanId_fkey" FOREIGN KEY ("interestedPlanId") REFERENCES "membership_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedTrainerId_fkey" FOREIGN KEY ("assignedTrainerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_plans" ADD CONSTRAINT "diet_plans_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_plans" ADD CONSTRAINT "diet_plans_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_classes" ADD CONSTRAINT "gym_classes_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
