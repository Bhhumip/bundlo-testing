-- CreateTable
CREATE TABLE "BundleRevenueDaily" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BundleRevenueDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BundleRevenueDaily_shop_date_idx" ON "BundleRevenueDaily"("shop", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BundleRevenueDaily_bundleId_date_key" ON "BundleRevenueDaily"("bundleId", "date");

-- AddForeignKey
ALTER TABLE "BundleRevenueDaily" ADD CONSTRAINT "BundleRevenueDaily_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
