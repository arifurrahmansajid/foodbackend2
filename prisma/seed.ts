import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@foodhub.com';
  const adminPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'System Admin',
      role: Role.ADMIN,
    },
  });

  console.log('Seeded static admin:', admin.email);

  // Seed some categories
  const categories = [
    { name: 'Italian', image: 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=400' },
    { name: 'Japanese', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400' },
    { name: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
