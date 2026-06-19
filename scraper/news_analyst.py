import os
import sys
import re
import json
import httpx
import argparse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from supabase import create_client, Client

sys.stdout.reconfigure(encoding='utf-8')

# Supabase and AI Credentials
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")

MODEL_NAME = 'meta-llama/llama-3.3-70b-instruct'

def log(msg: str):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [AI News Analyst] {msg}")

def get_supabase_client() -> Optional[Client]:
    if not SUPABASE_URL or not SUPABASE_KEY:
        log("WARNING: Supabase credentials missing.")
        return None
    return create_client(SUPABASE_URL, SUPABASE_KEY)

# Resilient RSS Downloader
def fetch_rss_feed(url: str) -> Optional[str]:
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        with httpx.Client(timeout=15.0, headers=headers, follow_redirects=True) as client:
            response = client.get(url)
            if response.status_code == 200:
                return response.text
            else:
                log(f"HTTP Error {response.status_code} fetching feed: {url}")
    except Exception as e:
        log(f"Connection error fetching feed {url}: {e}")
    return None

def parse_rss_xml(xml_content: str) -> List[Dict[str, str]]:
    items = []
    if not xml_content:
        return items
    content_stripped = xml_content.strip()
    if content_stripped.startswith("<!doctype") or content_stripped.startswith("<!DOCTYPE") or content_stripped.startswith("<html"):
        log("Feed content appears to be HTML instead of XML (likely a bot challenge or rate limit). Skipping parsing.")
        return items
    try:
        root = ET.fromstring(xml_content)
        # Handle namespaces if present
        channel = root.find("channel")
        if channel is None:
            return items
            
        for item_node in channel.findall("item"):
            title = item_node.find("title")
            link = item_node.find("link")
            desc = item_node.find("description")
            pub_date = item_node.find("pubDate")
            
            items.append({
                "title": title.text if title is not None else "",
                "link": link.text if link is not None else "",
                "description": desc.text if desc is not None else "",
                "pub_date": pub_date.text if pub_date is not None else ""
            })
    except Exception as e:
        log(f"Error parsing RSS XML: {e}")
    return items

def resolve_player(supabase_client: Client, player_name: str) -> Optional[str]:
    """
    Attempts to match a player name returned by AI to a player ID in the database.
    """
    if not supabase_client or not player_name or player_name.lower() in ["unknown", "none"]:
        return None
        
    try:
        # Fetch all players to perform fuzzy last name matching
        res = supabase_client.table("players").select("id, first_name, last_name").execute()
        if not res.data:
            return None
            
        name_clean = player_name.lower().strip()
        
        # 1. Exact match on full name
        for p in res.data:
            full_name = f"{p['first_name']} {p['last_name']}".lower()
            if name_clean == full_name or name_clean == p['last_name'].lower():
                return p['id']
                
        # 2. Fuzzy match: check if last name is in the string
        for p in res.data:
            last_name = p['last_name'].lower()
            if len(last_name) > 3 and last_name in name_clean:
                return p['id']
                
    except Exception as e:
        log(f"Error resolving player: {e}")
    return None

def analyze_article_content(title: str, description: str, source_type: str) -> Optional[Dict[str, Any]]:
    """
    Queries OpenRouter to analyze the article text and extract structured player insights.
    """
    if not OPENROUTER_API_KEY:
        log("WARNING: OPENROUTER_API_KEY missing. Cannot perform AI analysis.")
        return None
        
    prompt = f"""
    Analyze the following tennis update/news item and extract player-specific scouting intelligence.
    We are looking specifically for:
    1. Physical fitness, injuries, pain, or medical timeouts.
    2. Mental state, confidence, fatigue, or psychological stress.
    3. Player quotes or post-match interview insights (tactical comments about themselves, opponents, surfaces, or next matches).

    Source Type: {source_type}
    Title: {title}
    Description/Content: {description}

    You must output a JSON object with the following fields:
    - has_insight (boolean): True if this text contains valuable player injuries, fitness updates, or interview quotes. False if it is generic news (e.g., results only, schedules).
    - player_name (string): The full name of the primary player mentioned. If multiple, name the most important one.
    - headline (string): A short, punchy headline in English (max 60 chars) summarizing the insight.
    - summary (string): A concise 2-sentence summary in English explaining the situation (fitness, quotes, or injury).
    - key_takeaways (array of strings): 2 or 3 short bullet points (in English) highlighting the tactical impact.
    - sentiment (string): Must be one of: 'positive' (high fitness/confidence), 'neutral', 'negative' (minor pain/fatigue), or 'critical_injury' (retirements, major injury, surgery).

    Response MUST be valid JSON only. Do not include markdown formatting or backticks outside the JSON.
    """
    
    try:
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": MODEL_NAME,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1
        }
        
        with httpx.Client(timeout=30.0) as client:
            response = client.post("https://openrouter.ai/api/v1/chat/completions", json=payload, headers=headers)
            if response.status_code != 200:
                log(f"OpenRouter API error: {response.text}")
                return None
                
            res_json = response.json()
            raw_text = res_json['choices'][0]['message']['content'].strip()
            
            # Clean JSON codeblock wrapper if present
            if raw_text.startswith("```json"):
                raw_text = raw_text.replace("```json", "", 1)
            if raw_text.endswith("```"):
                raw_text = raw_text.rsplit("```", 1)[0]
                
            data = json.loads(raw_text.strip())
            return data
    except Exception as e:
        log(f"AI analysis failed: {e}")
    return None

def process_and_save_insight(supabase_client: Client, raw_item: Dict[str, str], source_type: str, source_name: str):
    """
    Analyzes, parses, and inserts a single insight into Supabase.
    """
    url = raw_item.get("link")
    title = raw_item.get("title")
    desc = raw_item.get("description", "")
    
    # 1. Check if URL already exists in database
    if supabase_client and url:
        try:
            exists = supabase_client.table("tennis_insights").select("id").eq("url", url).execute()
            if exists.data:
                # Already processed
                return
        except Exception as e:
            log(f"Error checking duplicate: {e}")
            
    # 2. Run AI Analysis
    insight_data = analyze_article_content(title, desc, source_type)
    if not insight_data or not insight_data.get("has_insight"):
        return
        
    log(f"💡 AI detected insight for player: {insight_data.get('player_name')} - Headline: {insight_data.get('headline')}")
    
    # 3. Resolve player ID
    player_id = None
    if supabase_client:
        player_id = resolve_player(supabase_client, insight_data.get("player_name"))
        if player_id:
            log(f"Linked player name '{insight_data.get('player_name')}' to UUID: {player_id}")
        else:
            log(f"Could not resolve player name '{insight_data.get('player_name')}' in database. Saving with player_id = NULL.")

    # 4. Format published date
    pub_date_str = raw_item.get("pub_date")
    published_at = datetime.now(timezone.utc).isoformat()
    if pub_date_str:
        try:
            # Parse standard RSS dates (e.g. "Fri, 19 Jun 2026 07:12:00 GMT")
            # Using simple parser fallback or just keep original
            published_at = datetime.strptime(pub_date_str[:25].strip(), "%a, %d %b %Y %H:%M:%S").replace(tzinfo=timezone.utc).isoformat()
        except:
            pass

    # 5. Insert into Supabase
    db_row = {
        "player_id": player_id,
        "source_type": source_type,
        "source_name": source_name,
        "url": url,
        "headline": insight_data.get("headline", "Tennis Intel Alert"),
        "summary": insight_data.get("summary", ""),
        "key_takeaways": insight_data.get("key_takeaways", []),
        "sentiment": insight_data.get("sentiment", "neutral"),
        "published_at": published_at
    }
    
    if supabase_client:
        try:
            res = supabase_client.table("tennis_insights").insert(db_row).execute()
            log(f"✅ Successfully saved insight in database: {insight_data.get('headline')}")
        except Exception as e:
            log(f"❌ Failed to save insight row: {e}")
    else:
        print("[DRY RUN] Would save to Supabase:", json.dumps(db_row, indent=2))

def run_news_crawler(test_run: bool = False):
    log("Starting Tennis Intelligence crawler...")
    supabase_client = None if test_run else get_supabase_client()
    
    # 1. Fetch upcoming players to monitor
    active_player_names = []
    if supabase_client:
        try:
            res = supabase_client.table("market_odds").select("player1_name, player2_name").is_("actual_winner_name", "null").execute()
            if res.data:
                for match in res.data:
                    active_player_names.append(match["player1_name"])
                    active_player_names.append(match["player2_name"])
                # Deduplicate and keep only last names for wider search scope
                active_player_names = list(set(active_player_names))
                log(f"Loaded {len(active_player_names)} players from upcoming matches to query Google News.")
        except Exception as e:
            log(f"Error fetching active matches players: {e}")
            
    # Fallback/Test list of players if database is empty or test_run
    if not active_player_names or test_run:
        active_player_names = ["Carlos Alcaraz", "Jannik Sinner", "Novak Djokovic", "Alexander Zverev", "Nick Kyrgios"]
        log(f"Using default player list for crawl: {active_player_names}")

    # 2. Monitor Twitter via Nitter RSS Bridge
    # List of public nitter instances to try (resilience)
    nitter_instances = [
        "https://nitter.net",
        "https://nitter.cz",
        "https://nitter.privacydev.net",
        "https://nitter.it"
    ]
    
    twitter_handles = ["edge_ai", "TennisInjuryLog"]
    for handle in twitter_handles:
        feed_content = None
        for instance in nitter_instances:
            feed_url = f"{instance}/{handle}/rss"
            log(f"Trying Twitter RSS feed: {feed_url}")
            feed_content = fetch_rss_feed(feed_url)
            if feed_content:
                log(f"Successfully fetched feed from {instance} for @{handle}!")
                break
                
        if feed_content:
            tweets = parse_rss_xml(feed_content)
            log(f"Parsed {len(tweets)} tweets for @{handle}")
            for tweet in tweets[:5]: # Process latest 5 tweets to keep it efficient
                process_and_save_insight(supabase_client, tweet, "twitter", f"@{handle}")
        else:
            log(f"Could not fetch Twitter RSS for @{handle} from any Nitter instance.")

    # 3. Monitor Google News RSS for Player Interviews & Injuries
    for player in active_player_names[:15]: # Crawl top 15 active players in this cron run to manage API/Rate limits
        # Extract last name
        last_name = player.split()[-1] if ' ' in player else player
        query = f'"{last_name}"+tennis+(injury|interview|fitness)'
        url = f"https://news.google.com/rss/search?q={query}+when:7d&hl=en&gl=US&ceid=US:en"
        
        log(f"Fetching Google News for player '{player}' (Query: {query})")
        news_xml = fetch_rss_feed(url)
        if news_xml:
            articles = parse_rss_xml(news_xml)
            log(f"Found {len(articles)} news articles for {player}")
            for art in articles[:3]: # Analyze top 3 articles per player
                process_and_save_insight(supabase_client, art, "news", "Google News")
        else:
            log(f"Failed to fetch news feed for {player}")

    log("Crawler run completed.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI Tennis Intelligence Crawler")
    parser.add_argument("--test-run", action="store_true", help="Run without writing to database")
    args = parser.parse_args()

    run_news_crawler(test_run=args.test_run)
