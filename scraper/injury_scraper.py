#!/usr/bin/env python3
"""
Injury Intel Bot v2.0 — Player-Name Batch Search
Searches Twitter for ALL players in our database using OR-Operator batches.
"""
import asyncio
import os
import sys
import random
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

# ── Config ──────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
TWITTER_AUTH = os.getenv("TWITTER_AUTH_TOKEN")
TWITTER_CT0 = os.getenv("TWITTER_CT0")
BATCH_SIZE = 15  # Spieler pro Query
MAX_SEARCHES = 15  # Max Suchen pro Lauf (Rate Limit safe)
INJURY_KEYWORDS = ['MTO', 'medical timeout', 'withdrawal', 'injury', 'retired']

# ── Supabase ────────────────────────────────────────────────
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def load_player_surnames():
    """Load all player surnames from database."""
    try:
        resp = supabase.table('players').select('last_name').execute()
        surnames = []
        for p in resp.data:
            last = (p.get('last_name') or '').strip()
            if last and len(last) > 2:
                surnames.append(last)
        return list(set(surnames))  # deduplicate
    except Exception as e:
        print(f"⚠️ Could not load players: {e}")
        return []


def build_batch_queries(surnames, batch_size=BATCH_SIZE):
    """Build batched OR queries from player surnames."""
    queries = []
    # Shuffle to get variety each run
    random.shuffle(surnames)
    
    for i in range(0, len(surnames), batch_size):
        batch = surnames[i:i+batch_size]
        # Build OR query
        name_part = ' OR '.join(f'"{s}"' for s in batch)
        keyword_part = ' OR '.join(INJURY_KEYWORDS)
        query = f'({name_part}) ({keyword_part})'
        queries.append(query)
    
    return queries


async def search_twitter_batch(query, max_results=20):
    """Search Twitter using twscrape with a batch query."""
    try:
        from twscrape import API
        api = API()
        
        # Add account with cookies
        await api.pool.add_account(
            TWITTER_AUTH, TWITTER_CT0,
            'injury_bot', 'pass123'
        )
        await api.pool.login_all()
        
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
    """Always search @edgeAIapp tweets."""
    try:
        from twscrape import API
        api = API()
        await api.pool.add_account(TWITTER_AUTH, TWITTER_CT0, 'injury_bot', 'pass123')
        await api.pool.login_all()
        
        tweets = []
        async for tweet in api.search('from:edgeAIapp', limit=30):
            text_lower = tweet.rawContent.lower()
            if any(kw in text_lower for kw in ['injury', 'withdraw', 'mto', 'medical', 'retire']):
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
        print(f"  ❌ edgeAIapp search error: {e}")
        return []


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
            'source': 'twitter_batch_v2',
            'analyzed_at': datetime.now(timezone.utc).isoformat()
        }
        supabase.table('player_injury_intel').upsert(data, on_conflict='tweet_id').execute()
        return True
    except Exception as e:
        print(f"  ❌ DB save error: {e}")
        return False


def analyze_with_gpt(tweet_text, player_names):
    """Simple GPT analysis using OpenRouter."""
    import httpx
    
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return {
            'is_tennis_related': True,
            'is_injury_news': True,
            'credibility': 50,
            'severity': 'unknown',
            'summary': tweet_text[:200]
        }
    
    prompt = f"""Analyze this tennis tweet for injury/MTO intel.
Tweet: "{tweet_text}"

Known players in DB: {', '.join(player_names[:20])}

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
            json={
                'model': 'openai/gpt-4o-mini',
                'messages': [{'role': 'user', 'content': prompt}],
                'max_tokens': 300
            },
            timeout=30
        )
        content = resp.json()['choices'][0]['message']['content']
        # Extract JSON from response
        import json
        # Try to find JSON in the response
        start = content.find('{')
        end = content.rfind('}') + 1
        if start >= 0 and end > start:
            return json.loads(content[start:end])
    except Exception as e:
        print(f"  ⚠️ GPT error: {e}")
    
    return {
        'is_tennis_related': True,
        'is_injury_news': True,
        'credibility': 40,
        'severity': 'unknown',
        'summary': tweet_text[:200]
    }


async def run_scan():
    """Main scan: load players → batch search → analyze → save."""
    print(f"\n{'='*60}")
    print(f"🏥 INJURY INTEL SCAN v2.0 — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    
    # 1. Load player surnames
    surnames = load_player_surnames()
    print(f"📊 Loaded {len(surnames)} player surnames from DB")
    
    # 2. Build batch queries
    queries = build_batch_queries(surnames)
    print(f"📋 Built {len(queries)} batch queries ({BATCH_SIZE} players each)")
    
    # 3. Limit searches
    if len(queries) > MAX_SEARCHES:
        queries = random.sample(queries, MAX_SEARCHES)
        print(f"🎲 Randomly selected {MAX_SEARCHES} queries for this run")
    
    # 4. Search + analyze + save
    total_tweets = 0
    total_saved = 0
    
    for i, query in enumerate(queries):
        print(f"\n🔎 [{i+1}/{len(queries)}] Searching batch...")
        tweets = await search_twitter_batch(query, max_results=15)
        print(f"  📊 Found {len(tweets)} tweets")
        total_tweets += len(tweets)
        
        for tweet in tweets:
            analysis = analyze_with_gpt(tweet['text'], surnames)
            if analysis.get('is_injury_news') or analysis.get('is_mto'):
                if save_to_supabase(tweet, analysis):
                    total_saved += 1
                    player = analysis.get('player_name', '?')
                    print(f"  ✅ Saved: {player} ({analysis.get('injury_type', 'unknown')})")
        
        # Rate limit: small delay between batches
        await asyncio.sleep(random.uniform(2, 4))
    
    # 5. Also search @edgeAIapp
    print(f"\n🔎 Searching @edgeAIapp...")
    edge_tweets = await search_edgeaiapp()
    print(f"  📊 Found {len(edge_tweets)} edgeAIapp tweets")
    total_tweets += len(edge_tweets)
    
    for tweet in edge_tweets:
        analysis = analyze_with_gpt(tweet['text'], surnames)
        if save_to_supabase(tweet, analysis):
            total_saved += 1
            print(f"  ✅ Saved edgeAIapp tweet")
    
    print(f"\n{'='*60}")
    print(f"📊 SUMMARY")
    print(f"  Players in DB: {len(surnames)}")
    print(f"  Batch queries: {len(queries)}")
    print(f"  Total tweets: {total_tweets}")
    print(f"  Saved to DB: {total_saved}")
    print(f"{'='*60}")
    
    return total_saved


async def main():
    """Main loop with jittered intervals."""
    print("🏥 Injury Intel Bot v2.0 started")
    print(f"   Mode: {'--once' if '--once' in sys.argv else 'continuous'}")
    print(f"   Batch size: {BATCH_SIZE} players/query")
    print(f"   Max searches: {MAX_SEARCHES}/run")
    
    if '--once' in sys.argv:
        await run_scan()
        return
    
    # Continuous mode with jitter
    while True:
        try:
            await run_scan()
        except Exception as e:
            print(f"❌ Scan error: {e}")
        
        # Jitter: 22-55 minutes
        wait = random.uniform(22 * 60, 55 * 60)
        print(f"\n⏳ Next scan in {wait/60:.1f} minutes...")
        await asyncio.sleep(wait)


if __name__ == "__main__":
    asyncio.run(main())