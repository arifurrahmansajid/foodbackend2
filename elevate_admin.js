const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function elevate() {
  try {
    const user = await prisma.user.update({
      where: { email: 'admin@foodhub.com' },
      data: { role: 'ADMIN' },
    });
    console.log(`SUCCESS: ${user.email} is now an ${user.role}!`);
  } catch (error) {
    console.error('ELEVATION FAILED:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

elevate();
