import { prisma } from "../src/lib/prisma";

/**
 * Seed script for development/testing
 * Note: Users are now created through Stack Auth authentication
 * This script only seeds test data like subscribers
 */
async function main(): Promise<void> {
  const isProduction: boolean = process.env.NODE_ENV === "production";
  const allowProduction: boolean = process.env.SEED_ALLOW_PRODUCTION === "true";
  if (isProduction && !allowProduction) {
    throw new Error(
      "Seeding is blocked in production. Set SEED_ALLOW_PRODUCTION=true to proceed."
    );
  }

  // Seed sample subscriber for waitlist testing
  const testEmail = process.env.SEED_EMAIL ?? "test@example.com";
  
  await prisma.subscriber.upsert({
    where: { email: testEmail },
    update: {},
    create: { email: testEmail },
  });

  console.log("Seed completed successfully");
  console.log("Note: Users are created automatically via Stack Auth sign-up");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
