import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@essar.com';
  const newPasswordHash = '$2b$10$KRzRzrSBYk7knE2Z8O7MRu8wP0qUNgGBeJ5sz01Hu/TlHltEvoHdS';

  const updatedUser = await prisma.user.update({
    where: { email },
    data: { passwordHash: newPasswordHash },
  });

  console.log(`Successfully updated password hash for ${updatedUser.email} (ID: ${updatedUser.id})`);
}

main()
  .catch(e => {
    console.error('Failed to update password:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
