// app/shopify.server.js
import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
  DeliveryMethod,
} from "@shopify/shopify-app-react-router/server";

import { BillingInterval } from "@shopify/shopify-api";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { sendEmail } from "./services/email.server";
import { installEmail } from "./services/emailTemplates";
import {
  Starter_PLAN, Growth_PLAN, Pro_PLAN,
  Starter_PLAN_ANNUAL, Growth_PLAN_ANNUAL, Pro_PLAN_ANNUAL,
  PLAN_AMOUNT, ANNUAL_DISCOUNT,
} from "./plans";
import prisma from "./db.server";

// ---- billingConfig defined here, before shopifyApp() ----
const billingConfig = {
  [Starter_PLAN]: {
    lineItems: [
      {
        amount: PLAN_AMOUNT[Starter_PLAN],
        currencyCode: "USD",
        interval: BillingInterval.Every30Days,
      },
    ],
  },

  [Starter_PLAN_ANNUAL]: {
    lineItems: [
      {
        amount: PLAN_AMOUNT[Starter_PLAN] * 12 * ANNUAL_DISCOUNT,
        currencyCode: "USD",
        interval: BillingInterval.Annual,
      },
    ],
  },

  [Growth_PLAN]: {
    lineItems: [
      {
        amount: PLAN_AMOUNT[Growth_PLAN],
        currencyCode: "USD",
        interval: BillingInterval.Every30Days,
      },
    ],
  },

  [Growth_PLAN_ANNUAL]: {
    lineItems: [
      {
        amount: PLAN_AMOUNT[Growth_PLAN] * 12 * ANNUAL_DISCOUNT,
        currencyCode: "USD",
        interval: BillingInterval.Annual,
      },
    ],
  },

  [Pro_PLAN]: {
    lineItems: [
      {
        amount: PLAN_AMOUNT[Pro_PLAN],
        currencyCode: "USD",
        interval: BillingInterval.Every30Days,
      },
    ],
  },

  [Pro_PLAN_ANNUAL]: {
    lineItems: [
      {
        amount: PLAN_AMOUNT[Pro_PLAN] * 12 * ANNUAL_DISCOUNT,
        currencyCode: "USD",
        interval: BillingInterval.Annual,
      },
    ],
  },
};

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  billing: billingConfig,
  future: {
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),

  webhooks: {
    ORDERS_PAID: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders-paid",
    },
    REFUNDS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/refunds-create",
    },
    APP_SUBSCRIPTIONS_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app-subscriptions-update",
    },
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app/uninstalled",
    },
  },
  hooks: {
    afterAuth: async ({ session, admin }) => {
      console.log("[afterAuth] fired! session:", session?.shop);
      await shopify.registerWebhooks({ session });

      const shopRecord = await prisma.shop.findUnique({ where: { shop: session.shop } });

      if (!shopRecord?.welcomeEmailSentAt) {
        try {
          const response = await admin.graphql(`#graphql
          query getShopEmail {
            shop {
              email
            }
          }
        `);
          const { data } = await response.json();
          const merchantEmail = data.shop.email;

          console.log("[afterAuth] merchant email fetched:", merchantEmail);

          const { subject, htmlBody } = installEmail(session.shop);
          await sendEmail({
            shop: session.shop,
            event: "install",
            to: merchantEmail,
            subject,
            htmlBody,
          });

          await prisma.shop.upsert({
            where: { shop: session.shop },
            create: { shop: session.shop, email: merchantEmail, welcomeEmailSentAt: new Date() },
            update: { email: merchantEmail, welcomeEmailSentAt: new Date() },
          });
        } catch (error) {
          // Never let an email failure break the install flow
          console.error("[afterAuth] install email flow failed:", error.message);
        }
      } else {
        console.log("[afterAuth] welcome email already sent, skipping");
      }
    },
  },
});


export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
export const IS_TEST_BILLING =
  process.env.IS_TEST_BILLING === "true";
