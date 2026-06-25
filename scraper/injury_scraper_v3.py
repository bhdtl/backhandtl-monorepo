#!/usr/bin/env python3
"""
Injury Intel Bot v3.0 — Twitter API v2 (Official)
Nutzt die offizielle Twitter API statt twscrape (kein Cloudflare Block).
"""
import asyncio
import os
import sys
import random
import json
import base64
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client
import httpx

load_dotenv()

# ── Config ──────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
TWITTER_BEARER = os.getenv("TWITTER_BEARER_TOKEN")  # Offizieller API Token
BATCH_SIZE = 15
MAX_SEARCHES = 15
INJURY_KEYWORDS = ['MTO', 'medical timeout', 'withdrawal', 'injury', 'retired', 'retires']

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

TWITTER_API = "https://api.twitter.com/2"


def load_player_surnames():
    """Load all player surnames from database."""
    try:
        resp = supabase.table('players').select('last_name').execute()
        surnames = []
        for p in resp.data:
            last = (p.get('last_name') or '').strip()
            if last and len(last) > 2:
                surnames.append(last)
        return list(set(surnames))
    except Exception as e:
        print(f"⚠️ Could not load players: {e}")
        return []


def build_batch_queries(surnames, batch_size=BATCH_SIZE):
    """Build batched OR queries."""
    queries = []
    random.shuffle(surnames)
    for i in range(0, len(surnames), batch_size):
        batch = surnames[i:i+batch_size]
        name_part = ' OR '.join(f'"{s}"' for s in batch)
        keyword_part = ' OR '.join(INJURY_KEYWORDS)
        queries.append(f'({name_part}) ({keyword_part})')
    return queries


def search_twitter_v2(query, max_results=20):
    """Search Twitter using official API v2."""
    if not TWITTER_BEARER:
        print("  ❌ No TWITTER_BEARER_TOKEN set")
        return []
    
    try:
        resp = httpx.get(
            f"{TWITTER_API}/tweets/search/recent",
            headers={"Authorization": f"Bearer {TWITTER_BEARER}"},
            params={
                "query": query,
                "max_results": min(max_results, 100),
                "tweet.fields": "created_at,public_metrics,author_id",
                "expansions": "author_id",
                "user.fields": "username"
            },
            timeout=30
        )
        
        if resp.status_code == 429:
            print(f"  ⚠️ Rate limited, waiting 60s...")
            import time; time.sleep(60)
            return []
        
        if resp.status_code != 200:
            print(f"  ❌ API error {resp.status_code}: {resp.text[:200]}")
            return []
        
        data = resp.json()
        tweets = data.get("data", [])
        
        # Build author lookup
        includes = data.get("includes", {})
        users = {u["id"]: u["username"] for u in includes.get("users", [])}
        
        results = []
        for t in tweets:
            author = users.get(t.get("author_id"), "unknown")
            metrics = t.get("public_metrics", {})
            results.append({
                "id": t["id"],
                "text": t["text"],
                "author": author,
                "date": t.get("created_at", datetime.now(timezone.utc).isoformat()),
                "likes": metrics.get("like_count", 0),
                "retweets": metrics.get("retweet_count", 0),
                "url": f"https://x.com/{author}/status/{t['id']}"
            })
        return results
    except Exception as e:
        print(f"  ❌ Search error: {e}")
        return []


def save_to_supabase(tweet, analysis):
    """Save to Supabase."""
    try:
        data = {
            "tweet_id": tweet["id"],
            "tweet_text": tweet["text"][:2000],
            "tweet_author": tweet["author"],
            "tweet_url": tweet["url"],
            "tweet_date": tweet["date"],
            "likes": tweet["likes"],
            "retweets": tweet["retweets"],
            "is_tennis_related": analysis.get("is_tennis_related", True),
            "is_injury_news": analysis.get("is_injury_news", False),
            "credibility": analysis.get("credibility", 50),
            "player_name": analysis.get("player_name"),
            "injury_type": analysis.get("injury_type"),
            "severity": analysis.get("severity", "unknown"),
            "summary_kurz": analysis.get("summary", ""),
            "is_mto": analysis.get("is_mto", False),
            "reasoning": analysis.get("reasoning", ""),
            "source": "twitter_api_v3",
            "analyzed_at": datetime.now(timezone.utc).isoformat()
        }
        supabase.table("player_injury_intel").upsert(data, on_conflict="tweet_id").execute()
        return True
    except Exception as e:
        print(f"  ❌ DB error: {e}")
        return False


def analyze_with_gpt(tweet_text, player_names):
    """GPT analysis."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return {"is_tennis_related": True, "is_injury_news": True, "credibility": 50, "summary": tweet_text[:200]}
    
    prompt = f"""Analyze this tennis tweet for injury/MTO intel.
Tweet: "{tweet_text}"
Return JSON: {{"is_tennis_related":bool,"is_injury_news":bool,"player_name":"name or null","injury_type":"injury|withdrawal|medical|recovery|rumor|null","severity":"minor|moderate|severe|unknown","is_mto":bool,"credibility":0-100,"summary":"1 sentence","reasoning":"brief"}}"""
    
    try:
        resp = httpx.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"model": "openai/gpt-4o-mini", "messages": [{"role": "user", "content": prompt}], "max_tokens": 200},
            timeout=30
        )
        content = resp.json()["choices"][0]["message"]["content"]
        start = content.find("{")
        end = content.rfind("}") + 1
        if start >= 0:
            return json.loads(content[start:end])
    except Exception as e:
        print(f"  ⚠️ GPT error: {e}")
    
    return {"is_tennis_related": True, "is_injury_news": True, "credibility": 40, "summary": tweet_text[:200]}


async def run_scan():
    """Main scan."""
    print(f"\n{'='*60}")
    print(f"🏥 INJURY INTEL SCAN v3.0 (API) — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    
    surnames = load_player_surnames()
    print(f"📊 Loaded {len(surnames)} player surnames")
    
    queries = build_batch_queries(surnames)
    if len(queries) > MAX_SEARCHES:
        queries = random.sample(queries, MAX_SEARCHES)
    
    total_tweets = 0
    total_saved = 0
    
    for i, query in enumerate(queries):
        print(f"\n🔎 [{i+1}/{len(queries)}] Searching...")
        tweets = search_twitter_v2(query, max_results=15)
        print(f"  📊 Found {len(tweets)} tweets")
        total_tweets += len(tweets)
        
        for tweet in tweets:
            analysis = analyze_with_gpt(tweet["text"], surnames)
            if analysis.get("is_injury_news") or analysis.get("is_mto"):
                if save_to_supabase(tweet, analysis):
                    total_saved += 1
                    print(f"  ✅ Saved: {analysis.get('player_name', '?')}")
        
        # Rate limit: Twitter API allows ~450 req/15min
        import time; time.sleep(2)
    
    # @edgeAIapp search
    print(f"\n🔎 Searching @edgeAIapp...")
    edge_tweets = search_twitter_v2("from:edgeAIapp (injury OR withdraw OR MTO OR medical)", max_results=30)
    print(f"  📊 Found {len(edge_tweets)} tweets")
    total_tweets += len(edge_tweets)
    
    for tweet in edge_tweets:
        analysis = analyze_with_gpt(tweet["text"], surnames)
        if save_to_supabase(tweet, analysis):
            total_saved += 1
    
    print(f"\n{'='*60}")
    print(f"📊 SUMMARY: {total_tweets} tweets, {total_saved} saved")
    print(f"{'='*60}")
    return total_saved


async def main():
    print("🏥 Injury Intel Bot v3.0 (Twitter API) started")
    if "--once" in sys.argv:
        await run_scan()
        return
    
    while True:
        try:
            await run_scan()
        except Exception as e:
            print(f"❌ Error: {e}")
        wait = random.uniform(22 * 60, 55 * 60)
        print(f"\n⏳ Next scan in {wait/60:.1f} min...")
        await asyncio.sleep(wait)


if __name__ == "__main__":
    asyncio.run(main())