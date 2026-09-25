-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'UPI', 'CASH', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "ContactMethod" AS ENUM ('PHONE', 'EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "IdProofType" AS ENUM ('AADHAAR', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID', 'OTHER');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "FitnessGoal" AS ENUM ('WEIGHT_LOSS', 'MUSCLE_GAIN', 'STRENGTH', 'ENDURANCE', 'REHAB', 'GENERAL_FITNESS');

-- CreateEnum
CREATE TYPE "FreezeReason" AS ENUM ('MEDICAL', 'TRAVEL', 'PERSONAL', 'OTHER');

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "accessBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "accessCardNumber" TEXT,
ADD COLUMN     "addressLine" TEXT,
ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "alternatePhone" TEXT,
ADD COLUMN     "assignedTrainerId" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "emergencyName" TEXT,
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "emergencyRelationship" TEXT,
ADD COLUMN     "experienceLevel" "ExperienceLevel",
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "heightCm" DOUBLE PRECISION,
ADD COLUMN     "idProofDocUrl" TEXT,
ADD COLUMN     "idProofLast4" TEXT,
ADD COLUMN     "idProofType" "IdProofType",
ADD COLUMN     "injuries" TEXT,
ADD COLUMN     "medicalConditions" TEXT,
ADD COLUMN     "medications" TEXT,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "parqCompletedAt" TIMESTAMP(3),
ADD COLUMN     "physicianClearance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "physicianClearanceDate" TIMESTAMP(3),
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "preferredContact" "ContactMethod" NOT NULL DEFAULT 'PHONE',
ADD COLUMN     "primaryGoal" "FitnessGoal",
ADD COLUMN     "state" TEXT,
ADD COLUMN     "waiverSignedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "method" "PaymentMethod";

-- CreateTable
CREATE TABLE "body_measurements" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightKg" DOUBLE PRECISION,
    "bodyFatPercent" DOUBLE PRECISION,
    "chestCm" DOUBLE PRECISION,
    "waistCm" DOUBLE PRECISION,
    "hipsCm" DOUBLE PRECISION,
    "armCm" DOUBLE PRECISION,
    "thighCm" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "body_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pt_packages" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "trainerId" TEXT,
    "sessionsPurchased" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "pt_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pt_sessions" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "trainerId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "pt_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_notes" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_freezes" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" "FreezeReason" NOT NULL DEFAULT 'OTHER',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_freezes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "body_measurements_memberId_recordedAt_idx" ON "body_measurements"("memberId", "recordedAt");

-- CreateIndex
CREATE INDEX "pt_packages_memberId_idx" ON "pt_packages"("memberId");

-- CreateIndex
CREATE INDEX "pt_sessions_memberId_scheduledAt_idx" ON "pt_sessions"("memberId", "scheduledAt");

-- CreateIndex
CREATE INDEX "member_notes_memberId_createdAt_idx" ON "member_notes"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "subscription_freezes_subscriptionId_idx" ON "subscription_freezes"("subscriptionId");

-- CreateIndex
CREATE INDEX "members_tenantId_assignedTrainerId_idx" ON "members"("tenantId", "assignedTrainerId");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_assignedTrainerId_fkey" FOREIGN KEY ("assignedTrainerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pt_packages" ADD CONSTRAINT "pt_packages_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pt_packages" ADD CONSTRAINT "pt_packages_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pt_sessions" ADD CONSTRAINT "pt_sessions_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "pt_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pt_sessions" ADD CONSTRAINT "pt_sessions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pt_sessions" ADD CONSTRAINT "pt_sessions_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_freezes" ADD CONSTRAINT "subscription_freezes_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
