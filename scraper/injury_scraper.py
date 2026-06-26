#!/usr/bin/env python3
"""
Injury Intel Bot v3.0 — Nitter RSS + Google News RSS + Keyword Filter
No Twitter API needed. No rate limits. No Cloudflare blocks.
"""
import asyncio
import os
import sys
import hashlib
import logging
import time
from datetime import datetime, timezone

import feedparser
from bs4 import BeautifulSoup
from supabase import create_client
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# ── Config ──────────────────────────────────────────────────
load_dotenv = __import__('dotenv').load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
CHECK_INTERVAL = 30  # minutes

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

logging.basicConfig(
    format="%(asctime)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
log = logging.getLogger(__name__)

# ── Keywords (EN + ES) ─────────────────────────────────────
KEYWORDS = [
    "injury", "injured", "withdrawal", "withdraws", "pulls out",
    "retires", "out of", "won't play", "unable to play", "scratch",
    "scratches", "muscle", "ankle", "wrist", "back injury", "hip",
    "knee", "illness", "sick", "doubtful", "late withdrawal", "MTO",
    "medical timeout", "medical", "retirement", "retired",
    "lesión", "lesionado", "lesionada", "baja", "retira", "abandona",
    "no jugará", "descartado", "descartada", "se baja", "fuera de",
    "dolor", "molestias", "se pierde", "no participará",
]

# ── Nitter RSS Sources (Twitter via Nitter) ─────────────────
NITTER_BASE = "https://nitter.privacydev.net"

JOURNALISTS = [
    {"user": "edgeAIapp", "name": "EdgeAI (Tennis Analytics)"},
    {"user": "josemorgado", "name": "José Morgado (ATP insider)"},
    {"user": "BenRothenberg", "name": "Ben Rothenberg (NYT Tennis)"},
    {"user": "Tumaini_C", "name": "Tumaini Carayol (The Guardian)"},
    {"user": "BastienFachan", "name": "Bastien Fachan (L'Equipe)"},
    {"user": "scambers73", "name": "Simon Cambers (Tennis journalist)"},
    {"user": "atptour", "name": "ATP Tour (official)"},
    {"user": "WTA", "name": "WTA (official)"},
]

# ── RSS News Sources ────────────────────────────────────────
RSS_SOURCES = [
    {
        "name": "Google News EN — Tennis Injury",
        "url": "https://news.google.com/rss/search?q=tennis+injury+withdrawal+ATP+WTA+2026&hl=en&gl=US&ceid=US:en",
        "tipo": "noticia",
    },
    {
        "name": "Google News ES — Tenis Lesión",
        "url": "https://news.google.com/rss/search?q=tenis+lesion+baja+retiro+ATP+WTA&hl=es&gl=ES&ceid=ES:es",
        "tipo": "noticia",
    },
    {
        "name": "Tennis Majors",
        "url": "https://www.tennismajors.com/feed",
        "tipo": "noticia",
    },
    {
        "name": "Reddit r/tennis",
        "url": "https://www.reddit.com/r/tennis/search.rss?q=injury+withdrawal&sort=new&restrict_sr=1",
        "tipo": "comunidad",
    },
]

# ── Date filter ─────────────────────────────────────────────
FECHA_INICIO = datetime(2026, 5, 28, tzinfo=timezone.utc)


# ── Helpers ─────────────────────────────────────────────────
def hash_noticia(titulo, link):
    return hashlib.md5(f"{titulo}{link}".encode()).hexdigest()


def contiene_keyword(texto):
    t = texto.lower()
    return any(kw.lower() in t for kw in KEYWORDS)


def limpiar_html(html):
    return BeautifulSoup(html, "html.parser").get_text(separator=" ").strip()[:300]


def es_reciente(entry):
    pp = entry.get("published_parsed")
    if not pp:
        return False
    try:
        dt = datetime.fromtimestamp(time.mktime(pp), tz=timezone.utc)
        return dt >= FECHA_INICIO
    except Exception:
        return False


def credibilidad(tipo, fuente):
    if "oficial" in fuente.lower() or "ATP Tour" in fuente or fuente == "WTA (official)":
        return "🔴 OFICIAL"
    if tipo == "periodista":
        return "🟠 PERIODISTA"
    if tipo == "comunidad":
        return "🟡 COMUNIDAD"
    return "🔵 NOTICIA"


def ya_existe(hash_id):
    """Check if news already exists in Supabase."""
    try:
        resp = supabase.table('player_injury_intel').select('tweet_id').eq('tweet_id', hash_id).execute()
        return len(resp.data) > 0
    except Exception:
        return False


def guardar_en_db(hash_id, titulo, resumen, fuente, link, fecha, tipo):
    """Save news to Supabase."""
    try:
        data = {
            'tweet_id': hash_id,
            'tweet_text': f"{titulo}\n\n{resumen}"[:2000],
            'tweet_author': fuente,
            'tweet_url': link,
            'tweet_date': fecha,
            'is_tennis_related': True,
            'is_injury_news': True,
            'credibility': 100 if "🔴" in credibilidad(tipo, fuente) else 70,
            'player_name': None,
            'injury_type': 'injury',
            'severity': 'unknown',
            'summary_kurz': titulo[:200],
            'is_mto': 'mto' in titulo.lower() or 'medical timeout' in titulo.lower(),
            'reasoning': f"Source: {fuente} | Type: {tipo}",
            'source': f'injury_bot_v3_{tipo}',
            'analyzed_at': datetime.now(timezone.utc).isoformat()
        }
        supabase.table('player_injury_intel').upsert(data, on_conflict='tweet_id').execute()
        return True
    except Exception as e:
        log.error(f"DB error: {e}")
        return False


# ── Scraping ────────────────────────────────────────────────
def parse_journalists():
    """Scrape journalists via Nitter RSS."""
    noticias = []
    for j in JOURNALISTS:
        url = f"{NITTER_BASE}/{j['user']}/rss"
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:10]:
                titulo = entry.get("title", "")
                resumen = limpiar_html(entry.get("summary", titulo))
                link = entry.get("link", "")
                fecha = entry.get("published", "")
                if not es_reciente(entry):
                    continue
                if not contiene_keyword(f"{titulo} {resumen}"):
                    continue
                noticias.append({
                    "titulo": titulo[:200], "resumen": resumen,
                    "link": link, "fecha": fecha,
                    "fuente": j["name"], "tipo": "periodista",
                })
            log.info(f"[X] @{j['user']} ✓")
        except Exception as e:
            log.error(f"[X] Error @{j['user']}: {e}")
    return noticias


def parse_rss():
    """Scrape RSS news sources."""
    noticias = []
    for s in RSS_SOURCES:
        try:
            feed = feedparser.parse(s["url"])
            for entry in feed.entries:
                titulo = entry.get("title", "")
                resumen = limpiar_html(entry.get("summary", ""))
                link = entry.get("link", "")
                fecha = entry.get("published", "")
                if not es_reciente(entry):
                    continue
                if not contiene_keyword(f"{titulo} {resumen}"):
                    continue
                noticias.append({
                    "titulo": titulo[:200], "resumen": resumen,
                    "link": link, "fecha": fecha,
                    "fuente": s["name"], "tipo": s["tipo"],
                })
            log.info(f"[RSS] {s['name']} ✓")
        except Exception as e:
            log.error(f"[RSS] Error {s['name']}: {e}")
    return noticias


# ── Main Job ────────────────────────────────────────────────
async def revisar():
    """Main scan job — runs every CHECK_INTERVAL minutes."""
    log.info("🔍 Revisando fuentes...")
    todas = parse_journalists() + parse_rss()

    orden = {"🔴 OFICIAL": 0, "🟠 PERIODISTA": 1, "🔵 NOTICIA": 2, "🟡 COMUNIDAD": 3}
    todas.sort(key=lambda x: orden.get(credibilidad(x["tipo"], x["fuente"]), 2))

    nuevas = 0
    for n in todas:
        h = hash_noticia(n["titulo"], n["link"])
        if ya_existe(h):
            continue
        nivel = credibilidad(n["tipo"], n["fuente"])
        if guardar_en_db(h, n["titulo"], n["resumen"], n["fuente"], n["link"], n["fecha"], n["tipo"]):
            nuevas += 1
            log.info(f"  ✅ {nivel} — {n['titulo'][:60]}...")
            await asyncio.sleep(1)

    log.info(f"{'📬 ' + str(nuevas) + ' alertas nuevas.' if nuevas else 'Sin novedades.'}")
    return nuevas


# ── Start ───────────────────────────────────────────────────
async def main():
    log.info("🏥 Injury Intel Bot v3.0 started")
    
    if '--once' in sys.argv:
        await revisar()
        return
    
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(revisar, "interval", minutes=CHECK_INTERVAL, next_run_time=datetime.now(timezone.utc))
    scheduler.start()
    
    log.info(f"✅ Bot running — checking every {CHECK_INTERVAL} min.")
    try:
        while True:
            await asyncio.sleep(3600)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()


if __name__ == "__main__":
    asyncio.run(main())