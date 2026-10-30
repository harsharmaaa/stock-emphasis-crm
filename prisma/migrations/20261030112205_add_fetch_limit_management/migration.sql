-- CreateTable
CREATE TABLE "FetchLimitRule" (
    "id" TEXT NOT NULL,
    "availableLimit" INTEGER NOT NULL,
    "fetchLimit" INTEGER NOT NULL,
    "fetchCount" INTEGER NOT NULL,
    "leadSource" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FetchLimitRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeFetchUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "leadSource" TEXT NOT NULL,
    "successfulFetches" INTEGER NOT NULL DEFAULT 0,
    "lastFetchedAt" TIMESTAMP(3),
    "resetAt" TIMESTAMP(3),
    "resetById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeFetchUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadFetchLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleId" TEXT,
    "leadSource" TEXT NOT NULL,
    "appliedProfile" TEXT,
    "leadsCount" INTEGER NOT NULL,
    "requestNumber" INTEGER NOT NULL,
    "leadIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadFetchLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FetchLimitRuleProfiles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FetchLimitRuleProfiles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_FetchLimitRuleAssignedUsers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FetchLimitRuleAssignedUsers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "FetchLimitRule_leadSource_idx" ON "FetchLimitRule"("leadSource");

-- CreateIndex
CREATE INDEX "FetchLimitRule_createdById_idx" ON "FetchLimitRule"("createdById");

-- CreateIndex
CREATE INDEX "EmployeeFetchUsage_userId_leadSource_idx" ON "EmployeeFetchUsage"("userId", "leadSource");

-- CreateIndex
CREATE INDEX "EmployeeFetchUsage_ruleId_idx" ON "EmployeeFetchUsage"("ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeFetchUsage_userId_ruleId_key" ON "EmployeeFetchUsage"("userId", "ruleId");

-- CreateIndex
CREATE INDEX "LeadFetchLog_userId_leadSource_idx" ON "LeadFetchLog"("userId", "leadSource");

-- CreateIndex
CREATE INDEX "LeadFetchLog_ruleId_idx" ON "LeadFetchLog"("ruleId");

-- CreateIndex
CREATE INDEX "LeadFetchLog_createdAt_idx" ON "LeadFetchLog"("createdAt");

-- CreateIndex
CREATE INDEX "_FetchLimitRuleProfiles_B_index" ON "_FetchLimitRuleProfiles"("B");

-- CreateIndex
CREATE INDEX "_FetchLimitRuleAssignedUsers_B_index" ON "_FetchLimitRuleAssignedUsers"("B");

-- AddForeignKey
ALTER TABLE "FetchLimitRule" ADD CONSTRAINT "FetchLimitRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeFetchUsage" ADD CONSTRAINT "EmployeeFetchUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeFetchUsage" ADD CONSTRAINT "EmployeeFetchUsage_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "FetchLimitRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadFetchLog" ADD CONSTRAINT "LeadFetchLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadFetchLog" ADD CONSTRAINT "LeadFetchLog_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "FetchLimitRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FetchLimitRuleProfiles" ADD CONSTRAINT "_FetchLimitRuleProfiles_A_fkey" FOREIGN KEY ("A") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FetchLimitRuleProfiles" ADD CONSTRAINT "_FetchLimitRuleProfiles_B_fkey" FOREIGN KEY ("B") REFERENCES "FetchLimitRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FetchLimitRuleAssignedUsers" ADD CONSTRAINT "_FetchLimitRuleAssignedUsers_A_fkey" FOREIGN KEY ("A") REFERENCES "FetchLimitRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FetchLimitRuleAssignedUsers" ADD CONSTRAINT "_FetchLimitRuleAssignedUsers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
