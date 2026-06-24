"""
agent_analysis.py — Neural Scout AI Ops Analyst (Wrapper)
==========================================================
Dieses Modul ruft den neuen daily_analyst.py auf, der den
kompletten 24h Performance-Report generiert.
"""
import os
import sys
import asyncio

sys.stdout.reconfigure(encoding='utf-8')

# ═══════════════════════════════════════════════════════════════════════════
# INIT
# ═══════════════════════════════════════════════════════════════════════════

try:
    from env_loader import load_env
    load_env()
except ImportError:
    try:
        from scraper.env_loader import load_env
        load_env()
    except ImportError:
        pass


def log(msg: str):
    from datetime import datetime
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [AgentAnalysis] {msg}")


# ═══════════════════════════════════════════════════════════════════════════
# DELEGATION TO DAILY ANALYST
# ═══════════════════════════════════════════════════════════════════════════

async def run_analysis():
    """
    Haupt-Entry-Point: Delegiert an den neuen Daily Analyst v2.0.
    Generiert einen umfassenden 24h Performance-Report mit:
    - Gesamtperformance (WR, ROI, P&L, Brier Score)
    - Market-Type Breakdown
    - Surface × Market-Type Analyse
    - Edge-Kalibrierung
    - Stake-Effizienz
    - Handicap-Line × Surface Coverage
    - Totals-Line × Surface Hit-Rate
    - Odds-Bracket × Market-Type
    - Challenger vs. Haupttour
    - 24h Pick-Liste mit Detail-Info
    - Autopilot Drawdown Circuit-Breaker
    - Scout Rules Evaluation & Auto-Anpassung
    """
    log("📊 Agent Analysis starting — delegating to Daily Analyst v2.0...")
    try:
        from daily_analyst import run_daily_analysis
        await run_daily_analysis()
        log("✅ Agent Analysis completed successfully.")
    except Exception as e:
        log(f"❌ Agent Analysis failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(run_analysis())