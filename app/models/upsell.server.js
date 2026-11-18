import db from "../db.server";
import {
  UPSELL_STATUS,
  UPSELL_SURFACES,
  UPSELL_OFFER_KINDS,
  DEFAULT_UPSELL_STATS,
} from "./upsell.constants";

export {
  UPSELL_STATUS,
  UPSELL_SURFACES,
  UPSELL_OFFER_KINDS,
  DEFAULT_UPSELL_STATS,
};

export async function listUpsellFunnels(shop, { take = 5, surface, status } = {}) {
  const where = {
    shop,
    ...(surface ? { surface } : {}),
    ...(status ? { status } : {}),
  };

  return db.upsellFunnel.findMany({
    where,
    take,
    orderBy: [{ updatedAt: "desc" }],
    include: {
      _count: {
        select: { offers: true, targets: true, conditions: true },
      },
    },
  });
}

export async function getUpsellFunnel(shop, id) {
  return db.upsellFunnel.findFirst({
    where: { id, shop },
    include: {
      offers: true,
      targets: true,
      conditions: true,
      _count: {
        select: {
          offers: true,
          targets: true,
          conditions: true,
        },
      },
    },
  });
}

export async function getUpsellStats(shop) {
  try {
      // Widget-based stats: the app now manages widgets (not funnels).
      // Revenue and orders come from each widget's notes.stats, which the
      // orders/paid webhook fills using line-item upsell attribution.
      const widgetRows = await db.upsellWidget.findMany({
        where: { shop },
        select: { notes: true },
      });

      let totalFunnels = 0;         // total widgets (rows saved for this shop)
      let activeFunnels = 0;        // widgets with enabled: true
      let totalUpsellRevenue = 0;   // summed from each widget's notes.stats.revenue
      let totalUnitsInfluenced = 0; // summed from each widget's notes.stats.orders

      for (const row of widgetRows) {
        totalFunnels += 1;

        let parsed = {};
        try {
          parsed = JSON.parse(row.notes || "{}");
        } catch {
          parsed = {};
        }

        if (parsed?.enabled === true) {
          activeFunnels += 1;
        }

        const stats = parsed?.stats || {};
        totalUpsellRevenue += Number(stats.revenue) || 0;
        totalUnitsInfluenced += Number(stats.orders) || 0;
      }

    return {
      totalUpsellRevenue,
      activeFunnels,
      totalFunnels,
      totalUnitsInfluenced,
    };
  } catch (err) {
    console.error("[getUpsellStats] error:", err);
    return DEFAULT_UPSELL_STATS;
  }
}

export async function deleteUpsell(shop, _admin, id) {
  return db.upsellFunnel.deleteMany({
    where: { id, shop },
  });
}

export async function archiveUpsell(id, shop, _admin) {
  return db.upsellFunnel.updateMany({
    where: { id, shop },
    data: { status: UPSELL_STATUS.ARCHIVED },
  });
}

export async function activateUpsell(id, shop, _admin) {
  return db.upsellFunnel.updateMany({
    where: { id, shop },
    data: { status: UPSELL_STATUS.ACTIVE },
  });
}

export async function createUpsellFunnel(shop, data) {
  return db.upsellFunnel.create({
    data: {
      shop,
      title: data.title ?? "Untitled funnel",
      surface: data.surface ?? UPSELL_SURFACES.PDP,
      status: data.status ?? UPSELL_STATUS.DRAFT,
      priority: data.priority ?? 0,
      description: data.description ?? null,
      startAt: data.startAt ?? null,
      endAt: data.endAt ?? null,
    },
  });
}

export async function updateUpsellFunnel(shop, id, data) {
  const existing = await db.upsellFunnel.findFirst({
    where: { id, shop },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Upsell funnel not found");
  }

  return db.upsellFunnel.update({
    where: { id: existing.id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.surface !== undefined ? { surface: data.surface } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.startAt !== undefined ? { startAt: data.startAt } : {}),
      ...(data.endAt !== undefined ? { endAt: data.endAt } : {}),
    },
  });
}

/**
 * Create or update a widget 
 */
export async function createOrUpdateUpsellWidget(shop, widgetKey, data) {
  const existing = await db.upsellWidget.findFirst({
    where: { shop, widgetKey },
  });

  if (existing) {
    return db.upsellWidget.update({
      where: { id: existing.id },
      data: {
        widgetType: data.widgetType,
        placement: data.placement,
        displayMode: data.displayMode,
        headline: data.headline,
        subheading: data.subheading,
        ctaLabel: data.ctaLabel,
        internalName: data.internalName,
        notes: data.notes,
        updatedAt: new Date(),
      },
    });
  }

  return db.upsellWidget.create({
    data: {
      shop,
      widgetKey,
      widgetType: data.widgetType,
      placement: data.placement,
      displayMode: data.displayMode,
      headline: data.headline,
      subheading: data.subheading,
      ctaLabel: data.ctaLabel,
      internalName: data.internalName,
      notes: data.notes,
    },
  });
}

/**
 * Fetch widget 
 */
export async function getUpsellWidget(shop, widgetKey) {
  return db.upsellWidget.findFirst({
    where: { shop, widgetKey },
  });
}

/**
 * Delete widget 
 */
export async function deleteUpsellWidget(shop, widgetKey) {
  return db.upsellWidget.deleteMany({
    where: { shop, widgetKey },
  });
}
/**
 * Fetch multiple widgets by key in one query — returns a map keyed by widgetKey.
 */
export async function getUpsellWidgetsByKeys(shop, widgetKeys) {
  const rows = await db.upsellWidget.findMany({
    where: { shop, widgetKey: { in: widgetKeys } },
  });

  const map = {};
  for (const row of rows) {
    map[row.widgetKey] = row;
  }
  return map;
}