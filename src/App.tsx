import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { exactExplosionProbability, type AIDecisionReport } from "./ai.js";
import { FORTUNE_CARDS, POT_TRACK, PRICE_BOOK, RAT_BOUNDARIES, UNLOCK_ROUND } from "./content.js";
import { createGame, deserialize, dispatch, observe, serialize } from "./engine.js";
import { createDebugGame, debugStateFromLocation } from "./debugStates.js";
import { GameIcon, type GameIconName } from "./GameIcon.js";
import type { GameLogEntry, GameState, IngredientColor, PendingDecision, PlayerState, Token } from "./types.js";
import { COLOR_ORDER, DECISION_CONTEXT, FORTUNE_COPY, INGREDIENT_META } from "./uiData.js";
import { BOARD_ASSET, ingredientAsset } from "./uiAssets.js";
import { HumanPotBoard } from "./HumanPotBoard.js";

const SAVE_KEY = "cauldron-and-chance/save-v1";
const SETTINGS_KEY = "cauldron-and-chance/settings-v2";
const DEBUG_STATE = debugStateFromLocation();

interface Settings {
  reducedMotion: boolean;
  highContrast: boolean;
  showRisk: boolean;
  fastAI: boolean;
  showBag: boolean;
  showAIDetails: boolean;
}

interface RoundSummaryData {
  round: number;
  humanScore: number;
  aiScore: number;
  humanRubies: number;
  aiRubies: number;
  nextHumanRats: number;
  nextAiRats: number;
}

interface ToastData { id: number; tone: "good" | "warning" | "info"; title: string; body: string }

const DEFAULT_SETTINGS: Settings = {
  reducedMotion: false, highContrast: false, showRisk: true,
  fastAI: false, showBag: true, showAIDetails: true,
};

function freshSeed(): string {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  return `brew-${values[0]?.toString(36)}-${values[1]?.toString(36)}`;
}

function loadGame(): GameState {
  if (DEBUG_STATE && DEBUG_STATE !== "home") return createDebugGame(DEBUG_STATE);
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return deserialize(JSON.parse(raw).state as string);
  } catch { localStorage.removeItem(SAVE_KEY); }
  return createGame({ seed: freshSeed() });
}

function loadSettings(): Settings {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") }; }
  catch { return DEFAULT_SETTINGS; }
}

function titleCase(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function groupedTokens(ids: readonly string[], tokens: Record<string, Token>) {
  const counts = new Map<string, { color: IngredientColor; value: Token["value"]; count: number }>();
  for (const id of ids) {
    const token = tokens[id]; if (!token) continue;
    const key = `${token.color}:${token.value}`;
    const entry = counts.get(key) ?? { color: token.color, value: token.value, count: 0 };
    entry.count += 1; counts.set(key, entry);
  }
  return [...counts.values()].sort((a,b)=>a.color.localeCompare(b.color)||a.value-b.value);
}

function scoringData(player: PlayerState) {
  const anchor = player.pot.at(-1)?.trackIndex ?? player.ratIndex ?? player.dropletIndex;
  const index = Math.min(53, anchor + 1);
  return { anchor, index, space: POT_TRACK[index] ?? POT_TRACK.at(-1)! };
}

function ingredientDetail(token: Token): string {
  const price = PRICE_BOOK[token.color]?.[token.value];
  const move = `Moves ${token.value} space${token.value === 1 ? "" : "s"}.`;
  return `${move} ${INGREDIENT_META[token.color].note}.${price === undefined ? " Not sold in the market." : ` Market price: ${price} coins.`}`;
}

function IngredientChip({ token, small = false, onInspect }: { token: Token; small?: boolean; onInspect?: (token:Token)=>void }) {
  const meta=INGREDIENT_META[token.color];
  const content=<><img src={ingredientAsset(token.color,token.value)} alt="" aria-hidden="true"/><b aria-hidden="true">{token.value}</b></>;
  if(onInspect)return <button className={`ingredient-chip ingredient-${token.color}${small?" chip-small":""}`} onClick={()=>onInspect(token)} aria-label={`Inspect ${meta.name} ${token.value}`} title={ingredientDetail(token)}>{content}</button>;
  return <span className={`ingredient-chip ingredient-${token.color}${small?" chip-small":""}`} aria-label={`${meta.name}, value ${token.value}`} title={ingredientDetail(token)}>{content}</span>;
}

function Resource({icon,label,value}:{icon:GameIconName;label:string;value:React.ReactNode}) {return <div className="resource"><GameIcon name={icon}/><span>{label}<b>{value}</b></span></div>}

function BagLedger({player,tokens,label="Your bag"}:{player:PlayerState;tokens:Record<string,Token>;label?:string}) {
  const groups=groupedTokens(player.bag,tokens);
  return <section className="bag-popover"><header><div><span className="eyebrow">Live composition</span><h3>{label}</h3></div><b>{player.bag.length} tokens</b></header><div className="bag-grid">{groups.map(group=><div key={`${group.color}:${group.value}`}><IngredientChip token={{id:"",color:group.color,value:group.value}} small/><span><b>{INGREDIENT_META[group.color].name}</b><small>Value {group.value} x {group.count}</small></span></div>)}</div><p>No order is stored or shown. Every draw samples this current pool.</p></section>;
}

function BrewingStatus({game,risk,showRisk}:{game:GameState;risk:number;showRisk:boolean}) {
  const player=game.players.human;const {anchor,space}=scoringData(player);const brewing=game.phase==="BREWING"||game.phase==="POST_BREW";
  const riskState=player.exploded?"Exploded":player.whiteTotal>=player.explosionThreshold-1?"Danger":player.whiteTotal>=player.explosionThreshold-2?"Caution":"Safe";
  return <section className={`brewing-status${player.exploded?" status-exploded":""}`} aria-label="Current brewing status">
    <div className="status-title"><GameIcon name={player.exploded?"explosion":"spark"}/><span><small>{game.round===9?"Final-round brew":brewing?"Potion status":"Current pot"}</small><b>{player.exploded?"Pot exploded":game.round===9&&game.pendingDecision?.kind==="ROUND9_COMMIT"?"Choose in secret":"Brew under control"}</b></span></div>
    <div className="risk-dial" aria-label={`White risk ${player.whiteTotal} of ${player.explosionThreshold}, ${riskState}`}><img src={BOARD_ASSET.riskGauge} alt=""/><strong>{player.whiteTotal} / {player.explosionThreshold}</strong><span>{riskState}</span></div>
    <div className="brew-facts"><Resource icon="round" label="Current space" value={anchor}/><Resource icon="coin" label="Buying power" value={space.coins}/><Resource icon="vp" label="Victory points" value={space.vp}/><Resource icon="explosion" label="White total" value={`${player.whiteTotal} / ${player.explosionThreshold}`}/></div>
    <div className="explosion-meter"><span style={{width:`${Math.min(100,player.whiteTotal/player.explosionThreshold*100)}%`}}/><i style={{left:`${Math.min(100,player.whiteTotal/player.explosionThreshold*100)}%`}}/></div>
    <p>{showRisk?`${Math.round(risk*100)}% chance the next random ingredient causes an immediate explosion.`:"Risk percentage hidden. White total and threshold remain visible."}{game.round===9?" Your draw or stop choice is hidden until both brewers commit.":""}</p>
  </section>;
}

function optionLabel(option:string,game:GameState):string {
  const labels:Record<string,string>={DRAW:"Draw ingredient",STOP:"Stop brewing",USE_FLASK:"Use flask",none:"Choose nothing",done:"Finish",droplet:"Advance droplet",flask:"Refill flask",score:"Keep victory points",buy:"Keep shopping coins",place:"Place it",return:"Return it to the live bag",remove:"Return the white ingredient",keep:"Keep the white ingredient",restart:"Restart this brew",continue:"Continue this brew","vp:4":"Gain 4 victory points","rubies:3":"Gain 3 rubies","rat-vp":"Gain points from rat tails",decline:"Decline"};
  if(labels[option])return labels[option];
  if(option.startsWith("token:")){const token=game.tokens[option.slice(6)];return token?`${INGREDIENT_META[token.color].name} ${token.value}`:option}
  if(option.startsWith("tier:")){const tier=Number(option.slice(5));return tier===1?"Gain 1 victory point":tier===2?"Gain 1 victory point and 1 ruby":"Gain 2 victory points and advance your droplet"}
  if(option.startsWith("exchange:")){const n=Number(option.slice(9));return n===0?"Keep every rat tail":`Trade ${n} rat tail${n===1?"":"s"} for ${n} ${n===1?"ruby":"rubies"}`}
  if(option.startsWith("upgrade:")){const token=game.tokens[option.split(":")[1]??""];return `Upgrade ${token?INGREDIENT_META[token.color].name:"ingredient"} to value ${option.split(":")[2]}`}
  const[c,v]=option.split(":");if(INGREDIENT_META[c as IngredientColor])return `${INGREDIENT_META[c as IngredientColor].name} ${v}`;
  return titleCase(option.replaceAll(":"," "));
}

function purchaseCost(option:string):number {
  if(option==="none")return 0;return option.slice(4).split("+").reduce((sum,part)=>{const[c,v]=part.split(":");return sum+(PRICE_BOOK[c as IngredientColor]?.[Number(v) as Token["value"]]??0)},0);
}

function PurchaseDecision({pending,game,onChoose}:{pending:PendingDecision;game:GameState;onChoose:(choice:string)=>void}) {
  const [selected,setSelected]=useState("none");useEffect(()=>setSelected("none"),[pending.id]);const budget=game.players.human.roundCoins;
  return <section className="purchase-decision"><div className="decision-heading"><img className="purchase-cart" src={BOARD_ASSET.cart} alt=""/><div><span className="eyebrow">Market phase</span><h2>You have {budget} buying power</h2><p>Select one legal basket. You may buy up to two ingredients of different colors.</p></div></div><div className="basket-grid">{pending.options.map(option=><button key={option} className={selected===option?"basket selected":"basket"} onClick={()=>setSelected(option)}><span>{optionLabel(option,game)}</span><b>{purchaseCost(option)} / {budget}</b></button>)}</div><div className="purchase-total"><span>Selected total <b>{purchaseCost(selected)} coins</b></span><button className="button-primary" onClick={()=>onChoose(selected)}>Confirm purchase</button></div></section>;
}

function DecisionPanel({pending,game,onChoose}:{pending:PendingDecision;game:GameState;onChoose:(choice:string)=>void}) {
  if(pending.kind==="PURCHASE")return <PurchaseDecision pending={pending} game={game} onChoose={onChoose}/>;
  const brewing=pending.kind==="BREW_ACTION"||pending.kind==="ROUND9_COMMIT";
  const purpleCount=Number(pending.data.count??0);
  return <section className={`decision-card${brewing?" brewing-guidance":""}`} id="decision" aria-labelledby="decision-title"><div className="decision-kicker"><span className="pulse-dot"/> Your turn / {titleCase(pending.kind)}</div><h2 id="decision-title">{brewing?(pending.kind==="ROUND9_COMMIT"?"Draw another ingredient or stop, secretly.":"Draw another ingredient or stop brewing."):pending.prompt}</h2><p>{DECISION_CONTEXT[pending.kind]}</p>{pending.kind==="PURPLE_TIER"&&<div className="purple-rewards" aria-label={`${purpleCount} purple ingredients`}><div className={purpleCount===1?"current":""}><b>1 Purple</b><span>+1 victory point</span></div><div className={purpleCount===2?"current":""}><b>2 Purple</b><span>+1 victory point and +1 ruby</span></div><div className={purpleCount>=3?"current":""}><b>3+ Purple</b><span>+2 victory points and droplet +1</span></div></div>}{!brewing&&<div className="decision-options">{pending.options.map((option,index)=><button key={option} className="button-secondary" onClick={()=>onChoose(option)} autoFocus={index===0}><span>{optionLabel(option,game)}</span>{pending.kind==="PURPLE_TIER"&&<small>{option.startsWith("tier:3")?"Best available reward":"Choose a lower reward if preferred"}</small>}</button>)}</div>}</section>;
}

function BrewingDecisionPanel({game,risk,onChoose}:{game:GameState;risk:number;onChoose:(choice:string)=>void}) {
  const player=game.players.human;const pending=game.pendingDecision;
  const humanBrew=pending?.actor==="human"&&(pending.kind==="BREW_ACTION"||pending.kind==="ROUND9_COMMIT");
  const aiBrew=pending?.actor==="ai"&&(pending.kind==="BREW_ACTION"||pending.kind==="ROUND9_COMMIT");
  const canDraw=Boolean(humanBrew&&pending.options.includes("DRAW"));const canStop=Boolean(humanBrew&&pending.options.includes("STOP"));const canFlask=Boolean(humanBrew&&pending.options.includes("USE_FLASK"));
  const riskState=player.exploded?"Exploded":player.whiteTotal>=player.explosionThreshold-1?"Danger":player.whiteTotal>=player.explosionThreshold-2?"Caution":"Safe";
  const flaskHelp=!player.flaskFull?"Your flask has already been used.":canFlask?"Return the most recent eligible white ingredient.":"The flask can be used only after an eligible white draw.";
  if(aiBrew)return <section className="current-decision ai-thinking-panel" aria-live="polite"><div className="thinking-mark"><GameIcon name="ai"/><span className="thinking-rings"/></div><span className="eyebrow">Current decision</span><h2>AI is brewing...</h2><p>The rival is choosing whether to draw another ingredient or stop.</p></section>;
  if(!humanBrew)return <section className="current-decision decision-idle"><span className="eyebrow">Current decision</span><h2>{player.stopped?"Your brewing is complete":"Round in progress"}</h2><p>{pending?.actor==="human"?"Complete the highlighted choice in the main play area.":"The next brewing choice will appear here."}</p></section>;
  return <section className={`current-decision risk-${riskState.toLowerCase()}`} id="decision" aria-labelledby="current-decision-title"><header><div><span className="eyebrow">Your decision</span><h2 id="current-decision-title">Draw or stop?</h2></div><span className="decision-state">{riskState}</span></header><div className="decision-status-grid"><div><GameIcon name="explosion"/><span>White risk<b>{player.whiteTotal} / {player.explosionThreshold}</b></span></div><div><GameIcon name="spark"/><span>Explosion chance<b>{Math.round(risk*100)}%</b></span></div><div><GameIcon name="flask"/><span>Flask<b>{player.flaskFull?"Ready":"Empty"}</b></span></div></div><button className="decision-flask" onClick={()=>onChoose("USE_FLASK")} disabled={!canFlask} title={flaskHelp}><GameIcon name="flask"/>Use flask</button><small className="decision-help">{flaskHelp}</small><div className="decision-actions"><button className="draw-action" onClick={()=>onChoose("DRAW")} disabled={!canDraw} title={canDraw?"Draw one random ingredient from your live bag.":"Drawing is not legal in the current state."}><GameIcon name="bag"/>Draw ingredient</button><button className="stop-action" onClick={()=>onChoose("STOP")} disabled={!canStop} title={canStop?"Stop brewing and keep the current pot position.":"Stopping is not legal in the current state."}><GameIcon name="stop"/>Stop brewing</button></div>{pending.kind==="ROUND9_COMMIT"&&<p className="decision-secret">Your final-round choice remains hidden until both brewers commit.</p>}</section>;
}

function ControlShelf({game,bagOpen,bagEnabled,onBag}:{game:GameState;bagOpen:boolean;bagEnabled:boolean;onBag:()=>void}) {
  const player=game.players.human;
  return <section className="control-shelf resource-shelf" aria-label="Player resources"><button className={bagOpen?"shelf-item active":"shelf-item"} onClick={onBag} disabled={!bagEnabled} title={bagEnabled?"Show current bag composition":"Enable bag composition in settings"}><GameIcon name="bag"/><span>Bag<b>{bagEnabled?`${player.bag.length} ingredients`:"Composition hidden"}</b></span></button><div className="shelf-item"><GameIcon name="flask"/><span>Flask<b>{player.flaskFull?"Ready":"Empty"}</b></span></div><div className="shelf-item"><GameIcon name="ruby"/><span>Rubies<b>{player.rubies}</b></span></div><span className="shelf-message">Brewing controls stay beside the rival cauldron in Current Decision.</span></section>;
}

function CompactScoreTrack({game}:{game:GameState}) {
  const marker=(score:number)=>Math.min(100,(score%50)/50*100);
  return <div className="compact-score" aria-label={`Score: you ${game.players.human.score}, AI ${game.players.ai.score}`}><div className="compact-score-labels"><span>0</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50</span></div><div className="compact-score-line"><i className="compact-marker human" style={{left:`${marker(game.players.human.score)}%`}} aria-label={`You: ${game.players.human.score}`}><img src={BOARD_ASSET.humanMarker} alt=""/></i><i className="compact-marker ai" style={{left:`${marker(game.players.ai.score)}%`}} aria-label={`AI: ${game.players.ai.score}`}><img src={BOARD_ASSET.aiMarker} alt=""/></i></div><div className="compact-score-values"><b>You {game.players.human.score}</b><b>AI {game.players.ai.score}</b></div></div>;
}

function SharedBar({game,fortuneOpen,onFortune}:{game:GameState;fortuneOpen:boolean;onFortune:()=>void}) {
  const fortune=FORTUNE_CARDS.find(card=>card.id===game.activeFortune);return <section className="shared-bar"><div className="round-pill"><GameIcon name="round"/><span>Round<b>{game.round} / 9</b></span></div><CompactScoreTrack game={game}/><div className="rat-summary"><GameIcon name="rat"/><span>Rat tails<b>+{game.roundState.ratTails.human}</b></span></div>{fortune?<button className="fortune-summary" onClick={onFortune} aria-expanded={fortuneOpen}><GameIcon name="fortune"/><span>Current fortune<b>{fortune.title}</b></span><i>{fortuneOpen?"Hide":"Read"}</i></button>:<div className="fortune-summary"><GameIcon name="fortune"/><span>Current fortune<b>Resolving...</b></span></div>}</section>;
}

function FortunePanel({game}:{game:GameState}) {const fortune=FORTUNE_CARDS.find(card=>card.id===game.activeFortune);if(!fortune)return null;return <section className="fortune-panel"><div className="fortune-seal"><GameIcon name="fortune" size={32}/></div><div><span className="eyebrow">{fortune.timing==="ROUND"?"Active this round":"Immediate effect"}</span><h2>{fortune.title}</h2><p>{FORTUNE_COPY[fortune.id]}</p>{fortune.timing==="ROUND"&&<span className="active-reminder"><GameIcon name="spark" size={16}/>Fortune effect active</span>}</div></section>}

function ScoreTrack({game}:{game:GameState}) {return <section className="detail-card"><header><span className="eyebrow">City square</span><h2>Score procession</h2></header><div className="score-track">{Array.from({length:50},(_,i)=>i+1).map(score=>{const human=((game.players.human.score-1)%50)+1===score&&game.players.human.score>0;const ai=((game.players.ai.score-1)%50)+1===score&&game.players.ai.score>0;return <span key={score} className={`score-space${RAT_BOUNDARIES.includes(score as never)?" rat-boundary":""}`} title={`${score} points`}>{(score===1||score%5===0)&&<small>{score}</small>}{human&&<i className="score-human"><img src={BOARD_ASSET.humanMarker} alt="You"/></i>}{ai&&<i className="score-ai"><img src={BOARD_ASSET.aiMarker} alt="AI"/></i>}</span>})}</div></section>}

function Market({game,onChoose}:{game:GameState;onChoose:(choice:string)=>void}) {const observation=observe(game,"human");const purchase=game.pendingDecision?.actor==="human"&&game.pendingDecision.kind==="PURCHASE"?game.pendingDecision:undefined;return <section className="detail-card market-panel"><header><span className="eyebrow">Ingredient quarter</span><h2>Market and rule books</h2></header>{purchase&&<PurchaseDecision pending={purchase} game={game} onChoose={onChoose}/>}<div className="market-grid">{COLOR_ORDER.map(color=>{const meta=INGREDIENT_META[color],locked=game.round<UNLOCK_ROUND[color],prices=PRICE_BOOK[color]??{};return <article key={color} className={`market-item ingredient-border-${color}${locked?" market-locked":""}`}><div className="market-name"><IngredientChip token={{id:"",color,value:1}} small/><div><b>{meta.name}</b><small>{locked?`Unlocks in round ${UNLOCK_ROUND[color]}`:meta.note}</small></div></div><div className="market-prices">{Object.entries(prices).map(([value,cost])=><span key={value}><IngredientChip token={{id:"",color,value:Number(value) as Token["value"]}} small/><span><b>Value {value}</b><small>{cost} coins / {observation.supplyCounts[`${color}:${value}`]??0} left</small></span></span>)}</div></article>})}</div></section>}

function GameLog({game}:{game:GameState}) {return <section className="detail-card"><header><span className="eyebrow">Cause and effect</span><h2>Brew log</h2></header><ol className="game-log" aria-live="polite">{game.log.slice(-22).reverse().map(entry=><li key={entry.eventId}><span>{entry.seq+1}</span><div><b>{titleCase(entry.type)}</b><small>{entry.actor?`${entry.actor==="human"?"You":"Rival"} / `:""}{Object.entries(entry.publicPayload).map(([k,v])=>`${titleCase(k)} ${String(v)}`).join(" / ")}</small></div></li>)}</ol></section>}

function SettingsPanel({settings,onChange}:{settings:Settings;onChange:(value:Settings)=>void}) {const toggle=(key:keyof Settings)=>(event:React.ChangeEvent<HTMLInputElement>)=>onChange({...settings,[key]:event.target.checked});return <section className="detail-card settings-panel"><header><span className="eyebrow">Display and pace</span><h2>Game settings</h2></header><label><input type="checkbox" checked={settings.showBag} onChange={toggle("showBag")}/>Show bag composition</label><label><input type="checkbox" checked={settings.showAIDetails} onChange={toggle("showAIDetails")}/>Show detailed AI reasoning</label><label><input type="checkbox" checked={settings.showRisk} onChange={toggle("showRisk")}/>Show explosion probability</label><label><input type="checkbox" checked={settings.reducedMotion} onChange={toggle("reducedMotion")}/>Reduced motion</label><label><input type="checkbox" checked={settings.fastAI} onChange={toggle("fastAI")}/>Fast animations</label><label><input type="checkbox" checked={settings.highContrast} onChange={toggle("highContrast")}/>High contrast</label></section>}

function readableAction(entry:GameLogEntry,game:GameState):string {
  const actor=entry.actor==="ai"?"AI":"You";
  if(entry.type==="TOKEN_PLACED")return `${actor} drew ${titleCase(String(entry.publicPayload.color??"ingredient"))} ${String(entry.publicPayload.value??"")}`;
  if(entry.type==="PLAYER_STOPPED")return `${actor} stopped brewing`;
  if(entry.type==="FLASK_USED")return `${actor} used the flask`;
  if(entry.type==="POT_EXPLODED")return `${actor}'s pot exploded`;
  if(entry.type==="TOKEN_GAINED")return `${actor} gained ${titleCase(String(entry.publicPayload.color??"ingredient"))} ${String(entry.publicPayload.value??"")}`;
  if(entry.type==="DIE_ROLLED")return `${actor} rolled ${titleCase(String(entry.publicPayload.face??"the die"))}`;
  const choice=String(entry.publicPayload.choice??"");
  if(entry.type==="DECISION_RESOLVED"&&choice)return `${actor}: ${optionLabel(choice,game)}`;
  return `${actor}: ${titleCase(entry.type)}`;
}

function AIBoard({game,aiReport,showDetails,onInspect}:{game:GameState;aiReport?:AIDecisionReport&{latencyMs:number};showDetails:boolean;onInspect:(token:Token)=>void}) {
  const ai=game.players.ai;const data=scoringData(ai);const actions=game.log.filter(entry=>entry.actor==="ai"&&["TOKEN_PLACED","PLAYER_STOPPED","FLASK_USED","POT_EXPLODED","TOKEN_GAINED","DIE_ROLLED"].includes(entry.type)).slice(-5).reverse();
  const aiState=game.pendingDecision?.actor==="ai"?"Brewing...":ai.exploded?"Exploded":ai.stopped?"Stopped":"Ready";const debugDetails=Boolean(DEBUG_STATE)&&showDetails&&aiReport;
  return <aside className="ai-board panel-frame" aria-label="AI board"><header className="board-strip"><div><span className="eyebrow">Alchemist AI</span><h2>Rival cauldron</h2></div><span className="ai-status-pill"><GameIcon name="ai" size={16}/>{aiState}</span></header><HumanPotBoard variant="ai" actorLabel="AI" spaces={POT_TRACK} tokenPlacements={ai.pot} tokens={game.tokens} currentPosition={data.anchor} dropletPosition={ai.dropletIndex} ratPosition={ai.ratIndex} highlightedSpace={data.index} whiteTotal={ai.whiteTotal} explosionThreshold={ai.explosionThreshold} reward={data.space} onInspect={onInspect}/><div className="ai-stat-grid"><Resource icon="vp" label="Score" value={ai.score}/><Resource icon="explosion" label="White risk" value={`${ai.whiteTotal} / ${ai.explosionThreshold}`}/><Resource icon="ruby" label="Rubies" value={ai.rubies}/><Resource icon="flask" label="Flask" value={ai.flaskFull?"Ready":"Used"}/><Resource icon="round" label="Position" value={data.anchor}/></div><section className="ai-actions"><header><span>Recent actions</span>{debugDetails&&<small>{aiReport.latencyMs}ms decision</small>}</header>{actions.length?<ol>{actions.map(entry=><li key={entry.eventId}>{readableAction(entry,game)}</li>)}</ol>:<p>No actions yet.</p>}{debugDetails&&<div className="ai-reason"><b>Decision summary</b>{aiReport.summary}</div>}</section></aside>;
}

function Modal({title,eyebrow,children,onClose,wide=false}:{title:string;eyebrow:string;children:React.ReactNode;onClose:()=>void;wide?:boolean}) {return <div className="modal-backdrop" onMouseDown={onClose}><section className={`modal-card${wide?" modal-wide":""}`} onMouseDown={event=>event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="close-button" onClick={onClose} aria-label="Close dialog">x</button><span className="eyebrow">{eyebrow}</span><h2 id="modal-title">{title}</h2>{children}</section></div>}

function HelpModal({onClose}:{onClose:()=>void}) {return <Modal title="How to brew" eyebrow="Apothecary handbook" onClose={onClose} wide><div className="help-grid"><article><GameIcon name="bag"/><h3>Draw from the live bag</h3><p>Each draw randomly samples the ingredients currently in your bag. The token advances around your pot by its value.</p></article><article><GameIcon name="explosion"/><h3>Watch the white total</h3><p>White ingredients add explosion load. Exceed your threshold and you must give up either victory points or shopping coins.</p></article><article><GameIcon name="stop"/><h3>Stop to bank the space</h3><p>Stop while the reward is worthwhile. Your next open space determines coins, points, and sometimes a ruby.</p></article><article><GameIcon name="coin"/><h3>Improve your bag</h3><p>Spend coins on up to two ingredients of different colours. Their rule text is always visible in the market below.</p></article><article><GameIcon name="flask"/><h3>Use the flask carefully</h3><p>After drawing a white ingredient, the flask can return it to the live bag. A returned token can be drawn again immediately.</p></article><article><GameIcon name="rat"/><h3>Rat tails help the chaser</h3><p>The brewer behind on score begins farther around the pot. Round nine hides both final draw-or-stop commitments.</p></article></div></Modal>}

function RoundSummary({summary,onContinue}:{summary:RoundSummaryData;onContinue:()=>void}) {return <Modal title={`Round ${summary.round} complete`} eyebrow="Night market closes" onClose={onContinue}><div className="round-summary-grid"><div><span>You</span><b>+{summary.humanScore} VP</b><small>{summary.humanRubies>=0?"+":""}{summary.humanRubies} rubies</small></div><div><span>Rival</span><b>+{summary.aiScore} VP</b><small>{summary.aiRubies>=0?"+":""}{summary.aiRubies} rubies</small></div></div><p className="summary-rats">Next round rat tails: <b>You +{summary.nextHumanRats}</b> / <b>Rival +{summary.nextAiRats}</b></p><button className="button-primary summary-continue" onClick={onContinue}>Begin round {summary.round+1}</button></Modal>}

function FeedbackToast({toast,onClose}:{toast:ToastData;onClose:()=>void}) {return <div className={`feedback-toast toast-${toast.tone}`} role="status"><GameIcon name={toast.tone==="warning"?"explosion":toast.tone==="good"?"spark":"round"}/><div><b>{toast.title}</b><span>{toast.body}</span></div><button onClick={onClose} aria-label="Dismiss notification">x</button></div>}

function InspectCard({token,onClose}:{token:Token;onClose:()=>void}) {const price=PRICE_BOOK[token.color]?.[token.value];return <section className="inspect-popover" role="dialog" aria-label="Ingredient tooltip"><button className="close-button" onClick={onClose} aria-label="Close ingredient details">x</button><div className="inspect-token"><IngredientChip token={token}/></div><span className="eyebrow">Ingredient inspection</span><h2>{INGREDIENT_META[token.color].name} {token.value}</h2><p><b>Movement</b> {token.value} space{token.value===1?"":"s"} before modifiers.</p><p><b>Effect</b> {INGREDIENT_META[token.color].note}.</p><p><b>Market</b> {price===undefined?"Not purchasable.":`${price} coins.`}</p></section>}

function BonusDieEvent({entry,onClose}:{entry:GameLogEntry;onClose:()=>void}) {const face=String(entry.publicPayload.face??"");const rewards:Record<string,string>={vp1:"+1 victory point",vp2:"+2 victory points",ruby:"+1 ruby",droplet:"Droplet advances",orange:"+1 pumpkin"};return <div className="event-toast" role="status"><div className="die-face">{face==="ruby"?"R":face==="droplet"?"D":face.startsWith("vp")?face.slice(2):"P"}</div><div><span className="eyebrow">Bonus die</span><h2>{entry.actor==="human"?"You brewed the strongest eligible potion.":"The rival brewed the strongest eligible potion."}</h2><p>Reward: <b>{rewards[face]??titleCase(face)}</b></p></div><button onClick={onClose} aria-label="Dismiss bonus die result">x</button></div>}

function HomeScreen({hasSave,seed,setSeed,settings,setSettings,onNew,onContinue,onImport,onHelp,fileRef}:{hasSave:boolean;seed:string;setSeed:(v:string)=>void;settings:Settings;setSettings:(v:Settings)=>void;onNew:()=>void;onContinue:()=>void;onImport:(file:File)=>void;onHelp:()=>void;fileRef:React.RefObject<HTMLInputElement|null>}) {return <main className="home-screen"><section className="home-hero"><img className="home-brand-art" src={BOARD_ASSET.brand} alt=""/><span className="eyebrow">A deterministic apothecary game</span><h1>Cauldron <i>&</i> Chance</h1><p>Brew recklessly. Read the bag. Try not to explode.</p><div className="home-actions"><button className="button-primary" onClick={onNew}>New game</button><button className="button-secondary" onClick={onContinue} disabled={!hasSave}>Continue game</button></div></section><section className="home-settings"><div><span className="eyebrow">Game settings</span><h2>Prepare your workbench</h2></div><dl><div><dt>Opponent</dt><dd><GameIcon name="ai"/>Strong AI</dd></div><div><dt>Ingredient set</dt><dd><GameIcon name="spark"/>Set 1</dd></div></dl><label className="seed-field"><span>Game seed</span><input value={seed} onChange={e=>setSeed(e.target.value)}/></label><SettingsPanel settings={settings} onChange={setSettings}/><div className="home-utility"><button onClick={()=>fileRef.current?.click()}>Import replay</button><button onClick={onHelp}>How to play</button></div><input ref={fileRef} className="visually-hidden" type="file" accept="application/json" onChange={e=>{const file=e.target.files?.[0];if(file)onImport(file)}}/></section></main>}

export function App() {
  const [game,setGame]=useState<GameState>(loadGame);const [choices,setChoices]=useState<string[]>([]);const [settings,setSettings]=useState<Settings>(loadSettings);const [screen,setScreen]=useState<"home"|"game">(DEBUG_STATE&&DEBUG_STATE!=="home"?"game":"home");const [seedInput,setSeedInput]=useState(game.config.seed);const [aiStatus,setAiStatus]=useState(DEBUG_STATE==="ai-brewing"?"Evaluating the live bag...":"Ready");const [aiReport,setAiReport]=useState<(AIDecisionReport&{latencyMs:number})>();const [notice,setNotice]=useState("");const [fortuneOpen,setFortuneOpen]=useState(DEBUG_STATE==="fortune");const [bagOpen,setBagOpen]=useState(DEBUG_STATE==="ingredients");const [helpOpen,setHelpOpen]=useState(false);const [settingsOpen,setSettingsOpen]=useState(false);const [roundSummary,setRoundSummary]=useState<RoundSummaryData|undefined>(DEBUG_STATE==="round-summary"?{round:5,humanScore:4,aiScore:3,humanRubies:1,aiRubies:0,nextHumanRats:0,nextAiRats:1}:undefined);const [toast,setToast]=useState<ToastData|undefined>(DEBUG_STATE==="toast"?{id:999,tone:"good",title:"Potion brewed",body:"You gained 2 victory points and a ruby."}:undefined);const [inspected,setInspected]=useState<Token|undefined>(DEBUG_STATE==="tooltip"?game.tokens[game.players.human.pot[0]?.tokenId??""]:undefined);const [dismissedDie,setDismissedDie]=useState(-1);const fileRef=useRef<HTMLInputElement>(null);const workerRef=useRef<Worker|null>(null);const gameRef=useRef(game);const roundStartRef=useRef({round:game.round,humanScore:game.players.human.score,aiScore:game.players.ai.score,humanRubies:game.players.human.rubies,aiRubies:game.players.ai.rubies});const lastToastSeq=useRef(game.log.at(-1)?.seq??-1);gameRef.current=game;

  const resolveChoice=useCallback((choice:string)=>setGame(current=>{const pending=current.pendingDecision;if(!pending||!pending.options.includes(choice))return current;setChoices(history=>[...history,choice]);const next=dispatch(current,{type:"RESOLVE_DECISION",decisionId:pending.id,choice});if(next.round>current.round){const start=roundStartRef.current;setRoundSummary({round:current.round,humanScore:next.players.human.score-start.humanScore,aiScore:next.players.ai.score-start.aiScore,humanRubies:next.players.human.rubies-start.humanRubies,aiRubies:next.players.ai.rubies-start.aiRubies,nextHumanRats:next.roundState.ratTails.human,nextAiRats:next.roundState.ratTails.ai});roundStartRef.current={round:next.round,humanScore:next.players.human.score,aiScore:next.players.ai.score,humanRubies:next.players.human.rubies,aiRubies:next.players.ai.rubies}}return next}),[]);
  useEffect(()=>{const worker=new Worker(new URL("./ai.worker.ts",import.meta.url),{type:"module"});workerRef.current=worker;worker.onmessage=(event:MessageEvent<{decisionId:string;report?:AIDecisionReport;latencyMs?:number;error?:string}>)=>{const current=gameRef.current;if(current.pendingDecision?.id!==event.data.decisionId||current.pendingDecision.actor!=="ai")return;if(event.data.error||!event.data.report){setAiStatus("AI needs attention");setNotice(event.data.error??"The AI returned no action.");return}setAiReport({...event.data.report,latencyMs:event.data.latencyMs??0});setAiStatus(event.data.report.summary);window.setTimeout(()=>resolveChoice(event.data.report!.choice),settings.fastAI||settings.reducedMotion?0:420)};return()=>worker.terminate()},[resolveChoice,settings.fastAI,settings.reducedMotion]);
  useEffect(()=>{const pending=game.pendingDecision;if(DEBUG_STATE||screen!=="game"||roundSummary||pending?.actor!=="ai"||!workerRef.current)return;setAiStatus("Weighing risk...");workerRef.current.postMessage({observation:observe(game,"ai"),pending,seed:`${game.config.seed}/ai/ai`})},[screen,roundSummary,game.revision,game.pendingDecision?.id,game.config.seed]);
  useEffect(()=>localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,state:serialize(game),choices})),[game,choices]);useEffect(()=>localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings)),[settings]);
  useEffect(()=>{const entry=game.log.at(-1);if(!entry||entry.seq<=lastToastSeq.current)return;lastToastSeq.current=entry.seq;const actor=entry.actor==="human"?"You":"The rival";let next:ToastData|undefined;if(entry.type==="POT_EXPLODED")next={id:entry.seq,tone:"warning",title:"The cauldron erupted",body:`${actor} crossed the white-token threshold.`};if(entry.type==="WHITE_REPRIEVED")next={id:entry.seq,tone:"good",title:"A narrow reprieve",body:"The white ingredient returned to the live bag."};if(entry.type==="FLASK_USED")next={id:entry.seq,tone:"info",title:"Flask used",body:`${actor} returned the last white ingredient.`};if(entry.type==="TOKEN_GAINED")next={id:entry.seq,tone:"good",title:"Bag improved",body:`${actor} gained a new ingredient.`};if(next){setToast(next);const timer=window.setTimeout(()=>setToast(current=>current?.id===next.id?undefined:current),3300);return()=>window.clearTimeout(timer)}},[game.log]);

  const observation=useMemo(()=>observe(game,"human"),[game]);const risk=useMemo(()=>exactExplosionProbability(observation,"human"),[observation]);const dieEvent=[...game.log].reverse().find(entry=>entry.type==="DIE_ROLLED"&&entry.seq>dismissedDie);
  const establishRoundStart=(next:GameState)=>{roundStartRef.current={round:next.round,humanScore:next.players.human.score,aiScore:next.players.ai.score,humanRubies:next.players.human.rubies,aiRubies:next.players.ai.rubies};lastToastSeq.current=next.log.at(-1)?.seq??-1;setRoundSummary(undefined)};
  const newGame=()=>{const seed=seedInput.trim()||freshSeed();const next=createGame({seed});establishRoundStart(next);setGame(next);setChoices([]);setNotice("");setSeedInput(seed);setScreen("game")};
  const exportReplay=()=>{const data=JSON.stringify({version:1,seed:game.config.seed,choices,state:serialize(game)},null,2);const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([data],{type:"application/json"}));link.download=`cauldron-${game.config.seed}.json`;link.click();URL.revokeObjectURL(link.href)};
  const importReplay=async(file:File)=>{try{const data=JSON.parse(await file.text()) as{state?:string;choices?:string[]};if(!data.state)throw new Error("This file has no saved game state.");const loaded=deserialize(data.state);establishRoundStart(loaded);setGame(loaded);setChoices(data.choices??[]);setSeedInput(loaded.config.seed);setScreen("game");setNotice("Replay loaded.")}catch(error){setNotice(error instanceof Error?error.message:"Could not load this replay.")}};
  const winner=game.result?(game.result.winners.length===2?"A shared victory":game.result.winners[0]==="human"?"You won the festival":"The rival won this time"):"";
  const classes=`app-shell${settings.highContrast?" high-contrast":""}${settings.reducedMotion?" reduced-motion":""}`;
  if(screen==="home")return <div className={classes}><HomeScreen hasSave={localStorage.getItem(SAVE_KEY)!==null} seed={seedInput} setSeed={setSeedInput} settings={settings} setSettings={setSettings} onNew={newGame} onContinue={()=>setScreen("game")} onImport={file=>void importReplay(file)} onHelp={()=>setHelpOpen(true)} fileRef={fileRef}/>{helpOpen&&<HelpModal onClose={()=>setHelpOpen(false)}/>}</div>;

  return <div className={classes}><a href="#decision" className="skip-link">Skip to current decision</a><header className="game-header"><button className="brand-button" onClick={()=>setScreen("home")}><img className="brand-mark" src={BOARD_ASSET.brand} alt=""/><span>Cauldron <i>&</i> Chance<small>Night market / seeded game</small></span></button><div className="header-tools"><button onClick={()=>setHelpOpen(true)}>Help</button><button onClick={()=>setSettingsOpen(true)}>Settings</button><button onClick={()=>setScreen("home")}>Home</button><button onClick={exportReplay}>Export</button><button onClick={()=>fileRef.current?.click()}>Import</button><input ref={fileRef} className="visually-hidden" type="file" accept="application/json" onChange={e=>{const file=e.target.files?.[0];if(file)void importReplay(file)}}/></div></header>
    <main className="game-main">
      <SharedBar game={game} fortuneOpen={fortuneOpen} onFortune={()=>setFortuneOpen(value=>!value)}/>
      {fortuneOpen&&<FortunePanel game={game}/>} {/* shared-board detail */}
      {notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Dismiss">x</button></div>}
      {game.phase==="GAME_OVER"&&game.result?<section className="end-card"><img className="finish-emblem" src={BOARD_ASSET.finishMarker} alt=""/><span className="eyebrow">The ninth brew is complete</span><h2>{winner}</h2><p><b>{game.result.scores.human}</b> points to <b>{game.result.scores.ai}</b>. Final pot distances: {game.result.tieBreakIndices.human} and {game.result.tieBreakIndices.ai}.</p><div><button className="button-primary" onClick={()=>{setSeedInput(freshSeed());setScreen("home")}}>Brew another game</button><button className="button-secondary" onClick={exportReplay}>Save replay</button></div></section>:<><div className="game-workspace">
        <section className="brew-stage human-board panel-frame"><div className="stage-heading"><div><span className="eyebrow">Your workbench</span><h1>The cauldron is yours</h1></div><div className="permanent-resources"><Resource icon="vp" label="Score" value={game.players.human.score}/><Resource icon="ruby" label="Rubies" value={game.players.human.rubies}/></div></div><div className="pot-focus"><BrewingStatus game={game} risk={risk} showRisk={settings.showRisk}/><HumanPotBoard spaces={POT_TRACK} tokenPlacements={game.players.human.pot} tokens={game.tokens} currentPosition={scoringData(game.players.human).anchor} dropletPosition={game.players.human.dropletIndex} ratPosition={game.players.human.ratIndex} highlightedSpace={scoringData(game.players.human).index} whiteTotal={game.players.human.whiteTotal} explosionThreshold={game.players.human.explosionThreshold} reward={scoringData(game.players.human).space} onInspect={setInspected}/></div>{settings.showBag&&bagOpen&&<BagLedger player={game.players.human} tokens={game.tokens}/>} {game.pendingDecision?.actor==="human"&&!['BREW_ACTION','ROUND9_COMMIT','PURCHASE'].includes(game.pendingDecision.kind)?<DecisionPanel pending={game.pendingDecision} game={game} onChoose={resolveChoice}/>:null}</section>
        <div className="ai-column"><AIBoard game={game} aiReport={aiReport} showDetails={settings.showAIDetails} onInspect={setInspected}/><BrewingDecisionPanel game={game} risk={risk} onChoose={resolveChoice}/></div></div>
      </>}
      <div className="lower-dashboard"><Market game={game} onChoose={resolveChoice}/><GameLog game={game}/></div>
      {game.phase!=="GAME_OVER"&&<ControlShelf game={game} bagOpen={bagOpen} bagEnabled={settings.showBag} onBag={()=>setBagOpen(value=>!value)}/>} {/* persistent resources */}
    </main>{helpOpen&&<HelpModal onClose={()=>setHelpOpen(false)}/>} {settingsOpen&&<Modal title="Game settings" eyebrow="Display and pace" onClose={()=>setSettingsOpen(false)}><SettingsPanel settings={settings} onChange={setSettings}/></Modal>} {roundSummary&&<RoundSummary summary={roundSummary} onContinue={()=>setRoundSummary(undefined)}/>} {inspected&&<InspectCard token={inspected} onClose={()=>setInspected(undefined)}/>} {toast&&<FeedbackToast toast={toast} onClose={()=>setToast(undefined)}/>} {dieEvent&&<BonusDieEvent entry={dieEvent} onClose={()=>setDismissedDie(dieEvent.seq)}/>}<footer><span>Deterministic live-bag engine / Monte Carlo AI</span><span>Seed {game.config.seed} / revision {game.revision}</span></footer></div>;
}
