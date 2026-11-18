import { authenticate } from "./../shopify.server";
import { requireFeatureAccess } from "../featureAccess.server";


function json(data, init) {
    return Response.json(data, init);
}

const METAFIELD_NAMESPACE = "$app";
const METAFIELD_KEY = "donations_config";
const METAFIELD_TYPE = "json";

const SHOP_ID_QUERY = `#graphql
  query GetShopId {
    shop { id name myshopifyDomain }
  }
`;

const METAFIELDS_SET_MUTATION = `#graphql
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id namespace key value type updatedAt }
      userErrors { field message code }
    }
  }
`;

async function syncDonationMetafield(admin, config, shopId) {
    // Only the fields the Function actually needs — not the full display theme
    const functionConfig = {
        donationTiers: config.donationTiers ?? [],
        customMinAmount: config.customMinAmount ?? 1,
        customMaxAmount: config.customMaxAmount ?? 100000,
    };

    const response = await admin.graphql(METAFIELDS_SET_MUTATION, {
        variables: {
            metafields: [{
                ownerId: shopId,
                namespace: METAFIELD_NAMESPACE,
                key: METAFIELD_KEY,
                type: METAFIELD_TYPE,
                value: JSON.stringify(functionConfig),
            }],
        },
    });

    const data = await response.json();
    if (data?.errors?.length) throw new Error(data.errors.map((e) => e.message).join(", "));

    const payload = data?.data?.metafieldsSet;
    if (payload?.userErrors?.length) throw new Error(payload.userErrors.map((e) => e.message).join(", "));

    return payload?.metafields ?? [];
}

export async function action({ request }) {
    const { admin, session } = await authenticate.admin(request);

    if (!session?.shop) {
        return json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    }

    await requireFeatureAccess(session.shop, "DONATIONS");

    if (request.method !== "POST") {
        return json({ ok: false, error: "Method not allowed" }, { status: 405 });
    }

    // rest same...

    // rest same...
    const formData = await request.formData();
    const widgetKey = formData.get("widgetKey");
    const theme = JSON.parse(formData.get("theme"));

    // 1. Save full theme to Prisma via  existing UpsellWidget.notes pattern (unchanged)
    //    ... existing save-widget-theme logic goes here, scopedKey = `CHECKOUT:${widgetKey}` ...

    // 2. If this is the donations widget, also sync the pricing-relevant subset to the metafield
    if (widgetKey === "donations") {
        const shopResponse = await admin.graphql(SHOP_ID_QUERY);
        const shopData = await shopResponse.json();
        const shopId = shopData?.data?.shop?.id;
        if (!shopId) throw new Error("Unable to determine shop ID.");

        await syncDonationMetafield(admin, theme, shopId);
    }

    return json({ ok: true });
}