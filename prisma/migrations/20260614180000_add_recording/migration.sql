-- CreateEnum
CREATE TYPE "RecordingKind" AS ENUM ('AUDIO', 'VIDEO');

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL,
    "sala" TEXT NOT NULL,
    "kind" "RecordingKind" NOT NULL DEFAULT 'VIDEO',
    "mime" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationSec" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recording_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Recording_sala_createdAt_idx" ON "Recording"("sala", "createdAt");
