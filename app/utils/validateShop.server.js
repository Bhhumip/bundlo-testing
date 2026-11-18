import prisma from "../db.server";

export async function getValidSession(shop) {
    if (!shop || !shop.endsWith(".myshopify.com")) return null;

    const offlineSession = await prisma.session.findFirst({
        where: { shop, id: { startsWith: "offline_" } },
        orderBy: { id: "desc" },
    });

    if (offlineSession?.accessToken) return offlineSession;

    const anySession = await prisma.session.findFirst({
        where: { shop },
        orderBy: { id: "desc" },
    });

    if (!anySession?.accessToken) return null;
    return anySession;
}