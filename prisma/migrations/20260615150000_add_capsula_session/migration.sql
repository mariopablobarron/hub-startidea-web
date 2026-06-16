-- CreateTable
CREATE TABLE "CapsulaSession" (
    "id" TEXT NOT NULL,
    "sala" TEXT NOT NULL DEFAULT 'estudio',
    "guestName" TEXT,
    "guestContext" TEXT NOT NULL,
    "modoBase" TEXT,
    "ambiente" TEXT,
    "guion" JSONB NOT NULL,
    "transcript" JSONB,
    "note" TEXT,
    "recordingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapsulaSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CapsulaSession_recordingId_key" ON "CapsulaSession"("recordingId");

-- CreateIndex
CREATE INDEX "CapsulaSession_sala_createdAt_idx" ON "CapsulaSession"("sala", "createdAt");

-- AddForeignKey
ALTER TABLE "CapsulaSession" ADD CONSTRAINT "CapsulaSession_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording"("id") ON DELETE SET NULL ON UPDATE CASCADE;
