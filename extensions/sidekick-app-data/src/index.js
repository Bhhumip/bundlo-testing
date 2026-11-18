export default async function extension() {
  // @ts-ignore
  shopify.tools.register("search", async (input) => {
    const { query = "", first = 10, after } = input;

    const params = new URLSearchParams();

    if (query) {
      params.set("query", query);
    }

    if (first) {
      params.set("first", String(first));
    }

    if (after) {
      params.set("after", String(after));
    }

    const response = await fetch(
      `/api/sidekick/search?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(
        `Bundlo Sidekick search failed: ${response.status}`
      );
    }

    return response.json();
  });

// @ts-ignore
shopify.tools.register("get_bundle", async (input) => {
  const { bundleId } = input;

  if (!bundleId) {
    throw new Error("bundleId is required");
  }

  const params = new URLSearchParams();
  params.set("bundleId", bundleId);

  const response = await fetch(
    `/api/sidekick/bundle?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(
      `Bundlo Sidekick get_bundle failed: ${response.status}`
    );
  }

  return response.json();
});

shopify.tools.register("get_bundle_stats", async () => {
  const response = await fetch("/api/sidekick/stats");

  if (!response.ok) {
    throw new Error(
      `Bundlo Sidekick get_bundle_stats failed: ${response.status}`
    );
  }

  return response.json();
});

// @ts-ignore
shopify.tools.register("get_bundle_analytics", async (input) => {
  const { startDate, endDate } = input;

  if (!startDate || !endDate) {
    throw new Error("startDate and endDate are required");
  }

  const params = new URLSearchParams();
  params.set("startDate", startDate);
  params.set("endDate", endDate);

  const response = await fetch(
    `/api/sidekick/analytics?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(
      `Bundlo Sidekick get_bundle_analytics failed: ${response.status}`
    );
  }

  return response.json();
});

// @ts-ignore
shopify.tools.register("get_bundle_performance", async (input) => {
  const { startDate, endDate } = input;

  if (!startDate || !endDate) {
    throw new Error("startDate and endDate are required");
  }

  const params = new URLSearchParams();
  params.set("startDate", startDate);
  params.set("endDate", endDate);

  const response = await fetch(
    `/api/sidekick/performance?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(
      `Bundlo Sidekick get_bundle_performance failed: ${response.status}`
    );
  }

  return response.json();
});
}