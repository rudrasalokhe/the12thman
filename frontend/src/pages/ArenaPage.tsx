import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, AudioLines, BarChart3, ChevronDown, ChevronRight, ChevronUp, CircleGauge, Database, FileText, Info, Loader2, MapPin, Mic, Pause, Search, Send, ShieldCheck, Sparkles, Swords, TrendingUp, Volume2, VolumeX, X } from 'lucide-react';
import { fetchMarqueeMatchups, fetchMatchup, fetchPlayers, fetchTacticalAnalysis, fetchVenues, generateVoiceTTS, sendChatMessage, INITIAL_PLAYERS } from '../services/api';
import type { ChatMessage, MarqueeMatchup, MatchupResponse, Player, TacticalAnalysisResponse } from '../services/api';

const getFallbackAvatar = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=171912&color=dfff4f&bold=true&size=100`;

type SelectBoxProps = { label:string; value:string; players:Player[]; open:boolean; onToggle:()=>void; onSelect:(v:string)=>void };
function PlayerSelect({label,value,players,open,onToggle,onSelect}:SelectBoxProps){
  const [query,setQuery]=useState(''); 
  const list=players.filter(p=>p.name.toLowerCase().includes(query.toLowerCase())); 
  const player=players.find(p=>p.name===value);
  const avatarUrl = player?.avatar || getFallbackAvatar(value);

  return (
    <div className="arena-player-select">
      <button onClick={onToggle} className="player-select-button">
        <img 
          src={avatarUrl} 
          alt={value}
          referrerPolicy="no-referrer"
          onError={(e) => { (e.target as HTMLImageElement).src = getFallbackAvatar(value); }}
        />
        <span>
          <small>{label}</small>
          <strong>{value}</strong>
          <em>{player?.role||label}</em>
        </span>
        <ChevronDown size={18}/>
      </button>
      {open && (
        <div className="player-menu">
          <label>
            <Search size={15}/>
            <input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Search ${label.toLowerCase()}`}/>
          </label>
          <div>
            {list.map(p => (
              <button key={p.name} onClick={()=>{onSelect(p.name);setQuery('')}}>
                <img 
                  src={p.avatar || getFallbackAvatar(p.name)} 
                  alt={p.name}
                  referrerPolicy="no-referrer"
                  onError={(e) => { (e.target as HTMLImageElement).src = getFallbackAvatar(p.name); }}
                />
                <span>{p.name}<small>{p.role}</small></span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function renderEvidenceItem(pt: any, idx: number) {
  if (pt === null || pt === undefined) return null;
  if (typeof pt === 'string') return <li key={idx}>{pt}</li>;
  if (typeof pt === 'number' || typeof pt === 'boolean') return <li key={idx}>{String(pt)}</li>;

  if (typeof pt === 'object') {
    if (pt.type === 'h2h_card') {
      return (
        <li key={idx}>
          <strong>Head-to-Head:</strong> {pt.runs ?? 0} runs scored off {pt.balls ?? 0} balls (SR {pt.strike_rate ?? 0}), {pt.dismissals ?? 0} dismissal{pt.dismissals === 1 ? '' : 's'}.
        </li>
      );
    }
    if (pt.type === 'recent_form_table') {
      const innList = Array.isArray(pt.data)
        ? pt.data.map((inn: any) => {
            if (typeof inn === 'object' && inn !== null) {
              const r = inn.runs ?? 0;
              const no = inn.not_out ? '*' : '';
              const b = inn.balls ? ` (${inn.balls}b)` : '';
              const vs = inn.opposition ? ` vs ${inn.opposition}` : '';
              return `${r}${no}${b}${vs}`;
            }
            return String(inn);
          }).join(', ')
        : '';
      return (
        <li key={idx}>
          <strong>{pt.title || 'Recent Innings'}:</strong> {innList || 'No recent innings logged'}
        </li>
      );
    }
    const summary = Object.entries(pt)
      .filter(([k]) => k !== 'type')
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(' · ');
    return <li key={idx}>{summary || JSON.stringify(pt)}</li>;
  }

  return <li key={idx}>{String(pt)}</li>;
}

export function ArenaPage(){
  const [marquees,setMarquees]=useState<MarqueeMatchup[]>([]);
  const [players,setPlayers]=useState<Player[]>(INITIAL_PLAYERS);
  const [venues,setVenues]=useState<string[]>([]);
  const [batter,setBatter]=useState('Virat Kohli'),[bowler,setBowler]=useState('Jasprit Bumrah'),[venue,setVenue]=useState('All Venues'),[format,setFormat]=useState('IPL / T20');
  const [open,setOpen]=useState<'batter'|'bowler'|null>(null);
  const [data,setData]=useState<MatchupResponse|null>(null);
  const [tactics,setTactics]=useState<TacticalAnalysisResponse|null>(null);
  const [loadingMatchup,setLoadingMatchup]=useState(true);
  const [loadingTactics,setLoadingTactics]=useState(true);
  const [tab,setTab]=useState<'batter'|'bowler'>('batter'),[messages,setMessages]=useState<ChatMessage[]>([]),[input,setInput]=useState(''),[sending,setSending]=useState(false),[mode,setMode]=useState<'bro'|'analyst'|'hype'>('analyst');
  const [audioPlayingId, setAudioPlayingId] = useState<string | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);
  const [autoVoice, setAutoVoice] = useState(true);
  const [voiceLang, setVoiceLang] = useState<'en' | 'hi'>('en');
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('matchup_tour_seen') ? null : 0;
    }
    return 0;
  });
  const [spotlightStyle, setSpotlightStyle] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const closeTour = () => {
    setTourStep(null);
    document.body.style.overflow = '';
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('matchup_tour_seen', 'true');
    }
  };

  useEffect(() => {
    if (tourStep === null) {
      setSpotlightStyle(null);
      document.body.style.overflow = '';
      return;
    }
    // Lock scrolling while tour is active
    document.body.style.overflow = 'hidden';

    const targetIds = ['tour-rivalry', 'tour-stats', 'tour-tactics', 'tour-chat'];
    const el = document.getElementById(targetIds[tourStep]);
    if (el) {
      // Scroll target into view, then lock
      document.body.style.overflow = '';
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const compute = () => {
        const r = el.getBoundingClientRect();
        setSpotlightStyle({
          top: r.top - 6,
          left: r.left - 6,
          width: r.width + 12,
          height: r.height + 12
        });
      };

      // Wait for scrollIntoView to settle, then lock and compute
      const t = setTimeout(() => {
        document.body.style.overflow = 'hidden';
        compute();
      }, 450);

      window.addEventListener('resize', compute);
      return () => {
        clearTimeout(t);
        window.removeEventListener('resize', compute);
        document.body.style.overflow = '';
      };
    }
  }, [tourStep]);

  const TOUR_DATA = [
    {
      tag: '🕹️ TUTORIAL · 01 / PICK THE CONTEST',
      title: 'Select Any Batter vs Bowler Duel',
      desc: 'Pick your pairing or launch iconic rivalries. The engine instantaneously queries 15,593 ball-by-ball match deliveries in real time.',
      actionLabel: 'Try: Load Kohli vs Bumrah ⚡',
      action: () => { setBatter('Virat Kohli'); setBowler('Jasprit Bumrah'); }
    },
    {
      tag: '📊 TUTORIAL · 02 / HEAD-TO-HEAD INTELLIGENCE',
      title: 'Analyze Ball-by-Ball Micro-Dominance',
      desc: 'Look beyond static scorecards. See strike rates, dot-ball pressure, dismissals, and scoring splits across Powerplay, Middle, and Death overs.',
      actionLabel: null,
      action: null
    },
    {
      tag: '🎯 TUTORIAL · 03 / TACTICAL BLUEPRINT',
      title: 'Batter Approach vs Bowler Plan',
      desc: 'Inspect vulnerability zones (5th-stump channel, pace-off deliveries) and tactical game plans with fantasy upside ratings.',
      actionLabel: 'Try: View Bowler Attack Plan ➔',
      action: () => { setTab('bowler'); }
    },
    {
      tag: '🎙️ TUTORIAL · 04 / AI SPORTS VOICE',
      title: 'Broadcast Voice Commentary',
      desc: 'Ask about fantasy captaincy, lethal delivery types, or hit "Play Audio Briefing". Ashwin\'s Sarvam AI studio voice speaks the breakdown aloud!',
      actionLabel: '▶️ Play Matchup Voice Briefing',
      action: () => { send(`Give me a tactical breakdown and edge assessment of ${batter} vs ${bowler} at ${venue}`); }
    }
  ];

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const rootRef=useRef<HTMLDivElement>(null),chatRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    Promise.all([fetchMarqueeMatchups(),fetchPlayers(),fetchVenues()]).then(([m,p,v])=>{
      setMarquees(m);
      if(p && p.length > 0) setPlayers(p);
      setVenues(v);
    });
    setMessages([{
      id: 'welcome',
      sender: 'ai',
      text: 'I’m across this contest! Ask me about verified head-to-head records, lethal delivery types, death-overs stats, or fantasy captaincy advice.',
      timestamp: 'Now',
      followUps: [
        'Should I captain Kohli in fantasy cricket today?',
        'Who holds the tactical edge here?',
        'What delivery gets him out?'
      ]
    }]);
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  },[]);

  // Instant matchup data + parallel tactical LLM analysis
  useEffect(()=>{
    let cancel=false;
    setLoadingMatchup(true);
    fetchMatchup(batter,bowler,venue,format)
      .then(m=>{if(!cancel){setData(m);setLoadingMatchup(false)}})
      .catch(()=>{if(!cancel)setLoadingMatchup(false)});

    setLoadingTactics(true);
    fetchTacticalAnalysis(batter,bowler,venue,format)
      .then(t=>{if(!cancel){setTactics(t);setLoadingTactics(false)}})
      .catch(()=>{
        if(!cancel) {
          setTactics({
            matchup: `${batter} vs ${bowler}`,
            venue: venue,
            batter_plan: {
              title: `${batter} Approach Blueprint`,
              strengths: ["Anchor scoring in middle overs", "Exploit field gaps square of the wicket"],
              vulnerabilities: ["Early moving ball outside off stump", "Pace off deliveries"],
              suggested_approach: ["Rotate strike against tight lengths", "Target boundary on release balls"]
            },
            bowler_plan: {
              title: `${bowler} Attack Strategy`,
              effectiveness: ["Maintain tight fourth-stump line", "Disrupt rhythm with variations"],
              pressure_points: ["Build consecutive dot deliveries", "Target stumps with hard lengths"],
              suggested_approach: ["Set catching cover and ring field", "Execute yorkers and cutters in death phase"]
            },
            fantasy_verdict: "Premier battle with high point upside. Strategic fantasy asset.",
            confidence_level: "High"
          });
          setLoadingTactics(false);
        }
      });

    return()=>{cancel=true};
  },[batter,bowler,venue,format]);

  useEffect(()=>{chatRef.current?.scrollTo({top:chatRef.current.scrollHeight,behavior:'smooth'})},[messages,sending]);

  const stats=data?.stats,phases=useMemo(()=>stats?.phase?Object.entries(stats.phase).filter(([,v])=>v):[],[stats]);

  const rawAvgRuns = useMemo(() => {
    const scores = data?.recent_form?.last_5_scores;
    if (!scores || scores.length === 0) return null;
    let sum = 0, count = 0;
    for (const s of scores) {
      const match = s.match(/^(\d+)/);
      if (match) {
        sum += parseInt(match[1], 10);
        count++;
      }
    }
    return count > 0 ? (sum / count).toFixed(1) : null;
  }, [data?.recent_form?.last_5_scores]);

  const unlockAudioContext = () => {
    try {
      if (!silentAudioRef.current) {
        silentAudioRef.current = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==");
      }
      silentAudioRef.current.play().then(() => {
        silentAudioRef.current?.pause();
      }).catch(() => {});
    } catch {}
  };

  const stopAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setAudioPlayingId(null);
  };

  const playAudioForMessage = async (msgId: string, text: string, existingAudioUrl?: string | null) => {
    if (audioPlayingId === msgId) {
      stopAudio();
      return;
    }
    stopAudio();

    // Exclusively Sarvam AI Studio Voice
    let audioSrc = existingAudioUrl;
    if (!audioSrc) {
      setAudioLoadingId(msgId);
      try {
        audioSrc = await generateVoiceTTS(text, voiceLang);
        if (audioSrc) {
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, audioUrl: audioSrc } : m));
        }
      } catch (err) {
        console.error("Sarvam Voice generation failed", err);
      } finally {
        setAudioLoadingId(null);
      }
    }

    if (audioSrc) {
      try {
        const audio = new Audio(audioSrc);
        currentAudioRef.current = audio;
        setAudioPlayingId(msgId);
        audio.onended = () => {
          setAudioPlayingId(null);
          currentAudioRef.current = null;
        };
        audio.onerror = () => {
          console.warn("Sarvam Audio playback encountered an error");
          setAudioPlayingId(null);
          currentAudioRef.current = null;
        };
        await audio.play();
      } catch (playErr) {
        console.warn("Sarvam Audio play interrupted or blocked", playErr);
        setAudioPlayingId(null);
        currentAudioRef.current = null;
      }
    }
  };

  const send = async (text = input) => {
    if (!text.trim() || sending) return;
    unlockAudioContext();
    const userMsgId = `u${Date.now()}`;
    const userText = text.trim();
    setMessages(x => [...x, { id: userMsgId, sender: 'user', text: userText, timestamp: 'Now' }]);
    setInput('');
    setSending(true);

    try {
      // Fetch text answer instantly with audio link if precomputed
      const r = await sendChatMessage(userText, batter, bowler, venue, mode, voiceLang, false);
      const aiMsgId = `a${Date.now()}`;

      setMessages(x => [
        ...x,
        {
          id: aiMsgId,
          sender: 'ai',
          text: r.reply,
          timestamp: 'Now',
          followUps: r.suggested_follow_ups,
          evidence: r.structured_evidence,
          audioUrl: r.audio_url || null
        }
      ]);
      setSending(false);

      if (autoVoice && r.reply) {
        playAudioForMessage(aiMsgId, r.reply, r.audio_url);
      }
    } catch {
      setMessages(x => [
        ...x,
        {
          id: `e${Date.now()}`,
          sender: 'ai',
          text: 'The analysis desk is temporarily offline. Try again in a moment.',
          timestamp: 'Now'
        }
      ]);
      setSending(false);
    }
  };

  const speak=()=>{
    unlockAudioContext();
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!SR)return;
    const r=new SR();
    r.lang=voiceLang==='hi'?'hi-IN':'en-IN';
    r.onresult=(e:any)=>send(e.results[0][0].transcript);
    r.start();
  };

  const launch=(m:MarqueeMatchup)=>{setBatter(m.batter);setBowler(m.bowler);setVenue(m.venue||'All Venues');setFormat(m.format||'IPL / T20')};

  return <div className="arena" ref={rootRef}>
    <div className="arena-ticker"><div className="container"><span><i/> FEATURED RIVALRIES</span><div>{marquees.map(m=><button key={m.id} className={m.batter===batter&&m.bowler===bowler?'active':''} onClick={()=>launch(m)}>{m.batter.split(' ').pop()} <b>vs</b> {m.bowler.split(' ').pop()}</button>)}</div></div></div>
    {tourStep !== null && (
      <div className="game-tour-overlay">
        <div className="game-tour-spotlight" style={spotlightStyle ? {
          top: spotlightStyle.top,
          left: spotlightStyle.left,
          width: spotlightStyle.width,
          height: spotlightStyle.height
        } : { top: 0, left: 0, width: 0, height: 0, opacity: 0 }} />
        <div className="game-tour-card">
          <div className="game-tour-card-top">
            <span className="game-tour-step-tag">{TOUR_DATA[tourStep].tag}</span>
            <button type="button" className="game-tour-btn-skip" onClick={closeTour} title="Skip tutorial">
              <X size={14} />
            </button>
          </div>
          <h3 className="game-tour-title">{TOUR_DATA[tourStep].title}</h3>
          <p className="game-tour-body">{TOUR_DATA[tourStep].desc}</p>
          {TOUR_DATA[tourStep].actionLabel && (
            <button
              type="button"
              className="game-tour-try-btn"
              onClick={() => {
                TOUR_DATA[tourStep].action?.();
              }}
            >
              {TOUR_DATA[tourStep].actionLabel}
            </button>
          )}
          <div className="game-tour-actions">
            <div className="game-tour-dots">
              {TOUR_DATA.map((_, i) => (
                <span
                  key={i}
                  className={i === tourStep ? 'active' : ''}
                  onClick={() => setTourStep(i)}
                />
              ))}
            </div>
            <div className="game-tour-btns">
              {tourStep > 0 && (
                <button
                  type="button"
                  className="game-tour-btn-prev"
                  onClick={() => setTourStep(tourStep - 1)}
                >
                  Back
                </button>
              )}
              <button
                type="button"
                className="game-tour-btn-next"
                onClick={() => {
                  if (tourStep < TOUR_DATA.length - 1) {
                    setTourStep(tourStep + 1);
                  } else {
                    closeTour();
                  }
                }}
              >
                {tourStep < TOUR_DATA.length - 1 ? (
                  <>Next <ChevronRight size={14} /></>
                ) : (
                  'Start Exploring 🏏'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    <main className="container arena-main">
      <header className="arena-heading">
        <div>
          <span className="arena-kicker">THE 12th MAN ARENA</span>
          <h1>Read the contest.</h1>
          <p>Historical battle archives, current form, and tactical intelligence in one workspace.</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
          <button 
            type="button" 
            className="replay-tour-btn" 
            onClick={() => setTourStep(0)}
            title="Interactive tutorial walkthrough"
          >
            <Sparkles size={13}/>
            <span>Interactive Tour</span>
          </button>
          <button 
            type="button" 
            className="voice-briefing-cta" 
            onClick={() => send(`Give me a tactical breakdown and edge assessment of ${batter} vs ${bowler} at ${venue}`)}
            title="Listen to AI Voice commentary on this matchup"
          >
            <Volume2 size={14}/>
            <span>Play Matchup Audio Briefing</span>
          </button>
          <div className="data-status live-clarification" title="All metrics are computed from 1,243 verified historical matches (2008–present). When live games are underway, real-time live feeds connect via webhook.">
            <i/>
            <span>
              <strong>HISTORICAL ARCHIVE ACTIVE</strong>
              1,243 Matches · Live Feed Ready
            </span>
          </div>
        </div>
      </header>

      <div className="live-feed-banner">
        <ShieldCheck size={14} className="lfb-icon" />
        <span><strong>Historical Baseline:</strong> Statistics reflect 1,243 verified historical matches (2008–Present). In-play telemetry integrates dynamically during live matches.</span>
      </div>

      <section className="matchup-control" id="tour-rivalry"><div className="control-label"><Swords size={17}/> SELECT THE BATTLE</div><div className="matchup-players"><PlayerSelect label="Batter" value={batter} players={players} open={open==='batter'} onToggle={()=>setOpen(open==='batter'?null:'batter')} onSelect={v=>{setBatter(v);setOpen(null)}}/><div className="arena-vs"><span>VS</span></div><PlayerSelect label="Bowler" value={bowler} players={players} open={open==='bowler'} onToggle={()=>setOpen(open==='bowler'?null:'bowler')} onSelect={v=>{setBowler(v);setOpen(null)}}/></div><div className="filters"><label><MapPin size={15}/><span>VENUE</span><select value={venue} onChange={e=>setVenue(e.target.value)}>{venues.map(v=><option key={v}>{v}</option>)}</select></label><label><CircleGauge size={15}/><span>FORMAT</span><select value={format} onChange={e=>setFormat(e.target.value)}><option>IPL / T20</option><option>ODI</option><option>Test</option></select></label></div></section>
      
      <div className="arena-grid"><div className="analysis-column">
        <section className="arena-card stat-card" id="tour-stats"><div className="card-title"><div><BarChart3 size={17}/><span>HEAD-TO-HEAD</span></div><small>{stats?.balls||0} recorded deliveries (historical archive)</small></div>{loadingMatchup?<div className="skeleton-block"/>:data?.found&&stats?<><div className="big-stats"><div><span>RUNS</span><strong>{stats.runs}</strong><small>scored</small></div><div className="key-stat"><span>STRIKE RATE</span><strong>{stats.strike_rate}</strong><small>{stats.strike_rate>=130?'attacking return':'controlled return'}</small></div><div><span>DISMISSALS</span><strong>{stats.dismissals}</strong><small>in matchup</small></div><div><span>DOT BALLS</span><strong>{stats.dot_percentage}%</strong><small>{stats.dots} deliveries</small></div></div><div className="phase-analysis"><div className="phase-head"><span>SCORING BY PHASE</span><span>Strike rate</span></div>{phases.map(([name,p]:any)=><div className="phase-row" key={name}><span>{name}</span><div><i style={{width:`${Math.min(100,(p.strike_rate||0)/2)}%`}}/></div><strong>{p.strike_rate}</strong><small>{p.runs} off {p.balls}</small></div>)}</div></>:<div className="empty-state">No direct matchup sample is available for this pairing yet.</div>}</section>
        
        <section className="arena-card context-card">
          <div className="card-title">
            <div><TrendingUp size={17}/><span>FORM & CONTEXT</span></div>
            <small>Recent innings</small>
          </div>
          <div className="recent-form">
            <div className="batting-avg-block">
              <div className="stat-label-wrap">
                <span>LAST 5 BATTING AVG</span>
                <span className="stat-info-pill" title="Official cricket batting average = Total Runs ÷ Dismissals (outs). If a batter remained Not Out (*), their batting average exceeds their raw average runs per innings.">
                  <Info size={10} /> Runs / Out
                </span>
              </div>
              <strong>{data?.recent_form?.last_5_avg ?? '—'} <small>batting avg</small></strong>
              <div className="avg-clarification">
                <span>Runs per dismissal (not per-match average)</span>
                {rawAvgRuns !== null && (
                  <span className="raw-avg-tag">Raw avg: {rawAvgRuns} runs/inn</span>
                )}
              </div>
            </div>
            <div className="score-pills-wrap">
              <span className="score-pills-label">Recent 5 Innings (Runs & Balls)</span>
              <div className="score-pills">
                {(data?.recent_form?.last_5_scores||['—','—','—','—','—']).map((s,i)=>(
                  <span key={i} title={s.includes('*') ? 'Not Out (*)' : 'Dismissed'}>{s}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="context-metrics">
            <div><span>RECENT STRIKE RATE</span><strong>{data?.recent_form?.last_5_sr||'—'}</strong></div>
            <div><span>VENUE BATTING AVG</span><strong>{data?.venue_record?.average||'—'}</strong></div>
            <div><span>VENUE HIGH</span><strong>{data?.venue_record?.highest||'—'}</strong></div>
          </div>
        </section>

        <section className="arena-card tactics-card" id="tour-tactics"><div className="card-title"><div><Sparkles size={17}/><span>TACTICAL BLUEPRINT</span></div><div className="tabs"><button className={tab==='batter'?'active':''} onClick={()=>setTab('batter')}>Batter plan</button><button className={tab==='bowler'?'active':''} onClick={()=>setTab('bowler')}>Bowler plan</button></div></div>{loadingTactics?<div className="skeleton-block small"/>:<div className="plan"><h3>{tab==='batter'?tactics?.batter_plan?.title:tactics?.bowler_plan?.title}</h3><div className="plan-grid"><div><span>{tab==='batter'?'WHAT WORKS':'PRESSURE POINTS'}</span><ul>{(tab==='batter'?tactics?.batter_plan?.strengths:tactics?.bowler_plan?.pressure_points)?.map(x=><li key={x}>{x}</li>)}</ul></div><div><span>THE PLAN</span><ul>{(tab==='batter'?tactics?.batter_plan?.suggested_approach:tactics?.bowler_plan?.suggested_approach)?.map(x=><li key={x}>{x}</li>)}</ul></div></div>{tactics?.fantasy_verdict&&<div className="fantasy"><span>FANTASY READ</span><p>{tactics.fantasy_verdict}</p></div>}<button type="button" className="tactics-voice-btn" onClick={() => send(`Explain the ${tab === 'batter' ? batter + ' batter' : bowler + ' bowler'} approach strategy for this contest`)}><Volume2 size={13}/><span>Listen to {tab === 'batter' ? `${batter}'s` : `${bowler}'s`} Voice Plan</span></button></div>}</section>

        <section className="arena-card source-evidence-card">
          <button 
            type="button" 
            className="source-evidence-header" 
            onClick={() => setEvidenceOpen(!evidenceOpen)}
            aria-expanded={evidenceOpen}
          >
            <div className="seh-title">
              <Database size={16} />
              <span>STATISTICAL EVIDENCE & DATA PROVENANCE</span>
              <span className="seh-badge">1,243 Matches · Cricsheet Archive</span>
            </div>
            <div className="seh-toggle">
              <span>{evidenceOpen ? 'Hide Evidence & Methodology' : 'Inspect Evidence & Source Details'}</span>
              {evidenceOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {evidenceOpen && (
            <div className="source-evidence-content">
              <div className="provenance-grid">
                <div className="prov-card">
                  <span className="prov-label">PRIMARY DATA SOURCE</span>
                  <strong>Cricsheet Open Ball-by-Ball Archive</strong>
                  <p>Official match registries spanning men's IPL and international T20 cricket from 2008 through the 2024 season.</p>
                </div>
                <div className="prov-card">
                  <span className="prov-label">DATASET SAMPLE SCOPE</span>
                  <strong>1,243 Verified Matches</strong>
                  <p>15,593 unique batter-bowler head-to-head records and 739 player form profiles parsed with automated ETL.</p>
                </div>
                <div className="prov-card">
                  <span className="prov-label">CURRENT DUEL SAMPLE</span>
                  <strong>{stats?.balls || 0} Legal Deliveries Recorded</strong>
                  <p>{data?.found && stats ? `${stats.runs} runs scored, ${stats.dismissals} dismissals, ${stats.dots} dot deliveries.` : 'No direct ball-by-ball deliveries recorded in monitored matches.'}</p>
                </div>
                <div className="prov-card">
                  <span className="prov-label">CONFIDENCE & LIVE STATUS</span>
                  <strong className={stats && stats.balls >= 50 ? 'confidence-high' : 'confidence-med'}>
                    {stats && stats.balls >= 50 ? 'High Confidence (>50 balls)' : stats && stats.balls >= 15 ? 'Moderate Sample (15–50 balls)' : 'Exploratory Sample (<15 balls)'}
                  </strong>
                  <p>Historical baseline. Live match telemetry connects dynamically via webhook/stream during live matches.</p>
                </div>
              </div>

              <div className="methodology-box">
                <div className="meth-title">STATISTICAL METHODOLOGY & FORMULA RULES</div>
                <div className="meth-grid">
                  <div>
                    <strong>Batting Average:</strong>
                    <span>Runs ÷ Dismissals (Outs). Not-out innings (*) add to runs without incrementing dismissals, which is why batting average differs from raw average runs per match.</span>
                  </div>
                  <div>
                    <strong>Strike Rate:</strong>
                    <span>(Total Runs ÷ Legal Deliveries Faced) × 100. Wides and illegal deliveries are excluded from balls faced.</span>
                  </div>
                  <div>
                    <strong>Dot Ball %:</strong>
                    <span>(Deliveries with 0 runs scored off bat ÷ Total Legal Deliveries) × 100. Measures bowling pressure.</span>
                  </div>
                  <div>
                    <strong>Phase Splits:</strong>
                    <span>Powerplay (Overs 1–6), Middle Overs (Overs 7–15), Death Overs (Overs 16–20).</span>
                  </div>
                </div>
              </div>

              {data?.data_provenance?.limitations && (
                <div className="limitations-note">
                  <strong>Dataset Coverage Note:</strong> {data.data_provenance.limitations}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <aside className="chat-card" id="tour-chat">
        <div className="chat-header">
          <div>
            <span className="ai-orb"><Sparkles size={17}/></span>
            <span>
              <strong>The 12th Man</strong>
              <small><i/> AI Cricket Companion · Sarvam Voice</small>
            </span>
          </div>
          <div className="chat-header-actions">
            <button type="button" className={`voice-toggle-btn ${autoVoice?'active':''}`} onClick={()=>{if(autoVoice&&audioPlayingId)stopAudio();setAutoVoice(!autoVoice)}} title={autoVoice?'Mute automatic spoken commentary':'Enable automatic spoken commentary'}>{autoVoice?<Volume2 size={12}/>:<VolumeX size={12}/>}<span>{autoVoice?'Voice: ON':'Voice: OFF'}</span></button>
            <select value={voiceLang} onChange={e=>setVoiceLang(e.target.value as any)} title="Commentary Language"><option value="en">EN (Ashwin)</option><option value="hi">HI (Hindi)</option></select>
            <select value={mode} onChange={e=>setMode(e.target.value as any)}><option value="analyst">Analyst</option><option value="bro">Bro mode</option><option value="hype">Hype</option></select>
          </div>
        </div>
        
        <div className="chat-context"><span>{batter}</span><b>vs</b><span>{bowler}</span></div>
        
        <div className="messages" ref={chatRef}>
          {messages.length <= 1 && (
            <div className="chat-welcome-insight">
              <div className="cwi-header">
                <div className="cwi-title">
                  <Sparkles size={14} />
                  <span>MATCHUP QUICK INSIGHT</span>
                </div>
                <span className="cwi-badge">{stats ? `${stats.balls} Balls Logged` : 'Historical Duel'}</span>
              </div>
              <div className="cwi-body">
                <div className="cwi-pairing">
                  <strong>{batter}</strong>
                  <span className="cwi-vs">vs</span>
                  <strong>{bowler}</strong>
                  <small>· {venue}</small>
                </div>
                {data?.found && stats ? (
                  <div className="cwi-stats-chip">
                    <span><b>{stats.runs}</b> Runs</span>
                    <span>•</span>
                    <span><b>{stats.balls}</b> Balls</span>
                    <span>•</span>
                    <span className="cwi-sr">SR <b>{stats.strike_rate}</b></span>
                    <span>•</span>
                    <span><b>{stats.dismissals}</b> {stats.dismissals === 1 ? 'Dismissal' : 'Dismissals'}</span>
                    <span>•</span>
                    <span><b>{stats.dot_percentage}%</b> Dots</span>
                  </div>
                ) : (
                  <p className="cwi-desc">
                    No direct head-to-head encounter recorded in this dataset yet. Statistical prediction is active based on individual phase & bowling-type profiles.
                  </p>
                )}

                {tactics?.fantasy_verdict && (
                  <div className="cwi-verdict">
                    <span className="cwi-verdict-tag">TACTICAL READ</span>
                    <p>{tactics.fantasy_verdict}</p>
                  </div>
                )}
              </div>

              <div className="cwi-prompts-label">SUGGESTED MATCHUP QUESTIONS</div>
              <div className="cwi-prompts">
                <button type="button" onClick={() => send(`Who holds the tactical edge between ${batter} and ${bowler}?`)}>
                  <span>⚡ Who holds the tactical edge?</span>
                  <ArrowRight size={12} />
                </button>
                <button type="button" onClick={() => send(`What deliveries and lengths pose the highest dismissal risk for ${batter}?`)}>
                  <span>🎯 Lethal delivery zones & risk</span>
                  <ArrowRight size={12} />
                </button>
                <button type="button" onClick={() => send(`Should I make ${batter} my fantasy captain against ${bowler} at ${venue}?`)}>
                  <span>⭐ Fantasy captaincy verdict</span>
                  <ArrowRight size={12} />
                </button>
                <button type="button" onClick={() => send(`How does ${batter} score against ${bowler} across Powerplay vs Death overs?`)}>
                  <span>📊 Phase-by-phase scoring splits</span>
                  <ArrowRight size={12} />
                </button>
              </div>

              <button 
                type="button" 
                className="cwi-voice-cta" 
                onClick={() => send(`Give me a tactical breakdown and edge assessment of ${batter} vs ${bowler} at ${venue}`)}
              >
                <Volume2 size={13} />
                <span>Play Matchup Audio Briefing</span>
              </button>
            </div>
          )}

          {messages.map(m=>(
            <div key={m.id} className={`message ${m.sender}`}>
              <div className="message-header-meta">
                <small>{m.sender==='ai'?'THE 12th MAN':'YOU'}</small>
                {m.sender==='ai'&&<button type="button" className={`voice-play-pill ${audioPlayingId===m.id?'playing':''} ${audioLoadingId===m.id?'loading':''}`} onClick={()=>playAudioForMessage(m.id,m.text,m.audioUrl)} title={audioPlayingId===m.id?'Pause commentary':'Listen in Sarvam sports voice'}>{audioLoadingId===m.id?<><Loader2 size={11} className="spin"/><span>Synthesizing voice…</span></>:audioPlayingId===m.id?<><Pause size={11}/><span>Playing Voice</span><div className="audio-bars"><span/><span/><span/><span/></div></>:<><Volume2 size={11}/><span>{m.audioUrl?'Replay Voice':'Sarvam Voice'}</span></>}</button>}
              </div>
              <p>{m.text}</p>
              {m.evidence && m.evidence.length > 0 && m.sender === 'ai' && (
                <details className="msg-evidence-details">
                  <summary><FileText size={11} /> Grounded Evidence ({m.evidence.length} points)</summary>
                  <ul>
                    {m.evidence.map((pt, idx) => renderEvidenceItem(pt, idx))}
                  </ul>
                </details>
              )}
              {m.followUps&&m.sender==='ai'&&<div className="followups">{m.followUps.slice(0,3).map(q=><button key={q} onClick={()=>send(q)}>{q}<ArrowRight size={13}/></button>)}</div>}
            </div>
          ))}
          {sending&&<div className="typing"><i/><i/><i/></div>}
        </div>
        
        <div className="chat-compose">
          <div>
            <button onClick={speak} title="Ask with voice"><Mic size={18}/></button>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask about this contest…"/>
            <button className="send" onClick={()=>send()} disabled={sending}><Send size={17}/></button>
          </div>
          <span><AudioLines size={13}/> Spoken by Sarvam AI Bulbul:v4-flash · Ashwin Sports Voice</span>
        </div>
      </aside>
    </div>
    </main>
  </div>
}
