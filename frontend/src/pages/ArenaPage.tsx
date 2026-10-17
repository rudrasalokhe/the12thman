import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, AudioLines, BarChart3, ChevronDown, CircleGauge, Loader2, MapPin, Mic, Pause, Search, Send, Sparkles, Swords, TrendingUp, Volume2, VolumeX } from 'lucide-react';
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
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const rootRef=useRef<HTMLDivElement>(null),chatRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    Promise.all([fetchMarqueeMatchups(),fetchPlayers(),fetchVenues()]).then(([m,p,v])=>{
      setMarquees(m);
      if(p && p.length > 0) setPlayers(p);
      setVenues(v);
    });
    setMessages([{id:'welcome',sender:'ai',text:'I’m across this contest. Ask me about the matchup, recent form, venue record, or tactical plan.',timestamp:'Now',followUps:['Who holds the edge here?','What is the powerplay risk?','Give me the fantasy verdict.']}]);
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

    let audioSrc = existingAudioUrl;
    if (!audioSrc) {
      setAudioLoadingId(msgId);
      try {
        audioSrc = await generateVoiceTTS(text, voiceLang);
        if (audioSrc) {
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, audioUrl: audioSrc } : m));
        }
      } catch (err) {
        console.error("Audio generation failed", err);
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
          setAudioPlayingId(null);
          currentAudioRef.current = null;
        };
        await audio.play();
      } catch (playErr) {
        console.warn("Audio playback interrupted or blocked", playErr);
        setAudioPlayingId(null);
      }
    }
  };

  const send = async (text = input) => {
    if (!text.trim() || sending) return;
    const userMsgId = `u${Date.now()}`;
    const userText = text.trim();
    setMessages(x => [...x, { id: userMsgId, sender: 'user', text: userText, timestamp: 'Now' }]);
    setInput('');
    setSending(true);

    try {
      // Fetch text answer instantly (sub-second) without blocking on TTS WAV generation
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
          audioUrl: null
        }
      ]);
      setSending(false);

      if (autoVoice && r.reply) {
        playAudioForMessage(aiMsgId, r.reply);
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

  const speak=()=>{const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!SR)return;const r=new SR();r.lang=voiceLang==='hi'?'hi-IN':'en-IN';r.onresult=(e:any)=>send(e.results[0][0].transcript);r.start()};
  const launch=(m:MarqueeMatchup)=>{setBatter(m.batter);setBowler(m.bowler);setVenue(m.venue||'All Venues');setFormat(m.format||'IPL / T20')};

  return <div className="arena" ref={rootRef}>
    <div className="arena-ticker"><div className="container"><span><i/> FEATURED RIVALRIES</span><div>{marquees.map(m=><button key={m.id} className={m.batter===batter&&m.bowler===bowler?'active':''} onClick={()=>launch(m)}>{m.batter.split(' ').pop()} <b>vs</b> {m.bowler.split(' ').pop()}</button>)}</div></div></div>
    <main className="container arena-main">
      <header className="arena-heading"><div><span>THE MATCHUP ARENA</span><h1>Read the contest.</h1><p>History, current form and tactical intelligence in one live workspace.</p></div><div className="data-status"><i/><span><strong>DATA DESK ONLINE</strong>Verified match logs</span></div></header>
      <section className="matchup-control"><div className="control-label"><Swords size={17}/> SELECT THE BATTLE</div><div className="matchup-players"><PlayerSelect label="Batter" value={batter} players={players} open={open==='batter'} onToggle={()=>setOpen(open==='batter'?null:'batter')} onSelect={v=>{setBatter(v);setOpen(null)}}/><div className="arena-vs"><span>VS</span></div><PlayerSelect label="Bowler" value={bowler} players={players} open={open==='bowler'} onToggle={()=>setOpen(open==='bowler'?null:'bowler')} onSelect={v=>{setBowler(v);setOpen(null)}}/></div><div className="filters"><label><MapPin size={15}/><span>VENUE</span><select value={venue} onChange={e=>setVenue(e.target.value)}>{venues.map(v=><option key={v}>{v}</option>)}</select></label><label><CircleGauge size={15}/><span>FORMAT</span><select value={format} onChange={e=>setFormat(e.target.value)}><option>IPL / T20</option><option>ODI</option><option>Test</option></select></label></div></section>
      <div className="arena-grid"><div className="analysis-column">
        <section className="arena-card stat-card"><div className="card-title"><div><BarChart3 size={17}/><span>HEAD-TO-HEAD</span></div><small>{stats?.balls||0} recorded deliveries</small></div>{loadingMatchup?<div className="skeleton-block"/>:data?.found&&stats?<><div className="big-stats"><div><span>RUNS</span><strong>{stats.runs}</strong><small>scored</small></div><div className="key-stat"><span>STRIKE RATE</span><strong>{stats.strike_rate}</strong><small>{stats.strike_rate>=130?'attacking return':'controlled return'}</small></div><div><span>DISMISSALS</span><strong>{stats.dismissals}</strong><small>in matchup</small></div><div><span>DOT BALLS</span><strong>{stats.dot_percentage}%</strong><small>{stats.dots} deliveries</small></div></div><div className="phase-analysis"><div className="phase-head"><span>SCORING BY PHASE</span><span>Strike rate</span></div>{phases.map(([name,p]:any)=><div className="phase-row" key={name}><span>{name}</span><div><i style={{width:`${Math.min(100,(p.strike_rate||0)/2)}%`}}/></div><strong>{p.strike_rate}</strong><small>{p.runs} off {p.balls}</small></div>)}</div></>:<div className="empty-state">No direct matchup sample is available for this pairing yet.</div>}</section>
        <section className="arena-card context-card"><div className="card-title"><div><TrendingUp size={17}/><span>FORM & CONTEXT</span></div><small>Recent innings</small></div><div className="recent-form"><div><span>LAST FIVE</span><strong>{data?.recent_form?.last_5_avg||'—'} <small>average</small></strong></div><div className="score-pills">{(data?.recent_form?.last_5_scores||['—','—','—','—','—']).map((s,i)=><span key={i}>{s}</span>)}</div></div><div className="context-metrics"><div><span>RECENT STRIKE RATE</span><strong>{data?.recent_form?.last_5_sr||'—'}</strong></div><div><span>VENUE AVERAGE</span><strong>{data?.venue_record?.average||'—'}</strong></div><div><span>VENUE HIGH</span><strong>{data?.venue_record?.highest||'—'}</strong></div></div></section>
        <section className="arena-card tactics-card"><div className="card-title"><div><Sparkles size={17}/><span>TACTICAL BLUEPRINT</span></div><div className="tabs"><button className={tab==='batter'?'active':''} onClick={()=>setTab('batter')}>Batter plan</button><button className={tab==='bowler'?'active':''} onClick={()=>setTab('bowler')}>Bowler plan</button></div></div>{loadingTactics?<div className="skeleton-block small"/>:<div className="plan"><h3>{tab==='batter'?tactics?.batter_plan?.title:tactics?.bowler_plan?.title}</h3><div className="plan-grid"><div><span>{tab==='batter'?'WHAT WORKS':'PRESSURE POINTS'}</span><ul>{(tab==='batter'?tactics?.batter_plan?.strengths:tactics?.bowler_plan?.pressure_points)?.map(x=><li key={x}>{x}</li>)}</ul></div><div><span>THE PLAN</span><ul>{(tab==='batter'?tactics?.batter_plan?.suggested_approach:tactics?.bowler_plan?.suggested_approach)?.map(x=><li key={x}>{x}</li>)}</ul></div></div>{tactics?.fantasy_verdict&&<div className="fantasy"><span>FANTASY READ</span><p>{tactics.fantasy_verdict}</p></div>}</div>}</section>
      </div><aside className="chat-card"><div className="chat-header"><div><span className="ai-orb"><Sparkles size={17}/></span><span><strong>Matchday analyst</strong><small><i/> Sarvam Sports Voice Active</small></span></div><div className="chat-header-actions"><button type="button" className={`voice-toggle-btn ${autoVoice?'active':''}`} onClick={()=>{if(autoVoice&&audioPlayingId)stopAudio();setAutoVoice(!autoVoice)}} title={autoVoice?'Mute automatic spoken commentary':'Enable automatic spoken commentary'}>{autoVoice?<Volume2 size={12}/>:<VolumeX size={12}/>}<span>{autoVoice?'Voice: ON':'Voice: OFF'}</span></button><select value={voiceLang} onChange={e=>setVoiceLang(e.target.value as any)} title="Commentary Language"><option value="en">EN (Ashwin)</option><option value="hi">HI (Hindi)</option></select><select value={mode} onChange={e=>setMode(e.target.value as any)}><option value="analyst">Analyst</option><option value="bro">Bro mode</option><option value="hype">Hype</option></select></div></div><div className="chat-context"><span>{batter}</span><b>vs</b><span>{bowler}</span></div><div className="messages" ref={chatRef}>{messages.map(m=><div key={m.id} className={`message ${m.sender}`}><div className="message-header-meta"><small>{m.sender==='ai'?'MATCHDAY AI':'YOU'}</small>{m.sender==='ai'&&<button type="button" className={`voice-play-pill ${audioPlayingId===m.id?'playing':''} ${audioLoadingId===m.id?'loading':''}`} onClick={()=>playAudioForMessage(m.id,m.text,m.audioUrl)} title={audioPlayingId===m.id?'Pause commentary':'Listen in Sarvam sports voice'}>{audioLoadingId===m.id?<><Loader2 size={11} className="spin"/><span>Synthesizing voice…</span></>:audioPlayingId===m.id?<><Pause size={11}/><span>Playing Voice</span><div className="audio-bars"><span/><span/><span/><span/></div></>:<><Volume2 size={11}/><span>{m.audioUrl?'Replay Voice':'Spoken Audio'}</span></>}</button>}</div><p>{m.text}</p>{m.followUps&&m.sender==='ai'&&<div className="followups">{m.followUps.slice(0,3).map(q=><button key={q} onClick={()=>send(q)}>{q}<ArrowRight size={13}/></button>)}</div>}</div>)}{sending&&<div className="typing"><i/><i/><i/></div>}</div><div className="chat-compose"><div><button onClick={speak} title="Ask with voice"><Mic size={18}/></button><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask about this contest…"/><button className="send" onClick={()=>send()} disabled={sending}><Send size={17}/></button></div><span><AudioLines size={13}/> Spoken by Sarvam AI Bulbul:v4-flash · Ashwin Sports Voice</span></div></aside></div>
    </main>
  </div>
}
