// Prisma Client stub for development
// In production, this will be replaced with actual PrismaClient

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockPrismaClient = Record<string, any>;

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

// In-memory storage for mock
const mockStorage: Record<string, Record<string, unknown>[]> = {
  clinics: [],
  subscriptions: [],
  channels: [],
  accessLogs: [],
  ctaClicks: [],
  diagnosisSessions: [],
  diagnosisTypes: [],
};

function createMockModel(modelName: string) {
  return {
    findUnique: async (args: { where: Record<string, unknown> }) => {
      const items = mockStorage[modelName] || [];
      const key = Object.keys(args.where)[0];
      return items.find((item) => item[key] === args.where[key]) || null;
    },
    findFirst: async (args: { where: Record<string, unknown> }) => {
      const items = mockStorage[modelName] || [];
      return items.find((item) => {
        return Object.entries(args.where).every(
          ([key, value]) => item[key] === value
        );
      }) || null;
    },
    findMany: async (args?: { where?: Record<string, unknown> }) => {
      const items = mockStorage[modelName] || [];
      if (!args?.where) return items;
      return items.filter((item) => {
        return Object.entries(args.where!).every(
          ([key, value]) => item[key] === value
        );
      });
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const item = {
        id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data,
      };
      if (!mockStorage[modelName]) mockStorage[modelName] = [];
      mockStorage[modelName].push(item);
      return item;
    },
    update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
      const items = mockStorage[modelName] || [];
      const index = items.findIndex((item) => item.id === args.where.id);
      if (index === -1) return null;
      items[index] = { ...items[index], ...args.data, updatedAt: new Date() };
      return items[index];
    },
    delete: async (args: { where: { id: string } }) => {
      const items = mockStorage[modelName] || [];
      const index = items.findIndex((item) => item.id === args.where.id);
      if (index === -1) return null;
      const deleted = items[index];
      items.splice(index, 1);
      return deleted;
    },
    count: async (args?: { where?: Record<string, unknown> }) => {
      const items = mockStorage[modelName] || [];
      if (!args?.where) return items.length;
      return items.filter((item) => {
        return Object.entries(args.where!).every(
          ([key, value]) => item[key] === value
        );
      }).length;
    },
    upsert: async (args: {
      where: Record<string, unknown>;
      update: Record<string, unknown>;
      create: Record<string, unknown>;
    }) => {
      const items = mockStorage[modelName] || [];
      const key = Object.keys(args.where)[0];
      const existingIndex = items.findIndex(
        (item) => item[key] === args.where[key]
      );
      if (existingIndex !== -1) {
        items[existingIndex] = {
          ...items[existingIndex],
          ...args.update,
          updatedAt: new Date(),
        };
        return items[existingIndex];
      } else {
        const item = {
          id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...args.create,
        };
        if (!mockStorage[modelName]) mockStorage[modelName] = [];
        mockStorage[modelName].push(item);
        return item;
      }
    },
  };
}

function createMockPrisma(): MockPrismaClient {
  console.warn(
    "Using mock Prisma client. Run 'npx prisma generate' to use real database."
  );
  return {
    clinic: createMockModel("clinics"),
    subscription: createMockModel("subscriptions"),
    channel: createMockModel("channels"),
    accessLog: createMockModel("accessLogs"),
    ctaClick: createMockModel("ctaClicks"),
    diagnosisSession: createMockModel("diagnosisSessions"),
    diagnosisType: createMockModel("diagnosisTypes"),
  };
}

function createPrismaClient(): MockPrismaClient {
  if (PrismaClientConstructor) {
    try {
      return new PrismaClientConstructor({
        log: process.env.NODE_ENV === "development" ? ["query"] : [],
      });
    } catch {
      // If PrismaClient fails to initialize, use mock
      return createMockPrisma();
    }
  }
  return createMockPrisma();
}

export const prisma: MockPrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
