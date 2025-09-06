import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main(): Promise<void> {
  const email = "michaelbergin@higharc.com";
  const password = "nanobanana";
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

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
