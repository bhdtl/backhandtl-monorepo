import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ═══════════════════════════════════════════════════════════════
// BACKHANDTL — LEMON SQUEEZY WEBHOOK HANDLER (FINAL v3)
// Kombiniert: Guillotine + Affiliate + Smart Downgrade Guard
// + alle aktuellen Variant-IDs (alt + neu)
// ═══════════════════════════════════════════════════════════════

const LS_SECRET                = Deno.env.get('LEMON_SQUEEZY_WEBHOOK_SECRET')!;
const LS_API_KEY               = Deno.env.get('LEMON_SQUEEZY_API_KEY')!;
const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ─── VARIANT MAP: ALLE bekannten IDs ────────────────────────────
const VARIANT_MAP: Record<string, string> = {
  // ✅ NEUE Varianten MIT TRIAL (Frontend seit ~Juni 2026)
  '632313': 'WEEKEND',
  '632314': 'ELITE',
  '632315': 'PREMIUM',
  // ✅ ALTE Varianten MIT TRIAL (Frontend vor ~Juni 2026)
  '1341574': 'WEEKEND',
  '1341599': 'ELITE',
  '1341601': 'PREMIUM',
  // ✅ POST-TRIAL Varianten OHNE TRIAL
  '1485891': 'WEEKEND',
  '1485892': 'ELITE',
  '1485893': 'PREMIUM',
};

// Trial-Varianten: User die mit diesen IDs kaufen → has_used_trial = true
const TRIAL_VARIANT_IDS = new Set(['632313', '632314', '632315', '1341574', '1341599', '1341601']);

// ─── SIGNATUR VERIFIKATION ───────────────────────────────────────
async function verifySignature(secret: string, signature: string, body: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const sigBuf = new Uint8Array(signature.match(/[\da-f]{2}/gi)?.map(h => parseInt(h, 16)) || []);
  return await crypto.subtle.verify('HMAC', key, sigBuf, encoder.encode(body));
}

// ─── GUILLOTINE: Sofort-Kündigung via API ───────────────────────
async function cancelSubscriptionImmediately(subscriptionId: string, apiKey: string): Promise<boolean> {
  const res = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'Authorization': `Bearer ${apiKey}`
    }
  });
  if (!res.ok) {
    console.error(`🚨 Guillotine fehlgeschlagen: ${res.status} ${res.statusText}`);
  } else {
    console.log(`🗡️ Subscription ${subscriptionId} erfolgreich terminiert.`);
  }
  return res.ok;
}

// ════════════════════════════════════════════════════════════════
serve(async (req) => {
  try {
    const signature = req.headers.get('x-signature');
    if (!signature) throw new Error('Missing x-signature header');

    const bodyText = await req.text();

    // 1. SICHERHEIT: Kryptografische Verifikation
    const isValid = await verifySignature(LS_SECRET, signature, bodyText);
    if (!isValid) throw new Error('Invalid signature: Intrusion Attempt Detected.');

    const payload = JSON.parse(bodyText);
    const eventName   = payload.meta.event_name;
    const customData  = payload.meta.custom_data;
    const attributes  = payload.data.attributes;

    // 2. USER MAPPING
    const userId = customData?.user_id;
    if (!userId) {
      console.warn('Webhook ignoriert: Keine custom_data.user_id gefunden.');
      return new Response(JSON.stringify({ success: true, message: 'No user_id, ignored.' }), { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Variant-ID auslesen (Order oder Subscription)
    const variantId = String(
      attributes.first_order_item?.variant_id ||
      attributes.variant_id ||
      ''
    );
    const newTier         = VARIANT_MAP[variantId] || 'ELITE'; // Fallback: ELITE
    const isTrialVariant  = TRIAL_VARIANT_IDS.has(variantId);
    const customerEmail   = (attributes.user_email || '').toLowerCase().trim();
    const lsCustomerId    = attributes.customer_id?.toString() || '';
    const subscriptionId  = payload.data.id.toString();

    console.log(`📩 ${eventName} | User:${userId} | Variant:${variantId} | Tier:${newTier} | Trial:${isTrialVariant}`);

    // ─── EVENT ROUTING ────────────────────────────────────────────

    // ── ORDER_CREATED (Weekend Pass, Einmalzahlungen) ─────────────
    if (eventName === 'order_created') {
      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + 7);

      await supabase.from('profiles').update({
        tier:                 newTier,
        special_badge:        newTier,
        premium_until:        newTier === 'WEEKEND' ? premiumUntil.toISOString() : null,
        ls_customer_id:       lsCustomerId || null,
        ls_variant_id:        variantId || null,
        ls_subscription_status: 'one_time',
        ls_subscription_id:   null,
        has_used_trial:       isTrialVariant ? true : undefined,
      }).eq('id', userId);

      console.log(`✅ order_created: User ${userId} → ${newTier}`);

      // Affiliate Engine
      try {
        const appliedCode = attributes.discount_code || customData?.affiliate_code;
        if (appliedCode) {
          const { data: partner } = await supabase
            .from('partners')
            .select('id, commission_rate, total_earned')
            .eq('ls_discount_code', appliedCode.toUpperCase().trim())
            .single();

          if (partner) {
            const saleAmount   = (attributes.total || 0) / 100;
            const commission   = saleAmount * Number(partner.commission_rate);
            const { error: refErr } = await supabase.from('referrals').insert({
              partner_id:        partner.id,
              ls_order_id:       payload.data.id.toString(),
              customer_email:    customerEmail || 'hidden',
              sale_amount:       saleAmount,
              commission_amount: commission,
              status:            'cleared',
            });
            if (!refErr) {
              await supabase.from('partners').update({
                total_earned: Number(partner.total_earned) + commission
              }).eq('id', partner.id);
              console.log(`💰 Affiliate: Partner ${partner.id} +${commission}€`);
            }
          }
        }
      } catch (affiliateErr) {
        console.error('Silent Affiliate Error:', affiliateErr);
      }
    }

    // ── SUBSCRIPTION_CREATED ──────────────────────────────────────
    else if (eventName === 'subscription_created') {
      const premiumUntil = attributes.renews_at || attributes.ends_at || null;
      const isTrial      = attributes.status === 'on_trial';

      // 🗡️ GUILLOTINE: Trial-Missbrauch erkennen und sofort stoppen
      if (isTrial && isTrialVariant) {
        const checkValues: string[] = [];
        if (customerEmail)  checkValues.push(customerEmail);
        if (lsCustomerId)   checkValues.push(lsCustomerId);

        if (checkValues.length > 0) {
          const { data: vaultRecords } = await supabase
            .from('used_trials')
            .select('value')
            .in('value', checkValues);

          if (vaultRecords && vaultRecords.length > 0) {
            console.warn(`🚨 BURNER ACCOUNT: ${customerEmail} / ${lsCustomerId} hat Trial bereits genutzt! Terminiere ${subscriptionId}...`);
            await cancelSubscriptionImmediately(subscriptionId, LS_API_KEY);
            return new Response(JSON.stringify({
              success: false,
              message: 'Trial already used. Subscription terminated.'
            }), { status: 200 });
          }

          // Sauber → In used_trials eintragen (BRANDZEICHEN)
          const insertData = checkValues.map(v => ({ value: v }));
          await supabase.from('used_trials').upsert(insertData, { onConflict: 'value' });
          console.log(`🔏 Trial-Brandzeichen gesetzt für: ${checkValues.join(', ')}`);
        }
      }

      // Normales Update
      await supabase.from('profiles').update({
        tier:                 newTier,
        special_badge:        newTier,
        premium_until:        premiumUntil,
        ls_customer_id:       lsCustomerId || null,
        ls_subscription_id:   subscriptionId,
        ls_variant_id:        variantId || null,
        ls_subscription_status: attributes.status || 'active',
        has_used_trial:       isTrialVariant ? true : undefined,
        is_premium:           true,
      }).eq('id', userId);

      console.log(`✅ subscription_created: User ${userId} → ${newTier} | Trial:${isTrial}`);
    }

    // ── SUBSCRIPTION_UPDATED ──────────────────────────────────────
    else if (eventName === 'subscription_updated') {
      const premiumUntil = attributes.renews_at || attributes.ends_at || null;
      await supabase.from('profiles').update({
        tier:                 newTier,
        special_badge:        newTier,
        premium_until:        premiumUntil,
        ls_customer_id:       lsCustomerId || null,
        ls_subscription_id:   subscriptionId,
        ls_variant_id:        variantId || null,
        ls_subscription_status: attributes.status || 'active',
        is_premium:           true,
      }).eq('id', userId);
      console.log(`✅ subscription_updated: User ${userId} → ${newTier} / ${attributes.status}`);
    }

    // ── SUBSCRIPTION_CANCELLED ────────────────────────────────────
    else if (eventName === 'subscription_cancelled') {
      // Smart Downgrade Guard: Nur updaten wenn es die aktuelle Sub ist
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('ls_subscription_id, ls_subscription_status, tier')
        .eq('id', userId)
        .single();

      if (currentProfile?.ls_subscription_status === 'one_time' ||
          currentProfile?.ls_subscription_id !== subscriptionId) {
        console.warn(`⚠️ Ignoriert ${eventName} für ${subscriptionId}: User hat neueres Paket`);
        return new Response(JSON.stringify({ success: true, message: 'Ignored: newer package active' }), { status: 200 });
      }

      await supabase.from('profiles').update({
        ls_subscription_status: attributes.status || 'cancelled',
        premium_until:          attributes.ends_at || new Date().toISOString(),
      }).eq('id', userId);
      console.log(`⚠️ subscription_cancelled: User ${userId} — bleibt aktiv bis ${attributes.ends_at}`);
    }

    // ── SUBSCRIPTION_EXPIRED ──────────────────────────────────────
    else if (eventName === 'subscription_expired') {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('ls_subscription_id, ls_subscription_status, tier')
        .eq('id', userId)
        .single();

      if (currentProfile?.ls_subscription_status === 'one_time' ||
          currentProfile?.ls_subscription_id !== subscriptionId) {
        console.warn(`⚠️ Ignoriert ${eventName} für ${subscriptionId}: User hat neueres Paket`);
        return new Response(JSON.stringify({ success: true, message: 'Ignored: newer package active' }), { status: 200 });
      }

      await supabase.from('profiles').update({
        tier:                 'FREE',
        special_badge:        'FREE',
        ls_subscription_status: 'expired',
        ls_subscription_id:   null,
        premium_until:        null,
        is_premium:           false,
      }).eq('id', userId);
      console.log(`❌ subscription_expired: User ${userId} → FREE`);
    }

    else {
      console.log(`ℹ️ Unbekanntes Event ignoriert: ${eventName}`);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err: any) {
    console.error('Webhook Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
