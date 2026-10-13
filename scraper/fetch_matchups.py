"""
Head-to-Head Ball-by-Ball Matchup Builder for Matchup AI
Downloads open ball-by-ball dataset (IPL) from Cricsheet,
processes every single delivery, and aggregates exact Batter vs. Bowler stats.
"""

import os
import zipfile
import io
import csv
import json
import urllib.request

CRICSHEET_IPL_URL = "https://cricsheet.org/downloads/ipl_csv2.zip"

# Common friendly name mappings for top marquee players
PLAYER_NAME_MAP = {
    "V Kohli": "Virat Kohli",
    "RG Sharma": "Rohit Sharma",
    "MS Dhoni": "MS Dhoni",
    "JJ Bumrah": "Jasprit Bumrah",
    "MA Starc": "Mitchell Starc",
    "TA Boult": "Trent Boult",
    "SP Narine": "Sunil Narine",
    "Rashid Khan": "Rashid Khan",
    "H Klaasen": "Heinrich Klaasen",
    "AB de Villiers": "AB de Villiers",
    "DA Warner": "David Warner",
    "S Dhawan": "Shikhar Dhawan",
    "KL Rahul": "KL Rahul",
    "SA Yadav": "Suryakumar Yadav",
    "HH Pandya": "Hardik Pandya",
    "RA Jadeja": "Ravindra Jadeja",
    "RR Pant": "Rishabh Pant",
    "AD Russell": "Andre Russell",
    "GJ Maxwell": "Glenn Maxwell",
    "CH Gayle": "Chris Gayle",
    "F du Plessis": "Faf du Plessis",
    "JC Buttler": "Jos Buttler",
    "SV Samson": "Sanju Samson",
    "Shubman Gill": "Shubman Gill",
    "B Kumar": "Bhuvneshwar Kumar",
    "YS Chahal": "Yuzvendra Chahal",
    "Kuldeep Yadav": "Kuldeep Yadav",
    "Mohammed Shami": "Mohammed Shami",
    "Mohammed Siraj": "Mohammed Siraj",
    "K Rabada": "Kagiso Rabada",
    "PJ Cummins": "Pat Cummins",
    "TM Head": "Travis Head",
    "AR Patel": "Axar Patel",
    "KH Pandya": "Krunal Pandya",
    "SL Malinga": "Lasith Malinga",
    "DJ Bravo": "Dwayne Bravo",
    "A Mishra": "Amit Mishra",
    "Harbhajan Singh": "Harbhajan Singh",
    "R Ashwin": "Ravichandran Ashwin",
    "Sandeep Sharma": "Sandeep Sharma",
    "UT Yadav": "Umesh Yadav",
    "CV Varun": "Varun Chakravarthy",
    "Arshdeep Singh": "Arshdeep Singh",
    "Ravi Bishnoi": "Ravi Bishnoi",
    "Ishan Kishan": "Ishan Kishan",
    "SS Iyer": "Shreyas Iyer",
    "SN Thakur": "Shardul Thakur",
    "HV Patel": "Harshal Patel",
    "Avesh Khan": "Avesh Khan",
    "T Natarajan": "T Natarajan",
    "MM Sharma": "Mohit Sharma"
}

def normalize_name(name: str) -> str:
    cleaned = name.strip()
    return PLAYER_NAME_MAP.get(cleaned, cleaned)

def download_and_extract_matchups(target_dir="data/raw_cricsheet", output_json="data/matchups.json"):
    os.makedirs(target_dir, exist_ok=True)
    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    
    zip_path = os.path.join(target_dir, "ipl_csv2.zip")
    
    # Download if not already present
    if not os.path.exists(zip_path):
        print(f"[*] Downloading ball-by-ball dataset from {CRICSHEET_IPL_URL}...")
        urllib.request.urlretrieve(CRICSHEET_IPL_URL, zip_path)
        print("[+] Download complete!")
    else:
        print("[*] Found existing ball-by-ball zip archive.")

    print("[*] Parsing ball-by-ball records from matches...")
    
    # Key: (batter, bowler) -> aggregated stats
    h2h_data = {}

    with zipfile.ZipFile(zip_path, 'r') as zf:
        file_list = [f for f in zf.namelist() if f.endswith('.csv') and not f.endswith('_info.csv') and f != 'all_matches.csv']
        print(f"[*] Processing {len(file_list)} matches...")

        for file_name in file_list:
            with zf.open(file_name) as f:
                reader = csv.DictReader(io.TextIOWrapper(f, encoding='utf-8'))
                for row in reader:
                    # In Cricsheet format, batter is 'striker' (or fallback 'batter')
                    raw_batter = row.get("striker") or row.get("batter", "")
                    raw_bowler = row.get("bowler", "")
                    
                    if not raw_batter or not raw_bowler:
                        continue
                    
                    batter = normalize_name(raw_batter)
                    bowler = normalize_name(raw_bowler)
                    
                    pair_key = f"{batter} vs {bowler}"
                    if pair_key not in h2h_data:
                        h2h_data[pair_key] = {
                            "batter": batter,
                            "bowler": bowler,
                            "raw_batter": raw_batter,
                            "raw_bowler": raw_bowler,
                            "runs": 0,
                            "balls": 0,
                            "dots": 0,
                            "fours": 0,
                            "sixes": 0,
                            "dismissals": 0,
                            "dismissal_types": [],
                            "phase": {
                                "powerplay": {"runs": 0, "balls": 0, "dismissals": 0, "dots": 0},
                                "middle": {"runs": 0, "balls": 0, "dismissals": 0, "dots": 0},
                                "death": {"runs": 0, "balls": 0, "dismissals": 0, "dots": 0}
                            }
                        }

                    entry = h2h_data[pair_key]
                    
                    try:
                        runs_bat = int(row.get("runs_off_bat", 0) or 0)
                        wides_str = row.get("wides", "") or "0"
                        wides = int(wides_str) if wides_str.isdigit() else 0
                        
                        ball_val = float(row.get("ball", 0) or 0)
                        over_num = int(ball_val)
                    except ValueError:
                        continue

                    # Over phase determination
                    if over_num < 6:
                        phase_name = "powerplay"
                    elif over_num < 16:
                        phase_name = "middle"
                    else:
                        phase_name = "death"

                    # Only count legal balls faced by striker (wides are not faced)
                    if wides == 0:
                        entry["balls"] += 1
                        entry["phase"][phase_name]["balls"] += 1
                        if runs_bat == 0:
                            entry["dots"] += 1
                            entry["phase"][phase_name]["dots"] += 1

                    entry["runs"] += runs_bat
                    entry["phase"][phase_name]["runs"] += runs_bat

                    if runs_bat == 4:
                        entry["fours"] += 1
                    elif runs_bat == 6:
                        entry["sixes"] += 1

                    # Check dismissal
                    wicket_type = (row.get("wicket_type") or "").strip().lower()
                    player_dismissed = (row.get("player_dismissed") or "").strip()

                    bowler_dismissals = ["bowled", "caught", "lbw", "stumped", "caught and bowled", "hit wicket"]
                    if player_dismissed == raw_batter and wicket_type in bowler_dismissals:
                        entry["dismissals"] += 1
                        entry["dismissal_types"].append(wicket_type)
                        entry["phase"][phase_name]["dismissals"] += 1

    # Final calculations: Strike Rates and Dot %
    filtered_h2h = {}
    for pair, stats in h2h_data.items():
        # Keep battles where at least 6 balls were bowled
        if stats["balls"] >= 6:
            balls = stats["balls"]
            runs = stats["runs"]
            stats["strike_rate"] = round((runs / balls) * 100, 2) if balls > 0 else 0.0
            stats["dot_percentage"] = round((stats["dots"] / balls) * 100, 1) if balls > 0 else 0.0
            
            for p in ["powerplay", "middle", "death"]:
                p_balls = stats["phase"][p]["balls"]
                p_runs = stats["phase"][p]["runs"]
                stats["phase"][p]["strike_rate"] = round((p_runs / p_balls) * 100, 2) if p_balls > 0 else 0.0

            filtered_h2h[pair] = stats

    print(f"[+] Computed {len(filtered_h2h)} distinct head-to-head battles!")
    
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(filtered_h2h, f, indent=2)

    print(f"[+] Saved matchups to {output_json}")
    return filtered_h2h

if __name__ == "__main__":
    download_and_extract_matchups()
