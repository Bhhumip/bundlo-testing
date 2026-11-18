-- AlterTable
ALTER TABLE "ShopPlan" ADD COLUMN     "revenueGracePeriodEndsAt" TIMESTAMP(3),
ADD COLUMN     "revenueLimitExceededAt" TIMESTAMP(3),
ADD COLUMN     "revenueLimitNotificationSentAt" TIMESTAMP(3);
