import { PrismaClient } from "@prisma/client";

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}

const prisma = global.prismaGlobal ?? new PrismaClient({
  log: ["query", "info", "warn", "error"],// Enable detailed logging in development for debugging
});
prisma.session.count().then(count => {
  console.log("[DB] Connected. Session count:", count);
}).catch(err => {
  console.error("[DB] Connection failed:", err.message);
});
export default prisma;