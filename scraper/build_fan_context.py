"""
Fan Context Builder for Matchup AI
Extracts the two biggest missing pieces for live match fans:
1. Recent Form (Last 10 match scores, opposition, date, venue, 4s, 6s)
2. Stadium / Venue Record (Runs, Avg, SR, 50s, 100s at specific stadiums)
"""

import os
import sys
import zipfile
import io
import csv
import json

# Ensure project root in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scraper.fetch_matchups import normalize_name

CRICSHEET_ZIP = "data/raw_cricsheet/ipl_csv2.zip"
OUTPUT_JSON = "data/player_context.json"

def standardize_venue(venue_name: str) -> str:
    """Standardizes stadium names (e.g. M Chinnaswamy Stadium, Bengaluru -> M. Chinnaswamy Stadium)."""
    v = venue_name.strip()
    if "Chinnaswamy" in v:
        return "M. Chinnaswamy Stadium, Bengaluru"
    if "Wankhede" in v:
        return "Wankhede Stadium, Mumbai"
    if "Eden Gardens" in v:
        return "Eden Gardens, Kolkata"
    if "Narendra Modi" in v or "Motera" in v:
        return "Narendra Modi Stadium, Ahmedabad"
    if "Feroz Shah" in v or "Arun Jaitley" in v:
        return "Arun Jaitley Stadium, Delhi"
    if "MA Chidambaram" in v or "Chepauk" in v:
        return "MA Chidambaram Stadium (Chepauk), Chennai"
    if "Rajiv Gandhi" in v or "Uppal" in v:
        return "Rajiv Gandhi Stadium, Hyderabad"
    if "Dharamsala" in v or "Himachal Pradesh" in v:
        return "HPCA Stadium, Dharamshala"
    if "Punjab Cricket" in v or "Mohali" in v:
        return "PCA Stadium, Mohali"
    if "Sawai Mansingh" in v:
        return "Sawai Mansingh Stadium, Jaipur"
    if "BRSABV" in v or "Ekana" in v:
        return "BRSABV Ekana Stadium, Lucknow"
    return v

def build_fan_context():
    if not os.path.exists(CRICSHEET_ZIP):
        print(f"[-] Zip file not found at {CRICSHEET_ZIP}")
        return

    print("[*] Processing matches for Recent Form and Stadium Records...")

    # Data structures:
    # player_innings: { player_name: [ {match details}, ... ] }
    # player_venues: { player_name: { venue_name: { innings, runs, balls, outs, 50s, 100s } } }
    player_innings = {}
    player_venues = {}

    with zipfile.ZipFile(CRICSHEET_ZIP, 'r') as zf:
        file_list = [f for f in zf.namelist() if f.endswith('.csv') and not f.endswith('_info.csv') and f != 'all_matches.csv']

        for f_name in file_list:
            with zf.open(f_name) as f:
                reader = csv.DictReader(io.TextIOWrapper(f, encoding='utf-8'))
                
                # We aggregate by match
                match_date = ""
                raw_venue = ""
                batting_team = ""
                bowling_team = ""
                
                # batter_in_match: { batter: { runs, balls, fours, sixes, out, opposition } }
                match_batters = {}

                for row in reader:
                    if not match_date:
                        match_date = row.get("start_date", "")
                        raw_venue = row.get("venue", "")
                        batting_team = row.get("batting_team", "")
                        bowling_team = row.get("bowling_team", "")

                    raw_striker = row.get("striker") or row.get("batter", "")
                    if not raw_striker:
                        continue

                    striker = normalize_name(raw_striker)
                    current_batting_team = row.get("batting_team", "")
                    current_bowling_team = row.get("bowling_team", "")

                    if striker not in match_batters:
                        match_batters[striker] = {
                            "runs": 0,
                            "balls": 0,
                            "fours": 0,
                            "sixes": 0,
                            "out": False,
                            "opposition": current_bowling_team,
                            "date": match_date,
                            "venue": standardize_venue(raw_venue)
                        }

                    entry = match_batters[striker]

                    try:
                        runs_bat = int(row.get("runs_off_bat", 0) or 0)
                        wides_str = row.get("wides", "") or "0"
                        wides = int(wides_str) if wides_str.isdigit() else 0
                    except ValueError:
                        continue

                    if wides == 0:
                        entry["balls"] += 1
                    
                    entry["runs"] += runs_bat
                    if runs_bat == 4:
                        entry["fours"] += 1
                    elif runs_bat == 6:
                        entry["sixes"] += 1

                    player_dismissed = (row.get("player_dismissed") or "").strip()
                    if player_dismissed == raw_striker:
                        entry["out"] = True

                # Save match innings into player logs
                for player, stats in match_batters.items():
                    if stats["balls"] == 0:
                        continue
                    
                    if player not in player_innings:
                        player_innings[player] = []
                    
                    stats["strike_rate"] = round((stats["runs"] / stats["balls"]) * 100, 1) if stats["balls"] > 0 else 0.0
                    player_innings[player].append(stats)

                    # Update venue records
                    v = stats["venue"]
                    if player not in player_venues:
                        player_venues[player] = {}
                    if v not in player_venues[player]:
                        player_venues[player][v] = {
                            "innings": 0,
                            "runs": 0,
                            "balls": 0,
                            "outs": 0,
                            "fifties": 0,
                            "centuries": 0,
                            "highest": 0
                        }

                    v_entry = player_venues[player][v]
                    v_entry["innings"] += 1
                    v_entry["runs"] += stats["runs"]
                    v_entry["balls"] += stats["balls"]
                    if stats["out"]:
                        v_entry["outs"] += 1
                    if stats["runs"] > v_entry["highest"]:
                        v_entry["highest"] = stats["runs"]
                    if stats["runs"] >= 100:
                        v_entry["centuries"] += 1
                    elif stats["runs"] >= 50:
                        v_entry["fifties"] += 1

    # Now assemble final fan context
    fan_context = {}
    all_players = set(player_innings.keys())

    for player in all_players:
        # Sort recent innings newest first
        sorted_inns = sorted(player_innings[player], key=lambda x: x["date"], reverse=True)
        recent_10 = sorted_inns[:10]

        # Calculate recent form metrics (last 5 average & strike rate)
        last_5 = sorted_inns[:5]
        last_5_runs = sum(i["runs"] for i in last_5)
        last_5_balls = sum(i["balls"] for i in last_5)
        last_5_outs = sum(1 for i in last_5 if i["out"])
        recent_avg = round(last_5_runs / last_5_outs, 1) if last_5_outs > 0 else last_5_runs
        recent_sr = round((last_5_runs / last_5_balls) * 100, 1) if last_5_balls > 0 else 0.0

        # Calculate averages for venues
        venues_summary = {}
        for v_name, v_data in player_venues.get(player, {}).items():
            if v_data["innings"] >= 2:  # at least 2 innings at the ground
                v_avg = round(v_data["runs"] / v_data["outs"], 1) if v_data["outs"] > 0 else v_data["runs"]
                v_sr = round((v_data["runs"] / v_data["balls"]) * 100, 1) if v_data["balls"] > 0 else 0.0
                venues_summary[v_name] = {
                    "innings": v_data["innings"],
                    "runs": v_data["runs"],
                    "average": v_avg,
                    "strike_rate": v_sr,
                    "highest": v_data["highest"],
                    "fifties": v_data["fifties"],
                    "centuries": v_data["centuries"]
                }

        # Top 5 most played venues
        top_venues = dict(sorted(venues_summary.items(), key=lambda x: x[1]["runs"], reverse=True)[:6])

        fan_context[player] = {
            "player": player,
            "recent_form": {
                "last_5_scores": [f"{i['runs']}{'*' if not i['out'] else ''} ({i['balls']})" for i in last_5],
                "last_5_avg": recent_avg,
                "last_5_sr": recent_sr,
                "last_10_innings": recent_10
            },
            "venue_records": top_venues
        }

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(fan_context, f, indent=2)

    print(f"[+] Fan Context built for {len(fan_context)} players! Saved to {OUTPUT_JSON}")
    return fan_context

if __name__ == "__main__":
    build_fan_context()
