import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@essar.com';
  const hashedPassword = await hash('admin123', 10);

  const updatedUser = await prisma.user.update({
    where: { email },
    data: { passwordHash: hashedPassword },
  });

  console.log(`Updated password for ${updatedUser.email}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
