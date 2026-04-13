import { PrismaClient } from '../src/db/generated/client/index.js'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@essar.com'
  const password = 'admin123'
  const hashedPassword = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
  })

  console.log(`Seeding user: ${email}...`)

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: hashedPassword,
      role: 'ADMIN'
    },
    create: {
      email,
      name: 'Admin User',
      passwordHash: hashedPassword,
      role: 'ADMIN'
    }
  })

  console.log(`User seeded: ${user.email} (ID: ${user.id})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
