// app/utils/supabase.server.js
//
// Server-side Supabase client used only for Broadcast signalling.
//
// Design intent:
//   The Supabase Broadcast channel carries lightweight signals, NOT cart data.
//   Payload: { version, deviceId, tabId, updatedAt }
//   Receiving clients use the version to decide whether to pull from the
//   App Proxy, keeping all sensitive cart data off the Supabase channel.
//
// Auth: uses SUPABASE_SERVICE_ROLE_KEY (server only — never exposed to browser).

import { createClient } from "@supabase/supabase-js";

const supabaseUrl        = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    "[PC] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env — " +
    "real-time cart signals are disabled. Clients will fall back to polling."
  );
}

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      // Disable automatic session/token handling — we use service role key only
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

/**
 * Returns the Realtime channel name for a given shop + customer combination.
 * Must match the channel name used in persistent-cart-client.js.
 */
export function cartChannelName(shopDomain, customerId) {
  return `cart-${shopDomain}-${customerId}`;
}

/**
 * Publishes a "cart_updated" Broadcast signal so other devices know
 * to pull the latest cart from the App Proxy.
 *
 * The payload intentionally contains NO cart item data:
 *  - Keeps sensitive data off Supabase's channel.
 *  - Avoids stale-data races (clients always pull fresh from the DB).
 *  - The version field lets clients skip pulls for signals they've already seen.
 *
 * @param {string} shopDomain
 * @param {string} customerId
 * @param {{ version: number, deviceId: string, tabId: string, updatedAt: Date }} payload
 */
export async function notifyCartUpdated(
  shopDomain,
  customerId,
  { version, deviceId, tabId, updatedAt }
) {
  if (!supabase) {
    // Logged at startup — no need to re-warn on every call.
    return;
  }

  const channelName = cartChannelName(shopDomain, customerId);

  // Each broadcast is sent on a short-lived channel.
  // We don't subscribe — service role can send without subscribing.
  const channel = supabase.channel(channelName);

  try {
    const res = await channel.send({
      type:    "broadcast",
      event:   "UPDATED",
      payload: { version, deviceId, tabId, updatedAt },
    });

    if (res !== "ok") {
      console.warn(`[PC] Supabase broadcast returned unexpected status: ${res}`);
    }
  } catch (error) {
    // Non-fatal: clients have polling and heartbeat as fallback.
    console.error("[PC] Supabase broadcast failed:", error?.message ?? error);
  } finally {
    // Clean up the channel to avoid accumulating subscriptions on long-running servers.
    await supabase.removeChannel(channel).catch(() => {});
  }
}
