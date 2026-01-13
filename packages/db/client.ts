import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as any;

// Ensure UTF-8 encoding for PostgreSQL connection
// This fixes encoding issues with Armenian and other UTF-8 characters
const databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl) {
  console.error("❌ [DB] DATABASE_URL is not set in environment variables!");
  console.error("   Please set DATABASE_URL in .env or .env.local file");
}

// Remove quotes if present
let cleanUrl = databaseUrl.trim();
if ((cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) || 
    (cleanUrl.startsWith("'") && cleanUrl.endsWith("'"))) {
  cleanUrl = cleanUrl.slice(1, -1);
}

let urlWithEncoding = cleanUrl;

if (!cleanUrl.includes('client_encoding')) {
  urlWithEncoding = cleanUrl.includes('?') 
    ? `${cleanUrl}&client_encoding=UTF8`
    : `${cleanUrl}?client_encoding=UTF8`;
  
  // Temporarily override DATABASE_URL for Prisma Client
  process.env.DATABASE_URL = urlWithEncoding;
}

console.log("🔌 [DB] Initializing Prisma Client...");
console.log("🔌 [DB] Database URL:", urlWithEncoding ? `${urlWithEncoding.substring(0, 50)}...` : "NOT SET");

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ 
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    errorFormat: "pretty",
  });

// Handle Prisma connection errors with better logging
db.$connect()
  .then(() => {
    console.log("✅ [DB] Prisma Client connected successfully!");
  })
  .catch((error) => {
    console.error("❌ [DB] Prisma connection error:", {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      databaseUrl: urlWithEncoding ? `${urlWithEncoding.substring(0, 50)}...` : "NOT SET",
    });
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

