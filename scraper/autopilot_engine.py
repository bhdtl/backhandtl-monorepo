"""
autopilot_engine.py — Neural Scout Autopilot v2.0 "Syndicate Board Agent"
==========================================================================
Autonomer Datenanalyst, der die täglichen Performance-Reports analysiert
und eigenständig Entscheidungen trifft:

Schicht 1: Deterministische Entscheidungen (harte Zahlen)
Schicht 2: LLM-gestützte tiefe Analyse
Schicht 3: Safety & Guardrails

Wird vom daily_analyst.py nach der Analyse aufgerufen.
"""
import os
import sys
import re
import json
import math
import httpx
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple

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
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("FATAL: SUPABASE_URL or SUPABASE_KEY not set.")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
MODEL_NAME = 'meta-llama/llama-3.3-70b-instruct'


def log(msg: str):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [Autopilot] {msg}")


# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

DEFAULT_CONFIG = {
    "max_veto_percentage": 35.0,
    "drawdown_limit_units": 15.0,
    "min_bets_for_evaluation": 8,
    "cooldown_hours": 24,
    "auto_approve_multiplier_rules": True,
    "auto_approve_veto_rules": False,
    "max_consecutive_auto_executions": 3,
    "min_roi_for_deactivation": 5.0,
    "max_roi_for_reactivation": -15.0,
    "min_p_value": 0.05,
    "min_bets_for_new_veto": 10,
    "min_roi_for_new_veto": -20.0,
}


# ═══════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def compute_p_value(n_bets: int, avg_odds: float, roi: float) -> float:
    """Berechnet den p-Wert für statistische Signifikanz."""
    if n_bets <= 0 or avg_odds <= 1.0:
        return 1.0
    se = math.sqrt((avg_odds - 1.0) / n_bets)
    if se <= 0:
        return 1.0
    z = (roi / 100.0) / se
    if roi < 0:
        p = 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))
    else:
        p = 0.5 * (1.0 - math.erf(z / math.sqrt(2.0)))
    return round(p, 4)


def _matches_rule_conditions(pick: Dict, conditions: Dict) -> bool:
    """Prüft ob ein Pick auf die Bedingungen einer Regel zutrifft."""
    if "surface" in conditions:
        if conditions["surface"].lower() != pick.get("surface", "").lower():
            return False
    if "is_favorite" in conditions:
        if conditions["is_favorite"] != pick.get("is_fav"):
            return False
    if "is_challenger" in conditions:
        if conditions["is_challenger"] != pick.get("is_challenger"):
            return False
    if "tour" in conditions:
        if conditions["tour"].upper() != pick.get("tour", "").upper():
            return False
    if "market_type" in conditions:
        req_mt = conditions["market_type"].lower()
        cand_mt = pick.get("market_type", "").lower()
        if req_mt == "handicap" and "handicap" not in cand_mt:
            return False
        elif req_mt == "total" and "total" not in cand_mt:
            return False
        elif req_mt not in ("handicap", "total") and req_mt != cand_mt:
            return False
    return True


def _grp_stats(grp: List[Dict]) -> Optional[Dict]:
    """Berechnet Statistiken für eine Pick-Gruppe."""
    n = len(grp)
    if n == 0:
        return None
    wins = sum(1 for p in grp if p.get("is_win"))
    staked = sum(p.get("stake", 0) for p in grp)
    pnl = sum(p.get("profit", 0) for p in grp)
    roi = pnl / staked * 100 if staked > 0 else 0
    wr = wins / n * 100
    avg_odds = sum(p.get("odds", 2.0) for p in grp) / n
    avg_edge = sum(p.get("edge", 0) for p in grp) / n
    be_wr = 100.0 / avg_odds
    skill = wr - be_wr
    return dict(
        n=n, wins=wins, wr=round(wr, 1), staked=round(staked, 2),
        pnl=round(pnl, 2), roi=round(roi, 1), avg_odds=round(avg_odds, 2),
        avg_edge=round(avg_edge, 1), be_wr=round(be_wr, 1),
        skill=round(skill, 1)
    )


async def call_openrouter(prompt: str, system_prompt: str, model: str = MODEL_NAME, temp: float = 0.15) -> str:
    """OpenRouter API Call mit Model-Fallback."""
    if not OPENROUTER_API_KEY:
        log("⚠️ OPENROUTER_API_KEY missing.")
        return ""
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://neuralscout.com",
        "X-Title": "NeuralScout Autopilot"
    }
    models_to_try = [model, "google/gemini-2.5-flash", "openrouter/free"]
    seen = set()
    models_to_try = [x for x in models_to_try if not (x in seen or seen.add(x))]

    async with httpx.AsyncClient() as client:
        for current_model in models_to_try:
            log(f"Calling OpenRouter: {current_model}...")
            payload = {
                "model": current_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "temperature": temp
            }
            try:
                response = await client.post(url, headers=headers, json=payload, timeout=60.0)
                if response.status_code == 200:
                    content = response.json()['choices'][0]['message']['content']
                    if content:
                        log(f"✅ OpenRouter OK ({current_model})")
                        return content
            except Exception as e:
                log(f"⚠️ OpenRouter Exception {current_model}: {e}")
    return ""


# ═══════════════════════════════════════════════════════════════════════════
# SCHICHT 1: DETERMINISTISCHE ENTSCHEIDUNGEN
# ═══════════════════════════════════════════════════════════════════════════

def deterministic_evaluation(
    rich_picks: List[Dict],
    all_rules: List[Dict],
    config: Dict
) -> List[Dict]:
    """
    Führt deterministische Regel-Evaluation durch.
    Gibt eine Liste von Entscheidungen zurück.
    """
    decisions = []
    min_bets = config.get("min_bets_for_evaluation", 8)
    min_p = config.get("min_p_value", 0.05)
    min_roi_deact = config.get("min_roi_for_deactivation", 5.0)
    max_roi_react = config.get("max_roi_for_reactivation", -15.0)
    min_bets_new_veto = config.get("min_bets_for_new_veto", 10)
    min_roi_new_veto = config.get("min_roi_for_new_veto", -20.0)

    for rule in all_rules:
        conds = rule.get("conditions") or {}
        desc = rule.get("description", "")
        rule_id = rule.get("id")
        rule_status = rule.get("status", "pending")
        rule_type = rule.get("rule_type", "veto")

        if desc == "SYSTEM_AUTOPILOT":
            continue

        matching_picks = [p for p in rich_picks if _matches_rule_conditions(p, conds)]
        mc = len(matching_picks)

        if mc < min_bets:
            continue

        avg_odds_r = sum(p.get("odds", 2.0) for p in matching_picks) / mc
        ts = sum(p.get("stake", 0) for p in matching_picks)
        np_r = sum(p.get("profit", 0) for p in matching_picks)
        roi_val = (np_r / ts) * 100 if ts > 0 else 0.0
        p_val = compute_p_value(mc, avg_odds_r, roi_val)

        # ── FALL 1: Aktives Veto → prüfen ob deaktivieren ──
        if rule_status == "approved" and rule_type == "veto":
            if roi_val > min_roi_deact and p_val < min_p:
                decisions.append({
                    "rule_id": rule_id,
                    "description": desc,
                    "current_status": rule_status,
                    "recommended_status": "rejected",
                    "action_type": "deactivate",
                    "reason": f"Segment erholt sich signifikant (ROI: {roi_val:+.1f}%, p={p_val}, N={mc}).",
                    "bets": mc,
                    "roi": round(roi_val, 1),
                    "profit": round(np_r, 2),
                    "p_value": p_val,
                    "confidence": "high",
                    "source": "deterministic"
                })

        # ── FALL 2: Deaktiviertes Veto → prüfen ob reaktivieren ──
        elif rule_status == "rejected" and rule_type == "veto":
            if roi_val < max_roi_react and p_val < min_p:
                decisions.append({
                    "rule_id": rule_id,
                    "description": desc,
                    "current_status": rule_status,
                    "recommended_status": "approved",
                    "action_type": "reactivate",
                    "reason": f"Segment verliert erneut signifikant (ROI: {roi_val:+.1f}%, p={p_val}, N={mc}).",
                    "bets": mc,
                    "roi": round(roi_val, 1),
                    "profit": round(np_r, 2),
                    "p_value": p_val,
                    "confidence": "high",
                    "source": "deterministic"
                })

        # ── FALL 3: Pending → bestätigen oder ablehnen ──
        elif rule_status == "pending":
            if roi_val < max_roi_react and p_val < min_p:
                decisions.append({
                    "rule_id": rule_id,
                    "description": desc,
                    "current_status": rule_status,
                    "recommended_status": "approved",
                    "action_type": "approve",
                    "reason": f"Vorschlag bestätigt sich (ROI: {roi_val:+.1f}%, p={p_val}, N={mc}).",
                    "bets": mc,
                    "roi": round(roi_val, 1),
                    "profit": round(np_r, 2),
                    "p_value": p_val,
                    "confidence": "high",
                    "source": "deterministic"
                })
            elif roi_val > min_roi_deact and p_val < min_p:
                decisions.append({
                    "rule_id": rule_id,
                    "description": desc,
                    "current_status": rule_status,
                    "recommended_status": "rejected",
                    "action_type": "reject",
                    "reason": f"Segment profitabel, Vorschlag hinfällig (ROI: {roi_val:+.1f}%, p={p_val}, N={mc}).",
                    "bets": mc,
                    "roi": round(roi_val, 1),
                    "profit": round(np_r, 2),
                    "p_value": p_val,
                    "confidence": "high",
                    "source": "deterministic"
                })

    # ── NEUE VETO-VORSCHLÄGE: Ungeschützte Verlust-Segmente ──
    surface_market_combos = {}
    for pick in rich_picks:
        surf = pick.get("surface", "hard")
        mt = pick.get("market_type", "MONEYLINE")
        tour = pick.get("tour", "ATP")
        is_fav = pick.get("is_fav", False)

        # Kombinationen prüfen
        for key, cond in [
            (f"{surf}|{mt}", {"surface": surf, "market_type": mt}),
            (f"{surf}|{tour}|{mt}", {"surface": surf, "tour": tour, "market_type": mt}),
            (f"{surf}|{'fav' if is_fav else 'dog'}|{mt}", {"surface": surf, "is_favorite": is_fav, "market_type": mt}),
        ]:
            if key not in surface_market_combos:
                surface_market_combos[key] = {"picks": [], "conditions": cond}
            surface_market_combos[key]["picks"].append(pick)

    existing_veto_conditions = set()
    for rule in all_rules:
        if rule.get("rule_type") == "veto" and rule.get("status") in ("approved", "pending"):
            conds = rule.get("conditions") or {}
            existing_veto_conditions.add(json.dumps(dict(sorted(conds.items()))))

    for key, data in surface_market_combos.items():
        picks = data["picks"]
        conds = data["conditions"]
        if len(picks) < min_bets_new_veto:
            continue

        conds_fp = json.dumps(dict(sorted(conds.items())))
        if conds_fp in existing_veto_conditions:
            continue

        stats = _grp_stats(picks)
        if not stats:
            continue

        if stats["roi"] < min_roi_new_veto and stats["n"] >= min_bets_new_veto:
            decisions.append({
                "rule_id": None,
                "description": f"Auto-Veto: {key} (ROI: {stats['roi']:+.1f}%, N={stats['n']})",
                "current_status": "none",
                "recommended_status": "pending",
                "action_type": "propose_veto",
                "reason": f"Ungeschütztes Segment verliert signifikant (ROI: {stats['roi']:+.1f}%, N={stats['n']}, WR: {stats['wr']:.0f}%).",
                "conditions": conds,
                "bets": stats["n"],
                "roi": stats["roi"],
                "profit": stats["pnl"],
                "p_value": compute_p_value(stats["n"], stats["avg_odds"], stats["roi"]),
                "confidence": "medium",
                "source": "deterministic_new_proposal"
            })

    return decisions


# ═══════════════════════════════════════════════════════════════════════════
# SCHICHT 2: LLM-GESTÜTZTE TIEFE ANALYSE
# ═══════════════════════════════════════════════════════════════════════════

async def llm_deep_analysis(
    rich_picks: List[Dict],
    deterministic_decisions: List[Dict],
    analytics_text: str,
    config: Dict
) -> List[Dict]:
    """
    LLM analysiert die vollen quantitativen Daten + deterministische Vorschläge
    und generiert finale Entscheidungen + neue Regelvorschläge.
    """
    decisions_text = ""
    if deterministic_decisions:
        decisions_text = "\nDETETERMINISTISCHE VORSCHLÄGE:\n"
        for d in deterministic_decisions:
            decisions_text += f"  - {d['action_type'].upper()}: {d['description']} (ROI: {d['roi']:+.1f}%, p={d['p_value']}, N={d['bets']})\n"
    else:
        decisions_text = "\nKeine deterministischen Entscheidungen nötig.\n"

    # Segment-Analyse für LLM
    segment_analysis = ""
    for surf in ["hard", "grass", "clay"]:
        for mt in ["MONEYLINE", "HANDICAP_FAVE", "HANDICAP_DOG", "TOTAL_OVER"]:
            grp = [p for p in rich_picks if p.get("surface") == surf and p.get("market_type") == mt]
            s = _grp_stats(grp)
            if s and s["n"] >= 3:
                icon = "🟢" if s["roi"] > 3 else ("🔴" if s["roi"] < -8 else "🟡")
                segment_analysis += f"  {surf}|{mt}: N={s['n']}, WR={s['wr']}%, ROI={icon}{s['roi']:+.1f}%, Skill={s['skill']:+.1f}%\n"

    # Edge-Kalibrierung
    edge_cal = ""
    for lo, hi in [(0, 4), (4, 6), (6, 8), (8, 12), (12, 100)]:
        grp = [p for p in rich_picks if lo <= p.get("edge", 0) < hi]
        s = _grp_stats(grp)
        if s and s["n"] >= 3:
            edge_cal += f"  Edge {lo}-{hi}%: N={s['n']}, WR={s['wr']}%, ROI={s['roi']:+.1f}%\n"

    # Weekly Trend
    now_utc = datetime.now(timezone.utc)
    weekly = ""
    for wk in range(3, -1, -1):
        ws = now_utc - timedelta(days=(wk + 1) * 7)
        we = now_utc - timedelta(days=wk * 7)
        grp = [p for p in rich_picks if p.get("dt") and ws <= p["dt"] < we]
        s = _grp_stats(grp)
        if s and s["n"] > 0:
            icon = "🟢" if s["roi"] > 3 else ("🔴" if s["roi"] < -8 else "🟡")
            weekly += f"  W-{wk} ({ws.strftime('%d.%m')}–{we.strftime('%d.%m')}): N={s['n']}, ROI={icon}{s['roi']:+.1f}%\n"

    system_prompt = (
        "Du bist der Chief Trading Officer eines professionellen Tennis-Wettsyndikats.\n"
        "Du analysierst tägliche Performance-Daten und triffst eigenständige Entscheidungen.\n\n"
        "DEINE AUFGABEN:\n"
        "1. Validiere oder überschreibe die deterministischen Vorschläge\n"
        "2. Identifiziere Muster die das Deterministische System übersieht (Korrelationen, Trends)\n"
        "3. Schlage neue präzise scout_rules vor (mit conditions)\n"
        "4. Bewerte ob bestehende Multiplier angepasst werden müssen\n\n"
        "REGELTYPEN:\n"
        '- "veto": Verbietet ein Segment komplett. Benötigt: surface, market_type, (tour, is_favorite)\n'
        '- "multiplier": Skaliert den Stake. Benötigt: multiplier (0.1-1.5), conditions\n'
        '- "odds_filter": Erhöht Mindest-Edge. Benötigt: min_edge, conditions\n\n'
        "ANTWORTE IM FORMAT:\n"
        "ZUERST: Eine kurze Analyse auf Deutsch (3-5 Sätze)\n"
        "DANN: Ein JSON-Array von Entscheidungen:\n"
        "PROPOSALS_JSON:\n"
        '[{"rule_type": "...", "description": "...", "conditions": {...}, "action": "approve|reject|propose"}]'
    )

    prompt = f"""
QUANTITATIVE DATEN (30 Tage):
{analytics_text}

SEGMENT-ANALYSE:
{segment_analysis}

EDGE-KALIBRIERUNG:
{edge_cal}

WÖCHENTLICHER TREND:
{weekly}

{decisions_text}

Schlage basierend auf diesen Daten konkrete Aktionen vor.
"""
    response = await call_openrouter(prompt, system_prompt)
    if not response:
        log("⚠️ LLM returned empty response. Using deterministic decisions only.")
        return deterministic_decisions

    # Parse LLM-Antwort
    llm_decisions = []
    try:
        # Extrahiere proposals
        if "PROPOSALS_JSON:" in response:
            parts = response.split("PROPOSALS_JSON:")
            json_str = parts[1].strip()
            arr_match = re.search(r'\[\s*\{.*\}\s*\]', json_str, re.DOTALL)
            if arr_match:
                proposals = json.loads(arr_match.group(0))
                for prop in proposals:
                    action = prop.get("action", "propose")
                    if action == "propose":
                        llm_decisions.append({
                            "rule_id": None,
                            "description": prop.get("description", "LLM Vorschlag"),
                            "current_status": "none",
                            "recommended_status": "pending",
                            "action_type": f"propose_{prop.get('rule_type', 'veto')}",
                            "reason": f"LLM Analytics: {prop.get('description', '')}",
                            "conditions": prop.get("conditions", {}),
                            "rule_type": prop.get("rule_type", "veto"),
                            "bets": 0,
                            "roi": 0,
                            "profit": 0,
                            "p_value": 1.0,
                            "confidence": "llm",
                            "source": "llm_analysis"
                        })
    except Exception as e:
        log(f"⚠️ Error parsing LLM proposals: {e}")

    # Kombiniere deterministische + LLM Entscheidungen
    all_decisions = deterministic_decisions + llm_decisions
    return all_decisions


# ═══════════════════════════════════════════════════════════════════════════
# SCHICHT 3: SAFETY & GUARDRAILS + EXECUTION
# ═══════════════════════════════════════════════════════════════════════════

def check_safety_guards(config: Dict) -> Tuple[bool, str]:
    """Prüft ob Autopilot-Ausführung sicher ist."""
    # Prüfe ob SYSTEM_AUTOPILOT aktiv ist
    try:
        res = supabase.table("scout_rules").select("*").eq("description", "SYSTEM_AUTOPILOT").execute()
        if not res.data:
            return False, "SYSTEM_AUTOPILOT nicht vorhanden."
        rule = res.data[0]
        if rule.get("status") != "approved":
            return False, "SYSTEM_AUTOPILOT ist deaktiviert."
    except Exception as e:
        return False, f"Fehler beim Laden der Autopilot-Config: {e}"

    # Prüfe Drawdown
    try:
        cutoff_48h = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        res = supabase.table("market_odds")\
            .select("ai_analysis_text, actual_winner_name, odds1, odds2, created_at")\
            .not_.is_("actual_winner_name", "null")\
            .gte("created_at", cutoff_48h)\
            .execute()
        # Einfacher P&L Check
        recent_profit = 0.0
        for m in (res.data or []):
            text = m.get("ai_analysis_text", "")
            if "[[" in text and "Stake:" in text:
                # Vereinfachte Extraktion
                stake_match = re.search(r'Stake:\s*([\d.]+)u', text)
                odds_match = re.search(r'@\s*([\d.]+)', text)
                if stake_match and odds_match:
                    stake = float(stake_match.group(1))
                    odds = float(odds_match.group(1))
                    # Vereinfacht: Annahme 50% Win Rate für Check
                    recent_profit -= stake * 0.1  # Konservativ

        drawdown_limit = config.get("drawdown_limit_units", 15.0)
        if recent_profit <= -drawdown_limit:
            return False, f"Drawdown-Limit überschritten ({recent_profit:+.2f}u <= -{drawdown_limit}u)"
    except Exception:
        pass

    # Prüfe consecutive auto executions
    try:
        res = supabase.table("scout_reports")\
            .select("metrics")\
            .order("report_date", desc=True)\
            .limit(3)\
            .execute()
        consecutive = 0
        for report in (res.data or []):
            metrics = report.get("metrics") or {}
            autopilot = metrics.get("autopilot_decisions") or []
            if any(d.get("auto_executed") for d in autopilot):
                consecutive += 1
            else:
                break

        max_consecutive = config.get("max_consecutive_auto_executions", 3)
        if consecutive >= max_consecutive:
            return False, f"{consecutive} aufeinanderfolgende Auto-Executions (Limit: {max_consecutive}). Cooling-Off empfohlen."
    except Exception:
        pass

    return True, "Safety Guards OK"


def execute_decisions(decisions: List[Dict], config: Dict) -> List[Dict]:
    """Führt genehmigte Entscheidungen aus."""
    auto_approve_multipliers = config.get("auto_approve_multiplier_rules", True)
    auto_approve_vetos = config.get("auto_approve_veto_rules", False)
    max_veto_pct = config.get("max_veto_percentage", 35.0)

    executed = []
    for decision in decisions:
        action = decision.get("action_type", "")
        status = decision.get("recommended_status", "")

        # ── Auto-Approved Aktionen ──
        should_auto_execute = False

        if action in ("deactivate", "reject") and decision.get("confidence") == "high":
            should_auto_execute = True
        elif action == "reactivate" and decision.get("confidence") == "high":
            should_auto_execute = True
        elif action == "approve" and decision.get("confidence") == "high":
            should_auto_execute = True
        elif action.startswith("propose_") and "multiplier" in action and auto_approve_multipliers:
            should_auto_execute = True
        elif action.startswith("propose_") and "veto" in action and auto_approve_vetos:
            should_auto_execute = True

        if not should_auto_execute:
            decision["auto_executed"] = False
            executed.append(decision)
            continue

        # ── Veto-Schutz: Prüfe max_veto_percentage ──
        if action.startswith("propose_veto") or action == "approve":
            try:
                res = supabase.table("scout_rules").select("*").eq("rule_type", "veto").eq("status", "approved").execute()
                active_vetos = len(res.data or [])
                total_rules_res = supabase.table("scout_rules").select("id").execute()
                total_rules = len(total_rules_res.data or [])
                if total_rules > 0:
                    veto_pct = (active_vetos / total_rules) * 100
                    if veto_pct >= max_veto_pct:
                        decision["auto_executed"] = False
                        decision["skip_reason"] = f"Max Veto Percentage erreicht ({veto_pct:.0f}% >= {max_veto_pct}%)"
                        executed.append(decision)
                        continue
            except Exception:
                pass

        # ── Ausführung ──
        try:
            if action in ("deactivate", "reject") and decision.get("rule_id"):
                supabase.table("scout_rules").update({
                    "status": "rejected",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", decision["rule_id"]).execute()
                decision["auto_executed"] = True
                log(f"⚡ Auto-EXECUTED: {action.upper()} '{decision['description']}'")

            elif action == "reactivate" and decision.get("rule_id"):
                supabase.table("scout_rules").update({
                    "status": "approved",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", decision["rule_id"]).execute()
                decision["auto_executed"] = True
                log(f"⚡ Auto-EXECUTED: {action.upper()} '{decision['description']}'")

            elif action == "approve" and decision.get("rule_id"):
                supabase.table("scout_rules").update({
                    "status": "approved",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", decision["rule_id"]).execute()
                decision["auto_executed"] = True
                log(f"⚡ Auto-EXECUTED: {action.upper()} '{decision['description']}'")

            elif action.startswith("propose_"):
                conds = decision.get("conditions", {})
                rule_type = decision.get("rule_type", "veto")
                initial_status = "pending"  # Neue Regeln immer erst pending

                supabase.table("scout_rules").insert({
                    "rule_type": rule_type,
                    "description": decision.get("description", "Autopilot Vorschlag"),
                    "conditions": conds,
                    "confidence": 0.7,
                    "status": initial_status
                }).execute()
                decision["auto_executed"] = True
                decision["recommended_status"] = initial_status
                log(f"📝 Auto-PROPOSED ({initial_status}): {rule_type} — {decision['description']}")

            else:
                decision["auto_executed"] = False

        except Exception as e:
            log(f"❌ Execution Error: {e}")
            decision["auto_executed"] = False
            decision["execution_error"] = str(e)

        executed.append(decision)

    return executed


# ═══════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════

async def run_autopilot(
    rich_picks: List[Dict],
    analytics_text: str = ""
) -> Dict[str, Any]:
    """
    Hauptfunktion des Autopilot v2.0.
    Wird vom daily_analyst nach der Analyse aufgerufen.

    Returns dict mit:
      - enabled: bool
      - decisions: List[Dict]
      - executed_count: int
      - proposed_count: int
      - safety_status: str
    """
    log("🤖 Autopilot v2.0 starting...")

    # Config laden
    config = dict(DEFAULT_CONFIG)
    try:
        res = supabase.table("scout_rules").select("*").eq("description", "SYSTEM_AUTOPILOT").execute()
        if res.data:
            rule = res.data[0]
            conds = rule.get("conditions") or {}
            config.update({
                "max_veto_percentage": conds.get("max_veto_percentage", DEFAULT_CONFIG["max_veto_percentage"]),
                "drawdown_limit_units": conds.get("drawdown_limit_units", DEFAULT_CONFIG["drawdown_limit_units"]),
            })
    except Exception:
        pass

    # Safety Check
    is_safe, safety_msg = check_safety_guards(config)
    if not is_safe:
        log(f"🛑 Autopilot BLOCKED: {safety_msg}")
        return {
            "enabled": False,
            "decisions": [],
            "executed_count": 0,
            "proposed_count": 0,
            "safety_status": safety_msg
        }

    # Alle aktiven Regeln laden
    all_rules = []
    try:
        res = supabase.table("scout_rules").select("*").execute()
        all_rules = res.data or []
    except Exception as e:
        log(f"⚠️ Error loading rules: {e}")

    # Schicht 1: Deterministische Evaluation
    log("📊 Schicht 1: Deterministische Evaluation...")
    det_decisions = deterministic_evaluation(rich_picks, all_rules, config)
    log(f"  → {len(det_decisions)} deterministische Entscheidungen")

    # Schicht 2: LLM Deep Analysis
    log("🧠 Schicht 2: LLM Deep Analysis...")
    all_decisions = await llm_deep_analysis(rich_picks, det_decisions, analytics_text, config)
    log(f"  → {len(all_decisions)} finale Entscheidungen (det: {len(det_decisions)}, llm: {len(all_decisions) - len(det_decisions)})")

    # Schicht 3: Execution
    log("⚡ Schicht 3: Execution...")
    executed = execute_decisions(all_decisions, config)

    executed_count = sum(1 for d in executed if d.get("auto_executed"))
    proposed_count = sum(1 for d in executed if d.get("action_type", "").startswith("propose_") and d.get("auto_executed"))

    log(f"✅ Autopilot complete: {executed_count} executed, {proposed_count} proposed")

    return {
        "enabled": True,
        "decisions": executed,
        "executed_count": executed_count,
        "proposed_count": proposed_count,
        "safety_status": "OK"
    }


if __name__ == "__main__":
    import asyncio

    async def main():
        result = await run_autopilot([], "")
        print(json.dumps(result, indent=2, default=str))

    asyncio.run(main())