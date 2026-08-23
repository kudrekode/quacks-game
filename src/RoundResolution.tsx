import React, { useEffect, useMemo, useState } from "react";
import { PRICE_BOOK } from "./content.js";
import { GameIcon, type GameIconName } from "./GameIcon.js";
import type { GameLogEntry, GameState, IngredientColor, PendingDecision, Phase, TokenValue } from "./types.js";
import { COLOR_ORDER, INGREDIENT_META } from "./uiData.js";
import { ingredientAsset } from "./uiAssets.js";

export interface RoundStartSnapshot {
  round: number;
  humanScore: number;
  aiScore: number;
  humanRubies: number;
  aiRubies: number;
}

export interface RoundSummaryData {
  round: number;
  humanScore: number;
  aiScore: number;
  humanRubies: number;
  aiRubies: number;
  nextHumanRats: number;
  nextAiRats: number;
}

type ResolutionStage = "postbrew" | "bonus" | "rewards" | "purchase" | "ruby" | "complete";

const RESOLUTION_PHASES = new Set<Phase>([
  "POST_BREW", "EVAL_A", "EVAL_B", "EVAL_C", "EVAL_EXPLOSION_CHOICE",
  "EVAL_D", "EVAL_E", "EVAL_F", "ROUND_CLEANUP", "FINAL_CONVERSION",
]);

export function isRoundResolutionActive(game: GameState, summary?: RoundSummaryData): boolean {
  return Boolean(summary) || RESOLUTION_PHASES.has(game.phase);
}

function dieReward(face: string): string {
  return ({ vp1: "+1 Victory Point", vp2: "+2 Victory Points", ruby: "+1 Ruby", droplet: "Droplet advanced", orange: "+1 Pumpkin" } as Record<string, string>)[face] ?? face;
}

function DieFace({ face, rolling }: { face: string; rolling: boolean }) {
  const pipCount = face === "vp2" ? 2 : face === "vp1" ? 1 : 0;
  return <div className={`resolution-die${rolling ? " is-rolling" : " is-settled"}`} aria-label={`Bonus die result: ${dieReward(face)}`}>
    <svg viewBox="0 0 120 120" role="img">
      <rect x="8" y="8" width="104" height="104" rx="21" className="die-body"/>
      {pipCount === 1 && <circle cx="60" cy="60" r="12" className="die-pip"/>}
      {pipCount === 2 && <><circle cx="40" cy="40" r="11" className="die-pip"/><circle cx="80" cy="80" r="11" className="die-pip"/></>}
      {face === "ruby" && <path d="M60 27 88 50 60 94 32 50Zm-28 23h56M47 50l13 44 13-44L60 27Z" className="die-symbol"/>}
      {face === "droplet" && <path d="M60 24S34 57 34 75a26 26 0 0 0 52 0c0-18-26-51-26-51Z" className="die-symbol"/>}
      {face === "orange" && <><circle cx="60" cy="64" r="27" className="die-symbol"/><path d="M61 36c2-10 10-16 21-14-2 10-9 15-21 14Z" className="die-symbol"/></>}
    </svg>
  </div>;
}

function stageLabel(stage: ResolutionStage): string {
  return ({ postbrew: "Post-brew", bonus: "Bonus", rewards: "Rewards", purchase: "Purchase", ruby: "Ruby actions", complete: "Complete" })[stage];
}

function ResolutionProgress({ stages, current }: { stages: ResolutionStage[]; current: ResolutionStage }) {
  const currentIndex = stages.indexOf(current);
  return <ol className="resolution-progress" aria-label="Round resolution progress">{stages.map((stage, index) => <li key={stage} className={index < currentIndex ? "is-complete" : index === currentIndex ? "is-current" : ""}><span>{index < currentIndex ? "✓" : index + 1}</span><b>{stageLabel(stage)}</b></li>)}</ol>;
}

function ResultResource({ icon, label, value }: { icon: GameIconName; label: string; value: React.ReactNode }) {
  return <div className="result-resource"><GameIcon name={icon} size={28}/><span>{label}<b>{value}</b></span></div>;
}

function resolutionOptionLabel(option: string): string {
  if (option === "score") return "Keep victory points";
  if (option === "buy") return "Keep buying power";
  if (option === "done") return "Finish ruby actions";
  if (option === "droplet") return "Move droplet";
  if (option === "flask") return "Refill flask";
  if (option.startsWith("tier:")) return `Purple reward tier ${option.split(":")[1]}`;
  if (option === "none") return "Choose nothing";
  return option.replaceAll(":", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function partsFromOption(option: string): string[] {
  return option.startsWith("buy:") ? option.slice(4).split("+") : [];
}

function sameParts(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && [...left].sort().every((part, index) => part === [...right].sort()[index]);
}

function legalPurchaseOption(pending: PendingDecision, parts: readonly string[]): string | undefined {
  if (parts.length === 0) return pending.options.includes("none") ? "none" : undefined;
  return pending.options.find(option => sameParts(partsFromOption(option), parts));
}

function purchasePart(part: string): { color: IngredientColor; value: TokenValue; cost: number } | undefined {
  const [colorText, valueText] = part.split(":");
  const color = colorText as IngredientColor; const value = Number(valueText) as TokenValue;
  const cost = PRICE_BOOK[color]?.[value];
  return cost === undefined ? undefined : { color, value, cost };
}

function BonusStage({ entries, settled, onContinue }: { entries: GameLogEntry[]; settled: boolean; onContinue: () => void }) {
  const result = entries.at(-1)!; const face = String(result.publicPayload.face ?? "vp1"); const actor = result.actor === "ai" ? "The rival" : "You";
  return <section className="resolution-stage bonus-stage" aria-labelledby="resolution-stage-title"><div className="resolution-copy"><span className="eyebrow">Evaluation A</span><h2 id="resolution-stage-title">Bonus die</h2><p>{actor} brewed the strongest eligible potion.</p></div><div className="bonus-die-scene"><DieFace face={face} rolling={!settled}/><span className="die-status">{settled ? "Result" : "Rolling..."}</span><strong>{settled ? dieReward(face) : "The result is already locked by the engine"}</strong></div>{entries.length > 1 && <div className="bonus-result-list">{entries.map(entry => <span key={entry.eventId}>{entry.actor === "human" ? "You" : "AI"}: <b>{dieReward(String(entry.publicPayload.face ?? ""))}</b></span>)}</div>}<div className="resolution-actions"><button className="button-primary" disabled={!settled} onClick={onContinue}>Continue to rewards</button></div></section>;
}

function PostBrewStage({ game, onChoose }: { game: GameState; onChoose: (choice: string) => void }) {
  const pending = game.pendingDecision;
  return <section className="resolution-stage rewards-stage" aria-labelledby="resolution-stage-title"><div className="resolution-copy"><span className="eyebrow">Post-brew hooks</span><h2 id="resolution-stage-title">Finish brewing effects</h2><p>The active Fortune card resolves any after-brewing placement before scoring entries and the bonus die are evaluated.</p></div>{pending?.actor === "human" ? <div className="resolution-choice"><span className="eyebrow">Decision required</span><h3>{pending.prompt}</h3><div>{pending.options.map(option => <button key={option} className="button-secondary" onClick={() => onChoose(option)}>{resolutionOptionLabel(option)}</button>)}</div></div> : <div className="resolution-wait large"><GameIcon name="ai" size={38}/><span><b>AI is resolving a post-brew effect...</b><small>Bonus comparison begins after every placement is complete.</small></span></div>}</section>;
}

function RewardsStage({ game, baseline, ready, purchaseNext, onChoose, onContinue }: { game: GameState; baseline: RoundStartSnapshot; ready: boolean; purchaseNext: boolean; onChoose: (choice: string) => void; onContinue: () => void }) {
  const pending = game.pendingDecision; const rewardDecision = pending && pending.kind !== "PURCHASE" && pending.kind !== "RUBY_ACTION" ? pending : undefined;
  const humanVP = game.players.human.score - baseline.humanScore; const aiVP = game.players.ai.score - baseline.aiScore;
  const humanRubies = game.players.human.rubies - baseline.humanRubies; const aiRubies = game.players.ai.rubies - baseline.aiRubies;
  return <section className="resolution-stage rewards-stage" aria-labelledby="resolution-stage-title"><div className="resolution-copy"><span className="eyebrow">Evaluation B–D</span><h2 id="resolution-stage-title">Round rewards</h2><p>Ingredient effects, scoring-space rubies, explosion choices, and victory points resolve before shopping.</p></div><div className="reward-comparison"><article><span>You</span><div><ResultResource icon="vp" label="Victory points" value={`${humanVP >= 0 ? "+" : ""}${humanVP}`}/><ResultResource icon="ruby" label="Rubies" value={`${humanRubies >= 0 ? "+" : ""}${humanRubies}`}/></div><small>Round space {game.players.human.scoringIndex}</small></article><article><span>AI</span><div><ResultResource icon="vp" label="Victory points" value={`${aiVP >= 0 ? "+" : ""}${aiVP}`}/><ResultResource icon="ruby" label="Rubies" value={`${aiRubies >= 0 ? "+" : ""}${aiRubies}`}/></div><small>Round space {game.players.ai.scoringIndex}</small></article></div>{rewardDecision?.actor === "human" && <div className="resolution-choice"><span className="eyebrow">Decision required</span><h3>{rewardDecision.kind === "EXPLOSION_CHOICE" ? "Your pot exploded — choose one reward" : rewardDecision.prompt}</h3><div>{rewardDecision.options.map(option => <button key={option} className="button-secondary" onClick={() => onChoose(option)}>{resolutionOptionLabel(option)}</button>)}</div></div>}{rewardDecision?.actor === "ai" && <div className="resolution-wait"><GameIcon name="ai"/><span><b>AI is resolving rewards...</b><small>The rival is completing its legal effect choice.</small></span></div>}<div className="resolution-actions"><p>{ready ? "All reward changes are now reflected above." : "Complete the current effect decision to finish rewards."}</p><button className="button-primary" disabled={!ready} onClick={onContinue}>Continue to {purchaseNext ? "purchasing" : "ruby actions"}</button></div></section>;
}

function PurchaseStage({ game, selected, onSelected, onConfirm }: { game: GameState; selected: string[]; onSelected: (parts: string[]) => void; onConfirm: (choice: string) => void }) {
  const pending = game.pendingDecision; const humanPurchase = pending?.actor === "human" && pending.kind === "PURCHASE" ? pending : undefined;
  const budget = game.players.human.roundCoins;
  const cards = COLOR_ORDER.flatMap(color => Object.entries(PRICE_BOOK[color] ?? {}).map(([valueText, cost]) => ({ color, value: Number(valueText) as TokenValue, cost }))).filter(card => game.unlockedColors.includes(card.color));
  const supplyCount = (color: IngredientColor, value: TokenValue) => game.supply.reduce((count, id) => { const token = game.tokens[id]; return count + Number(token?.color === color && token.value === value); }, 0);
  const selectedItems = selected.map(purchasePart).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const total = selectedItems.reduce((sum, item) => sum + item.cost, 0); const finalChoice = humanPurchase ? legalPurchaseOption(humanPurchase, selected) : undefined;
  const toggle = (part: string) => { if (!humanPurchase) return; const next = selected.includes(part) ? selected.filter(item => item !== part) : [...selected, part]; if (legalPurchaseOption(humanPurchase, next)) onSelected(next); };
  return <section className="resolution-stage purchase-stage" aria-labelledby="resolution-stage-title"><div className="purchase-stage-heading"><div className="resolution-copy"><span className="eyebrow">Evaluation E</span><h2 id="resolution-stage-title">Purchase ingredients</h2><p>Choose a legal engine-validated basket of up to two different colours.</p></div><ResultResource icon="coin" label="Buying power" value={budget}/></div>{humanPurchase ? <><div className="resolution-market" role="list">{cards.map(card => { const part = `${card.color}:${card.value}`; const count = supplyCount(card.color, card.value); const selectedNow = selected.includes(part); const canSelect = selectedNow || Boolean(legalPurchaseOption(humanPurchase, [...selected, part])); const status = count === 0 ? "Sold out" : card.cost > budget ? "Over budget" : canSelect ? `${count} available` : "Not legal with selection"; return <button role="listitem" key={part} className={`resolution-ingredient ingredient-border-${card.color}${selectedNow ? " is-selected" : ""}`} disabled={!canSelect} onClick={() => toggle(part)} aria-pressed={selectedNow}><img src={ingredientAsset(card.color, card.value)} alt=""/><span><b>{INGREDIENT_META[card.color].name}</b><small>Value {card.value} · {INGREDIENT_META[card.color].note}</small></span><strong><GameIcon name="coin" size={18}/>{card.cost}</strong><i>{selectedNow ? "Selected" : status}</i></button>; })}</div><div className="purchase-summary"><div><span className="eyebrow">Selected</span>{selectedItems.length ? <ul>{selectedItems.map(item => <li key={`${item.color}:${item.value}`}><span>{INGREDIENT_META[item.color].name} {item.value}</span><b>{item.cost}</b></li>)}</ul> : <p>No ingredients selected.</p>}</div><div className="purchase-totals"><span>Total <b>{total} / {budget}</b></span><span>Remaining <b>{budget - total}</b></span></div><button className="button-primary" disabled={!finalChoice} onClick={() => finalChoice && onConfirm(finalChoice)}>{selected.length ? "Confirm purchase" : "Finish without buying"}</button></div></> : <div className="resolution-wait large"><GameIcon name="ai" size={38}/><span><b>{pending?.kind === "PURCHASE" ? "AI is purchasing..." : "Purchasing is complete"}</b><small>The shared supply and buying order remain controlled by the engine.</small></span></div>}</section>;
}

function RubyStage({ game, onChoose }: { game: GameState; onChoose: (choice: string) => void }) {
  const pending = game.pendingDecision; const humanRuby = pending?.actor === "human" && pending.kind === "RUBY_ACTION" ? pending : undefined;
  return <section className="resolution-stage ruby-stage" aria-labelledby="resolution-stage-title"><div className="resolution-copy"><span className="eyebrow">Evaluation F</span><h2 id="resolution-stage-title">Ruby actions</h2><p>Spend two rubies per action. These changes apply to future rounds, not the pot just scored.</p></div><div className="ruby-balance"><GameIcon name="ruby" size={42}/><span>You have<b>{game.players.human.rubies} rubies</b></span></div>{humanRuby ? <div className="ruby-options">{humanRuby.options.includes("droplet") && <button onClick={() => onChoose("droplet")}><GameIcon name="droplet" size={34}/><span><b>Move droplet</b><small>Cost: 2 rubies · Current space {game.players.human.dropletIndex}</small></span></button>}{humanRuby.options.includes("flask") && <button onClick={() => onChoose("flask")}><GameIcon name="flask" size={34}/><span><b>Refill flask</b><small>Cost: 2 rubies · Flask is currently empty</small></span></button>}{!humanRuby.options.some(option => option === "droplet" || option === "flask") && <p className="no-ruby-action">No paid ruby action is currently legal.</p>}<button className="button-primary ruby-finish" onClick={() => onChoose("done")}>Finish ruby actions</button></div> : <div className="resolution-wait large"><GameIcon name="ai" size={38}/><span><b>AI is resolving ruby actions...</b><small>This stage will advance automatically when the rival finishes.</small></span></div>}</section>;
}

function CompleteStage({ game, summary, onContinue }: { game: GameState; summary: RoundSummaryData; onContinue: () => void }) {
  return <section className="resolution-stage complete-stage" aria-labelledby="resolution-stage-title"><div className="completion-seal"><GameIcon name="spark" size={46}/></div><div className="resolution-copy"><span className="eyebrow">Cleanup complete</span><h2 id="resolution-stage-title">Round {summary.round} complete</h2><p>Ingredients have returned to their bags and the next starting player is ready.</p></div><div className="complete-scores"><div><span>You</span><b>{game.players.human.score} VP</b></div><div><span>AI</span><b>{game.players.ai.score} VP</b></div></div><div className="next-round-rats"><GameIcon name="rat" size={34}/><span>Rat tails next round<b>You +{summary.nextHumanRats} · AI +{summary.nextAiRats}</b></span></div><div className="resolution-actions"><button className="button-primary" onClick={onContinue}>Begin round {summary.round + 1}</button></div></section>;
}

export function RoundResolution({ game, baseline, summary, bonusAcknowledged, rewardsAcknowledged, selectedPurchase, reducedMotion, onBonusAcknowledged, onRewardsAcknowledged, onSelectedPurchase, onChoose, onComplete }: {
  game: GameState;
  baseline: RoundStartSnapshot;
  summary?: RoundSummaryData;
  bonusAcknowledged: boolean;
  rewardsAcknowledged: boolean;
  selectedPurchase: string[];
  reducedMotion: boolean;
  onBonusAcknowledged: () => void;
  onRewardsAcknowledged: () => void;
  onSelectedPurchase: (parts: string[]) => void;
  onChoose: (choice: string) => void;
  onComplete: () => void;
}) {
  const resolutionRound = summary?.round ?? game.round;
  const dieEntries = useMemo(() => game.log.filter(entry => entry.round === resolutionRound && entry.type === "DIE_ROLLED"), [game.log, resolutionRound]);
  const bonusApplies = dieEntries.length > 0;
  const purchaseApplies = summary ? true : game.phase === "EVAL_E" || game.pendingDecision?.kind === "PURCHASE" || !game.players.human.exploded || game.players.human.explosionChoice === "buy";
  const rubyApplies = summary ? true : game.phase === "EVAL_F" || game.pendingDecision?.kind === "RUBY_ACTION" || game.players.human.rubies >= 2;
  const stages: ResolutionStage[] = [...(game.phase === "POST_BREW" ? ["postbrew" as const] : []), ...(bonusApplies ? ["bonus" as const] : []), "rewards", ...(purchaseApplies ? ["purchase" as const] : []), ...(rubyApplies ? ["ruby" as const] : []), "complete"];
  const rewardReady = game.phase === "EVAL_E" || game.phase === "EVAL_F" || game.phase === "ROUND_CLEANUP" || game.phase === "FINAL_CONVERSION" || Boolean(summary);
  const current: ResolutionStage = summary ? "complete" : game.phase === "POST_BREW" ? "postbrew" : bonusApplies && !bonusAcknowledged ? "bonus" : !rewardsAcknowledged ? "rewards" : game.phase === "EVAL_E" || game.pendingDecision?.kind === "PURCHASE" ? "purchase" : game.phase === "EVAL_F" || game.pendingDecision?.kind === "RUBY_ACTION" ? "ruby" : "rewards";
  const [dieSettled, setDieSettled] = useState(reducedMotion);
  useEffect(() => { if (current !== "bonus") return; setDieSettled(reducedMotion); if (reducedMotion) return; const timer = window.setTimeout(() => setDieSettled(true), 900); return () => window.clearTimeout(timer); }, [current, dieEntries.at(-1)?.eventId, reducedMotion]);
  useEffect(() => { document.body.classList.add("resolution-open"); return () => document.body.classList.remove("resolution-open"); }, []);
  return <div className="resolution-backdrop"><section className={`resolution-shell stage-${current}`} role="dialog" aria-modal="true" aria-labelledby="resolution-title"><header className="resolution-header"><div><span className="eyebrow">Night market accounting</span><h1 id="resolution-title">Round {resolutionRound} resolution</h1></div><span className="resolution-phase-code">{current === "complete" ? "Ready" : current === "postbrew" ? "Post-brew" : `Phase ${current === "bonus" ? "A" : current === "rewards" ? "B–D" : current === "purchase" ? "E" : "F"}`}</span></header><ResolutionProgress stages={stages} current={current}/><div className="resolution-body">{current === "postbrew" && <PostBrewStage game={game} onChoose={onChoose}/>} {current === "bonus" && <BonusStage entries={dieEntries} settled={dieSettled} onContinue={onBonusAcknowledged}/>} {current === "rewards" && <RewardsStage game={game} baseline={baseline} ready={rewardReady} purchaseNext={purchaseApplies} onChoose={onChoose} onContinue={onRewardsAcknowledged}/>} {current === "purchase" && <PurchaseStage game={game} selected={selectedPurchase} onSelected={onSelectedPurchase} onConfirm={choice => { onSelectedPurchase([]); onChoose(choice); }}/>} {current === "ruby" && <RubyStage game={game} onChoose={onChoose}/>} {current === "complete" && summary && <CompleteStage game={game} summary={summary} onContinue={onComplete}/>}</div></section></div>;
}
