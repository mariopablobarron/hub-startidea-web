-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('PHYSICAL_KEY', 'ALARM_CODE', 'ACCESS_CARD', 'GARAGE_REMOTE', 'BUILDING_KEY', 'OTHER');

-- CreateEnum
CREATE TYPE "KeyHolderStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "KeyHolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "userId" TEXT,
    "accessType" "AccessType" NOT NULL DEFAULT 'PHYSICAL_KEY',
    "identifier" TEXT,
    "role" TEXT,
    "notes" TEXT,
    "status" "KeyHolderStatus" NOT NULL DEFAULT 'ACTIVE',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeyHolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KeyHolder_status_idx" ON "KeyHolder"("status");

-- CreateIndex
CREATE INDEX "KeyHolder_accessType_status_idx" ON "KeyHolder"("accessType", "status");

-- AddForeignKey
ALTER TABLE "KeyHolder" ADD CONSTRAINT "KeyHolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
