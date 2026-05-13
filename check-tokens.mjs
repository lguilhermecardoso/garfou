import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tokens = await prisma.deviceToken.findMany({
    where: {
      restaurantId: 'cmp37zy8f000553mq0qz07bpd',
    },
    include: {
      creator: {
        select: {
          name: true,
        },
      },
      sessions: true,
    },
  });

  console.log('📊 Total tokens found:', tokens.length);
  console.log('📋 Tokens:', JSON.stringify(tokens, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
