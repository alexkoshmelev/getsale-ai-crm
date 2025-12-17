import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash: '$2b$10$rKZ8v5F5Y5v5F5Y5v5F5Yu5v5F5Y5v5F5Y5v5F5Y5v5F5Y5v5F5Y', // password: test123
      name: 'Test User',
    },
  });

  // Create organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'test-org' },
    update: {},
    create: {
      name: 'Test Organization',
      slug: 'test-org',
      members: {
        create: {
          userId: user.id,
          role: 'owner',
        },
      },
    },
  });

  console.log('✅ Seeding completed!');
  console.log(`   User: ${user.email}`);
  console.log(`   Organization: ${organization.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

