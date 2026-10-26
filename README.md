# 🏏 THE 12th MAN
> **Know the battle before the next ball.**  
> *AI-Powered Cricket Intelligence Companion — Dream11 Forward Deployed Engineer Assignment*

---

## 1. What Fan Problem Are You Solving?
During cricket matches, traditional scoreboards only show static scores (e.g., *"Kohli 18 off 14"*). Fans and fantasy players don't know the micro-drama of the ball about to be bowled: who historically dominates this 1-on-1 battle, what the batter scored in their last 5 innings, or how they perform at this specific stadium.

## 2. How Does Your Solution Help?
**The 12th Man** provides second-screen intelligence across three real-time pillars grounded in 1,243 verified historical matches (with live in-play feed integration ready):
1. **1-on-1 Head-to-Head Duel**: Verified ball-by-ball battle history (runs, balls, dismissals, dot-ball %, phase splits).
2. **Form & Venue Intelligence**: Batter's last 5 innings batting averages (runs per dismissal vs raw runs/match) and ground-specific averages and strike rates.
3. **The Battle Plan & AI Cricket Buddy**: Grounded tactical blueprints (batter's plan vs bowler's plan) and conversational voice assistance with personality modes (Bro, Analyst, Hype) and Dream11 captaincy advice.

## 3. Which AI & Tech Tools Were Used?
- **Data Engineering**: Automated ball-by-ball ETL parsing 1,243 official matches (15,593 head-to-head records + 739 player form profiles).
- **AI Reasoning**: Structured prompt synthesis with statistical evidence grounding (Batter's approach, Bowler's attack plan, Dream11 fantasy verdict).
- **Voice Intelligence**: Sarvam AI Multilingual Voice API (English & Hindi) with client-side Web Speech API fallback.
- **Frontend**: React + Vite + TypeScript + Tailwind CSS (dark sports-broadcast aesthetic).
- **Backend**: FastAPI + Uvicorn Python REST API.

---

## 4. Quick Start

### Backend (FastAPI)
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

Visit:
- Landing Page: `http://localhost:5173/`
- Interactive Arena: `http://localhost:5173/demo`
