"""
reset_system.py — Neural Scout System Reset
=============================================
Setzt AI System Weights zurück.
"""
import os
import sys

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


if __name__ == "__main__":
    log("🚀 Neural Scout System Reset v2.0")
    log("=" * 50)

    reset_ai_system_weights()

    log("=" * 50)