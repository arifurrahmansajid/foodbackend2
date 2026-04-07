const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'supperadmin@gmail.com' }
    });
    console.log('--- USER DATA ---');
    console.log(JSON.stringify(user, null, 2));
    console.log('-----------------');
  } catch (error) {
    console.error('CHECK FAILED:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

check();
