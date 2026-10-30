-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "callingExtension" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "employeeProfileId" TEXT,
ADD COLUMN     "employeeTarget" INTEGER DEFAULT 0,
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "joiningDate" TIMESTAMP(3),
ADD COLUMN     "leadFetchSources" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "mobile" TEXT,
ADD COLUMN     "pastExperience" TEXT,
ADD COLUMN     "photo" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateTable
CREATE TABLE "LeadFetchPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadSource" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadFetchPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadFetchPermission_userId_idx" ON "LeadFetchPermission"("userId");

-- CreateIndex
CREATE INDEX "LeadFetchPermission_leadSource_idx" ON "LeadFetchPermission"("leadSource");

-- CreateIndex
CREATE UNIQUE INDEX "LeadFetchPermission_userId_leadSource_key" ON "LeadFetchPermission"("userId", "leadSource");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE INDEX "User_employeeProfileId_idx" ON "User"("employeeProfileId");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadFetchPermission" ADD CONSTRAINT "LeadFetchPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

