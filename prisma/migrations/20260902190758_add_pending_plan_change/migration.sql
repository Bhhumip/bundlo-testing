-- AlterTable
ALTER TABLE "ShopPlan" ADD COLUMN     "pendingBillingPeriod" TEXT,
ADD COLUMN     "pendingChangeType" TEXT,
ADD COLUMN     "pendingEffectiveAt" TIMESTAMP(3),
ADD COLUMN     "pendingPlan" TEXT;
