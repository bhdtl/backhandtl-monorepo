#!/usr/bin/env python3
"""
Injury Intel Bot — Twitter Scraping + GPT Analysis
Uses twscrape for free Twitter access, OpenRouter for GPT analysis.
Features randomized intervals (jitter) to appear human.
"""

import asyncio
import json
import os
import random
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(Path(__file__).parent.parent / ".env")

# --- CONFIG ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY")
TWITTER_AUTH = os.getenv("TWITTER_AUTH_TOKEN")
TWITTER_CT0 = os.getenv("TWITTER_CT0")

# Search queries (rotated randomly)
SEARCH_QUERIES = [
    "from:edgeAIapp injury",
    "from:edgeAIapp withdraw",
    "from:edgeAIapp retirement",
    "from:edgeAIapp medical",
    "tennis injury withdraw",
    "tennis player injury ATP",
    "tennis player injury WTA",
    "MTO tennis injury",
    "ATP withdrawal injury",
    "WTA withdrawal injury",
]

# Jitter config: min/max minutes between runs
JITTER_MIN = 25  # minimum minutes
JITTER_MAX = 55  # maximum minutes

# How many tweets to fetch per query
TWEETS_PER_QUERY = 20


def jitter_delay() -> float:
    """Random delay between JITTER_MIN and JITTER_MAX minutes."""
    minutes = random.uniform(JITTER_MIN, JITTER_MAX)
    print(f"  ⏰ Next scan in {minutes:.1f} minutes (jitter)")
    return minutes * 60


async def setup_twscrape():
    """Initialize twscrape API with cookies from .env."""
    from twscrape import API

    api = API()

    if not TWITTER_AUTH or not TWITTER_CT0:
        print("❌ Missing TWITTER_AUTH_TOKEN or TWITTER_CT0 in .env")
        sys.exit(1)

    # Add cookie-based account
    cookie_str = f"auth_token={TWITTER_AUTH}; ct0={TWITTER_CT0}"
    await api.pool.add_account_cookies("injury_bot", cookie_str)
    print("✅ twscrape initialized with cookies")
    return api


async def scrape_tweets(api, query: str, limit: int = TWEETS_PER_QUERY):
    """Search Twitter for tweets matching query."""
    from twscrape import gather

    tweets = []
    try:
        async for tweet in api.search(query, limit=limit):
            tweets.append({
                "id": str(tweet.id),
                "text": tweet.rawContent,
                "author": tweet.user.username,
                "author_name": tweet.user.displayname,
                "date": tweet.date.isoformat(),
                "url": f"https://x.com/{tweet.user.username}/status/{tweet.id}",
                "likes": tweet.likeCount,
                "retweets": tweet.retweetCount,
                "replies": tweet.replyCount,
            })
    except Exception as e:
        print(f"  ⚠️ Search error for '{query}': {e}")

    return tweets


async def analyze_tweet_with_gpt(tweet: dict) -> dict:
    """Use GPT to analyze if tweet is real tennis injury news."""
    prompt = f"""Du bist ein professioneller Tennis-Injury-Analyst. 
Analysiere diesen Tweet und antworte NUR mit validem JSON (kein Markdown, kein Code-Block).

Tweet: "{tweet['text']}"
Von: @{tweet['author']}
Datum: {tweet['date']}
Likes: {tweet['likes']} | Retweets: {tweet['retweets']}

Antworte mit diesem JSON-Format:
{{
  "is_tennis_related": true/false,
  "is_injury_news": true/false,
  "credibility": 0-100,
  "player_name": "Vollständiger Spielername oder null",
  "injury_type": "withdrawal/injury/medical/recovery/rumor/null",
  "severity": "minor/moderate/severe/unknown",
  "summary_kurz": "1-2 Satz Zusammenfassung auf Deutsch",
  "is_mto": true/false,
  "reasoning": "1 Satz warum可信/unglaubwürdig"
}}

Bewertungsregeln:
- Credibility 80-100: Offizielle Quellen, Tournament-Accounts, etablierte Journalisten
- Credibility 50-79: Sport-News-Accounts, aber keine primäre Quelle
- Credibility 20-49: Gerüchte, keine Bestätigung
- Credibility 0-19: Offensichtlich Fake/Clickbait/Unrelated
- is_mto: True wenn es sich um "Most Talked About" handelt (trending, aber nicht bestätigt)
- Spielername immer vollständig (Vor- + Nachname)"""

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "openai/gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 500,
                },
                timeout=30,
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]

            # Parse JSON from response
            # Handle cases where GPT wraps in ```json ... ```
            content = content.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            content = content.strip()

            return json.loads(content)
    except Exception as e:
        print(f"  ⚠️ GPT analysis failed: {e}")
        return {
            "is_tennis_related": False,
            "is_injury_news": False,
            "credibility": 0,
            "player_name": None,
            "injury_type": None,
            "severity": "unknown",
            "summary_kurz": "Analyse fehlgeschlagen",
            "is_mto": False,
            "reasoning": f"GPT Fehler: {str(e)[:100]}",
        }


def save_to_supabase(tweet: dict, analysis: dict):
    """Save analyzed tweet to Supabase."""
    import httpx as hx

    # Skip if not tennis-related
    if not analysis.get("is_tennis_related"):
        print(f"  ⏭️ Skipping (not tennis): {tweet['text'][:60]}...")
        return

    payload = {
        "tweet_id": tweet["id"],
        "tweet_text": tweet["text"],
        "tweet_author": tweet["author"],
        "tweet_url": tweet["url"],
        "tweet_date": tweet["date"],
        "is_tennis_related": analysis.get("is_tennis_related", False),
        "is_injury_news": analysis.get("is_injury_news", False),
        "credibility": analysis.get("credibility", 0),
        "player_name": analysis.get("player_name"),
        "injury_type": analysis.get("injury_type"),
        "severity": analysis.get("severity", "unknown"),
        "summary_kurz": analysis.get("summary_kurz", ""),
        "is_mto": analysis.get("is_mto", False),
        "reasoning": analysis.get("reasoning", ""),
        "source": "twitter",
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "likes": tweet.get("likes", 0),
        "retweets": tweet.get("retweets", 0),
    }

    try:
        resp = hx.post(
            f"{SUPABASE_URL}/rest/v1/player_injury_intel",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            json=payload,
            timeout=15,
        )

        if resp.status_code == 201 or resp.status_code == 204:
            cred = analysis.get("credibility", 0)
            player = analysis.get("player_name", "Unknown")
            inj_type = analysis.get("injury_type", "unknown")
            print(f"  ✅ Saved: {player} ({inj_type}) - Credibility: {cred}%")
        elif resp.status_code == 409:
            print(f"  ⏭️ Duplicate: {tweet['text'][:50]}...")
        else:
            print(f"  ❌ Supabase error {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"  ❌ Save error: {e}")


async def run_scan():
    """Run a single scan cycle."""
    print(f"\n{'='*60}")
    print(f"🔍 INJURY INTEL SCAN — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")

    api = await setup_twscrape()

    # Pick 2-3 random queries to search (not all, to stay under radar)
    num_queries = random.randint(2, 3)
    selected_queries = random.sample(SEARCH_QUERIES, min(num_queries, len(SEARCH_QUERIES)))

    all_tweets = []

    for query in selected_queries:
        print(f"\n🔎 Searching: {query}")
        tweets = await scrape_tweets(api, query, limit=TWEETS_PER_QUERY)
        print(f"  📊 Found {len(tweets)} tweets")
        all_tweets.extend(tweets)
        # Small delay between queries
        await asyncio.sleep(random.uniform(2, 5))

    # Deduplicate by tweet ID
    seen_ids = set()
    unique_tweets = []
    for t in all_tweets:
        if t["id"] not in seen_ids:
            seen_ids.add(t["id"])
            unique_tweets.append(t)

    print(f"\n📊 Total unique tweets: {len(unique_tweets)}")

    # Analyze each tweet with GPT
    analyzed_count = 0
    saved_count = 0

    for tweet in unique_tweets:
        print(f"\n🤖 Analyzing: @{tweet['author']}: {tweet['text'][:80]}...")

        analysis = await analyze_tweet_with_gpt(tweet)
        analyzed_count += 1

        # Only save tennis-related tweets
        if analysis.get("is_tennis_related"):
            save_to_supabase(tweet, analysis)
            saved_count += 1
        else:
            print(f"  ⏭️ Not tennis-related, skipping")

        # Small delay between GPT calls
        await asyncio.sleep(random.uniform(1, 2))

    print(f"\n{'='*60}")
    print(f"✅ Scan complete: {analyzed_count} analyzed, {saved_count} saved")
    print(f"{'='*60}")

    return analyzed_count, saved_count


async def main():
    """Main loop with jittered intervals."""
    print("🏥 Injury Intel Bot started")
    print(f"  📡 Monitoring: edgeAIapp + general tennis injury terms")
    print(f"  ⏱️ Interval: {JITTER_MIN}-{JITTER_MAX} minutes (randomized)")
    print(f"  🤖 Analysis: GPT-4o-mini via OpenRouter")

    while True:
        try:
            await run_scan()
        except Exception as e:
            print(f"❌ Scan failed: {e}")

        # Jittered delay
        delay = jitter_delay()
        await asyncio.sleep(delay)


if __name__ == "__main__":
    # Allow single run with --once flag
    if "--once" in sys.argv:
        asyncio.run(run_scan())
    else:
        asyncio.run(main())