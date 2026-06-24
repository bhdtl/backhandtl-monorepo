"""
staking_rules.py — Neural Scout Syndicate Staking & Filter System v2.0
=====================================================================
Basierend auf 30-Tage Deep Pattern Mining Analyse (21.515 abgerechnete Bets).

UNIT SCALE: 0.0 – 5.0 units (0 = VETO/SKIP, 5 = MAX PLAY)

PROFITABLE SEGMENTS (aus historischer Analyse):
  ✅ Grass Handicap Favorit:              +46.0% ROI → 3.0–5.0u
  ✅ Micro Edge (alle Märkte, Kelly<0.5): +56.4% ROI → 2.0u
  ✅ Grass Underdog 2.00–3.00:            +5.8–8.5% ROI → 1.5–2.0u
  ✅ Clay Slam Favorit:                   +1.18% ROI → 1.5u
  ✅ Clay Moneyline, Edge<5%:             +5.4% ROI → 1.5u
  ✅ Big Dog (Odds ≥3.50) Moneyline:     +7.2% ROI → 1.5u

LOSING SEGMENTS (automatisch gefiltert):
  ❌ Clay/Hard Handicap Underdog:          -28% bis -62% ROI → SKIP
  ❌ Underdogs < 1.70 Moneyline:          -12.0% ROI → SKIP
  ❌ Underdogs > 5.00 (alle Märkte):      -27% bis -57% ROI → SKIP
  ❌ Favorites < 1.60 (nur wenn kein Edge): -12.0% ROI → SKIP
  ❌ MAX BOMB (Kelly > 2.5u):             -34.5% ROI → SKIP
  ❌ HIGH CONVICTION (Kelly 1.5–2.5u):    -26.5% ROI → Reduzieren
"""
import re
import math
from typing import Tuple, Dict, Any, Optional


# ═══════════════════════════════════════════════════════════════════════════
# SURFACE DETECTION
# ═══════════════════════════════════════════════════════════════════════════

GRASS_KEYWORDS = [
    "wimbledon", "eastbourne", "halle", "queens", "queen's", "mallorca",
    "hertogenbosch", "birmingham", "nottingham", "newport", "gaiba",
    "s-hertogenbosch", "rosmalen", "grass", "rasen"
]

CLAY_KEYWORDS = [
    "roland garros", "french open", "clay", "madrid", "barcelona", "rome",
    "monte carlo", "hamburg", "geneva", "lyon", "bucharest", "estoril",
    "gstaad", "marrakech", "umag", "bastad", "kitzbuhel", "palermo",
    "bogota", "cordoba", "buenos aires", "rio", "santiago", "houston",
    "sand", "terre", "erde", "tierra"
]

SLAM_KEYWORDS = [
    "australian open", "roland garros", "french open", "wimbledon", "us open"
]


def get_surface(tournament_name: str, ai_text: str = "") -> str:
    """Erkennt Belag aus Turniernamen oder KI-Text."""
    t = (tournament_name or "").lower()
    a = (ai_text or "")[:500].lower()
    if any(k in t for k in GRASS_KEYWORDS) or any(k in a for k in GRASS_KEYWORDS):
        return "grass"
    if any(k in t for k in CLAY_KEYWORDS) or any(k in a for k in CLAY_KEYWORDS):
        return "clay"
    return "hard"


def is_grand_slam(tournament_name: str) -> bool:
    t = (tournament_name or "").lower()
    return any(s in t for s in SLAM_KEYWORDS)


def is_challenger(tournament_name: str) -> bool:
    t = (tournament_name or "").lower()
    return "challenger" in t or "itf" in t


# ═══════════════════════════════════════════════════════════════════════════
# MARKET TYPE CLASSIFICATION
# ═══════════════════════════════════════════════════════════════════════════

def get_market_type(pick_name: str) -> str:
    """Klassifiziert den Markt-Typ aus dem Pick-Namen."""
    pn = (pick_name or "").lower()
    if "over " in pn or "under " in pn:
        return "TOTAL_OVER" if "over " in pn else "TOTAL_UNDER"
    if re.search(r'\+\s*\d', pn):
        return "HANDICAP_DOG"
    if re.search(r'-\s*\d', pn):
        return "HANDICAP_FAVE"
    return "MONEYLINE"


def get_hcap_line(pick_name: str) -> Optional[float]:
    """Extrahiert den Handicap-Wert."""
    m = re.search(r'([+-])\s*(\d+(?:\.\d+)?)', pick_name or "")
    if m:
        sign = 1.0 if m.group(1) == "+" else -1.0
        return sign * float(m.group(2))
    return None


def get_total_line(pick_name: str) -> Optional[float]:
    """Extrahiert die Over/Under Linie."""
    m = re.search(r'(?:over|under)\s+(\d+(?:\.\d+)?)', (pick_name or "").lower())
    return float(m.group(1)) if m else None


# ═══════════════════════════════════════════════════════════════════════════
# CORE FILTER — Was wird komplett übersprungen?
# ═══════════════════════════════════════════════════════════════════════════

def should_skip(
    pick_name: str,
    market_odds: float,
    surface: str,
    edge_pct: float,
    is_challenger_tourney: bool = False,
    is_slam: bool = False,
) -> Tuple[bool, str]:
    """
    Prüft ob ein Pick komplett übersprungen werden soll.
    Returns: (should_skip: bool, reason: str)
    """
    mkt = get_market_type(pick_name)

    # ═══ HARD FILTERS (keine Ausnahme) ═══

    # ❌ Clay/Hard Handicap Underdog → -28% bis -62% ROI (größter Cash Leak)
    if mkt == "HANDICAP_DOG" and surface in ("clay", "hard"):
        return True, f"SKIP: {surface.upper()}|HANDICAP_DOG — historisch -28% bis -62% ROI (größter Leak)"

    # ❌ Underdogs > 5.00 → systematisch Verluste (-27% bis -57%)
    if market_odds > 5.00:
        return True, f"SKIP: Odds {market_odds:.2f} > 5.00 — historisch -27% bis -57% ROI"

    # ❌ Underdogs < 1.70 als Moneyline → -12% ROI
    if mkt == "MONEYLINE" and market_odds < 1.70:
        return True, f"SKIP: Moneyline @ {market_odds:.2f} < 1.70 — historisch -12% ROI"

    # ❌ MAX BOMB (Kelly > 2.5u) → -34.5% ROI
    if edge_pct > 12.0:
        return True, f"SKIP: Edge {edge_pct:.1f}% > 12% — Fake Edge Trap (Brier Score Spike)"

    # ❌ Challenger Underdog mit schlechtem Surface Record → zu unsicher
    if is_challenger_tourney and mkt in ("HANDICAP_DOG", "TOTAL_UNDER") and market_odds > 2.50:
        return True, f"SKIP: Challenger Underdog @ {market_odds:.2f} — zu viel Rauschen"

    return False, ""


# ═══════════════════════════════════════════════════════════════════════════
# STAKE CALCULATION — 0.0 – 5.0 Unit Scale
# ═══════════════════════════════════════════════════════════════════════════

def calculate_stake(
    pick_name: str,
    market_odds: float,
    edge_pct: float,
    surface: str,
    kelly_raw: float,
    is_grand_slam: bool = False,
    is_challenger_tourney: bool = False,
    ai_conviction: float = 1.0,
    pattern_multiplier: float = 1.0,
) -> Tuple[float, str]:
    """
    Berechnet den finalen Stake auf einer 0.0–5.0 Unit Skala.

    Returns: (final_stake: float, tier_label: str)
    """
    mkt = get_market_type(pick_name)
    is_micro_edge = kelly_raw < 0.5
    is_grass = surface == "grass"
    is_clay = surface == "clay"
    is_grass_hc_fave = is_grass and mkt == "HANDICAP_FAVE"
    is_grass_underdog = is_grass and market_odds >= 2.00 and market_odds <= 3.00
    is_clay_slam_fave = is_clay and is_grand_slam and mkt == "MONEYLINE" and market_odds < 2.00
    is_big_dog = market_odds >= 3.50 and mkt == "MONEYLINE"
    is_clay_ml_low_edge = is_clay and mkt == "MONEYLINE" and edge_pct < 5.0

    # ═══ TIER 5: MAX PLAY (5.0u) ═══
    # Grass Handicap Fave + Micro Edge + Edge < 12%
    if is_grass_hc_fave and is_micro_edge and edge_pct < 12.0:
        return 5.0, "⚡ 5U MAX PLAY (Grass HCP Fave + Micro Edge)"

    # ═══ TIER 4: HIGH VALUE (4.0u) ═══
    # Grass Handicap Fave (solider Edge)
    if is_grass_hc_fave and edge_pct >= 4.0:
        return 4.0, "🔥 4U HIGH VALUE (Grass HCP Fave + Strong Edge)"

    # ═══ TIER 3: PREMIUM (3.0u) ═══
    # Grass Handicap Fave (alle Edge-Levels) — historisch +46% ROI
    if is_grass_hc_fave:
        return 3.0, "🎯 3U PREMIUM (Grass HCP Fave)"

    # Grass Underdog 2.00–3.00 + Micro Edge — historisch +5.8–8.5% ROI
    if is_grass_underdog and is_micro_edge:
        return 3.0, "🎯 3U PREMIUM (Grass Dog 2.00–3.00 + Micro Edge)"

    # ═══ TIER 2: SOLID VALUE (2.0u) ═══
    # Micro Edge (alle Märkte) — historisch +56.4% ROI
    if is_micro_edge:
        return 2.0, "🔬 2U SOLID (Micro Edge)"

    # Grass Underdog 2.00–3.00 (solider Edge)
    if is_grass_underdog:
        return 2.0, "🔬 2U SOLID (Grass Dog 2.00–3.00)"

    # Clay Slam Favorit — historisch +1.18% ROI (einziges profitables Fav-Segment)
    if is_clay_slam_fave:
        return 2.0, "🔬 2U SOLID (Clay Slam Favorit)"

    # ═══ TIER 1: STANDARD (1.5u) ═══
    # Big Dog 3.5+ Moneyline — historisch +7.2% ROI
    if is_big_dog:
        return 1.5, "🐕 1.5U STANDARD (Big Dog 3.5+)"

    # Clay Moneyline, Edge < 5% — historisch +5.4% ROI
    if is_clay_ml_low_edge:
        return 1.5, "🎾 1.5U STANDARD (Clay ML Low Edge)"

    # Clay Slam Favorit (solider Edge)
    if is_clay_slam_fave and edge_pct >= 4.0:
        return 1.5, "🎾 1.5U STANDARD (Clay Slam Fave)"

    # ═══ TIER 0: MICRO / SAFE (1.0u) ═══
    # Standard für alle anderen profitable Picks
    return 1.0, "🛡️ 1U STANDARD"


# ═══════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════

def apply_staking_rules(
    pick_name: str,
    market_odds: float,
    edge_pct: float,
    surface: str,
    kelly_raw: float,
    is_grand_slam: bool = False,
    is_challenger_tourney: bool = False,
    ai_conviction: float = 1.0,
    pattern_multiplier: float = 1.0,
) -> Dict[str, Any]:
    """
    Haupt-Entry-Point: Gibt finales Staking-Urteil zurück.

    Returns dict mit:
      - skip: bool
      - skip_reason: str
      - final_stake: float (0.0–5.0)
      - tier_label: str
      - market_type: str
    """
    mkt = get_market_type(pick_name)

    # Prüfe ob Skip
    skip, skip_reason = should_skip(
        pick_name, market_odds, surface, edge_pct,
        is_challenger_tourney=is_challenger_tourney,
        is_slam=is_grand_slam
    )
    if skip:
        return {
            "skip": True,
            "skip_reason": skip_reason,
            "final_stake": 0.0,
            "tier_label": "🚫 FILTERED",
            "market_type": mkt,
        }

    # AI Conviction Veto (wenn KI-Veto < 0.2)
    if ai_conviction <= 0.2:
        return {
            "skip": True,
            "skip_reason": f"SKIP: AI Veto (conviction={ai_conviction}) — schlechtes Matchup",
            "final_stake": 0.0,
            "tier_label": "🚫 AI VETO",
            "market_type": mkt,
        }

    # Berechne Stake
    final_stake, tier_label = calculate_stake(
        pick_name, market_odds, edge_pct, surface, kelly_raw,
        is_grand_slam=is_grand_slam,
        is_challenger_tourney=is_challenger_tourney,
        ai_conviction=ai_conviction,
        pattern_multiplier=pattern_multiplier,
    )

    # Wende Pattern-Multiplier an
    if pattern_multiplier != 1.0:
        final_stake = round(max(0.1, min(5.0, final_stake * pattern_multiplier)), 1)
        if pattern_multiplier < 0.7:
            tier_label += f" (×{pattern_multiplier:.2f} Pattern-Rabatt)"
        elif pattern_multiplier > 1.1:
            tier_label += f" (×{pattern_multiplier:.2f} Pattern-Boost)"

    # Wende AI Conviction an (nur bei < 1.0, da Veto bereits oben behandelt)
    if ai_conviction < 1.0:
        final_stake = round(max(0.1, min(5.0, final_stake * ai_conviction)), 1)
        tier_label += f" (×{ai_conviction:.2f} AI Conv.)"

    # Kelly-Größen-Begrenzung basierend auf Quoten
    if market_odds >= 3.00:
        final_stake = min(final_stake, 2.0)  # Max 2u für Underdogs 3.00+
    elif market_odds >= 2.00:
        final_stake = min(final_stake, 3.0)  # Max 3u für 2.00–3.00

    final_stake = round(max(0.1, min(5.0, final_stake)), 1)

    return {
        "skip": False,
        "skip_reason": "",
        "final_stake": final_stake,
        "tier_label": tier_label,
        "market_type": mkt,
    }