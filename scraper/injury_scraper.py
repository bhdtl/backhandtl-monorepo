#!/usr/bin/env python3
"""
Injury Intel Bot v2.0 — @edgeAIapp + Player Name MTO Search
Uses a shared twscrape API instance for all searches.
"""
import asyncio
import os
import sys
import random
import json
import time
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

# ── Config ──────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
TWITTER_AUTH = os.getenv("TWITTER_AUTH_TOKEN")
TWITTER_CT0 = os.getenv("TWITTER_CT0")
PLAYER_SEARCH_KEYWORDS = ['MTO', 'medical timeout', 'injury', 'withdrawal']
MAX_PLAYERS_PER_RUN = 80

# ── Supabase ────────────────────────────────────────────────
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Shared twscrape API (created once) ──────────────────────
_api_instance = None

def get_api():
    """Get or create a shared twscrape API instance."""
    global _api_instance
    if _api_instance is None:
        from twscrape import API
        _api_instance = API()
        # Account will be added lazily on first search
    return _api_instance

_account_added = False

async def ensure_account():
    """Add account to the pool only once."""
    global _account_added
    if _account_added:
        return
    api = get_api()
    try:
        await api.pool.add_account_cookies(
            'injury_bot',
            f'auth_token={TWITTER_AUTH}; ct0={TWITTER_CT0}'
        )
        _account_added = True
    except Exception:
        _account_added = True  # Already exists, that's fine


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


async def search_twitter(query, max_results=20):
    """Search Twitter using the shared API instance."""
    try:
        api = get_api()
        await ensure_account()
        
        tweets = []
        async for tweet in api.search(query, limit=max_results):
            tweets.append({
                'id': str(tweet.id),
                'text': tweet.rawContent,
                'author': tweet.user.username,
                'date': tweet.date.isoformat(),
                'likes': tweet.likeCount,
                'retweets': tweet.retweetCount,
                'url': f"https://x.com/{tweet.user.username}/status/{tweet.id}"
            })
        return tweets
    except Exception as e:
        print(f"  ❌ Search error: {e}")
        return []


async def search_edgeaiapp():
    """Search @edgeAIapp for injury-related tweets."""
    try:
        tweets = await search_twitter('from:edgeAIapp', max_results=30)
        # Filter for injury keywords
        filtered = []
        for t in tweets:
            text_lower = t['text'].lower()
            if any(kw in text_lower for kw in ['injury', 'withdraw', 'mto', 'medical', 'retire']):
                filtered.append(t)
        return filtered
    except Exception as e:
        print(f"  ❌ edgeAIapp error: {e}")
        return []


def load_saved_tweet_ids():
    """Load all existing tweet IDs from DB (for bulk dedup)."""
    try:
        resp = supabase.table('player_injury_intel').select('tweet_id').execute()
        return {row['tweet_id'] for row in resp.data}
    except Exception:
        return set()


def save_to_supabase(tweet, analysis):
    """Save tweet + GPT analysis to Supabase."""
    try:
        data = {
            'tweet_id': tweet['id'],
            'tweet_text': tweet['text'][:2000],
            'tweet_author': tweet['author'],
            'tweet_url': tweet['url'],
            'tweet_date': tweet['date'],
            'likes': tweet['likes'],
            'retweets': tweet['retweets'],
            'is_tennis_related': analysis.get('is_tennis_related', True),
            'is_injury_news': analysis.get('is_injury_news', False),
            'credibility': analysis.get('credibility', 50),
            'player_name': analysis.get('player_name'),
            'injury_type': analysis.get('injury_type'),
            'severity': analysis.get('severity', 'unknown'),
            'summary_kurz': analysis.get('summary', ''),
            'is_mto': analysis.get('is_mto', False),
            'reasoning': analysis.get('reasoning', ''),
            'source': 'injury_bot_v2',
            'analyzed_at': datetime.now(timezone.utc).isoformat()
        }
        supabase.table('player_injury_intel').upsert(data, on_conflict='tweet_id').execute()
        return True
    except Exception as e:
        print(f"  ❌ DB error: {e}")
        return False


def analyze_with_gpt(tweet_text, player_names):
    """GPT analysis — checks if it's a TENNIS player and injury/MTO news."""
    import httpx
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return {'is_tennis_related': True, 'is_injury_news': True, 'credibility': 50, 'summary': tweet_text[:200]}
    
    prompt = f"""Analyze this tweet for TENNIS injury/MTO intel.

Tweet: "{tweet_text}"

Known tennis players in DB: {', '.join(player_names[:30])}

IMPORTANT: Only return is_tennis_related=true if this is about a TENNIS player (not boxing, table tennis, football, etc.)

Return JSON:
{{
  "is_tennis_related": true/false,
  "is_injury_news": true/false,
  "player_name": "detected player or null",
  "injury_type": "injury|withdrawal|medical|recovery|rumor|null",
  "severity": "minor|moderate|severe|unknown",
  "is_mto": true/false,
  "credibility": 0-100,
  "summary": "1 sentence summary",
  "reasoning": "brief reasoning"
}}"""

    try:
        resp = httpx.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers={'Authorization': f'Bearer {api_key}'},
            json={'model': 'openai/gpt-4o-mini', 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 300},
            timeout=30
        )
        content = resp.json()['choices'][0]['message']['content']
        start = content.find('{')
        end = content.rfind('}') + 1
        if start >= 0:
            return json.loads(content[start:end])
    except Exception as e:
        print(f"  ⚠️ GPT error: {e}")
    
    return {'is_tennis_related': True, 'is_injury_news': True, 'credibility': 40, 'summary': tweet_text[:200]}


async def run_scan():
    """Main scan: @edgeAIapp + player name searches."""
    print(f"\n{'='*60}")
    print(f"🏥 INJURY INTEL SCAN v2.0 — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    
    surnames = load_player_surnames()
    print(f"📊 Loaded {len(surnames)} player surnames")
    
    # Load ALL existing tweet IDs for bulk dedup
    saved_ids = load_saved_tweet_ids()
    print(f"📋 Loaded {len(saved_ids)} existing tweet IDs for dedup")
    
    # Only keep tweets from last 7 days
    cutoff_date = datetime.now(timezone.utc).timestamp() - (7 * 24 * 60 * 60)
    
    total_tweets = 0
    total_saved = 0
    total_skipped_old = 0
    total_skipped_dup = 0
    
    # ── 1. @edgeAIapp (trusted source) ──
    print(f"\n🔎 [1/2] Searching @edgeAIapp...")
    edge_tweets = await search_edgeaiapp()
    print(f"  📊 Found {len(edge_tweets)} relevant tweets")
    total_tweets += len(edge_tweets)
    
    for tweet in edge_tweets:
        # Bulk dedup check
        if tweet['id'] in saved_ids:
            total_skipped_dup += 1
            continue
        
        # Skip old tweets (>7 days)
        try:
            tweet_ts = datetime.fromisoformat(tweet['date'].replace('Z', '+00:00')).timestamp()
            if tweet_ts < cutoff_date:
                total_skipped_old += 1
                continue
        except Exception:
            pass
        
        total_tweets += 1
        analysis = analyze_with_gpt(tweet['text'], surnames)
        if analysis.get('is_injury_news') or analysis.get('is_mto'):
            if save_to_supabase(tweet, analysis):
                total_saved += 1
                player = analysis.get('player_name', '?')
                print(f"  ✅ Saved: {player} ({analysis.get('injury_type', 'unknown')})")
        else:
            print(f"  ⏭️ Skipped: {tweet['text'][:60]}...")
    
    # ── 2. Player name + MTO/medical timeout searches ──
    print(f"\n🔎 [2/2] Searching player names + MTO/medical timeout...")
    
    if len(surnames) > MAX_PLAYERS_PER_RUN:
        selected = random.sample(surnames, MAX_PLAYERS_PER_RUN)
    else:
        selected = surnames
    
    print(f"  📋 Selected {len(selected)} players for this run")
    
    for i, surname in enumerate(selected):
        for keyword in PLAYER_SEARCH_KEYWORDS:
            query = f'"{surname}" {keyword}'
            tweets = await search_twitter(query, max_results=5)
            
            for tweet in tweets:
                # Bulk dedup check
                if tweet['id'] in saved_ids:
                    total_skipped_dup += 1
                    continue
                
                # Skip old tweets (>7 days)
                try:
                    tweet_ts = datetime.fromisoformat(tweet['date'].replace('Z', '+00:00')).timestamp()
                    if tweet_ts < cutoff_date:
                        total_skipped_old += 1
                        continue
                except Exception:
                    pass
                
                total_tweets += 1
                analysis = analyze_with_gpt(tweet['text'], surnames)
                if analysis.get('is_tennis_related') and (analysis.get('is_injury_news') or analysis.get('is_mto')):
                    if save_to_supabase(tweet, analysis):
                        total_saved += 1
                        player = analysis.get('player_name', '?')
                        print(f"  ✅ Saved: {player} ({analysis.get('injury_type', 'unknown')})")
            
            time.sleep(1)  # Rate limit
        
        if (i + 1) % 10 == 0:
            print(f"  📊 Progress: {i+1}/{len(selected)} players searched")
    
    print(f"\n{'='*60}")
    print(f"📊 SUMMARY")
    print(f"  Players in DB: {len(surnames)}")
    print(f"  Players searched: {len(selected)}")
    print(f"  Total tweets found: {total_tweets}")
    print(f"  Saved to DB: {total_saved}")
    print(f"  Skipped (duplicates): {total_skipped_dup}")
    print(f"  Skipped (>7 days old): {total_skipped_old}")
    print(f"{'='*60}")
    
    return total_saved


async def main():
    print("🏥 Injury Intel Bot v2.0 started")
    if '--once' in sys.argv:
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