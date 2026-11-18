const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.bundle.findMany({}).then((bundles) => {
  console.log("Total bundles:", bundles.length);
  bundles.forEach((b) => {
    console.log("---");
    console.log("Title:", b.title);
    console.log("Shop:", b.shop);
    console.log("Status:", b.status);
    console.log("Discount:", b.discountType, b.discountValue);
    console.log("ShopifyVariantId:", b.shopifyVariantId);
  });
  p.$disconnect();
});
