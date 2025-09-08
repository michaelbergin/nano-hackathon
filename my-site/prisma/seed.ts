import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value == null || value === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  const isProduction: boolean = process.env.NODE_ENV === "production";
  const allowProduction: boolean = process.env.SEED_ALLOW_PRODUCTION === "true";
  if (isProduction && !allowProduction) {
    throw new Error(
      "Seeding is blocked in production. Set SEED_ALLOW_PRODUCTION=true to proceed."
    );
  }

  const email: string = requireEnv("SEED_EMAIL");
  const password: string = requireEnv("SEED_PASSWORD");
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { hashedPassword, role: "superadmin" },
    create: { email, hashedPassword, role: "superadmin" },
  });

  // Ensure sample Subscriber exists (optional)
  await prisma.subscriber.upsert({
    where: { email },
    update: {},
    create: { email },
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
