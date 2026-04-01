import { PrismaClient } from "@prisma/client";

export async function GET() {
  const prisma = new PrismaClient();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return new Response("OK", { status: 200 });
  } catch {
    return new Response("NG", { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
