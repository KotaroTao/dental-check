// Prisma Client stub for development
// In production, this will be replaced with actual PrismaClient

type MockPrismaClient = {
  clinic: {
    findUnique: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<unknown>;
  };
  subscription: {
    create: (args: unknown) => Promise<unknown>;
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let PrismaClientConstructor: any;

try {
  // Try to import PrismaClient (will work after prisma generate)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  PrismaClientConstructor = require("@prisma/client").PrismaClient;
} catch {
  // Fallback to mock for development without DB
  PrismaClientConstructor = null;
}

const globalForPrisma = globalThis as unknown as {
  prisma: MockPrismaClient | undefined;
};

function createMockPrisma(): MockPrismaClient {
  console.warn("Using mock Prisma client. Run 'npx prisma generate' to use real database.");
  return {
    clinic: {
      findUnique: async () => null,
      create: async (args: unknown) => {
        const data = (args as { data: Record<string, unknown> }).data;
        return { id: "mock-id", ...data };
      },
    },
    subscription: {
      create: async (args: unknown) => {
        const data = (args as { data: Record<string, unknown> }).data;
        return { id: "mock-sub-id", ...data };
      },
    },
  };
}

export const prisma: MockPrismaClient =
  globalForPrisma.prisma ??
  (PrismaClientConstructor
    ? new PrismaClientConstructor({
        log: process.env.NODE_ENV === "development" ? ["query"] : [],
      })
    : createMockPrisma());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
