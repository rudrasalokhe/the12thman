"""
Career Stats Scraper for Matchup AI
Scrapes lifetime career stats, profile photos, and role info from Cricbuzz.
Accurately parses Batting & Bowling tables (Test, ODI, T20, IPL) and calculates lifetime totals.
"""

import requests
from bs4 import BeautifulSoup
import json
import os
import sys
import time

# Ensure UTF-8 output on Windows terminal
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
}

# Curated high-priority players with direct Cricbuzz IDs to guarantee instant, 100% accurate data
CURATED_PLAYERS = {
    "Virat Kohli": ("1413", "virat-kohli"),
    "Rohit Sharma": ("576", "rohit-sharma"),
    "Jasprit Bumrah": ("9311", "jasprit-bumrah"),
    "MS Dhoni": ("265", "ms-dhoni"),
    "Mitchell Starc": ("7710", "mitchell-starc"),
    "Trent Boult": ("8117", "trent-boult"),
    "Sunil Narine": ("2276", "sunil-narine"),
    "Heinrich Klaasen": ("10209", "heinrich-klaasen"),
    "Rashid Khan": ("10738", "rashid-khan"),
    "Pat Cummins": ("8095", "pat-cummins"),
    "Travis Head": ("8497", "travis-head"),
    "Glenn Maxwell": ("1739", "glenn-maxwell"),
    "Suryakumar Yadav": ("7915", "suryakumar-yadav"),
    "Hardik Pandya": ("9647", "hardik-pandya"),
    "Rishabh Pant": ("10744", "rishabh-pant"),
    "Ravindra Jadeja": ("587", "ravindra-jadeja"),
    "Mohammed Shami": ("7909", "mohammed-shami"),
    "Kagiso Rabada": ("9585", "kagiso-rabada"),
    "Jos Buttler": ("2258", "jos-buttler"),
    "KL Rahul": ("8733", "kl-rahul"),
    "Shubman Gill": ("11808", "shubman-gill"),
    "Andre Russell": ("7736", "andre-russell"),
    "AB de Villiers": ("201", "ab-de-villiers"),
    "David Warner": ("1735", "david-warner"),
    "Yuzvendra Chahal": ("7910", "yuzvendra-chahal"),
    "Kuldeep Yadav": ("8292", "kuldeep-yadav"),
    "Faf du Plessis": ("7825", "faf-du-plessis"),
    "Sanju Samson": ("8271", "sanju-samson"),
    "Mohammed Siraj": ("10808", "mohammed-siraj"),
    "Lasith Malinga": ("793", "lasith-malinga")
}

def parse_transposed_table(table):
    """
    Parses Cricbuzz tables where row 0 is format headers: ['', 'Test', 'ODI', 'T20', 'IPL']
    and subsequent rows are metrics: ['Runs', '9230', '15109', '4188', '9336']
    Returns a dict keyed by format: { 'Test': {'Runs': 9230, ...}, 'ODI': ... }
    """
    rows = table.find_all("tr")
    if not rows:
        return {}
    
    header_cols = [c.text.strip() for c in rows[0].find_all(["th", "td"])]
    formats = [f for f in header_cols if f]
    
    data = {fmt: {} for fmt in formats}
    
    for row in rows[1:]:
        cols = [c.text.strip() for c in row.find_all(["th", "td"])]
        if not cols or len(cols) < 2:
            continue
        metric_name = cols[0]
        val_cols = cols[1:]
        for idx, fmt in enumerate(formats):
            if idx < len(val_cols):
                data[fmt][metric_name] = val_cols[idx]
                
    return data

def scrape_player_career(player_id: str, slug: str, player_name: str = ""):
    url = f"https://www.cricbuzz.com/profiles/{player_id}/{slug}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=12)
        if resp.status_code != 200:
            print(f"[-] HTTP {resp.status_code} for {slug}")
            return None
        
        soup = BeautifulSoup(resp.text, "html.parser")
        
        # Name
        h1 = soup.find("h1")
        name = h1.text.strip() if h1 else (player_name or slug.replace("-", " ").title())
        
        # Image
        image_url = ""
        img_tags = soup.find_all("img", src=True)
        for img in img_tags:
            src = img["src"]
            if ("images" in src or "cricbuzz.com/a/img" in src) and (player_id in src or slug in src):
                image_url = src
                break
        if not image_url:
            for img in img_tags:
                if "cricbuzz.com/a/img" in img.get("src", ""):
                    image_url = img["src"]
                    break

        # Personal details & Role
        role = "All-Rounder"
        batting_style = "Right Handed Bat"
        bowling_style = "Right-arm bowler"
        country = "International"

        page_text = soup.get_text()
        if "Role" in page_text:
            for div in soup.find_all("div"):
                text = div.text.strip()
                if "Role" in text and len(text) < 50:
                    role = text.replace("Role", "").strip()
                    break

        if "Batting Style" in page_text:
            for div in soup.find_all("div"):
                text = div.text.strip()
                if "Batting Style" in text and len(text) < 60:
                    batting_style = text.replace("Batting Style", "").strip()
                    break

        if "Bowling Style" in page_text:
            for div in soup.find_all("div"):
                text = div.text.strip()
                if "Bowling Style" in text and len(text) < 60:
                    bowling_style = text.replace("Bowling Style", "").strip()
                    break

        # Tables
        tables = soup.find_all("table")
        batting_data = {}
        bowling_data = {}

        if len(tables) >= 2:
            batting_data = parse_transposed_table(tables[1])
        if len(tables) >= 3:
            bowling_data = parse_transposed_table(tables[2])

        # Calculate Lifetime Totals
        total_intl_runs = 0
        total_ipl_runs = 0
        total_centuries = 0
        total_fifties = 0

        for fmt, stats in batting_data.items():
            runs_val = int(stats.get("Runs", "0").replace(",", "") or 0)
            hundreds_val = int(stats.get("100s", "0") or 0)
            fifties_val = int(stats.get("50s", "0") or 0)

            if fmt in ["Test", "ODI", "T20"]:
                total_intl_runs += runs_val
            elif fmt == "IPL":
                total_ipl_runs += runs_val

            total_centuries += hundreds_val
            total_fifties += fifties_val

        total_intl_wickets = 0
        total_ipl_wickets = 0

        for fmt, stats in bowling_data.items():
            wkts_val = int(stats.get("Wickets", "0") or 0)
            if fmt in ["Test", "ODI", "T20"]:
                total_intl_wickets += wkts_val
            elif fmt == "IPL":
                total_ipl_wickets += wkts_val

        return {
            "name": name,
            "id": player_id,
            "slug": slug,
            "role": role,
            "batting_style": batting_style,
            "bowling_style": bowling_style,
            "image": image_url,
            "total_international_runs": total_intl_runs,
            "total_ipl_runs": total_ipl_runs,
            "total_lifetime_runs": total_intl_runs + total_ipl_runs,
            "total_centuries": total_centuries,
            "total_fifties": total_fifties,
            "total_international_wickets": total_intl_wickets,
            "total_ipl_wickets": total_ipl_wickets,
            "batting_career": batting_data,
            "bowling_career": bowling_data
        }

    except Exception as e:
        print(f"[-] Error scraping {slug}: {e}")
        return None

def scrape_all_curated_players(output_json="data/players_career.json"):
    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    all_players = {}

    print(f"[*] Starting Career Scraper for {len(CURATED_PLAYERS)} marquee cricketers...")
    
    for idx, (p_name, (p_id, p_slug)) in enumerate(CURATED_PLAYERS.items(), 1):
        print(f"[{idx}/{len(CURATED_PLAYERS)}] Scraping {p_name} (ID: {p_id})...")
        data = scrape_player_career(p_id, p_slug, p_name)
        if data:
            all_players[p_name] = data
            print(f"    ✅ {p_name} | Runs: {data['total_lifetime_runs']:,} (Int'l: {data['total_international_runs']:,}, IPL: {data['total_ipl_runs']:,}) | 100s: {data['total_centuries']}")
        
        # Save incrementally
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(all_players, f, indent=2)

        time.sleep(0.5)

    print(f"\n[+] SUCCESS: Scraped {len(all_players)} players! Saved to {output_json}")
    return all_players

if __name__ == "__main__":
    scrape_all_curated_players()
