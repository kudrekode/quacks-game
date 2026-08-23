import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { exactExplosionProbability, type AIDecisionReport } from "./ai.js";
import { FORTUNE_CARDS, POT_TRACK, PRICE_BOOK, RAT_BOUNDARIES, UNLOCK_ROUND } from "./content.js";
import { createGame, deserialize, dispatch, observe, serialize } from "./engine.js";
import type { GameState, IngredientColor, PendingDecision, PlacedToken, PlayerId, PlayerState, Token } from "./types.js";
import { COLOR_ORDER, DECISION_CONTEXT, FORTUNE_COPY, INGREDIENT_META } from "./uiData.js";

const SAVE_KEY = "cauldron-and-chance/save-v1";
const SETTINGS_KEY = "cauldron-and-chance/settings-v1";

interface Settings {
  reducedMotion: boolean;
  highContrast: boolean;
  showRisk: boolean;
  fastAI: boolean;
}

const DEFAULT_SETTINGS: Settings = { reducedMotion: false, highContrast: false, showRisk: true, fastAI: false };

function freshSeed(): string {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  return `brew-${values[0]?.toString(36)}-${values[1]?.toString(36)}`;
}

function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return deserialize(JSON.parse(raw).state as string);
  } catch {
    localStorage.removeItem(SAVE_KEY);
  }
  return createGame({ seed: freshSeed() });
}

function loadSettings(): Settings {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") }; }
  catch { return DEFAULT_SETTINGS; }
}

function titleCase(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function groupedTokens(ids: readonly string[], tokens: Record<string, Token>): Array<{ color: IngredientColor; value: number; count: number }> {
  const counts = new Map<string, { color: IngredientColor; value: number; count: number }>();
  for (const id of ids) {
    const token = tokens[id];
    if (!token) continue;
    const key = `${token.color}:${token.value}`;
    const entry = counts.get(key) ?? { color: token.color, value: token.value, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return [...counts.values()].sort((a, b) => a.color.localeCompare(b.color) || a.value - b.value);
}

function IngredientChip({ token, small = false }: { token: Token; small?: boolean }) {
  const meta = INGREDIENT_META[token.color];
  return (
    <span className={`ingredient-chip ingredient-${token.color}${small ? " chip-small" : ""}`} aria-label={`${meta.name}, value ${token.value}`} title={`${meta.name} · ${meta.note}`}>
      <span aria-hidden="true">{meta.symbol}</span><b>{token.value}</b>
    </span>
  );
}

function TrackPoint({ index }: { index: number }) {
  const angle = -1.35 + index * 0.48;
  const radius = 184 - index * 2.7;
  return { x: 220 + Math.cos(angle) * radius, y: 220 + Math.sin(angle) * radius };
}

function PotBoard({ player, tokens, compact = false }: { player: PlayerState; tokens: Record<string, Token>; compact?: boolean }) {
  const placedByIndex = new Map<number, PlacedToken[]>();
  for (const placed of player.pot) placedByIndex.set(placed.trackIndex, [...(placedByIndex.get(placed.trackIndex) ?? []), placed]);
  const anchor = player.pot.at(-1)?.trackIndex ?? player.ratIndex ?? player.dropletIndex;
  const nextIndex = Math.min(53, anchor + 1);
  const next = POT_TRACK[nextIndex] ?? POT_TRACK.at(-1)!;
  return (
    <div className={`pot-wrap${compact ? " pot-compact" : ""}`}>
      <svg className="pot-board" viewBox="0 0 440 440" role="img" aria-label={`${player.id} pot track, current scoring space ${next.coins} coins and ${next.vp} points`}>
        <defs>
          <radialGradient id={`pot-${player.id}`}><stop offset="0" stopColor="#183b3c"/><stop offset="1" stopColor="#0b2024"/></radialGradient>
          <filter id={`glow-${player.id}`}><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <circle cx="220" cy="220" r="208" fill={`url(#pot-${player.id})`} stroke="#a9783f" strokeWidth="5"/>
        <circle cx="220" cy="220" r="196" fill="none" stroke="#d0aa6b" strokeOpacity=".25" strokeWidth="1" strokeDasharray="3 8"/>
        {POT_TRACK.map((space) => {
          const { x, y } = TrackPoint({ index: space.trackIndex });
          const active = space.trackIndex === nextIndex;
          return <g key={space.trackIndex} transform={`translate(${x} ${y})`}>
            <circle r={active ? 13 : 8.5} className={active ? "track-space active-space" : "track-space"}/>
            {space.ruby && <path d="M0-5 5 0 0 5-5 0Z" className="track-ruby"/>}
            {(space.trackIndex % 5 === 0 || active) && <text y={active ? -17 : -12} className="track-number">{space.coins}</text>}
          </g>;
        })}
        {player.dropletIndex > 0 && (() => { const {x,y}=TrackPoint({index:player.dropletIndex}); return <path transform={`translate(${x} ${y})`} d="M0-12 C8-3 9 3 0 10 C-9 3-8-3 0-12Z" className="droplet-marker"/>; })()}
        {player.ratIndex !== undefined && (() => { const {x,y}=TrackPoint({index:player.ratIndex}); return <text transform={`translate(${x-6} ${y+6})`} className="rat-marker">♙</text>; })()}
        {[...placedByIndex.entries()].map(([index, entries]) => {
          const {x,y}=TrackPoint({index});
          return entries.map((placed, offset) => {
            const token = tokens[placed.tokenId];
            if (!token) return null;
            return <g key={placed.tokenId} transform={`translate(${x + offset * 5} ${y - offset * 5})`} filter={`url(#glow-${player.id})`}>
              <circle r="12" className={`svg-chip ingredient-${token.color}`}/>
              <text y="4" className="svg-chip-symbol">{INGREDIENT_META[token.color].symbol}{token.value}</text>
            </g>;
          });
        })}
        <g transform="translate(220 213)">
          <text textAnchor="middle" className="pot-total">{player.whiteTotal} / {player.explosionThreshold}</text>
          <text y="24" textAnchor="middle" className="pot-caption">WHITE LOAD</text>
          <text y="54" textAnchor="middle" className="pot-reward">{next.coins} coins · {next.vp} VP{next.ruby ? " · ruby" : ""}</text>
        </g>
      </svg>
    </div>
  );
}

function PlayerStats({ player, label, thinking }: { player: PlayerState; label: string; thinking?: string }) {
  return (
    <header className="player-heading">
      <div><span className="eyebrow">{label}</span><h2>{player.id === "human" ? "Your workbench" : "The rival alchemist"}</h2>{thinking && <p className="thinking"><span/> {thinking}</p>}</div>
      <dl className="stats-row">
        <div><dt>VP</dt><dd>{player.score}</dd></div>
        <div><dt>Rubies</dt><dd>◆ {player.rubies}</dd></div>
        <div><dt>Flask</dt><dd>{player.flaskFull ? "Full" : "Empty"}</dd></div>
        <div><dt>Bag</dt><dd>{player.bag.length}</dd></div>
      </dl>
    </header>
  );
}

function BagLedger({ player, tokens, hiddenLabel = false }: { player: PlayerState; tokens: Record<string, Token>; hiddenLabel?: boolean }) {
  const groups = groupedTokens([...player.bag, ...player.pot.map((placed) => placed.tokenId)], tokens);
  return <div className="bag-ledger" aria-label={hiddenLabel ? "Publicly known rival bag composition" : "Your known bag composition"}>
    {groups.map((group) => <span key={`${group.color}:${group.value}`} className="bag-entry"><IngredientChip token={{id:"",color:group.color,value:group.value as Token["value"]}} small/><span>×{group.count}</span></span>)}
  </div>;
}

function ScoreTrack({ game }: { game: GameState }) {
  return <section className="score-card" aria-labelledby="score-title">
    <div className="section-title"><span className="eyebrow">City square</span><h2 id="score-title">Score procession</h2></div>
    <div className="score-track">
      {Array.from({length:50},(_,i)=>i+1).map((score) => {
        const humans = ((game.players.human.score - 1) % 50) + 1 === score && game.players.human.score > 0;
        const ais = ((game.players.ai.score - 1) % 50) + 1 === score && game.players.ai.score > 0;
        return <span key={score} className={`score-space${RAT_BOUNDARIES.includes(score as never)?" rat-boundary":""}`} title={`${score} points`}>
          {(score===1||score%5===0)&&<small>{score}</small>}{humans&&<i className="score-human" aria-label={`You at ${game.players.human.score}`}>Y</i>}{ais&&<i className="score-ai" aria-label={`AI at ${game.players.ai.score}`}>A</i>}
        </span>;
      })}
    </div>
    <div className="score-summary"><span><i className="score-human">Y</i> You {game.players.human.score}{game.players.human.score>=50&&` · lap ${Math.floor(game.players.human.score/50)+1}`}</span><span><i className="score-ai">A</i> Rival {game.players.ai.score}{game.players.ai.score>=50&&` · lap ${Math.floor(game.players.ai.score/50)+1}`}</span></div>
  </section>;
}

function Market({ game }: { game: GameState }) {
  const observation = observe(game, "human");
  return <section className="market-card" aria-labelledby="market-title">
    <div className="section-title"><span className="eyebrow">Ingredient quarter</span><h2 id="market-title">Market</h2></div>
    <div className="market-grid">
      {COLOR_ORDER.map((color) => {
        const meta = INGREDIENT_META[color];
        const locked = game.round < UNLOCK_ROUND[color];
        const prices = PRICE_BOOK[color] ?? {};
        return <article key={color} className={`market-item ingredient-border-${color}${locked?" market-locked":""}`}>
          <div className="market-name"><span className={`market-symbol ingredient-${color}`}>{meta.symbol}</span><div><b>{meta.name}</b><small>{locked ? `Unlocks round ${UNLOCK_ROUND[color]}` : meta.note}</small></div></div>
          <div className="market-prices">{Object.entries(prices).map(([value,cost])=><span key={value}><b>{value}</b><small>{cost}¢ · {observation.supplyCounts[`${color}:${value}`]??0} left</small></span>)}</div>
        </article>;
      })}
    </div>
  </section>;
}

function optionLabel(option: string, game: GameState): string {
  if (option === "DRAW") return "Draw again";
  if (option === "STOP") return "Stop brewing";
  if (option === "USE_FLASK") return "Use flask";
  if (option === "none") return "Choose nothing";
  if (option === "done") return "Finish";
  if (option === "droplet") return "Advance droplet";
  if (option === "flask") return "Refill flask";
  if (option === "score") return "Keep victory points";
  if (option === "buy") return "Keep shopping coins";
  if (option === "place") return "Place it";
  if (option === "return") return "Return it safely";
  if (option === "remove") return "Return the white chip";
  if (option === "keep") return "Keep the white chip";
  if (option === "restart") return "Restart this brew";
  if (option === "continue") return "Continue this brew";
  if (option.startsWith("token:")) {
    const token = game.tokens[option.slice(6)];
    return token ? `${INGREDIENT_META[token.color].name} ${token.value}` : option;
  }
  if (option.startsWith("buy:")) return option.slice(4).split("+").map((part)=>{const [color,value]=part.split(":");return `${INGREDIENT_META[color as IngredientColor]?.name ?? color} ${value}`;}).join(" + ");
  if (option.startsWith("tier:")) return `Reward tier ${option.slice(5)}`;
  if (option.startsWith("exchange:")) return `Trade ${option.slice(9)} rat tail${option.endsWith(":1")?"":"s"}`;
  if (option.startsWith("upgrade:")) { const token=game.tokens[option.split(":")[1]??""]; return `Upgrade ${token ? INGREDIENT_META[token.color].name : "ingredient"} to ${option.split(":")[2]}`; }
  const [maybeColor, maybeValue] = option.split(":");
  if (INGREDIENT_META[maybeColor as IngredientColor]) return `${INGREDIENT_META[maybeColor as IngredientColor].name} ${maybeValue}`;
  return titleCase(option.replaceAll(":", " "));
}

function DecisionCard({ pending, game, risk, onChoose }: { pending: PendingDecision; game: GameState; risk?: number; onChoose: (choice:string)=>void }) {
  const player = game.players.human;
  return <section className="decision-card" aria-labelledby="decision-title">
    <div className="decision-kicker"><span className="pulse-dot"/> Your decision · {titleCase(pending.kind)}</div>
    <h2 id="decision-title">{pending.prompt}</h2>
    <p>{DECISION_CONTEXT[pending.kind]}</p>
    {pending.kind === "BREW_ACTION" && <div className="risk-meter"><div>{risk !== undefined ? <><b>{Math.round(risk*100)}%</b><span>immediate explosion risk</span></> : <><b>Risk hidden</b><span>Enable it in display settings</span></>}</div>{risk !== undefined && <div className="risk-bar"><span style={{width:`${risk*100}%`}}/></div>}<small>White load {player.whiteTotal}/{player.explosionThreshold} · {player.bag.length} ingredients remain</small></div>}
    <div className="decision-options">
      {pending.options.map((option,index)=><button key={option} className={option === "DRAW" ? "button-primary" : "button-secondary"} onClick={()=>onChoose(option)} autoFocus={index===0}>
        <span>{optionLabel(option,game)}</span>{option === "DRAW" && <small>Reveal one unknown ingredient</small>}
      </button>)}
    </div>
  </section>;
}

function RoundRail({ round }: { round: number }) {
  return <div className="round-rail" aria-label={`Round ${round} of 9`}>
    {Array.from({length:9},(_,index)=>index+1).map((value)=><span key={value} className={value<round?"round-done":value===round?"round-current":""}><b>{value}</b>{value===2&&<small>Y</small>}{value===3&&<small>P</small>}{value===6&&<small>+</small>}</span>)}
  </div>;
}

function GameLog({ game }: { game: GameState }) {
  const entries = game.log.slice(-18).reverse();
  return <section className="log-card" aria-labelledby="log-title"><div className="section-title"><span className="eyebrow">Ledger</span><h2 id="log-title">Brew log</h2></div><ol aria-live="polite">
    {entries.map((entry)=><li key={entry.eventId}><span>{entry.seq+1}</span><div><b>{titleCase(entry.type)}</b><small>{entry.actor ? `${entry.actor === "human" ? "You" : "Rival"} · ` : ""}{Object.entries(entry.publicPayload).map(([key,value])=>`${titleCase(key)} ${String(value)}`).join(" · ")}</small></div></li>)}
  </ol></section>;
}

export function App() {
  const [game, setGame] = useState<GameState>(loadGame);
  const [choices, setChoices] = useState<string[]>([]);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [seedInput, setSeedInput] = useState(game.config.seed);
  const [aiStatus, setAiStatus] = useState("ready");
  const [aiReport, setAiReport] = useState<(AIDecisionReport & { latencyMs: number }) | undefined>();
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const gameRef = useRef(game);
  gameRef.current = game;

  const resolveChoice = useCallback((choice: string) => {
    setGame((current) => {
      const pending = current.pendingDecision;
      if (!pending || !pending.options.includes(choice)) return current;
      setChoices((history) => [...history, choice]);
      return dispatch(current, { type: "RESOLVE_DECISION", decisionId: pending.id, choice });
    });
  }, []);

  useEffect(() => {
    const worker = new Worker(new URL("./ai.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<{decisionId:string;report?:AIDecisionReport;latencyMs?:number;error?:string}>) => {
      const current = gameRef.current;
      if (current.pendingDecision?.id !== event.data.decisionId || current.pendingDecision.actor !== "ai") return;
      if (event.data.error || !event.data.report) {
        setAiStatus("needs attention"); setNotice(event.data.error ?? "The AI worker returned no action."); return;
      }
      setAiReport({...event.data.report,latencyMs:event.data.latencyMs??0});
      setAiStatus(event.data.report.summary);
      const delay = settings.fastAI || settings.reducedMotion ? 0 : 420;
      window.setTimeout(() => resolveChoice(event.data.report!.choice), delay);
    };
    return () => worker.terminate();
  }, [resolveChoice, settings.fastAI, settings.reducedMotion]);

  useEffect(() => {
    const pending = game.pendingDecision;
    if (pending?.actor !== "ai" || !workerRef.current) return;
    setAiStatus("weighing risk…");
    workerRef.current.postMessage({ observation: observe(game,"ai"), pending, seed: `${game.config.seed}/ai/ai` });
  }, [game.revision, game.pendingDecision?.id, game.config.seed]);

  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({version:1,state:serialize(game),choices}));
  }, [game, choices]);
  useEffect(() => localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings)), [settings]);

  const humanObservation = useMemo(() => observe(game,"human"), [game]);
  const risk = useMemo(() => exactExplosionProbability(humanObservation,"human"), [humanObservation]);
  const fortune = FORTUNE_CARDS.find((card)=>card.id===game.activeFortune);

  const startNewGame = () => {
    if (game.revision > 0 && game.phase !== "GAME_OVER" && !window.confirm("Abandon this brew and begin a new game?")) return;
    const seed = seedInput.trim() || freshSeed();
    setChoices([]); setAiReport(undefined); setNotice(""); setGame(createGame({seed})); setSeedInput(seed);
  };

  const brewAnother = () => {
    const seed = freshSeed();
    setSeedInput(seed); setChoices([]); setAiReport(undefined); setNotice(""); setGame(createGame({seed}));
  };

  const exportReplay = () => {
    const data = JSON.stringify({version:1,seed:game.config.seed,choices,state:serialize(game)},null,2);
    const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([data],{type:"application/json"}));link.download=`cauldron-${game.config.seed}.json`;link.click();URL.revokeObjectURL(link.href);
  };

  const importReplay = async (file: File) => {
    try {
      const data=JSON.parse(await file.text()) as {state?:string;choices?:string[]};
      if(!data.state)throw new Error("This file has no saved game state.");
      const loaded=deserialize(data.state);setGame(loaded);setChoices(data.choices??[]);setSeedInput(loaded.config.seed);setNotice("Replay loaded.");
    } catch(error) { setNotice(error instanceof Error?error.message:"Could not load this replay."); }
  };

  const winnerText = game.result ? (game.result.winners.length===2?"A shared victory":game.result.winners[0]==="human"?"You won the festival":"The rival won this time") : "";

  return <div className={`${settings.highContrast?"high-contrast ":""}${settings.reducedMotion?"reduced-motion":""}`}>
    <a href="#decision" className="skip-link">Skip to current decision</a>
    <header className="app-header">
      <div className="brand"><span className="brand-mark" aria-hidden="true">C</span><div><span>QUEDLINBURG · NIGHT MARKET</span><h1>Cauldron <i>&</i> Chance</h1></div></div>
      <div className="game-tools">
        <label><span>Game seed</span><input value={seedInput} onChange={(e)=>setSeedInput(e.target.value)} aria-label="Game seed"/></label>
        <button onClick={startNewGame}>New game</button><button onClick={exportReplay}>Export</button><button onClick={()=>fileRef.current?.click()}>Import</button>
        <input ref={fileRef} className="visually-hidden" type="file" accept="application/json" onChange={(e)=>{const file=e.target.files?.[0];if(file)void importReplay(file);}}/>
      </div>
    </header>

    <main>
      <section className="status-ribbon">
        <div><span className="eyebrow">Round {game.round} of 9</span><strong>{titleCase(game.phase)}</strong></div>
        <RoundRail round={game.round}/>
        <div className="start-player"><span>First flask</span><b>{game.startPlayerId === "human" ? "You" : "Rival"}</b></div>
      </section>

      {notice && <div className="notice" role="status">{notice}<button aria-label="Dismiss notice" onClick={()=>setNotice("")}>×</button></div>}

      {fortune && <section className="fortune-card"><div className="fortune-orbit" aria-hidden="true">✦</div><div><span className="eyebrow">Fortune {fortune.timing === "ROUND" ? "· lasts this round" : "· immediate"}</span><h2>{fortune.title}</h2><p>{FORTUNE_COPY[fortune.id]}</p></div><span className="fortune-id">{fortune.id}</span></section>}

      {game.phase === "GAME_OVER" && game.result && <section className="end-card" aria-labelledby="end-title"><span className="eyebrow">The ninth brew is complete</span><h2 id="end-title">{winnerText}</h2><p><b>{game.result.scores.human}</b> points to <b>{game.result.scores.ai}</b>. Final pot distances: {game.result.tieBreakIndices.human} and {game.result.tieBreakIndices.ai}.</p><div><button className="button-primary" onClick={brewAnother}>Brew another game</button><button className="button-secondary" onClick={exportReplay}>Save this replay</button></div><small>Seed · {game.config.seed}</small></section>}

      <div className="game-grid">
        <section className="human-panel panel">
          <PlayerStats player={game.players.human} label="Human brewer"/>
          <div className="human-workbench">
            <PotBoard player={game.players.human} tokens={game.tokens}/>
            <div className="bench-side">
              <div className="mini-card"><span className="eyebrow">Known ingredients</span><BagLedger player={game.players.human} tokens={game.tokens}/></div>
              <div id="decision">{game.pendingDecision?.actor === "human" ? <DecisionCard pending={game.pendingDecision} game={game} risk={settings.showRisk?risk:undefined} onChoose={resolveChoice}/> : <div className="waiting-card"><span className="waiting-rings"/><h2>{game.phase === "GAME_OVER" ? "Festival complete" : "The rival is deciding"}</h2><p>{game.phase === "GAME_OVER" ? "Start a new seeded game or export this replay." : aiStatus}</p></div>}</div>
            </div>
          </div>
        </section>

        <aside className="shared-column">
          <ScoreTrack game={game}/>
          <section className="settings-card"><div className="section-title"><span className="eyebrow">Comfort</span><h2>Display settings</h2></div>
            <label><input type="checkbox" checked={settings.showRisk} onChange={(e)=>setSettings({...settings,showRisk:e.target.checked})}/> Show risk percentage</label>
            <label><input type="checkbox" checked={settings.reducedMotion} onChange={(e)=>setSettings({...settings,reducedMotion:e.target.checked})}/> Reduced motion</label>
            <label><input type="checkbox" checked={settings.fastAI} onChange={(e)=>setSettings({...settings,fastAI:e.target.checked})}/> Skip AI pause</label>
            <label><input type="checkbox" checked={settings.highContrast} onChange={(e)=>setSettings({...settings,highContrast:e.target.checked})}/> High contrast</label>
          </section>
          {aiReport && <section className="ai-note"><span className="eyebrow">Last AI thought · {aiReport.latencyMs} ms</span><p>{aiReport.summary}</p></section>}
        </aside>

        <section className="ai-panel panel">
          <PlayerStats player={game.players.ai} label="Monte Carlo AI" thinking={game.pendingDecision?.actor==="ai"?aiStatus:undefined}/>
          <PotBoard player={game.players.ai} tokens={game.tokens} compact/>
          <div className="mini-card"><span className="eyebrow">Public bag record</span><BagLedger player={game.players.ai} tokens={game.tokens} hiddenLabel/></div>
        </section>
      </div>

      <div className="lower-grid"><Market game={game}/><GameLog game={game}/></div>
    </main>
    <footer><span>Deterministic rules engine · Monte Carlo policy v1</span><span>Seed {game.config.seed} · revision {game.revision}</span></footer>
  </div>;
}
