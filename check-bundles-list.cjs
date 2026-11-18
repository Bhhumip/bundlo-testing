const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.bundle.findMany({ take: 5, select: { title: true, shop: true, discountType: true, discountValue: true, shopifyProductId: true, shopifyVariantId: true } }).then((bundles) => {
  bundles.forEach((b) => console.log(JSON.stringify(b, null, 2)));
  p.$disconnect();
});
