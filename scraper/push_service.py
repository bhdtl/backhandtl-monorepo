import os
import json
import argparse
from supabase import create_client, Client
from pywebpush import webpush, WebPushException

# Config
VAPID_PUBLIC_KEY = "BM_dk2077mt3YTvUPGOliX5NDezbvp0gjZyigyEy3G6Y8PMD3PqFSvWrc-XL4z7ZjTWMEcHXzzkozVXEG1IwLug"
VAPID_CLAIMS = {
    "sub": "mailto:bh.dtl@web.de"
}

def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY/SUPABASE_SERVICE_ROLE_KEY env variables.")
    return create_client(url, key)

def send_web_push(subscription_info, data_to_send):
    private_key = os.environ.get("VAPID_PRIVATE_KEY")
    if not private_key:
        print("[WARN] VAPID_PRIVATE_KEY not set. Skipping push dispatch.")
        return False
        
    try:
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(data_to_send),
            vapid_private_key=private_key,
            vapid_claims=VAPID_CLAIMS.copy()
        )
        return True
    except WebPushException as ex:
        # If subscription is invalid (expired/blocked), we want to delete it
        if ex.response is not None and ex.response.status_code in [404, 410]:
            print(f"[CLEANUP] Subscription gone (Status {ex.response.status_code}). Marking for removal.")
            return "REMOVE"
        else:
            print(f"[ERROR] WebPush Exception: {ex}")
            return False
    except Exception as e:
        print(f"[ERROR] Unknown WebPush error: {e}")
        return False

def dispatch_pick_notifications(pick_details):
    """
    Dispatches push notifications for a new AI Pick.
    pick_details structure:
    {
        "player1_name": str,
        "player2_name": str,
        "pick_name": str,     # Name of the player or market selected
        "odds": float,
        "edge": float,        # e.g. 8.5
        "stake": float,       # e.g. 3.0
        "type": str,          # e.g. "HUNTER", "MAX BOMB"
        "tournament": str
    }
    """
    print(f"[INFO] Preparing notification dispatch for pick: {pick_details.get('pick_name')} in {pick_details.get('tournament')}")
    
    # Check if VAPID private key is available
    if not os.environ.get("VAPID_PRIVATE_KEY"):
        print("[WARN] VAPID_PRIVATE_KEY is missing in environment. Cannot dispatch notifications.")
        return

    try:
        supabase_client = get_supabase_client()
        res = supabase_client.table("push_subscriptions").select("*").execute()
        subscriptions = res.data if res else []
    except Exception as e:
        print(f"[ERROR] Failed to fetch push subscriptions: {e}")
        return

    if not subscriptions:
        print("[INFO] No active push subscriptions found.")
        return

    # Determine pick level characteristics
    is_potd = "BOMB" in str(pick_details.get("type", "")).upper() or pick_details.get("stake", 0) >= 4.0
    is_high_value = pick_details.get("edge", 0) >= 8.0 or pick_details.get("stake", 0) >= 3.0 or is_potd

    payload = {
        "title": f"🚨 NEUES SIGNAL: {pick_details.get('pick_name')}",
        "body": f"{pick_details.get('tournament')} | Quote: {pick_details.get('odds')} | Edge: {pick_details.get('edge')}% | Einsatz: {pick_details.get('stake')}u",
        "url": "/picks"
    }

    sent_count = 0
    removed_count = 0
    failed_count = 0

    for sub in subscriptions:
        push_level = sub.get("push_level", "high_value")
        user_id = sub.get("user_id")
        sub_info = sub.get("subscription")

        should_send = False
        if push_level == "all":
            should_send = True
        elif push_level == "high_value" and is_high_value:
            should_send = True
        elif push_level == "potd" and is_potd:
            should_send = True

        if should_send:
            res = send_web_push(sub_info, payload)
            if res is True:
                sent_count += 1
            elif res == "REMOVE":
                removed_count += 1
                # Delete invalid subscription from DB
                try:
                    supabase_client.table("push_subscriptions").delete().eq("user_id", user_id).execute()
                except Exception as del_err:
                    print(f"[WARN] Failed to delete expired subscription for {user_id}: {del_err}")
            else:
                failed_count += 1

    print(f"[INFO] Notification Run Finished: Sent: {sent_count} | Removed Invalid: {removed_count} | Failed: {failed_count}")

def parse_pick_from_text(text: str):
    if not text:
        return None
        
    import re
    # Check standard format
    if "[" in text and "Edge:" in text:
        pattern = r"\[(.*?):\s*(.*?)\s*@\s*([\d.]+)\s*\|\s*Fair:\s*([\d.]+)\s*\|\s*Edge:\s*(-?[\d.]+)%(?:\s*\|\s*Stake:\s*([\d.]+)u)?\]"
        match = re.search(pattern, text)
        if match:
            raw_stake = float(match.group(6)) if match.group(6) else 0.0
            stake = max(0.0, min(5.0, raw_stake))
            stake = round(stake, 1)
            return {
                "type": match.group(1).strip(),
                "pick_name": match.group(2).strip(),
                "odds": float(match.group(3)),
                "fair_odds": float(match.group(4)),
                "edge": float(match.group(5)),
                "stake": stake
            }
            
    # Check legacy/alternative formats
    if "Stake:" in text:
        legacy_pattern = r"\[?(💎|🛡️|⚖️|💰|HUNTER).*?:\s*(.*?)\s*@\s*([\d.]+).*?Edge:\s*(-?[\d.]+)%.*?Stake:\s*([\d.]+)u"
        match = re.search(legacy_pattern, text)
        if match:
            raw_stake = float(match.group(5))
            stake = max(0.0, min(5.0, raw_stake))
            stake = round(stake, 1)
            return {
                "type": "LEGACY",
                "pick_name": match.group(2).strip(),
                "odds": float(match.group(3)),
                "edge": float(match.group(4)),
                "stake": stake
            }
            
    return None

def trigger_push_if_new_pick(data, db_match_id, is_insert):
    new_analysis = data.get("ai_analysis_text")
    if not new_analysis:
        return

    # Check if analysis changed or was not present
    is_new_pick = False
    if is_insert or not db_match_id:
        is_new_pick = True
    else:
        try:
            supabase_client = get_supabase_client()
            res_val = supabase_client.table("market_odds").select("ai_analysis_text").eq("id", db_match_id).execute()
            if res_val.data:
                existing_analysis = res_val.data[0].get("ai_analysis_text")
                if existing_analysis != new_analysis:
                    is_new_pick = True
            else:
                is_new_pick = True
        except Exception as e:
            # Fallback to true if check fails, but log it
            print(f"[WARN] Error checking existing analysis: {e}")
            is_new_pick = True

    if is_new_pick:
        pick = parse_pick_from_text(new_analysis)
        if pick and pick.get("stake", 0) > 0 and "VETO" not in pick.get("type", "") and "NOISE" not in pick.get("type", ""):
            # Enforce tournament detail in pick payload
            pick["tournament"] = data.get("tournament", "Unknown Tournament")
            # Run dispatch!
            dispatch_pick_notifications(pick)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Web Push Notification Service CLI")
    parser.add_argument("--test-run", action="store_true", help="Send a test notification to all subscribers")
    args = parser.parse_args()

    if args.test_run:
        print("[TEST] Running push notification test-run...")
        test_pick = {
            "player1_name": "Test Player A",
            "player2_name": "Test Player B",
            "pick_name": "Test Player A +1.5 Set",
            "odds": 1.95,
            "edge": 9.2,
            "stake": 3.5,
            "type": "MAX BOMB Test",
            "tournament": "Silicon Valley Open"
        }
        dispatch_pick_notifications(test_pick)
