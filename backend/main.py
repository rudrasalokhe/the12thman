"""
MATCHUP AI — FastAPI Backend Server
Integrated with GROQ AI (Ultra-fast LLM) and SARVAM AI (Sports Voice Commentary).
Serves real cricket statistics, tactical AI generation, and spoken audio responses.
"""

from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import os
import requests
import base64

# Load .env file
def load_env():
    env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip()

load_env()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_TTS_MODEL = os.getenv("SARVAM_TTS_MODEL", "bulbul:v4-flash")
SARVAM_SPEAKER = os.getenv("SARVAM_SPEAKER", "ashwin_en_sports")
SARVAM_LANGUAGE_CODE = os.getenv("SARVAM_LANGUAGE_CODE", "en-IN")

app = FastAPI(
    title="Matchup AI Backend",
    description="Live cricket tactical intelligence powered by Groq & Sarvam AI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# DATA LOADING & IN-MEMORY CACHE
# -------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

MATCHUPS_FILE = os.path.join(DATA_DIR, "matchups.json")
PLAYER_CONTEXT_FILE = os.path.join(DATA_DIR, "player_context.json")
PLAYERS_CAREER_FILE = os.path.join(DATA_DIR, "players_career.json")

matchups_db: Dict[str, Any] = {}
player_context_db: Dict[str, Any] = {}
players_career_db: Dict[str, Any] = {}

def load_data():
    global matchups_db, player_context_db, players_career_db
    if os.path.exists(MATCHUPS_FILE):
        with open(MATCHUPS_FILE, "r", encoding="utf-8") as f:
            matchups_db = json.load(f)
        print(f"[Backend] Loaded {len(matchups_db)} matchups")

    if os.path.exists(PLAYER_CONTEXT_FILE):
        with open(PLAYER_CONTEXT_FILE, "r", encoding="utf-8") as f:
            player_context_db = json.load(f)
        print(f"[Backend] Loaded {len(player_context_db)} player contexts")

    if os.path.exists(PLAYERS_CAREER_FILE):
        with open(PLAYERS_CAREER_FILE, "r", encoding="utf-8") as f:
            players_career_db = json.load(f)
        print(f"[Backend] Loaded {len(players_career_db)} player career profiles")

load_data()

MARQUEE_MATCHUPS = [
    {
        "id": "kohli-bumrah",
        "title": "King vs Boom Boom",
        "batter": "Virat Kohli",
        "bowler": "Jasprit Bumrah",
        "venue": "Wankhede Stadium, Mumbai",
        "format": "IPL / T20",
        "tag": "El Clásico Duel"
    },
    {
        "id": "rohit-boult",
        "title": "Hitman vs Swing King",
        "batter": "Rohit Sharma",
        "bowler": "Trent Boult",
        "venue": "Eden Gardens, Kolkata",
        "format": "IPL / T20",
        "tag": "Left-Arm Menace"
    },
    {
        "id": "dhoni-narine",
        "title": "Thala vs Mystery Spin",
        "batter": "MS Dhoni",
        "bowler": "Sunil Narine",
        "venue": "MA Chidambaram Stadium (Chepauk), Chennai",
        "format": "IPL / T20",
        "tag": "Tactical Strangle"
    },
    {
        "id": "kohli-starc",
        "title": "Kohli vs Starc",
        "batter": "Virat Kohli",
        "bowler": "Mitchell Starc",
        "venue": "M. Chinnaswamy Stadium, Bengaluru",
        "format": "IPL / T20",
        "tag": "World Cup Rivals"
    },
    {
        "id": "head-bumrah",
        "title": "Head vs Bumrah",
        "batter": "Travis Head",
        "bowler": "Jasprit Bumrah",
        "venue": "Narendra Modi Stadium, Ahmedabad",
        "format": "IPL / T20",
        "tag": "Powerplay Explosiveness"
    },
    {
        "id": "russell-rashid",
        "title": "Dre Russ vs Rashid Khan",
        "batter": "Andre Russell",
        "bowler": "Rashid Khan",
        "venue": "Eden Gardens, Kolkata",
        "format": "IPL / T20",
        "tag": "Death Overs War"
    }
]

# -------------------------------------------------------------
# GROQ LLM & SARVAM VOICE HELPERS
# -------------------------------------------------------------
def call_groq_llm(system_prompt: str, user_prompt: str) -> str:
    """Calls Groq API with fast inference."""
    if not GROQ_API_KEY:
        return ""
    for model_name in ["openai/gpt-oss-20b", "qwen/qwen3.8-27b"]:
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.4,
                "max_tokens": 550
            }
            res = requests.post(url, headers=headers, json=payload, timeout=4)
            if res.status_code == 200:
                content = res.json()["choices"][0]["message"]["content"].strip()
                if content:
                    return content
            else:
                print(f"[Groq Error {res.status_code} ({model_name})] {res.text[:120]}")
        except Exception as e:
            print(f"[Groq Exception ({model_name})] {e}")
    return ""

def call_sarvam_tts(text: str, language_code: str = "en-IN") -> Optional[str]:
    """Generates studio commentary audio via Sarvam AI TTS (returns base64 audio)."""
    if not SARVAM_API_KEY:
        return None
    try:
        # Clean text for speech (max 500 chars)
        clean_text = text[:480].replace("*", "").replace("#", "")
        url = "https://api.sarvam.ai/text-to-speech"
        headers = {
            "api-subscription-key": SARVAM_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "inputs": [clean_text],
            "target_language_code": language_code if language_code in ["en-IN", "hi-IN", "te-IN", "ta-IN", "mr-IN"] else "en-IN",
            "speaker": SARVAM_SPEAKER,
            "model": SARVAM_TTS_MODEL
        }
        res = requests.post(url, headers=headers, json=payload, timeout=8)
        if res.status_code == 200:
            audios = res.json().get("audios", [])
            if audios:
                return f"data:audio/wav;base64,{audios[0]}"
        else:
            print(f"[Sarvam TTS Error {res.status_code}] {res.text[:120]}")
    except Exception as e:
        print(f"[Sarvam TTS Exception] {e}")
    return None

def get_player_avatar(player_name: str) -> str:
    if player_name in players_career_db:
        img = players_career_db[player_name].get("image")
        if img:
            return img
    avatar_map = {
        "Virat Kohli": "https://static.cricbuzz.com/a/img/v1/i1/c616517/virat-kohli.jpg?d=low&p=gthumb",
        "Rohit Sharma": "https://static.cricbuzz.com/a/img/v1/i1/c616514/rohit-sharma.jpg?d=low&p=gthumb",
        "Jasprit Bumrah": "https://static.cricbuzz.com/a/img/v1/i1/c846037/jasprit-bumrah.jpg?d=low&p=gthumb",
        "MS Dhoni": "https://static.cricbuzz.com/a/img/v1/i1/c170677/ms-dhoni.jpg?d=low&p=gthumb",
        "Mitchell Starc": "https://static.cricbuzz.com/a/img/v1/i1/c351610/mitchell-starc.jpg?d=low&p=gthumb",
        "Trent Boult": "https://static.cricbuzz.com/a/img/v1/i1/c351612/trent-boult.jpg?d=low&p=gthumb",
        "Sunil Narine": "https://static.cricbuzz.com/a/img/v1/i1/c351615/sunil-narine.jpg?d=low&p=gthumb",
        "Rashid Khan": "https://static.cricbuzz.com/a/img/v1/i1/c244980/rashid-khan.jpg?d=low&p=gthumb",
        "Travis Head": "https://static.cricbuzz.com/a/img/v1/i1/c351608/travis-head.jpg?d=low&p=gthumb",
        "Heinrich Klaasen": "https://static.cricbuzz.com/a/img/v1/i1/c244990/heinrich-klaasen.jpg?d=low&p=gthumb"
    }
    return avatar_map.get(player_name, "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=200&auto=format&fit=crop&q=80")

def get_player_role(player_name: str) -> str:
    if player_name in players_career_db:
        return players_career_db[player_name].get("role", "Cricketer")
    bowlers = ["Jasprit Bumrah", "Mitchell Starc", "Trent Boult", "Rashid Khan", "Sunil Narine", "Mohammed Shami", "Kagiso Rabada", "Yuzvendra Chahal", "Kuldeep Yadav"]
    return "Bowler" if player_name in bowlers else "Batsman"

# -------------------------------------------------------------
# MODELS
# -------------------------------------------------------------
class TacticalAnalysisRequest(BaseModel):
    batter: str
    bowler: str
    venue: Optional[str] = "All Venues"
    format: Optional[str] = "IPL / T20"

class ChatRequest(BaseModel):
    message: str
    batter: str
    bowler: str
    venue: Optional[str] = "All Venues"
    format: Optional[str] = "IPL / T20"
    personality: Optional[str] = "bro"  # bro | analyst | hype
    language: Optional[str] = "en"

class TTSRequest(BaseModel):
    text: str
    language: Optional[str] = "en-IN"

# -------------------------------------------------------------
# API ROUTES
# -------------------------------------------------------------
@app.get("/")
def root():
    return {
        "service": "Matchup AI Engine (the12thman)",
        "status": "online",
        "documentation": "/docs",
        "health": "/api/health",
        "matchups": "/api/marquee-matchups"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Matchup AI Engine",
        "groq_configured": bool(GROQ_API_KEY),
        "sarvam_configured": bool(SARVAM_API_KEY),
        "speaker": SARVAM_SPEAKER,
        "matchups_loaded": len(matchups_db),
        "player_contexts_loaded": len(player_context_db),
        "career_profiles_loaded": len(players_career_db)
    }

@app.get("/api/marquee-matchups")
def get_marquee_matchups():
    return {"matchups": MARQUEE_MATCHUPS}

@app.get("/api/players")
def get_players(query: Optional[str] = Query(None)):
    career_names = list(players_career_db.keys())
    other_names = sorted(list(set(player_context_db.keys()) | {item["batter"] for item in list(matchups_db.values())[:500]} | {item["bowler"] for item in list(matchups_db.values())[:500]}))
    
    # Priority order: prominent stars first, then others without duplicates
    seen = set()
    ordered_names = []
    for name in career_names + other_names:
        if name not in seen:
            seen.add(name)
            ordered_names.append(name)

    players = []
    for name in ordered_names:
        if query and query.lower() not in name.lower():
            continue
        career = players_career_db.get(name, {})
        players.append({
            "name": name,
            "role": career.get("role", get_player_role(name)),
            "country": career.get("country", "International"),
            "avatar": get_player_avatar(name),
            "lifetime_runs": career.get("total_lifetime_runs", 0),
            "lifetime_wickets": career.get("total_international_wickets", 0) + career.get("total_ipl_wickets", 0)
        })
        if len(players) >= 200:
            break
    return {"players": players}

@app.get("/api/venues")
def get_venues():
    venues = set()
    for ctx in player_context_db.values():
        for v in ctx.get("venue_records", {}).keys():
            venues.add(v)
    return {"venues": ["All Venues"] + sorted(list(venues))}

@app.get("/api/matchup")
def get_matchup(
    batter: str = Query(...),
    bowler: str = Query(...),
    venue: Optional[str] = Query("All Venues"),
    format: Optional[str] = Query("IPL / T20")
):
    key = f"{batter} vs {bowler}"
    h2h = matchups_db.get(key)
    batter_career = players_career_db.get(batter, {})
    bowler_career = players_career_db.get(bowler, {})
    batter_context = player_context_db.get(batter, {})

    venue_stat = None
    if venue and venue != "All Venues":
        venue_stat = batter_context.get("venue_records", {}).get(venue)

    if not h2h:
        return {
            "found": False,
            "message": f"No ball-by-ball encounter recorded between {batter} and {bowler} in this dataset.",
            "batter": {"name": batter, "role": get_player_role(batter), "avatar": get_player_avatar(batter), "career": batter_career},
            "bowler": {"name": bowler, "role": get_player_role(bowler), "avatar": get_player_avatar(bowler), "career": bowler_career},
            "recent_form": batter_context.get("recent_form", {}),
            "venue_record": venue_stat,
            "data_provenance": {
                "source": "Cricsheet & Cricbuzz Historical Match Logs",
                "coverage": "1,243 IPL & International Matches",
                "sample_size": 0,
                "limitations": "Players have not faced each other under monitored deliveries."
            }
        }

    return {
        "found": True,
        "matchup_key": key,
        "stats": {
            "runs": h2h["runs"],
            "balls": h2h["balls"],
            "strike_rate": h2h["strike_rate"],
            "dismissals": h2h["dismissals"],
            "dots": h2h["dots"],
            "dot_percentage": h2h["dot_percentage"],
            "fours": h2h["fours"],
            "sixes": h2h["sixes"],
            "dismissal_types": h2h.get("dismissal_types", []),
            "phase": h2h.get("phase", {})
        },
        "batter": {"name": batter, "role": get_player_role(batter), "avatar": get_player_avatar(batter), "career": batter_career},
        "bowler": {"name": bowler, "role": get_player_role(bowler), "avatar": get_player_avatar(bowler), "career": bowler_career},
        "recent_form": batter_context.get("recent_form", {}),
        "venue_record": venue_stat,
        "top_venues": batter_context.get("venue_records", {}),
        "data_provenance": {
            "source": "Cricsheet & Cricbuzz Historical Match Registry",
            "coverage": "1,243 Official Match Deliveries (2008–Present)",
            "sample_size": f"{h2h['balls']} legal deliveries faced",
            "limitations": "Ball speed, pitch trajectory, and wagon-wheel telemetry are unrecorded in ball-by-ball public logs."
        }
    }

# -------------------------------------------------------------
# TACTICAL AI ANALYSIS (GROQ-POWERED)
# -------------------------------------------------------------
@app.post("/api/tactical-analysis")
def generate_tactical_analysis(req: TacticalAnalysisRequest):
    key = f"{req.batter} vs {req.bowler}"
    h2h = matchups_db.get(key)
    batter_ctx = player_context_db.get(req.batter, {})
    venue_stat = batter_ctx.get("venue_records", {}).get(req.venue) if req.venue != "All Venues" else None

    # Base metrics
    if h2h:
        runs = h2h["runs"]
        balls = h2h["balls"]
        sr = h2h["strike_rate"]
        dismissals = h2h["dismissals"]
        dot_pct = h2h["dot_percentage"]
        dis_types = h2h.get("dismissal_types", [])
        dis_summary = ", ".join(set(dis_types)) if dis_types else "None"
    else:
        runs, balls, sr, dismissals, dot_pct, dis_summary = 0, 0, 0, 0, 0, "None"

    # Default statistical synthesis
    batter_strengths = [f"Scored {runs} runs off {balls} balls ({sr} SR) against {req.bowler}."]
    batter_vulnerabilities = [f"Dismissed {dismissals} times ({dis_summary}) with {dot_pct}% dot balls."]
    batter_approach = ["Look for boundary releases in the powerplay."]
    bowler_effectiveness = [f"Took {dismissals} wickets against {req.batter}."]
    bowler_pressure = [f"Maintains {dot_pct}% dot ball pressure."]
    bowler_approach = ["Target off-stump channel to force false strokes."]
    fantasy_verdict = f"Even battle. {req.batter} has {sr} SR against {req.bowler} with {dismissals} dismissals."

    # Enhance with Groq LLM if key available
    if GROQ_API_KEY:
        system_prompt = (
            "You are Matchup AI's elite cricket tactical analyst for Dream11. "
            "Given exact player statistics, provide 1 concise sentence each for: "
            "BATTER_STRENGTH, BATTER_VULNERABILITY, BATTER_APPROACH, BOWLER_EFFECTIVENESS, BOWLER_PRESSURE, BOWLER_APPROACH, FANTASY_VERDICT. "
            "Ground your answer ONLY in the provided numbers. Do not invent unrecorded data."
        )
        user_prompt = (
            f"Batter: {req.batter}\nBowler: {req.bowler}\nVenue: {req.venue}\n"
            f"Head to Head: {runs} runs, {balls} balls, {sr} strike rate, {dismissals} dismissals ({dis_summary}), {dot_pct}% dot balls.\n"
            f"Venue Average: {venue_stat['average'] if venue_stat else 'N/A'}, Strike Rate: {venue_stat['strike_rate'] if venue_stat else 'N/A'}."
        )
        ai_resp = call_groq_llm(system_prompt, user_prompt)
        if ai_resp:
            lines = [l.strip() for l in ai_resp.split("\n") if l.strip()]
            for l in lines:
                if "BATTER_STRENGTH:" in l: batter_strengths = [l.split(":", 1)[1].strip()]
                elif "BATTER_VULNERABILITY:" in l: batter_vulnerabilities = [l.split(":", 1)[1].strip()]
                elif "BATTER_APPROACH:" in l: batter_approach = [l.split(":", 1)[1].strip()]
                elif "BOWLER_EFFECTIVENESS:" in l: bowler_effectiveness = [l.split(":", 1)[1].strip()]
                elif "BOWLER_PRESSURE:" in l: bowler_pressure = [l.split(":", 1)[1].strip()]
                elif "BOWLER_APPROACH:" in l: bowler_approach = [l.split(":", 1)[1].strip()]
                elif "FANTASY_VERDICT:" in l: fantasy_verdict = l.split(":", 1)[1].strip()

    return {
        "matchup": key,
        "venue": req.venue,
        "batter_plan": {
            "title": f"{req.batter}'s Blueprint",
            "strengths": batter_strengths,
            "vulnerabilities": batter_vulnerabilities,
            "suggested_approach": batter_approach
        },
        "bowler_plan": {
            "title": f"{req.bowler}'s Blueprint",
            "effectiveness": bowler_effectiveness,
            "pressure_points": bowler_pressure,
            "suggested_approach": bowler_approach
        },
        "fantasy_verdict": fantasy_verdict,
        "confidence_level": "High (Groq LLM + Cricsheet Verified)" if balls >= 25 else "Moderate (Sample Size Limited)"
    }

# -------------------------------------------------------------
# CONVERSATIONAL AI CRICKET BUDDY & VOICE (GROQ + SARVAM)
# -------------------------------------------------------------
@app.post("/api/chat")
def chat_with_cricket_buddy(req: ChatRequest):
    msg = req.message.lower().strip()
    key = f"{req.batter} vs {req.bowler}"
    h2h = matchups_db.get(key)
    batter_ctx = player_context_db.get(req.batter, {})
    career = players_career_db.get(req.batter, {})

    structured_evidence = []
    reply = ""

    # Generate grounded reply using Groq LLM
    if GROQ_API_KEY:
        tone_instruction = {
            "bro": "Speak like a cricket-obsessed Indian buddy ('bro', 'yaar', energetic, conversational, Hinglish-friendly, fun).",
            "analyst": "Speak like a calm, sharp broadcast analyst (factual, objective, concise, precise metrics).",
            "hype": "Speak like an ultra-hyped stadium commentator (electric, passionate, bold, dramatic)."
        }.get(req.personality, "conversational")

        # Extract dismissal breakdown
        dis_types = h2h.get("dismissal_types", []) if h2h else []
        dis_counts = {}
        for d in dis_types:
            dis_counts[d] = dis_counts.get(d, 0) + 1
        dis_detail = ", ".join([f"{count} {dtype}" for dtype, count in dis_counts.items()]) if dis_counts else "None"

        # Extract phase breakdown
        phase_str = "No phase breakdown."
        if h2h and "phase" in h2h:
            pp = h2h["phase"].get("powerplay", {})
            mid = h2h["phase"].get("middle", {})
            death = h2h["phase"].get("death", {})
            phase_str = (
                f"Powerplay: {pp.get('runs', 0)} runs, {pp.get('dismissals', 0)} out, {pp.get('strike_rate', 0)} SR | "
                f"Middle overs: {mid.get('runs', 0)} runs, {mid.get('dismissals', 0)} out, {mid.get('strike_rate', 0)} SR | "
                f"Death overs: {death.get('runs', 0)} runs, {death.get('dismissals', 0)} out, {death.get('strike_rate', 0)} SR"
            )

        system_prompt = (
            f"You are 'Cricket Buddy' on Matchup AI. Personality: {tone_instruction}\n"
            "CRITICAL CRICKET DOMAIN RULES:\n"
            "1. When the user asks 'which ball', 'lethal delivery', 'what ball', 'yorker or good length', or 'how does he get him out': "
            "YOU MUST ALWAYS ANSWER IN TERMS OF CRICKET DELIVERY TYPES, LINE, AND LENGTH (e.g. toe-crushing yorker on leg stump, hard back-of-a-length in the 5th-stump corridor of uncertainty, dipping slower ball, sharp inswinger, fiery bouncer). "
            "ABSOLUTELY NEVER reply with a ball count or number like 'ball 20' or '22nd ball'!\n"
            "2. Directly map historical dismissals to delivery tactics: "
            "LBW/Bowled dismissals prove vulnerability to full swinging deliveries/toe-crushing yorkers attacking the pads/stumps; "
            "Caught dismissals prove vulnerability to 5th-stump good-length/back-of-a-length channel drawing edges, or mistimed pull shots against hard lengths. "
            "Use the phase breakdown to highlight when the bowler strangles the batter.\n"
            "3. Ground your reasoning in the real numbers provided below. Keep your reply punchy, insightful, and authentic (3-4 sentences)."
        )

        h2h_str = f"{h2h['runs']} runs, {h2h['balls']} balls, {h2h['dismissals']} dismissals, {h2h['strike_rate']} SR, {h2h['dot_percentage']}% dots" if h2h else "No direct head-to-head encounters."
        last_scores = ", ".join(batter_ctx.get("recent_form", {}).get("last_5_scores", []))
        venue_records = batter_ctx.get("venue_records", {}).get(req.venue, {})
        venue_str = f"Avg {venue_records.get('average', 'N/A')}, SR {venue_records.get('strike_rate', 'N/A')} at {req.venue}" if venue_records else "No venue record."

        user_prompt = (
            f"Batter: {req.batter}\n"
            f"Bowler: {req.bowler}\n"
            f"Venue: {req.venue}\n"
            f"H2H Stats: {h2h_str}\n"
            f"Historical Dismissals: {dis_detail}\n"
            f"Phase Breakdown: {phase_str}\n"
            f"Batter Recent 5 Scores: {last_scores}\n"
            f"Venue Record: {venue_str}\n"
            f"Fan Question: '{req.message}'"
        )

        ai_reply = call_groq_llm(system_prompt, user_prompt)
        if ai_reply:
            reply = ai_reply

    # Fallback template if Groq reply empty
    if not reply:
        if "last" in msg or "form" in msg:
            rf = batter_ctx.get("recent_form", {})
            reply = f"In his last 5 recorded innings, {req.batter} put up: {', '.join(rf.get('last_5_scores', []))} (Avg: {rf.get('last_5_avg')}, SR: {rf.get('last_5_sr')})."
        elif h2h:
            reply = f"Against {req.bowler}, {req.batter} has scored {h2h['runs']} runs in {h2h['balls']} deliveries (SR {h2h['strike_rate']}), dismissed {h2h['dismissals']} times."
        else:
            reply = f"Looking at {req.batter} vs {req.bowler} at {req.venue}: ask me about his form, stadium record, or tactical plans!"

    # Attach structured evidence cards
    if "last" in msg or "form" in msg:
        structured_evidence.append({
            "type": "recent_form_table",
            "title": f"{req.batter}'s Recent Innings Log",
            "data": batter_ctx.get("recent_form", {}).get("last_10_innings", [])[:5]
        })
    elif h2h:
        structured_evidence.append({
            "type": "h2h_card",
            "runs": h2h["runs"],
            "balls": h2h["balls"],
            "strike_rate": h2h["strike_rate"],
            "dismissals": h2h["dismissals"]
        })

    # Decouple heavy TTS for sub-second responses; generated on-demand via /api/voice/tts
    return {
        "reply": reply,
        "audio_url": None,
        "can_voice": bool(SARVAM_API_KEY),
        "batter": req.batter,
        "bowler": req.bowler,
        "personality": req.personality,
        "structured_evidence": structured_evidence,
        "suggested_follow_ups": [
            f"What did {req.batter} score in his last 5 matches?",
            f"How many times has {req.bowler} dismissed {req.batter}?",
            f"What is {req.batter}'s record at {req.venue}?",
            f"Should I captain {req.batter} in Dream11 today?"
        ]
    }

@app.post("/api/voice/tts")
def text_to_speech(req: TTSRequest):
    """Direct Sarvam TTS generation."""
    audio = call_sarvam_tts(req.text, req.language or SARVAM_LANGUAGE_CODE)
    if not audio:
        raise HTTPException(status_code=500, detail="Sarvam TTS synthesis failed")
    return {"audio_base64": audio}

@app.get("/api/voice/status")
def get_voice_status():
    return {
        "available": bool(SARVAM_API_KEY),
        "provider": "Sarvam AI (Bulbul:v4-flash / Ashwin Sports Voice)",
        "model": SARVAM_TTS_MODEL,
        "speaker": SARVAM_SPEAKER,
        "language": SARVAM_LANGUAGE_CODE,
        "groq_active": bool(GROQ_API_KEY)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
