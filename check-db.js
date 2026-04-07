const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const profiles = await prisma.providerProfile.findMany({
      include: {
        user: true
      }
    });
    console.log('PROFILES:', JSON.stringify(profiles, null, 2));
    
    const users = await prisma.user.findMany();
    console.log('USERS:', JSON.stringify(users, null, 2));
    
    const categories = await prisma.category.findMany();
    console.log('CATEGORIES:', JSON.stringify(categories, null, 2));
    
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
