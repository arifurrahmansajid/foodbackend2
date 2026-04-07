const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createMasterAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('supper123', 12);
    
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: 'supperadmin@gmail.com' } });
    
    if (existing) {
      await prisma.user.update({
        where: { email: 'supperadmin@gmail.com' },
        data: { role: 'ADMIN', password: hashedPassword }
      });
      console.log('MASTER ADMIN UPDATED: supperadmin@gmail.com');
    } else {
      const user = await prisma.user.create({
        data: {
          email: 'supperadmin@gmail.com',
          password: hashedPassword,
          name: 'Super Admin',
          role: 'ADMIN',
          isActive: true
        }
      });
      console.log('MASTER ADMIN CREATED: supperadmin@gmail.com');
    }
  } catch (error) {
    console.error('MASTER ADMIN CREATION FAILED:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

createMasterAdmin();
