-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "district" TEXT,
    "alternateMobile" TEXT,
    "dob" TIMESTAMP(3),
    "aadhar" TEXT,
    "fatherName" TEXT,
    "state" TEXT,
    "city" TEXT,
    "pan" TEXT,
    "gstin" TEXT,
    "occupation" TEXT,
    "segment" TEXT,
    "investment" TEXT,
    "profile" TEXT,
    "leadResponse" TEXT,
    "leadSource" TEXT DEFAULT 'DIRECT',
    "description" TEXT,
    "experience" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNFOLLOWED',
    "callbackDate" TIMESTAMP(3),
    "allotToId" TEXT,
    "teamId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_mobile_key" ON "Lead"("mobile");

-- CreateIndex
CREATE INDEX "Lead_mobile_idx" ON "Lead"("mobile");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_allotToId_idx" ON "Lead"("allotToId");

-- CreateIndex
CREATE INDEX "Lead_teamId_idx" ON "Lead"("teamId");

-- CreateIndex
CREATE INDEX "Lead_callbackDate_idx" ON "Lead"("callbackDate");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_allotToId_fkey" FOREIGN KEY ("allotToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
