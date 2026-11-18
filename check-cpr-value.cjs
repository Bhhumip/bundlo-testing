const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.upsellWidget.findFirst({
  where: { widgetKey: { contains: "personalized_recommendation" } }
}).then((w) => {
  if (w?.notes) {
    const parsed = JSON.parse(w.notes);
    console.log("Current CPR discountValue in DB:", parsed?.theme?.discountValue);
  }
  p.$disconnect();
});
