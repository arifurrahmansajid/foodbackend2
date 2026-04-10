const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: "Burgers", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400" },
    { name: "Desserts", image: "https://images.unsplash.com/photo-1551024601-5f0082c6cdd0?w=400" },
    { name: "Healthy", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400" },
    { name: "Mexican", image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400" },
    { name: "Italian", image: "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=400" },
    { name: "Japanese", image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400" }
  ];

  console.log("Seeding categories...");
  
  for (const cat of categories) {
    const upserted = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    console.log(`Created/Ensured category: ${upserted.name}`);
  }

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
