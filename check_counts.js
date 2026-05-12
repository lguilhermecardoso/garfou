const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  const restaurants = await prisma.restaurant.count();
  const categories = await prisma.category.count();
  const products = await prisma.product.count();
  const orders = await prisma.order.count();

  console.log('--- Database Counts ---');
  console.log('Users:', users);
  console.log('Restaurants:', restaurants);
  console.log('Categories:', categories);
  console.log('Products:', products);
  console.log('Orders:', orders);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
