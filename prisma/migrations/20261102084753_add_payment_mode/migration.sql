-- CreateTable
CREATE TABLE "PaymentMode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "charges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstin" TEXT,
    "state" TEXT,
    "invoicePrefix" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMode_name_key" ON "PaymentMode"("name");

-- CreateIndex
CREATE INDEX "PaymentMode_name_idx" ON "PaymentMode"("name");

-- CreateIndex
CREATE INDEX "PaymentMode_isActive_idx" ON "PaymentMode"("isActive");
