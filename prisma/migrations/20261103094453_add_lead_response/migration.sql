-- CreateTable
CREATE TABLE "LeadResponse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadResponse_name_key" ON "LeadResponse"("name");

-- CreateIndex
CREATE INDEX "LeadResponse_name_idx" ON "LeadResponse"("name");

-- CreateIndex
CREATE INDEX "LeadResponse_isActive_idx" ON "LeadResponse"("isActive");

-- AddForeignKey
ALTER TABLE "LeadResponse" ADD CONSTRAINT "LeadResponse_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
