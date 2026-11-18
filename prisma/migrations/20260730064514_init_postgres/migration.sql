-- CreateEnum
CREATE TYPE "BundleType" AS ENUM ('FIXED', 'MIX_MATCH', 'VOLUME', 'BYOB', 'MULTIVARIANT');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bundle" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "bundleCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "type" "BundleType" NOT NULL DEFAULT 'FIXED',
    "shopifyProductHandle" TEXT,
    "shopifyVariantId" TEXT,
    "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fixedPrice" DOUBLE PRECISION,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "availableQty" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "minSelectCount" INTEGER,
    "maxSelectCount" INTEGER,
    "tags" TEXT,
    "price" DOUBLE PRECISION,
    "mediaUrl" TEXT,
    "shopifyProductId" TEXT,
    "endsAt" TIMESTAMP(3),
    "isMulti" BOOLEAN NOT NULL DEFAULT false,
    "productCount" INTEGER,
    "bundleOptions" TEXT,
    "variantLimit" INTEGER,

    CONSTRAINT "Bundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolumeTier" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VolumeTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleComponent" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "shopifyProductTitle" TEXT NOT NULL,
    "shopifyProductImage" TEXT,
    "shopifyVariantId" TEXT,
    "shopifyVariantTitle" TEXT,
    "shopifyVariantPrice" DOUBLE PRECISION,
    "shopifySku" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selectedOptions" TEXT,
    "options" TEXT,
    "variants" TEXT,

    CONSTRAINT "BundleComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopSetting" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "settings" TEXT NOT NULL DEFAULT '{}',
    "judgemePublicToken" TEXT,
    "judgemePrivateToken" TEXT,
    "googlePlaceId" TEXT,
    "googleApiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedWebhook" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleStats" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BundleStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsellFunnel" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "surface" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpsellFunnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsellWidget" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "widgetKey" TEXT NOT NULL,
    "widgetType" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "displayMode" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "subheading" TEXT,
    "ctaLabel" TEXT NOT NULL,
    "internalName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpsellWidget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsellFunnelTarget" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "include" BOOLEAN NOT NULL DEFAULT true,
    "minCartValue" DOUBLE PRECISION,
    "maxCartValue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UpsellFunnelTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsellFunnelCondition" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UpsellFunnelCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsellOffer" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "internalKey" TEXT,
    "stepOrder" INTEGER NOT NULL DEFAULT 0,
    "kind" TEXT NOT NULL,
    "description" TEXT,
    "customerHeading" TEXT,
    "customerBody" TEXT,
    "maxAcceptances" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpsellOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsellOfferItem" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "shopifyVariantId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UpsellOfferItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsellDiscountRule" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "currency" TEXT,
    "minQty" INTEGER,
    "maxQty" INTEGER,
    "minSpend" DOUBLE PRECISION,
    "maxSpend" DOUBLE PRECISION,
    "tiersJson" TEXT,
    "functionConfig" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpsellDiscountRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsellEvent" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "offerId" TEXT,
    "type" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "orderId" TEXT,
    "checkoutId" TEXT,
    "value" DOUBLE PRECISION,
    "currency" TEXT,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UpsellEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsellStat" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "accepts" INTEGER NOT NULL DEFAULT 0,
    "rejects" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpsellStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressBarConfig" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressBarConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JudgemeProduct" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "judgemeProductId" INTEGER NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JudgemeProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewCache" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "testimonialsJson" TEXT NOT NULL DEFAULT '[]',
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopPlan" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "trialStartedAt" TIMESTAMP(3),
    "trialLengthDays" INTEGER NOT NULL DEFAULT 7,
    "status" TEXT NOT NULL DEFAULT 'TRIALING',
    "currentPlan" TEXT,
    "subscriptionId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bundle_bundleCode_key" ON "Bundle"("bundleCode");

-- CreateIndex
CREATE INDEX "BundleComponent_bundleId_idx" ON "BundleComponent"("bundleId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopSetting_shop_key" ON "ShopSetting"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedWebhook_eventId_key" ON "ProcessedWebhook"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "BundleStats_bundleId_key" ON "BundleStats"("bundleId");

-- CreateIndex
CREATE INDEX "BundleStats_shop_idx" ON "BundleStats"("shop");

-- CreateIndex
CREATE INDEX "UpsellFunnel_shop_idx" ON "UpsellFunnel"("shop");

-- CreateIndex
CREATE INDEX "UpsellFunnel_shop_surface_status_idx" ON "UpsellFunnel"("shop", "surface", "status");

-- CreateIndex
CREATE INDEX "UpsellWidget_shop_idx" ON "UpsellWidget"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "UpsellWidget_shop_widgetKey_key" ON "UpsellWidget"("shop", "widgetKey");

-- CreateIndex
CREATE INDEX "UpsellFunnelTarget_funnelId_idx" ON "UpsellFunnelTarget"("funnelId");

-- CreateIndex
CREATE INDEX "UpsellFunnelTarget_targetType_targetId_idx" ON "UpsellFunnelTarget"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "UpsellFunnelCondition_funnelId_idx" ON "UpsellFunnelCondition"("funnelId");

-- CreateIndex
CREATE INDEX "UpsellOffer_funnelId_idx" ON "UpsellOffer"("funnelId");

-- CreateIndex
CREATE INDEX "UpsellOffer_kind_idx" ON "UpsellOffer"("kind");

-- CreateIndex
CREATE INDEX "UpsellOfferItem_offerId_idx" ON "UpsellOfferItem"("offerId");

-- CreateIndex
CREATE INDEX "UpsellOfferItem_shopifyProductId_idx" ON "UpsellOfferItem"("shopifyProductId");

-- CreateIndex
CREATE INDEX "UpsellDiscountRule_offerId_idx" ON "UpsellDiscountRule"("offerId");

-- CreateIndex
CREATE INDEX "UpsellDiscountRule_discountType_idx" ON "UpsellDiscountRule"("discountType");

-- CreateIndex
CREATE INDEX "UpsellEvent_shop_idx" ON "UpsellEvent"("shop");

-- CreateIndex
CREATE INDEX "UpsellEvent_funnelId_idx" ON "UpsellEvent"("funnelId");

-- CreateIndex
CREATE INDEX "UpsellEvent_offerId_idx" ON "UpsellEvent"("offerId");

-- CreateIndex
CREATE INDEX "UpsellEvent_type_surface_idx" ON "UpsellEvent"("type", "surface");

-- CreateIndex
CREATE INDEX "UpsellStat_shop_idx" ON "UpsellStat"("shop");

-- CreateIndex
CREATE INDEX "UpsellStat_funnelId_date_idx" ON "UpsellStat"("funnelId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "UpsellStat_shop_funnelId_date_key" ON "UpsellStat"("shop", "funnelId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressBarConfig_shop_key" ON "ProgressBarConfig"("shop");

-- CreateIndex
CREATE INDEX "JudgemeProduct_shop_idx" ON "JudgemeProduct"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "JudgemeProduct_shop_shopifyProductId_key" ON "JudgemeProduct"("shop", "shopifyProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewCache_shop_key" ON "ReviewCache"("shop");

-- CreateIndex
CREATE INDEX "ReviewCache_shop_idx" ON "ReviewCache"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "ShopPlan_shop_key" ON "ShopPlan"("shop");

-- AddForeignKey
ALTER TABLE "VolumeTier" ADD CONSTRAINT "VolumeTier_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleComponent" ADD CONSTRAINT "BundleComponent_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpsellFunnelTarget" ADD CONSTRAINT "UpsellFunnelTarget_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "UpsellFunnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpsellFunnelCondition" ADD CONSTRAINT "UpsellFunnelCondition_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "UpsellFunnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpsellOffer" ADD CONSTRAINT "UpsellOffer_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "UpsellFunnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpsellOfferItem" ADD CONSTRAINT "UpsellOfferItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "UpsellOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpsellDiscountRule" ADD CONSTRAINT "UpsellDiscountRule_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "UpsellOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpsellEvent" ADD CONSTRAINT "UpsellEvent_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "UpsellFunnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpsellEvent" ADD CONSTRAINT "UpsellEvent_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "UpsellOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpsellStat" ADD CONSTRAINT "UpsellStat_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "UpsellFunnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
