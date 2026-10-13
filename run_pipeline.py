"""
Master Data Pipeline for Matchup AI
Runs career stats scraping + Head-to-Head ball-by-ball aggregation.
"""

import sys
import os

# Add scraper directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scraper.scrape_career import scrape_players_list, KEY_PLAYERS
from scraper.fetch_matchups import download_and_extract_matchups

def main():
    print("=" * 60)
    print("🏏 MATCHUP AI — DATA PIPELINE")
    print("=" * 60)
    
    print("\n--- STEP 1: Building Head-to-Head Ball-by-Ball Database ---")
    matchups = download_and_extract_matchups(
        target_dir="data/raw_cricsheet",
        output_json="data/matchups.json"
    )
    print(f"✅ Extracted {len(matchups)} head-to-head battles!")

    print("\n--- STEP 2: Scraping Lifetime Career Stats (Cricbuzz) ---")
    players = scrape_players_list(
        KEY_PLAYERS,
        output_file="data/players_career.json"
    )
    print(f"✅ Scraped career stats for {len(players)} players!")

    print("\n" + "=" * 60)
    print("🎉 DATA PIPELINE COMPLETE! All datasets are ready in data/")
    print("=" * 60)

if __name__ == "__main__":
    main()
