import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

interface SeedAccountConfig {
  role: Role;
  nameEnv: string;
  emailEnv: string;
  passwordEnv: string;
  defaultName: string;
}

const SEED_ACCOUNTS: SeedAccountConfig[] = [
  {
    role: "ADMIN",
    nameEnv: "TEST_ADMIN_NAME",
    emailEnv: "TEST_ADMIN_EMAIL",
    passwordEnv: "TEST_ADMIN_PASSWORD",
    defaultName: "Test Admin",
  },
  {
    role: "MANAGER",
    nameEnv: "TEST_MANAGER_NAME",
    emailEnv: "TEST_MANAGER_EMAIL",
    passwordEnv: "TEST_MANAGER_PASSWORD",
    defaultName: "Test Manager",
  },
  {
    role: "EMPLOYEE",
    nameEnv: "TEST_EMPLOYEE_NAME",
    emailEnv: "TEST_EMPLOYEE_EMAIL",
    passwordEnv: "TEST_EMPLOYEE_PASSWORD",
    defaultName: "Test Employee",
  },
];

async function seed() {
  console.log("[SEED] Checking environment variables for test accounts...");

  // Verify that all required email and password variables are provided
  const missingVariables: string[] = [];
  for (const account of SEED_ACCOUNTS) {
    if (!process.env[account.emailEnv]?.trim()) {
      missingVariables.push(account.emailEnv);
    }
    if (!process.env[account.passwordEnv]?.trim()) {
      missingVariables.push(account.passwordEnv);
    }
  }

  if (missingVariables.length > 0) {
    console.error(
      `[SEED] FAILED: Missing required environment variables:\n` +
      missingVariables.map((v) => `  - ${v}`).join("\n") +
      `\nPlease add these variables to your .env file before running the seed script.`
    );
    process.exit(1);
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const account of SEED_ACCOUNTS) {
    const email = (process.env[account.emailEnv] as string).trim().toLowerCase();
    const rawPassword = (process.env[account.passwordEnv] as string).trim();
    const name = process.env[account.nameEnv]?.trim() || account.defaultName;

    // Check if account already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(
        `[SEED] SKIPPED: User with email "${email}" already exists (Role: ${existingUser.role}). Existing details preserved.`
      );
      skippedCount++;
      continue;
    }

    // Hash password with bcryptjs (10 salt rounds)
    const passwordHash = await hash(rawPassword, 10);

    // Create user with assigned role and isActive = true
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: account.role,
        isActive: true,
      },
    });

    console.log(
      `[SEED] CREATED: ${account.role} account created successfully for "${email}".`
    );
    createdCount++;
  }

  console.log(
    `[SEED] Summary: ${createdCount} created, ${skippedCount} skipped (already existed).`
  );
}

seed()
  .catch((err) => {
    console.error(
      "[SEED] Fatal error occurred during seeding:",
      err instanceof Error ? err.message : "Unknown error"
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
