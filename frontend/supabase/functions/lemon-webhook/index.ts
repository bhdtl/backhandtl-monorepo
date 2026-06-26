import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

// ──────────────────────────────────────────────────────────────────
// LEMON SQUEEZY WEBHOOK HANDLER
// Empfängt alle LemonSqueezy-Events und verwaltet User-Subscriptions.
//
// Registriere diese URL in LemonSqueezy → Settings → Webhooks:
//   https://<project>.supabase.co/functions/v1/lemon-webhook
//
// Aktivierte Events:
//   ✅ order_created
//   ✅ subscription_created
//   ✅ subscription_updated
//   ✅ subscription_cancelled
//   ✅ subscription_expired
//   ✅ subscription_payment_success
// ──────────────────────────────────────────────────────────────────

const LEMON_WEBHOOK_SECRET = Deno.env.get("LEMON_WEBHOOK_SECRET") || "";
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Variant-ID → Tier Mapping (anpassen wenn sich IDs ändern)
const VARIANT_TIER_MAP: Record<string, string> = {
  // MIT TRIAL (erste Subscription)
  "632313": "WEEKEND",
  "632314": "ELITE",
  "632315": "PREMIUM",
  // OHNE TRIAL (Renewal / Post-Trial)
  "1485891": "WEEKEND",
  "1485892": "ELITE",
  "1485893": "PREMIUM",
};

// Trial-Varianten (diese setzen has_used_trial = true)
const TRIAL_VARIANT_IDS = new Set(["632313", "632314", "632315"]);

async function verifySignature(body: string, signature: string): Promise<boolean> {
  if (!LEMON_WEBHOOK_SECRET) {
    console.warn("⚠️ LEMON_WEBHOOK_SECRET nicht gesetzt — Signatur-Check übersprungen");
    return true; // Im Dev-Modus durchlassen
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(LEMON_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return sigHex === signature;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-signature") || "";
  
  // Signatur prüfen
  const valid = await verifySignature(body, signature);
  if (!valid) {
    console.error("❌ Ungültige Webhook-Signatur");
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Bad Request: Invalid JSON", { status: 400 });
  }

  const eventName   = payload?.meta?.event_name || "";
  const userId      = payload?.meta?.custom_data?.user_id || "";
  const variantId   = String(payload?.data?.attributes?.variant_id || payload?.data?.attributes?.first_order_item?.variant_id || "");
  const status      = payload?.data?.attributes?.status || "";
  const endsAt      = payload?.data?.attributes?.ends_at || null;
  const customerId  = String(payload?.data?.attributes?.customer_id || "");
  const subId       = String(payload?.data?.id || "");

  console.log(`📩 Event: ${eventName} | User: ${userId} | Variant: ${variantId} | Status: ${status}`);

  if (!userId) {
    console.warn("⚠️ Kein user_id in custom_data — Webhook ignoriert");
    return new Response(JSON.stringify({ ok: false, reason: "no user_id" }), { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const tier = VARIANT_TIER_MAP[variantId] || "ELITE";
  const isTrialVariant = TRIAL_VARIANT_IDS.has(variantId);

  // ────────────────────────────────────────────────
  // EVENT ROUTING
  // ────────────────────────────────────────────────
  
  if (eventName === "order_created") {
    // Einmaliger Weekend Pass oder erster Kauf
    const updateData: any = {
      tier,
      is_premium: true,
      ls_customer_id: customerId,
      ls_variant_id: variantId,
    };
    if (isTrialVariant) {
      updateData.has_used_trial = true;
    }
    // Weekend Pass: 7 Tage Zugang
    if (tier === "WEEKEND") {
      const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      updateData.premium_until = until;
    }
    const { error } = await supabase.from("profiles").update(updateData).eq("id", userId);
    if (error) console.error("❌ DB Update Fehler (order_created):", error);
    else console.log(`✅ order_created: User ${userId} → Tier ${tier}`);
  }

  else if (eventName === "subscription_created") {
    const updateData: any = {
      tier,
      is_premium: true,
      ls_customer_id: customerId,
      ls_subscription_id: subId,
      ls_variant_id: variantId,
      ls_subscription_status: "active",
    };
    if (endsAt) updateData.premium_until = endsAt;
    // Wenn Trial-Variante: markiere als verbraucht
    if (isTrialVariant) {
      updateData.has_used_trial = true;
    }
    const { error } = await supabase.from("profiles").update(updateData).eq("id", userId);
    if (error) console.error("❌ DB Update Fehler (subscription_created):", error);
    else console.log(`✅ subscription_created: User ${userId} → Tier ${tier}, Trial: ${isTrialVariant}`);
  }

  else if (eventName === "subscription_updated" || eventName === "subscription_payment_success") {
    const updateData: any = {
      tier,
      is_premium: true,
      ls_subscription_status: status || "active",
    };
    if (endsAt) updateData.premium_until = endsAt;
    const { error } = await supabase.from("profiles").update(updateData).eq("id", userId);
    if (error) console.error("❌ DB Update Fehler (subscription_updated):", error);
    else console.log(`✅ subscription_updated: User ${userId} → Status ${status}`);
  }

  else if (eventName === "subscription_cancelled") {
    // Subscription gekündigt — bleibt aktiv bis Periodenende
    const { error } = await supabase.from("profiles").update({
      ls_subscription_status: "cancelled",
    }).eq("id", userId);
    if (error) console.error("❌ DB Update Fehler (subscription_cancelled):", error);
    else console.log(`⚠️ subscription_cancelled: User ${userId} — bleibt aktiv bis ${endsAt}`);
  }

  else if (eventName === "subscription_expired") {
    // Subscription abgelaufen — Zugang entziehen
    const { error } = await supabase.from("profiles").update({
      tier: "FREE",
      is_premium: false,
      ls_subscription_status: "expired",
      premium_until: null,
    }).eq("id", userId);
    if (error) console.error("❌ DB Update Fehler (subscription_expired):", error);
    else console.log(`❌ subscription_expired: User ${userId} → Tier FREE`);
  }

  else {
    console.log(`ℹ️ Unbekanntes Event ignoriert: ${eventName}`);
  }

  return new Response(JSON.stringify({ received: true, event: eventName }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
