-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricingWithGst" BOOLEAN NOT NULL DEFAULT false,
    "monthlyPrice" DECIMAL(12,2),
    "quarterlyPrice" DECIMAL(12,2),
    "halfYearlyPrice" DECIMAL(12,2),
    "yearlyPrice" DECIMAL(12,2),
    "hasFreeTrial" BOOLEAN NOT NULL DEFAULT false,
    "freeTrialDays" INTEGER NOT NULL DEFAULT 2,
    "riskAbove" TEXT,
    "telegram" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
