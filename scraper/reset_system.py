"""
reset_system.py — Neural Scout System Reset
=============================================
Löscht alte Reports und setzt Scout Rules zurück.
Vor dem Deploy des neuen v2.0 Systems ausführen.
"""
import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

try:
    from env_loader import load_env
    load_env()
except ImportError:
    try:
        from scraper.env_loader import load_env
        load_env()
    except ImportError:
        pass

from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("FATAL: SUPABASE_URL or SUPABASE_KEY not set.")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def log(msg):
    print(f"[RESET] {msg}")


def reset_scout_reports():
    """Löscht alle alten Scout Reports."""
    log("🗑️ Lösche alle alten scout_reports...")
    try:
        # Alle Reports laden
        res = supabase.table("scout_reports").select("id").execute()
        if res.data:
            count = len(res.data)
            for row in res.data:
                supabase.table("scout_reports").delete().eq("id", row["id"]).execute()
            log(f"  ✅ {count} alte Reports gelöscht.")
        else:
            log("  ℹ️ Keine Reports gefunden.")
    except Exception as e:
        log(f"  ❌ Fehler: {e}")


def reset_scout_rules():
    """Setzt alle Scout Rules auf 'rejected' zurück (außer SYSTEM_AUTOPILOT)."""
    log("🔄 Setze alle Scout Rules auf 'rejected' zurück...")
    try:
        res = supabase.table("scout_rules").select("*").execute()
        if res.data:
            count = 0
            for rule in res.data:
                desc = rule.get("description", "")
                if desc == "SYSTEM_AUTOPILOT":
                    continue
                if rule.get("status") != "rejected":
                    supabase.table("scout_rules").update({
                        "status": "rejected",
                        "updated_at": "2026-06-25T00:00:00Z"
                    }).eq("id", rule["id"]).execute()
                    count += 1
            log(f"  ✅ {count} Rules auf 'rejected' zurückgesetzt.")
        else:
            log("  ℹ️ Keine Rules gefunden.")
    except Exception as e:
        log(f"  ❌ Fehler: {e}")


def reset_ai_system_weights():
    """Setzt die System-Gewichte auf Standard zurück."""
    log("🔄 Setze AI System Weights auf Standard zurück...")
    try:
        for tour in ["ATP", "WTA"]:
            supabase.table("ai_system_weights").upsert({
                "tour": tour,
                "weight_skill": 0.50,
                "weight_form": 0.35,
                "weight_surface": 0.15,
                "mc_variance": 1.20,
                "last_optimized": "2026-06-25T00:00:00Z"
            }).execute()
        log("  ✅ System Weights zurückgesetzt (ATP+WTA: 50/35/15).")
    except Exception as e:
        log(f"  ❌ Fehler: {e}")


def ensure_autopilot_rule():
    """Stellt sicher, dass die SYSTEM_AUTOPILOT Rule existiert."""
    log("🔧 Stelle sicher, dass SYSTEM_AUTOPILOT Rule existiert...")
    try:
        res = supabase.table("scout_rules").select("*").eq("description", "SYSTEM_AUTOPILOT").execute()
        if not res.data:
            supabase.table("scout_rules").insert({
                "rule_type": "veto",
                "description": "SYSTEM_AUTOPILOT",
                "status": "rejected",
                "conditions": {
                    "max_veto_percentage": 35.0,
                    "drawdown_limit_units": 15.0
                },
                "confidence": 1.0
            }).execute()
            log("  ✅ SYSTEM_AUTOPILOT Rule erstellt (deaktiviert).")
        else:
            log("  ℹ️ SYSTEM_AUTOPILOT Rule existiert bereits.")
    except Exception as e:
        log(f"  ❌ Fehler: {e}")


if __name__ == "__main__":
    log("🚀 Neural Scout System Reset v2.0")
    log("=" * 50)

    reset_scout_reports()
    reset_scout_rules()
    reset_ai_system_weights()
    ensure_autopilot_rule()

    log("=" * 50)
    log("✅ System Reset abgeschlossen. Bereit für v2.0 Deploy.")