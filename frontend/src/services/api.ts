/**
 * Matchup AI API Client
 * Typed service connecting frontend to FastAPI backend endpoints.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface Player {
  name: string;
  role: string;
  country: string;
  avatar: string;
  lifetime_runs?: number;
  lifetime_wickets?: number;
}

export interface MarqueeMatchup {
  id: string;
  title: string;
  batter: string;
  bowler: string;
  venue: string;
  format: string;
  tag: string;
}

export interface MatchupStats {
  runs: number;
  balls: number;
  strike_rate: number;
  dismissals: number;
  dots: number;
  dot_percentage: number;
  fours: number;
  sixes: number;
  dismissal_types: string[];
  phase: {
    powerplay?: { runs: number; balls: number; dismissals: number; dots: number; strike_rate: number };
    middle?: { runs: number; balls: number; dismissals: number; dots: number; strike_rate: number };
    death?: { runs: number; balls: number; dismissals: number; dots: number; strike_rate: number };
  };
}

export interface RecentInning {
  date: string;
  vs: string;
  runs: number;
  balls: number;
  out: boolean;
  venue: string;
  fours?: number;
  sixes?: number;
  strike_rate?: number;
}

export interface VenueStat {
  innings: number;
  runs: number;
  average: number;
  strike_rate: number;
  highest: number;
  fifties: number;
  centuries: number;
}

export interface MatchupResponse {
  found: boolean;
  matchup_key?: string;
  stats?: MatchupStats;
  batter: {
    name: string;
    role: string;
    avatar: string;
    career?: any;
  };
  bowler: {
    name: string;
    role: string;
    avatar: string;
    career?: any;
  };
  recent_form?: {
    last_5_scores?: string[];
    last_5_avg?: number;
    last_5_sr?: number;
    last_10_innings?: RecentInning[];
  };
  venue_record?: VenueStat | null;
  top_venues?: Record<string, VenueStat>;
  data_provenance?: {
    source: string;
    coverage: string;
    sample_size: string | number;
    limitations: string;
  };
  message?: string;
}

export interface TacticalAnalysisResponse {
  matchup: string;
  venue: string;
  batter_plan: {
    title: string;
    strengths: string[];
    vulnerabilities: string[];
    suggested_approach: string[];
  };
  bowler_plan: {
    title: string;
    effectiveness: string[];
    pressure_points: string[];
    suggested_approach: string[];
  };
  fantasy_verdict: string;
  confidence_level: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  evidence?: any[];
  followUps?: string[];
  audioUrl?: string | null;
  isLoadingAudio?: boolean;
  isPlayingAudio?: boolean;
}

export async function fetchMarqueeMatchups(): Promise<MarqueeMatchup[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/marquee-matchups`);
    if (!res.ok) throw new Error("Failed to fetch marquee matchups");
    const data = await res.json();
    return data.matchups;
  } catch (err) {
    console.warn("Backend not available, using local marquee list", err);
    return [
      { id: "kohli-bumrah", title: "King vs Boom Boom", batter: "Virat Kohli", bowler: "Jasprit Bumrah", venue: "Wankhede Stadium, Mumbai", format: "IPL / T20", tag: "El Clásico Duel" },
      { id: "rohit-boult", title: "Hitman vs Swing King", batter: "Rohit Sharma", bowler: "Trent Boult", venue: "Eden Gardens, Kolkata", format: "IPL / T20", tag: "Left-Arm Menace" },
      { id: "dhoni-narine", title: "Thala vs Mystery Spin", batter: "MS Dhoni", bowler: "Sunil Narine", venue: "MA Chidambaram Stadium (Chepauk), Chennai", format: "IPL / T20", tag: "Tactical Strangle" },
      { id: "kohli-starc", title: "Kohli vs Starc", batter: "Virat Kohli", bowler: "Mitchell Starc", venue: "M. Chinnaswamy Stadium, Bengaluru", format: "IPL / T20", tag: "World Cup Rivals" }
    ];
  }
}

export const INITIAL_PLAYERS: Player[] = [
  { name: "Virat Kohli", role: "Batsman", country: "India", avatar: "https://static.cricbuzz.com/a/img/v1/i1/c616517/virat-kohli.jpg?d=low&p=gthumb", lifetime_runs: 37863 },
  { name: "Jasprit Bumrah", role: "Bowler", country: "India", avatar: "https://static.cricbuzz.com/a/img/v1/i1/c846037/jasprit-bumrah.jpg?d=low&p=gthumb", lifetime_wickets: 698 },
  { name: "Rohit Sharma", role: "Batsman", country: "India", avatar: "https://static.cricbuzz.com/a/img/v1/i1/c616514/rohit-sharma.jpg?d=low&p=gthumb", lifetime_runs: 27981 },
  { name: "Trent Boult", role: "Bowler", country: "New Zealand", avatar: "https://static.cricbuzz.com/a/img/v1/i1/c351612/trent-boult.jpg?d=low&p=gthumb", lifetime_wickets: 756 },
  { name: "MS Dhoni", role: "WK-Batsman", country: "India", avatar: "https://static.cricbuzz.com/a/img/v1/i1/c170677/ms-dhoni.jpg?d=low&p=gthumb", lifetime_runs: 22705 },
  { name: "Sunil Narine", role: "All-Rounder", country: "West Indies", avatar: "https://static.cricbuzz.com/a/img/v1/i1/c351615/sunil-narine.jpg?d=low&p=gthumb", lifetime_wickets: 372 },
  { name: "Mitchell Starc", role: "Bowler", country: "Australia", avatar: "https://static.cricbuzz.com/a/img/v1/i1/c351610/mitchell-starc.jpg?d=low&p=gthumb", lifetime_wickets: 849 },
  { name: "Travis Head", role: "Batsman", country: "Australia", avatar: "https://static.cricbuzz.com/a/img/v1/i1/c351608/travis-head.jpg?d=low&p=gthumb", lifetime_runs: 10837 },
  { name: "Heinrich Klaasen", role: "WK-Batsman", country: "South Africa", avatar: "https://static.cricbuzz.com/a/img/v1/i1/c244990/heinrich-klaasen.jpg?d=low&p=gthumb", lifetime_runs: 5349 },
  { name: "Rashid Khan", role: "Bowler", country: "Afghanistan", avatar: "https://static.cricbuzz.com/a/img/v1/i1/c244980/rashid-khan.jpg?d=low&p=gthumb", lifetime_wickets: 450 }
];

export async function fetchPlayers(query?: string): Promise<Player[]> {
  try {
    const url = query ? `${API_BASE_URL}/api/players?query=${encodeURIComponent(query)}` : `${API_BASE_URL}/api/players`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch players");
    const data = await res.json();
    return data.players && data.players.length > 0 ? data.players : INITIAL_PLAYERS;
  } catch (err) {
    console.warn("Using offline player catalogue", err);
    return INITIAL_PLAYERS;
  }
}

export async function fetchVenues(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/venues`);
    if (!res.ok) throw new Error("Failed to fetch venues");
    const data = await res.json();
    return data.venues;
  } catch (err) {
    return [
      "All Venues",
      "Wankhede Stadium, Mumbai",
      "M. Chinnaswamy Stadium, Bengaluru",
      "Eden Gardens, Kolkata",
      "MA Chidambaram Stadium (Chepauk), Chennai",
      "Narendra Modi Stadium, Ahmedabad",
      "Arun Jaitley Stadium, Delhi",
      "Rajiv Gandhi Stadium, Hyderabad"
    ];
  }
}

export async function fetchMatchup(
  batter: string,
  bowler: string,
  venue: string = "All Venues",
  format: string = "IPL / T20"
): Promise<MatchupResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/matchup?batter=${encodeURIComponent(batter)}&bowler=${encodeURIComponent(bowler)}&venue=${encodeURIComponent(venue)}&format=${encodeURIComponent(format)}`
  );
  if (!res.ok) throw new Error("Failed to fetch matchup");
  return res.json();
}

export async function fetchTacticalAnalysis(
  batter: string,
  bowler: string,
  venue: string = "All Venues",
  format: string = "IPL / T20"
): Promise<TacticalAnalysisResponse> {
  const res = await fetch(`${API_BASE_URL}/api/tactical-analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batter, bowler, venue, format }),
  });
  if (!res.ok) throw new Error("Failed to fetch tactical analysis");
  return res.json();
}

export async function sendChatMessage(
  message: string,
  batter: string,
  bowler: string,
  venue: string = "All Venues",
  personality: string = "bro",
  language: string = "en"
): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, batter, bowler, venue, personality, language }),
  });
  if (!res.ok) throw new Error("Chat request failed");
  return res.json();
}

export async function fetchVoiceStatus(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/voice/status`);
    if (!res.ok) throw new Error("Failed to check voice");
    return res.json();
  } catch (err) {
    return {
      available: false,
      provider: "Browser Web Speech Fallback",
      supported_languages: [{ code: "en", name: "English" }, { code: "hi", name: "Hindi" }]
    };
  }
}

export async function generateVoiceTTS(text: string, language: string = "en"): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/voice/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        language: language === "hi" ? "hi-IN" : "en-IN"
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.audio_base64 || null;
  } catch (err) {
    console.warn("Sarvam Voice generation failed", err);
    return null;
  }
}
