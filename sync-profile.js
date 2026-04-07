const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function fix() {
  try {
    const adminEmail = 'admin@foodhub.com'; // Verified email from DB check
    const user = await prisma.user.findUnique({ where: { email: adminEmail } });
    
    if (user) {
      console.log('Ensuring profile for:', user.email);
      const profile = await prisma.providerProfile.upsert({
        where: { userId: user.id },
        update: {
            name: user.name,
        },
        create: {
          userId: user.id,
          name: user.name,
          description: 'Master Chef at FoodHub',
          image: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400',
          rating: 5.0
        }
      });
      console.log('Profile Sync Success:', profile.id);
    } else {
        console.log('USER NOT FOUND. Checking all users...');
        const allUsers = await prisma.user.findMany();
        console.log('Current Users:', allUsers.map(u => u.email).join(', '));
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
