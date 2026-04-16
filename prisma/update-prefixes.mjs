import { PrismaClient } from '../src/db/generated/client/index.js'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.companySetting.findFirst()
  if (existing) {
    await prisma.companySetting.update({
      where: { id: existing.id },
      data: { invoicePrefix: 'SRB2B', quotationPrefix: 'SRQUO' }
    })
    console.log('✅ Updated: invoicePrefix=SRB2B, quotationPrefix=SRQUO')
  } else {
    await prisma.companySetting.create({ data: {} }) // uses schema defaults
    console.log('✅ Created company settings with defaults (SRB2B / SRQUO)')
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
