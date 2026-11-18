// app/routes/webhooks.app.uninstalled.jsx
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendEmail } from "../services/email.server";
import { uninstallEmail } from "../services/emailTemplates";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`[webhook:uninstalled] received for ${shop}`);

  // Look up the stored merchant email BEFORE any cleanup — we can't fetch
  // it fresh here since there's no admin client available post-uninstall.
  const shopRecord = await db.shop.findUnique({ where: { shop } });

  if (shopRecord?.email) {
    const { subject, htmlBody } = uninstallEmail(shop);
    await sendEmail({
      shop,
      event: "uninstall",
      to: shopRecord.email,
      subject,
      htmlBody,
    });
  } else {
    console.warn(`[webhook:uninstalled] No stored email found for ${shop}, skipping uninstall email`);
  }

  // Update the shop record to nullify welcomeEmailSentAt so that if the
  // merchant reinstalls, they receive a fresh welcome email.
  await db.shop.upsert({
    where: { shop },
    create: { shop, welcomeEmailSentAt: null },
    update: { welcomeEmailSentAt: null },
  });

  // Clean up app-owned data now that the merchant has removed the app.
  // Wrapped in try/catch, matching the pattern used elsewhere in this repo —
  // a cleanup failure shouldn't crash the whole webhook response, since
  // Shopify will retry on non-200, and retrying a failed delete is safe
  // (deleteMany on an already-empty set is a no-op, not an error).
  try {
    await db.bundle.deleteMany({ where: { shop } });
    await db.shopSetting.deleteMany({ where: { shop } }).catch(() => { });
  } catch (err) {
    console.error(`[webhook:uninstalled] cleanup error for ${shop}:`, err);
  }

  // Webhook requests can trigger multiple times, including after an app
  // has already been uninstalled. If this webhook already ran, the session
  // may have been deleted previously — deleteMany is safe either way.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};