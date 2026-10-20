import { ArrowRight, AudioLines, BarChart3, ChevronRight, MapPin, MessageCircle, ShieldCheck, Sparkles, Swords, Zap } from 'lucide-react';

interface LandingPageProps { onGoToDemo: () => void }
const form = ['75*', '43', '15', '58', '105*'];

export function LandingPage({ onGoToDemo }: LandingPageProps) {
  return (
    <div className="landing">
      <section className="hero-section">
        <div className="hero-grid" aria-hidden="true" />
        <div className="container hero-copy">
          <div className="eyebrow"><span className="live-dot" /> Built for the moments between balls</div>
          <h1>See the battle<br /><em>before it unfolds.</em></h1>
          <p className="hero-lede">The live cricket intelligence companion that turns every player matchup into a clear, tactical story with AI voice commentary—in seconds.</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={onGoToDemo}>Try Interactive Demo <ArrowRight size={18} /></button>
            <a className="text-link" href="#intelligence">Discover the intelligence <ChevronRight size={17} /></a>
          </div>
          <div className="trust-row"><div><strong>15,500+</strong><span>player matchups</span></div><div><strong>1,240+</strong><span>verified matches</span></div><div><strong>&lt; 3 sec</strong><span>to an answer</span></div></div>
        </div>
        <div className="container product-stage">
          <div className="stage-glow" />
          <div className="product-window">
            <div className="window-bar"><div className="window-brand"><span className="brand-mark small"><span /></span> Live matchup desk</div><div className="window-status"><span className="live-dot" /> IPL · LIVE INTELLIGENCE</div></div>
            <div className="preview-grid">
              <div className="duel-panel">
                <div className="panel-kicker">HEAD-TO-HEAD · 110 DELIVERIES</div>
                <div className="players">
                  <div className="player"><img src="https://static.cricbuzz.com/a/img/v1/i1/c616517/virat-kohli.jpg?d=low&p=gthumb" alt="Virat Kohli" /><div><span>BATTER</span><strong>Virat Kohli</strong><small>Right hand · India</small></div></div>
                  <div className="versus">VS</div>
                  <div className="player player-right"><div><span>BOWLER</span><strong>Mitchell Starc</strong><small>Left arm fast · AUS</small></div><img src="https://static.cricbuzz.com/a/img/v1/i1/c351610/mitchell-starc.jpg?d=low&p=gthumb" alt="Mitchell Starc" /></div>
                </div>
                <div className="hero-stats"><div><span>RUNS</span><strong>164</strong></div><div><span>BALLS</span><strong>110</strong></div><div className="accent-stat"><span>STRIKE RATE</span><strong>149.1</strong></div><div><span>DISMISSALS</span><strong>05</strong></div></div>
                <div className="form-row"><div className="form-label"><span>RECENT FORM</span><strong>Avg 74.0 · SR 169.1</strong></div><div className="form-scores">{form.map((score, i) => <span className={i === 4 ? 'hot' : ''} key={score}>{score}<small>{[42,25,11,37,60][i]}b</small></span>)}</div></div>
              </div>
              <div className="insight-panel">
                <div className="insight-head"><div><Sparkles size={16} /> MATCHDAY INSIGHT</div><span>92% confidence</span></div>
                <blockquote>“Kohli owns the matchup once he gets beyond the powerplay.”</blockquote>
                <p>His scoring rate climbs to <strong>165.3</strong> against Starc after the sixth over. The risk window is early: two of five dismissals came against the new ball.</p>
                <div className="verdict"><span>TACTICAL VERDICT</span><strong>Survive the inswing. Attack the change-ups.</strong></div>
                <button onClick={onGoToDemo}>Ask a follow-up <ArrowRight size={16} /></button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="proof-strip"><div className="container proof-inner"><span>Grounded in ball-by-ball data</span><span>CRICSHEET</span><span>IPL ARCHIVE</span><span>VENUE RECORDS</span><span>PLAYER FORM</span></div></section>
      <section id="intelligence" className="section section-dark"><div className="container">
        <div className="section-heading split-heading"><div><span className="section-number">01 / INTELLIGENCE</span><h2>Less noise.<br/><em>More signal.</em></h2></div><p>Scorecards tell you what happened. Matchday tells you why it matters now—with context built for the next delivery.</p></div>
        <div className="feature-bento">
          <article className="feature-card feature-large"><div className="feature-icon"><Swords/></div><span className="feature-index">01</span><h3>Every rivalry,<br/>mapped.</h3><p>Ball-by-ball matchup history, phase splits and dismissal patterns—compressed into the numbers that change the contest.</p><div className="mini-chart">{[38,64,48,82,56,94,71,88].map((h,i)=><span key={i} style={{height:`${h}%`}} className={i===5?'active':''}/>)}</div></article>
          <article className="feature-card feature-map"><div className="feature-icon"><MapPin/></div><span className="feature-index">02</span><h3>Context travels.</h3><p>Venue conditions, recent form and phase-by-phase performance—all in one view.</p><div className="venue-chip"><span>WANKHEDE</span><strong>172.4</strong><small>career strike rate</small></div></article>
          <article className="feature-card feature-ai"><div className="feature-icon"><MessageCircle/></div><span className="feature-index">03</span><h3>Ask cricket,<br/>not a database.</h3><p>Speak naturally. Get evidence-backed answers in English or Hindi, tuned to the way you follow the game.</p><div className="voice-wave"><AudioLines/><i/><i/><i/><i/><i/><i/><span>Listening…</span></div></article>
        </div>
      </div></section>
      <section id="how-it-works" className="section process-section"><div className="container process-grid"><div className="process-intro"><span className="section-number">02 / THE FLOW</span><h2>From question<br/>to <em>edge.</em></h2><p>No dashboards to decode. Pick the contest, see the evidence, ask what matters.</p><button className="button button-dark" onClick={onGoToDemo}>Try it with live data <ArrowRight size={18}/></button></div><div className="steps"><div className="step"><span>01</span><div><h3>Choose the contest</h3><p>Select a batter, bowler, ground and format—or launch a blockbuster rivalry.</p></div><Zap/></div><div className="step"><span>02</span><div><h3>Read the matchup</h3><p>See the pattern across phases, form and venues without hunting through scorecards.</p></div><BarChart3/></div><div className="step"><span>03</span><div><h3>Go one question deeper</h3><p>Ask for the tactical plan, risk window or fantasy verdict in your own words.</p></div><Sparkles/></div></div></div></section>
      <section className="cta-section"><div className="cta-orbit"/><div className="container cta-inner"><div className="eyebrow light"><ShieldCheck size={14}/> VERIFIED MATCH INTELLIGENCE</div><h2>Cricket moves fast.<br/><em>Move with it.</em></h2><button className="button button-primary" onClick={onGoToDemo}>Enter the arena <ArrowRight size={18}/></button></div></section>
      <footer className="footer"><div className="container footer-inner"><div className="brand inverse"><span className="brand-mark"><span/></span>MATCHDAY<span className="brand-dot">.</span>AI</div><p>Built for fans who watch the game between the numbers.</p><div><span>Cricsheet data</span><span>·</span><span>Voice enabled</span></div></div></footer>
    </div>
  );
}
