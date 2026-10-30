import { PrismaClient } from "@prisma/client";

const prisma: PrismaClient = new PrismaClient();

export const INITIAL_DEPARTMENTS = [
  "Sales",
  "Accounts",
  "Research",
  "HR",
  "Compliance Manager",
] as const;

export interface InitialProfileConfig {
  name: string;
  department: string;
  description: string | null;
  clientLimit: number;
  invoiceLimit: number;
  salesLimit: number;
  isActive: boolean;
}

export const INITIAL_PROFILES: InitialProfileConfig[] = [
  {
    name: "Admin",
    department: "Sales",
    description: "Admin",
    clientLimit: 0,
    invoiceLimit: 0,
    salesLimit: 0,
    isActive: true,
  },
  {
    name: "SBA",
    department: "Sales",
    description: "Senior Business Analyst",
    clientLimit: 1000,
    invoiceLimit: 1000,
    salesLimit: 0,
    isActive: true,
  },
  {
    name: "AFM",
    department: "Sales",
    description: "Assistant Floor Manager",
    clientLimit: 1000,
    invoiceLimit: 1000,
    salesLimit: 0,
    isActive: true,
  },
  {
    name: "TL",
    department: "Sales",
    description: "Team Leader",
    clientLimit: 1000,
    invoiceLimit: 1000,
    salesLimit: 0,
    isActive: true,
  },
  {
    name: "Accounts",
    department: "Accounts",
    description: null,
    clientLimit: 0,
    invoiceLimit: 0,
    salesLimit: 0,
    isActive: true,
  },
  {
    name: "Research",
    department: "Research",
    description: "Research",
    clientLimit: 0,
    invoiceLimit: 0,
    salesLimit: 0,
    isActive: true,
  },
  {
    name: "FM",
    department: "Sales",
    description: "Floor Manager",
    clientLimit: 1000,
    invoiceLimit: 1000,
    salesLimit: 0,
    isActive: true,
  },
  {
    name: "HR",
    department: "HR",
    description: "Human Resource",
    clientLimit: 0,
    invoiceLimit: 0,
    salesLimit: 0,
    isActive: true,
  },
  {
    name: "BAT",
    department: "Sales",
    description: null,
    clientLimit: 0,
    invoiceLimit: 0,
    salesLimit: 0,
    isActive: true,
  },
  {
    name: "BA",
    department: "Sales",
    description: "Business Analyst",
    clientLimit: 0,
    invoiceLimit: 0,
    salesLimit: 0,
    isActive: true,
  },
  {
    name: "ARM",
    department: "Sales",
    description: null,
    clientLimit: 1000,
    invoiceLimit: 1000,
    salesLimit: 0,
    isActive: true,
  },
  {
    name: "STL",
    department: "Sales",
    description: "senior team leader",
    clientLimit: 100,
    invoiceLimit: 100,
    salesLimit: 0,
    isActive: true,
  },
  {
    name: "SUPPORT",
    department: "Sales",
    description: null,
    clientLimit: 0,
    invoiceLimit: 100,
    salesLimit: 100,
    isActive: true,
  },
  {
    name: "Compliance Manager",
    department: "Compliance Manager",
    description: null,
    clientLimit: 0,
    invoiceLimit: 0,
    salesLimit: 0,
    isActive: true,
  },
];

export async function seedProfilesAndDepartments(client: PrismaClient = prisma) {
  console.log("[SEED] Initializing Departments and Employee Profiles...");

  const departmentMap = new Map<string, string>();

  // 1. Upsert Departments
  for (const deptName of INITIAL_DEPARTMENTS) {
    const dept = await client.department.upsert({
      where: { name: deptName },
      update: {},
      create: {
        name: deptName,
        isActive: true,
      },
    });
    departmentMap.set(dept.name, dept.id);
    console.log(`[SEED] Department "${dept.name}" ensured with ID: ${dept.id}`);
  }

  // 2. Upsert Employee Profiles
  for (const profile of INITIAL_PROFILES) {
    const departmentId = departmentMap.get(profile.department);
    if (!departmentId) {
      console.warn(`[SEED] WARNING: Department "${profile.department}" not found for profile "${profile.name}".`);
      continue;
    }

    const created = await client.employeeProfile.upsert({
      where: { name: profile.name },
      update: {},
      create: {
        name: profile.name,
        departmentId,
        description: profile.description,
        clientLimit: profile.clientLimit,
        invoiceLimit: profile.invoiceLimit,
        salesLimit: profile.salesLimit,
        isActive: profile.isActive,
      },
    });
    console.log(`[SEED] Employee Profile "${created.name}" ensured with ID: ${created.id}`);
  }

  console.log("[SEED] Initial Departments and Employee Profiles seeding completed successfully.");
}

if (process.argv[1]?.includes("seed-profiles-departments")) {
  seedProfilesAndDepartments()
    .catch((err) => {
      console.error("[SEED] Error seeding profiles and departments:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
