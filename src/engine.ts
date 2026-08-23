import {
  ALL_CARD_IDS, FORTUNE_CARDS, POT_TRACK, PRICE_BOOK, UNLOCK_ROUND,
  countRatTails, createTokenRegistry, supplyKey,
} from "./content.js";
import { createRandomState, drawRandom, randomInt, shuffle } from "./rng.js";
import {
  PLAYER_IDS, type CardId, type Command, type DecisionTask, type GameConfig,
  type GameLogEntry, type GameState, type IngredientColor, type Observation,
  type PendingDecision, type PlacedToken, type PlayerId, type PlayerSnapshot,
  type PlayerState, type TokenValue,
} from "./types.js";

const MAX_POT = 52;
const SPOON = 53;
const DIE = ["vp1", "vp1", "vp2", "ruby", "droplet", "orange"] as const;

function other(id: PlayerId): PlayerId { return id === "human" ? "ai" : "human"; }
function clone<T>(value: T): T { return structuredClone(value); }
function orderFrom(start: PlayerId): PlayerId[] { return [start, other(start)]; }
function cardNumber(id: CardId): number { return Number(id.slice(1)); }

function emptyRound(start: PlayerId): GameState["roundState"] {
  return {
    startOrder: orderFrom(start), activeModifiers: [], tasks: [], brewingCursor: 0,
    evaluationCursor: 0, ratTails: { human: 0, ai: 0 }, bonusDieWinners: [],
    finalCommitments: {}, finalTieBreakIndices: {}, postBrewPrepared: false,
    fortunePrepared: false, ratPrepared: false, evalBPrepared: false,
    explosionPrepared: false, purchasePrepared: false, rubyPrepared: false,
    revealQueue: [],
  };
}

function createPlayer(id: PlayerId, controller: "human" | "ai"): PlayerState {
  return {
    id, controller, score: 0, rubies: 0, dropletIndex: 0, flaskFull: true,
    bag: [], pot: [], placementOrder: [], preview: [], exploded: false,
    stopped: false, voluntaryStop: false, whiteTotal: 0, explosionThreshold: 7,
    roundCoins: 0, roundBaseVP: 0, scoringIndex: 1, boughtColors: [],
    placementEvents: 0, firstWhiteSeen: false, restartUsed: false,
    restartPending: false,
  };
}

function log(state: GameState, type: string, payload: Record<string, unknown> = {}, actor?: PlayerId, privatePayload?: GameLogEntry["privatePayloadByPlayer"]): void {
  const entry: GameLogEntry = {
    seq: state.log.length, eventId: `e${state.log.length + 1}`, round: state.round,
    phase: state.phase, type, publicPayload: payload,
  };
  if (actor !== undefined) entry.actor = actor;
  if (privatePayload !== undefined) entry.privatePayloadByPlayer = privatePayload;
  state.log.push(entry);
}

function tokenIds(state: GameState, color: IngredientColor, value: TokenValue, location = state.supply): string[] {
  return location.filter((id) => {
    const token = state.tokens[id];
    return token?.color === color && token.value === value;
  });
}

function takeSupply(state: GameState, color: IngredientColor, value: TokenValue): string | undefined {
  const id = tokenIds(state, color, value)[0];
  if (id !== undefined) state.supply.splice(state.supply.indexOf(id), 1);
  return id;
}

function grant(state: GameState, playerId: PlayerId, color: IngredientColor, value: TokenValue): boolean {
  if (color !== "white" && !state.unlockedColors.includes(color)) return false;
  const id = takeSupply(state, color, value);
  if (id === undefined) return false;
  state.players[playerId].bag.push(id);
  log(state, "TOKEN_GAINED", { color, value }, playerId);
  return true;
}

function moveDroplet(player: PlayerState, spaces = 1): void {
  player.dropletIndex = Math.min(MAX_POT, player.dropletIndex + spaces);
}

function snapshot(player: PlayerState): PlayerSnapshot {
  return clone({
    score: player.score, rubies: player.rubies, dropletIndex: player.dropletIndex,
    flaskFull: player.flaskFull, bag: player.bag, pot: player.pot,
    placementOrder: player.placementOrder, preview: player.preview,
    whiteTotal: player.whiteTotal, exploded: player.exploded, stopped: player.stopped,
    placementEvents: player.placementEvents, firstWhiteSeen: player.firstWhiteSeen,
    restartUsed: player.restartUsed, restartPending: player.restartPending,
  });
}

function restore(player: PlayerState, value: PlayerSnapshot): void {
  Object.assign(player, clone(value));
  player.voluntaryStop = false;
}

function makeDecision(state: GameState, actor: PlayerId, kind: PendingDecision["kind"], prompt: string, options: string[], data: Record<string, unknown> = {}): void {
  if (options.length === 0) return;
  state.pendingDecision = { id: `d${state.nextDecision++}`, actor, kind, prompt, options, data };
}

function preview(state: GameState, playerId: PlayerId, count: number): string[] {
  const player = state.players[playerId];
  const result: string[] = [];
  for (let i = 0; i < count && player.bag.length > 0; i += 1) result.push(drawRandom(state.rng, player.bag));
  player.preview = result;
  return result;
}

function returnPreview(player: PlayerState, except?: string): void {
  for (const id of player.preview) if (id !== except) player.bag.push(id);
  player.preview = [];
}

function scoringIndex(player: PlayerState): number {
  const anchor = player.pot.at(-1)?.trackIndex ?? player.ratIndex ?? player.dropletIndex;
  return Math.min(SPOON, anchor + 1);
}

function rollDie(state: GameState, playerId: PlayerId): void {
  const before = state.rng.drawsConsumed;
  const face = DIE[randomInt(state.rng, DIE.length)];
  const player = state.players[playerId];
  if (face === "vp1") player.score += 1;
  else if (face === "vp2") player.score += 2;
  else if (face === "ruby") player.rubies += 1;
  else if (face === "droplet") moveDroplet(player);
  else grant(state, playerId, "orange", 1);
  log(state, "DIE_ROLLED", { face, rngBefore: before, rngAfter: state.rng.drawsConsumed }, playerId);
}

function drawOptions(state: GameState, value: TokenValue): string[] {
  const options: string[] = [];
  for (const color of state.unlockedColors) {
    if (color === "white") continue;
    if (tokenIds(state, color, value).length > 0) options.push(`${color}:${value}`);
  }
  return options;
}

function configureTask(state: GameState, task: DecisionTask): void {
  const player = state.players[task.actor];
  const effect = String(task.data.effect ?? "");
  let options: string[] = [];
  let prompt = effect;
  if (effect === "F01") options = ["droplet", ...(drawOptions(state, 1).includes("purple:1") ? ["purple:1"] : [])];
  else if (effect === "F05") options = ["rubies:3", ...(tokenIds(state,"black",1).length ? ["black:1"] : []), ...drawOptions(state,2)];
  else if (effect === "F06") options = ["decline", ...(player.rubies > 0 ? drawOptions(state,1).filter((x) => !x.startsWith("black") && !x.startsWith("purple")) : [])];
  else if (effect === "F07") options = Array.from({ length: Math.min(3, Number(task.data.tails)) + 1 }, (_, i) => `exchange:${i}`);
  else if (effect === "F09") options = ["decline", ...(task.data.upgrades as string[] ?? []).filter((option) => {
    const [, oldId, nextText] = option.split(":");
    const old = oldId ? state.tokens[oldId] : undefined;
    return old !== undefined && tokenIds(state, old.color, Number(nextText) as TokenValue).length > 0;
  })];
  else if (effect === "F13") options = ["vp:4", ...(tokenIds(state,"white",1,player.bag).length ? ["remove:white:1"] : [])];
  else if (effect === "F14") options = ["rat-vp", ...drawOptions(state,4)];
  else if (effect === "F18") options = drawOptions(state,2);
  if (options.length) makeDecision(state, task.actor, task.kind, prompt, options, task.data);
}

function setupFortune(state: GameState): void {
  const id = state.fortuneDeck.shift();
  if (id === undefined) throw new Error("Fortune deck exhausted");
  state.activeFortune = id;
  log(state, "FORTUNE_REVEALED", { id, title: FORTUNE_CARDS.find((c) => c.id === id)?.title ?? id });
  const players = state.roundState.startOrder;
  const n = cardNumber(id);
  if (n >= 11) state.roundState.activeModifiers.push(id);
  if (id === "F01" || id === "F05" || id === "F06" || id === "F13") {
    for (const actor of players) state.roundState.tasks.push({ kind: "FORTUNE_CHOICE", actor, data: { effect: id } });
  } else if (id === "F02") players.forEach((p) => moveDroplet(state.players[p]));
  else if (id === "F03") {
    const min = Math.min(...players.map((p) => state.players[p].rubies));
    players.filter((p) => state.players[p].rubies === min).forEach((p) => { state.players[p].rubies += 1; });
  } else if (id === "F04") {
    const sums = {} as Record<PlayerId, number>;
    for (const p of players) { sums[p] = preview(state,p,5).reduce((s,t) => s + (state.tokens[t]?.value ?? 0),0); returnPreview(state.players[p]); }
    const min = Math.min(...Object.values(sums));
    for (const p of players) if (sums[p] === min) grant(state,p,"blue",2); else state.players[p].rubies += 1;
  } else if (id === "F08") players.forEach((p) => rollDie(state,p));
  else if (id === "F09") {
    for (const actor of players) {
      const ids = preview(state,actor,4);
      const upgrades: string[] = [];
      for (const tokenId of ids) {
        const token = state.tokens[tokenId]; if (!token) continue;
        const next = token.color === "white" ? (token.value === 1 ? 2 : token.value === 2 ? 3 : 0) : (token.value === 1 ? 2 : token.value === 2 ? 4 : 0);
        if (next && tokenIds(state,token.color,next as TokenValue).length) upgrades.push(`upgrade:${tokenId}:${next}`);
      }
      if (upgrades.length) state.roundState.tasks.push({ kind:"FORTUNE_CHOICE", actor, data:{ effect:id, upgrades } });
      else { returnPreview(state.players[actor]); grant(state,actor,"green",1); }
    }
  } else if (id === "F10") {
    const min = Math.min(...players.map((p) => state.players[p].score));
    players.filter((p) => state.players[p].score === min).forEach((p) => grant(state,p,"green",1));
  } else if (id === "F11") players.forEach((p) => { state.players[p].explosionThreshold = 9; });
}

function setupRats(state: GameState): void {
  const lead = Math.max(...PLAYER_IDS.map((id) => state.players[id].score));
  for (const id of PLAYER_IDS) {
    let tails = countRatTails(state.players[id].score, lead);
    if (state.activeFortune === "F12") tails *= 2;
    state.roundState.ratTails[id] = state.round === 1 ? 0 : tails;
    if (state.activeFortune === "F07" && tails > 0) state.roundState.tasks.push({ kind:"RAT_CHOICE", actor:id, data:{ effect:"F07", tails } });
    if (state.activeFortune === "F14") state.roundState.tasks.push({ kind:"RAT_CHOICE", actor:id, data:{ effect:"F14", tails } });
  }
}

function finalizeRats(state: GameState): void {
  for (const id of PLAYER_IDS) {
    const p = state.players[id];
    const tails = state.roundState.ratTails[id];
    if (tails > 0) p.ratIndex = Math.min(MAX_POT, p.dropletIndex + tails); else delete p.ratIndex;
    p.brewingSnapshot = snapshot(p);
  }
}

function afterPlacement(state: GameState, playerId: PlayerId): void {
  const p = state.players[playerId];
  if (state.activeFortune === "F21" && !p.restartUsed && p.placementEvents === 5) p.restartPending = true;
}

function placeToken(state: GameState, playerId: PlayerId, tokenId: string, source: PlacedToken["source"], before: PlayerSnapshot): void {
  const p = state.players[playerId]; const token = state.tokens[tokenId];
  if (!token) throw new Error("Unknown token");
  p.flaskSnapshot = before;
  let movement = token.value;
  if (token.color === "orange" && state.activeFortune === "F23") movement += 1;
  if (token.color === "red") {
    const oranges = p.pot.filter((placed) => state.tokens[placed.tokenId]?.color === "orange").length;
    movement += oranges >= 3 ? 2 : oranges >= 1 ? 1 : 0;
  }
  const anchor = p.pot.at(-1)?.trackIndex ?? p.ratIndex ?? p.dropletIndex;
  p.pot.push({ tokenId, trackIndex: Math.min(MAX_POT, anchor + movement), ordinal:p.placementEvents, baseMovement:token.value, effectiveMovement:movement, source });
  p.placementOrder.push(tokenId); p.placementEvents += 1;
  if (state.activeFortune === "F21" && !p.restartUsed && p.placementEvents === 5) p.restartPending = true;
  log(state,"TOKEN_PLACED",{ color:token.color,value:token.value,trackIndex:p.pot.at(-1)?.trackIndex },playerId);
  if (token.color === "white") {
    p.whiteTotal += token.value;
    if (p.whiteTotal > p.explosionThreshold) { p.exploded = true; p.stopped = true; log(state,"POT_EXPLODED",{ whiteTotal:p.whiteTotal },playerId); }
  }
  if (token.color === "yellow") {
    const previousId = p.placementOrder.at(-2);
    if (previousId && state.tokens[previousId]?.color === "white") {
      makeDecision(state,playerId,"YELLOW_REMOVE","Return the preceding white token?",["keep","remove"],{ previousId });
      return;
    }
  }
  if (token.color === "blue" && !p.exploded) {
    const ids = preview(state,playerId,token.value);
    makeDecision(state,playerId,"BLUE_SELECT","Choose up to one previewed token",["none",...ids.map((id) => `token:${id}`)],{});
    return;
  }
  afterPlacement(state,playerId);
}

function processDrawn(state: GameState, playerId: PlayerId, tokenId: string, source: PlacedToken["source"], before: PlayerSnapshot): void {
  const p = state.players[playerId]; const token = state.tokens[tokenId];
  if (token?.color === "white" && state.activeFortune === "F19" && !p.firstWhiteSeen) {
    p.firstWhiteSeen = true; p.preview = [tokenId];
    makeDecision(state,playerId,"WHITE_REPRIEVE","Return the first white token?",["place","return"],{ tokenId, source, before });
    return;
  }
  placeToken(state,playerId,tokenId,source,before);
}

function brewAction(state: GameState, playerId: PlayerId, choice: string): void {
  const p = state.players[playerId];
  if (choice === "STOP") { p.stopped = true; p.voluntaryStop = true; p.flaskSnapshot = undefined; log(state,"PLAYER_STOPPED",{},playerId); return; }
  if (choice === "USE_FLASK") {
    if (!p.flaskFull || !p.flaskSnapshot || p.exploded) throw new Error("Flask is not legal");
    const snap = p.flaskSnapshot; const firstWhiteSeen = p.firstWhiteSeen;
    restore(p,snap); p.firstWhiteSeen = firstWhiteSeen; p.flaskFull = false; p.flaskSnapshot = undefined;
    log(state,"FLASK_USED",{},playerId); return;
  }
  if (choice !== "DRAW" || p.bag.length === 0) throw new Error("Draw is not legal");
  const before = snapshot(p); p.flaskSnapshot = undefined;
  const tokenId = drawRandom(state.rng,p.bag);
  processDrawn(state,playerId,tokenId,"draw",before);
}

function preparePostBrew(state: GameState): void {
  if (state.activeFortune === "F22") {
    for (const id of state.roundState.startOrder) {
      const p=state.players[id];
      if (p.voluntaryStop && !p.exploded) {
        const ids=preview(state,id,5);
        if (ids.length) state.roundState.tasks.push({kind:"STRONG_SELECT",actor:id,data:{ids}});
      }
    }
  }
  if (state.activeFortune === "F18") {
    for (const exploded of state.roundState.startOrder) if (state.players[exploded].exploded && drawOptions(state,2).length) state.roundState.tasks.push({kind:"FORTUNE_CHOICE",actor:other(exploded),data:{effect:"F18"}});
  }
}

function prepareEvalB(state: GameState): void {
  const order=state.roundState.startOrder;
  const blackCounts={} as Record<PlayerId,number>;
  for(const id of PLAYER_IDS) blackCounts[id]=state.players[id].pot.filter((x)=>state.tokens[x.tokenId]?.color==="black").length;
  for(const id of order) if(blackCounts[id]>0){ moveDroplet(state.players[id]); if(blackCounts[id]>blackCounts[other(id)]) state.players[id].rubies+=1; }
  for(const id of order){
    const p=state.players[id]; const last=p.placementOrder.slice(-2);
    p.rubies+=last.filter((t)=>state.tokens[t]?.color==="green").length;
  }
  for(const id of order){
    const count=state.players[id].pot.filter((x)=>state.tokens[x.tokenId]?.color==="purple").length;
    if(count>0) state.roundState.tasks.push({kind:"PURPLE_TIER",actor:id,data:{count}});
  }
  if(state.activeFortune==="F15") for(const id of order) if(state.players[id].whiteTotal===7) moveDroplet(state.players[id]);
}

function purchaseOptions(state: GameState, playerId: PlayerId): string[] {
  const p=state.players[playerId]; const types=new Map<string,{color:IngredientColor,value:TokenValue,cost:number}>();
  for(const id of state.supply){ const t=state.tokens[id]; if(!t||!state.unlockedColors.includes(t.color)||t.color==="white") continue; const cost=PRICE_BOOK[t.color]?.[t.value]; if(cost!==undefined&&cost<=p.roundCoins) types.set(supplyKey(t),{color:t.color,value:t.value,cost}); }
  const vals=[...types.values()]; const result=["none"];
  for(const a of vals) result.push(`buy:${a.color}:${a.value}`);
  for(let i=0;i<vals.length;i++) for(let j=i+1;j<vals.length;j++){const a=vals[i],b=vals[j]; if(a&&b&&a.color!==b.color&&a.cost+b.cost<=p.roundCoins) result.push(`buy:${a.color}:${a.value}+${b.color}:${b.value}`);}
  return result;
}

function resolveTaskDecision(state: GameState, pending: PendingDecision, choice: string): void {
  const p=state.players[pending.actor]; const effect=String(pending.data.effect??"");
  if(effect==="F01") { if(choice==="droplet") moveDroplet(p,2); else { const [c,v]=choice.split(":"); grant(state,p.id,c as IngredientColor,Number(v) as TokenValue); } }
  else if(effect==="F05") { if(choice==="rubies:3") p.rubies+=3; else {const[c,v]=choice.split(":");grant(state,p.id,c as IngredientColor,Number(v) as TokenValue);} }
  else if(effect==="F06") { if(choice!=="decline"){const[c,v]=choice.split(":");if(p.rubies<1)throw new Error("Ruby required");p.rubies-=1;grant(state,p.id,c as IngredientColor,Number(v) as TokenValue);} }
  else if(effect==="F07") { const n=Number(choice.split(":")[1]); p.rubies+=n; state.roundState.ratTails[p.id]-=n; }
  else if(effect==="F09") {
    if(choice.startsWith("upgrade:")){ const[,oldId,nextText]=choice.split(":"); if(!oldId)throw new Error("Invalid upgrade"); const old=state.tokens[oldId]; if(!old)throw new Error("Invalid token"); const newId=takeSupply(state,old.color,Number(nextText) as TokenValue); if(!newId)throw new Error("Upgrade unavailable"); state.supply.push(oldId); returnPreview(p,oldId); p.bag.push(newId); }
    else returnPreview(p);
  }
  else if(effect==="F13") { if(choice==="vp:4")p.score+=4; else {const id=tokenIds(state,"white",1,p.bag)[0];if(!id)throw new Error("No white 1");p.bag.splice(p.bag.indexOf(id),1);state.supply.push(id);} }
  else if(effect==="F14") { if(choice==="rat-vp")p.score+=state.roundState.ratTails[p.id]; else {const[c,v]=choice.split(":");grant(state,p.id,c as IngredientColor,Number(v) as TokenValue);} }
  else if(effect==="F18") {const[c,v]=choice.split(":");grant(state,p.id,c as IngredientColor,Number(v) as TokenValue);}
}

function resolvePending(state: GameState, pending: PendingDecision, choice: string): void {
  const p=state.players[pending.actor];
  if(pending.kind==="FORTUNE_CHOICE"||pending.kind==="RAT_CHOICE") resolveTaskDecision(state,pending,choice);
  else if(pending.kind==="BREW_ACTION") brewAction(state,p.id,choice);
  else if(pending.kind==="ROUND9_COMMIT") state.roundState.finalCommitments[p.id]=choice.toLowerCase() as "draw"|"stop";
  else if(pending.kind==="WHITE_REPRIEVE") {
    const tokenId=String(pending.data.tokenId); const source=pending.data.source as PlacedToken["source"]; const before=pending.data.before as PlayerSnapshot; p.preview=[];
    if(choice==="return"){p.bag.push(tokenId);p.flaskSnapshot=undefined;log(state,"WHITE_REPRIEVED",{},p.id);} else placeToken(state,p.id,tokenId,source,before);
  } else if(pending.kind==="YELLOW_REMOVE") {
    if(choice==="remove"){const id=String(pending.data.previousId);const placed=p.pot.find((x)=>x.tokenId===id);if(placed){p.pot.splice(p.pot.indexOf(placed),1);p.placementOrder.splice(p.placementOrder.indexOf(id),1);p.whiteTotal-=state.tokens[id]?.value??0;p.bag.push(id);}}
    afterPlacement(state,p.id);
  } else if(pending.kind==="BLUE_SELECT") {
    if(choice==="none"){returnPreview(p);afterPlacement(state,p.id);} else {const id=choice.slice(6);returnPreview(p,id);const before=snapshot(p);before.bag.push(id);processDrawn(state,p.id,id,"blue",before);}
  } else if(pending.kind==="RESTART") {
    p.restartPending=false;
    if(choice==="restart"){const snap=p.brewingSnapshot;if(!snap)throw new Error("No brewing snapshot");restore(p,snap);p.restartUsed=true;log(state,"BREW_RESTARTED",{},p.id);} else p.restartUsed=true;
  } else if(pending.kind==="STRONG_SELECT") {
    if(choice==="none")returnPreview(p); else {const id=choice.slice(6);returnPreview(p,id);const before=snapshot(p);before.bag.push(id);processDrawn(state,p.id,id,"fortune",before);}
  } else if(pending.kind==="PURPLE_TIER") {
    const tier=Number(choice.split(":")[1]); if(tier===1)p.score+=1; else if(tier===2){p.score+=1;p.rubies+=1;}else{p.score+=2;moveDroplet(p);}
  } else if(pending.kind==="EXPLOSION_CHOICE") p.explosionChoice=choice as "score"|"buy";
  else if(pending.kind==="PURCHASE") {
    if(choice!=="none") for(const part of choice.slice(4).split("+")){const[c,vText]=part.split(":");const value=Number(vText) as TokenValue;const cost=PRICE_BOOK[c as IngredientColor]?.[value];if(cost===undefined||cost>p.roundCoins||p.boughtColors.includes(c as IngredientColor))throw new Error("Illegal purchase");if(!grant(state,p.id,c as IngredientColor,value))throw new Error("Unavailable purchase");p.roundCoins-=cost;p.boughtColors.push(c as IngredientColor);}
    if(state.round<9)p.roundCoins=0;
  } else if(pending.kind==="RUBY_ACTION") {
    if(choice==="droplet"){p.rubies-=2;moveDroplet(p);}else if(choice==="flask"){p.rubies-=2;p.flaskFull=true;}else state.roundState.evaluationCursor+=1;
  }
  log(state,"DECISION_RESOLVED",{kind:pending.kind,choice},p.id);
}

function advance(state: GameState): void {
  for(let guard=0;guard<1000&&!state.pendingDecision;guard+=1){
    if(state.roundState.tasks.length){ taskPending(state); if(state.pendingDecision)return; continue; }
    if(state.phase==="ROUND_OPEN"){
      if(state.round===2&&!state.unlockedColors.includes("yellow"))state.unlockedColors.push("yellow");
      if(state.round===3&&!state.unlockedColors.includes("purple"))state.unlockedColors.push("purple");
      if(state.round===6)for(const id of PLAYER_IDS)grant(state,id,"white",1);
      state.phase="FORTUNE";continue;
    }
    if(state.phase==="FORTUNE"){
      if(!state.roundState.fortunePrepared){setupFortune(state);state.roundState.fortunePrepared=true;continue;}
      state.phase="RAT_SETUP";continue;
    }
    if(state.phase==="RAT_SETUP"){
      if(!state.roundState.ratPrepared){setupRats(state);state.roundState.ratPrepared=true;continue;}
      finalizeRats(state);state.phase="BREWING";continue;
    }
    if(state.phase==="BREWING"){
      const restart=PLAYER_IDS.find((id)=>state.players[id].restartPending&&!state.players[id].restartUsed);
      if(restart){makeDecision(state,restart,"RESTART","Restart brewing?",["continue","restart"]);return;}
      if(state.round===9){
        if(state.roundState.revealQueue.length){const id=state.roundState.revealQueue.shift();if(id&&!state.players[id].stopped)brewAction(state,id,"DRAW");continue;}
        const active=state.roundState.startOrder.filter((id)=>!state.players[id].stopped);
        if(active.length===0){state.phase="POST_BREW";continue;}
        const uncommitted=active.find((id)=>state.roundState.finalCommitments[id]===undefined);
        if(uncommitted){makeDecision(state,uncommitted,"ROUND9_COMMIT","Commit draw or stop",["DRAW","STOP"]);return;}
        for(const id of active){if(state.roundState.finalCommitments[id]==="stop"){state.players[id].stopped=true;state.players[id].voluntaryStop=true;}else state.roundState.revealQueue.push(id);}
        state.roundState.finalCommitments={};continue;
      }
      const active=PLAYER_IDS.filter((id)=>!state.players[id].stopped);
      if(active.length===0){state.phase="POST_BREW";continue;}
      for(let i=0;i<2;i+=1){const index=(state.roundState.brewingCursor+i)%2;const id=state.roundState.startOrder[index];if(id&&!state.players[id].stopped){state.roundState.brewingCursor=(index+1)%2;const p=state.players[id];const options=[...(p.bag.length?["DRAW"]:[]),"STOP",...(p.flaskFull&&p.flaskSnapshot&&!p.exploded?["USE_FLASK"]:[])];makeDecision(state,id,"BREW_ACTION","Draw, stop, or use flask",options);return;}}
    }
    if(state.phase==="POST_BREW"){
      if(!state.roundState.postBrewPrepared){preparePostBrew(state);state.roundState.postBrewPrepared=true;continue;}
      for(const id of PLAYER_IDS){const p=state.players[id];p.scoringIndex=scoringIndex(p);p.roundCoins=POT_TRACK[p.scoringIndex]?.coins??35;p.roundBaseVP=POT_TRACK[p.scoringIndex]?.vp??15;state.roundState.finalTieBreakIndices[id]=p.scoringIndex;}
      state.phase="EVAL_A";continue;
    }
    if(state.phase==="EVAL_A"){
      const eligible=PLAYER_IDS.filter((id)=>!state.players[id].exploded);const max=Math.max(-1,...eligible.map((id)=>state.players[id].scoringIndex));const winners=eligible.filter((id)=>state.players[id].scoringIndex===max);state.roundState.bonusDieWinners=winners;
      for(const id of state.roundState.startOrder.filter((x)=>winners.includes(x)))for(let i=0;i<(state.activeFortune==="F20"?2:1);i++)rollDie(state,id);
      state.phase="EVAL_B";continue;
    }
    if(state.phase==="EVAL_B"){
      if(!state.roundState.evalBPrepared){prepareEvalB(state);state.roundState.evalBPrepared=true;continue;}
      state.phase="EVAL_C";continue;
    }
    if(state.phase==="EVAL_C"){
      for(const id of state.roundState.startOrder){const p=state.players[id];if(POT_TRACK[p.scoringIndex]?.ruby){p.rubies+=state.activeFortune==="F17"?2:1;if(state.activeFortune==="F16")p.score+=2;}}
      state.phase="EVAL_EXPLOSION_CHOICE";continue;
    }
    if(state.phase==="EVAL_EXPLOSION_CHOICE"){
      if(!state.roundState.explosionPrepared){for(const id of state.roundState.startOrder)if(state.players[id].exploded)state.roundState.tasks.push({kind:"EXPLOSION_CHOICE",actor:id,data:{}});state.roundState.explosionPrepared=true;continue;}
      state.phase="EVAL_D";continue;
    }
    if(state.phase==="EVAL_D"){
      for(const id of state.roundState.startOrder){const p=state.players[id];if(!p.exploded||p.explosionChoice==="score")p.score+=p.roundBaseVP;if(p.exploded&&p.explosionChoice==="score")p.roundCoins=0;}
      state.phase="EVAL_E";continue;
    }
    if(state.phase==="EVAL_E"){
      if(!state.roundState.purchasePrepared){for(const id of state.roundState.startOrder){const p=state.players[id];if(!p.exploded||p.explosionChoice==="buy")state.roundState.tasks.push({kind:"PURCHASE",actor:id,data:{}});else p.roundCoins=0;}state.roundState.purchasePrepared=true;continue;}
      state.phase="EVAL_F";continue;
    }
    if(state.phase==="EVAL_F"){
      if(!state.roundState.rubyPrepared){if(state.activeFortune==="F24")PLAYER_IDS.forEach((id)=>{state.players[id].flaskFull=true;});state.roundState.evaluationCursor=0;state.roundState.rubyPrepared=true;}
      const id=state.roundState.startOrder[state.roundState.evaluationCursor];if(id){const p=state.players[id];const options=["done",...(p.rubies>=2&&p.dropletIndex<MAX_POT?["droplet"]:[]),...(p.rubies>=2&&!p.flaskFull?["flask"]:[])];makeDecision(state,id,"RUBY_ACTION","Spend rubies or finish",options);return;}
      state.phase="ROUND_CLEANUP";continue;
    }
    if(state.phase==="ROUND_CLEANUP"){
      for(const id of PLAYER_IDS){const p=state.players[id];p.bag.push(...p.pot.map((x)=>x.tokenId),...p.preview);p.pot=[];p.preview=[];p.placementOrder=[];delete p.ratIndex;p.exploded=false;p.stopped=false;p.voluntaryStop=false;p.whiteTotal=0;p.explosionThreshold=7;p.roundBaseVP=0;p.boughtColors=[];p.placementEvents=0;p.firstWhiteSeen=false;p.restartUsed=false;p.restartPending=false;p.brewingSnapshot=undefined;p.flaskSnapshot=undefined;delete p.explosionChoice;}
      if(state.activeFortune)state.fortuneDiscard.push(state.activeFortune);delete state.activeFortune;
      if(state.round===9){state.phase="FINAL_CONVERSION";continue;}
      state.round+=1;state.startPlayerId=other(state.startPlayerId);state.roundState=emptyRound(state.startPlayerId);state.phase="ROUND_OPEN";continue;
    }
    if(state.phase==="FINAL_CONVERSION"){
      for(const id of PLAYER_IDS){const p=state.players[id];p.score+=Math.floor(p.roundCoins/5)+Math.floor(p.rubies/2);p.roundCoins%=5;p.rubies%=2;}
      const max=Math.max(...PLAYER_IDS.map((id)=>state.players[id].score));let winners=PLAYER_IDS.filter((id)=>state.players[id].score===max);if(winners.length>1){const far=Math.max(...winners.map((id)=>state.roundState.finalTieBreakIndices[id]??0));winners=winners.filter((id)=>(state.roundState.finalTieBreakIndices[id]??0)===far);}
      state.result={winners,scores:{human:state.players.human.score,ai:state.players.ai.score},tieBreakIndices:{human:state.roundState.finalTieBreakIndices.human??0,ai:state.roundState.finalTieBreakIndices.ai??0}};state.phase="GAME_OVER";log(state,"GAME_OVER",{winners});return;
    }
    if(state.phase==="GAME_OVER")return;
  }
  if(!state.pendingDecision&&state.phase!=="GAME_OVER")throw new Error("Automatic transition guard exceeded");
}

function taskPending(state: GameState): void {
  if(state.pendingDecision||!state.roundState.tasks.length)return;
  const task=state.roundState.tasks.shift();if(!task)return;
  if(task.kind==="PURPLE_TIER"){const count=Number(task.data.count);makeDecision(state,task.actor,"PURPLE_TIER","Choose purple reward tier",Array.from({length:Math.min(3,count)},(_,i)=>`tier:${i+1}`),task.data);}
  else if(task.kind==="EXPLOSION_CHOICE")makeDecision(state,task.actor,"EXPLOSION_CHOICE","Choose score or buying",["score","buy"]);
  else if(task.kind==="PURCHASE")makeDecision(state,task.actor,"PURCHASE","Choose purchases",purchaseOptions(state,task.actor));
  else if(task.kind==="STRONG_SELECT"){const ids=task.data.ids as string[];makeDecision(state,task.actor,"STRONG_SELECT","Choose up to one final ingredient",["none",...ids.map((id)=>`token:${id}`)]);}
  else configureTask(state,task);
}

export function createGame(input: Partial<GameConfig> & { seed: string }): GameState {
  const config: GameConfig={seed:input.seed,startPlayerId:input.startPlayerId??"human",controllers:input.controllers??{human:"human",ai:"ai"},rulesVersion:"base-set1-v1",aiVersion:input.aiVersion??"monte-carlo-v1"};
  if(input.fortuneDeck!==undefined)config.fortuneDeck=[...input.fortuneDeck];
  const registry=createTokenRegistry();const rng=createRandomState(config.seed);
  const deck=config.fortuneDeck?[...config.fortuneDeck]:shuffle(rng,ALL_CARD_IDS);
  if(deck.length!==24||new Set(deck).size!==24)throw new Error("Fortune deck must contain 24 unique cards");
  const state:GameState={schemaVersion:1,gameId:`game-${config.seed}`,config,phase:"ROUND_OPEN",round:1,startPlayerId:config.startPlayerId,players:{human:createPlayer("human",config.controllers.human),ai:createPlayer("ai",config.controllers.ai)},tokens:registry.tokens,supply:registry.supply,unlockedColors:["orange","green","blue","red","black"],fortuneDeck:deck,fortuneDiscard:[],roundState:emptyRound(config.startPlayerId),rng,pendingDecision:undefined,log:[],revision:0,nextDecision:1};
  for(const id of PLAYER_IDS)for(const [color,value,count] of [["white",1,4],["white",2,2],["white",3,1],["orange",1,1],["green",1,1]] as const)for(let i=0;i<count;i++){const token=takeSupply(state,color,value);if(!token)throw new Error("Setup supply exhausted");state.players[id].bag.push(token);}
  advance(state);taskPending(state);if(!state.pendingDecision)advance(state);
  return state;
}

export function dispatch(current: GameState, command: Command): GameState {
  const state=clone(current);const pending=state.pendingDecision;
  if(!pending)throw new Error("No decision is pending");
  if(command.type!=="RESOLVE_DECISION"||command.decisionId!==pending.id)throw new Error("Stale or invalid decision id");
  if(!pending.options.includes(command.choice))throw new Error(`Illegal choice: ${command.choice}`);
  delete state.pendingDecision;resolvePending(state,pending,command.choice);state.revision+=1;
  for(let guard=0;guard<100&&!state.pendingDecision&&state.phase!=="GAME_OVER";guard+=1){taskPending(state);if(state.pendingDecision)break;advance(state);}
  validateInvariants(state);return state;
}

export function observe(state: GameState, viewer: PlayerId): Observation {
  const players={} as Observation["players"];
  for(const id of PLAYER_IDS){const source=clone(state.players[id]);const {brewingSnapshot:_b,flaskSnapshot:_f,preview,...rest}=source;players[id]=id===viewer?{...rest,preview}:{...rest};}
  const counts:Record<string,number>={};for(const id of state.supply){const t=state.tokens[id];if(t)counts[supplyKey(t)]=(counts[supplyKey(t)]??0)+1;}
  const observation:Observation={revision:state.revision,phase:state.phase,round:state.round,viewer,players,tokens:state.tokens,supplyCounts:counts,unlockedColors:[...state.unlockedColors],fortuneDiscard:[...state.fortuneDiscard]};
  if(state.activeFortune!==undefined)observation.activeFortune=state.activeFortune;
  if(state.pendingDecision?.actor===viewer)observation.pendingDecision=clone(state.pendingDecision);
  if(state.result!==undefined)observation.result=clone(state.result);
  return observation;
}

export function serialize(state: GameState): string { return JSON.stringify(state); }
export function deserialize(value: string): GameState { const state=JSON.parse(value) as GameState;validateInvariants(state);return state; }

export function replayGame(config: Partial<GameConfig> & { seed: string }, choices: readonly string[]): GameState {
  let state = createGame(config);
  for (const choice of choices) {
    const pending = state.pendingDecision;
    if (!pending) throw new Error("Replay contains a choice after the game stopped requesting decisions");
    state = dispatch(state, { type: "RESOLVE_DECISION", decisionId: pending.id, choice });
  }
  return state;
}

export function validateInvariants(state: GameState): void {
  if(state.schemaVersion!==1)throw new Error("Unsupported schema");
  const locations:string[]=[...state.supply];
  for(const id of PLAYER_IDS){const p=state.players[id];if(p.rubies<0||p.score<0||!Number.isFinite(p.score))throw new Error("Invalid player resources");if(p.dropletIndex<0||p.dropletIndex>MAX_POT)throw new Error("Invalid droplet");const white=p.pot.reduce((sum,x)=>sum+(state.tokens[x.tokenId]?.color==="white"?(state.tokens[x.tokenId]?.value??0):0),0);if(white!==p.whiteTotal)throw new Error("White total mismatch");locations.push(...p.bag,...p.pot.map((x)=>x.tokenId),...p.preview);}
  if(locations.length!==Object.keys(state.tokens).length||new Set(locations).size!==locations.length)throw new Error("Token conservation violated");
  const cards=[...state.fortuneDeck,...state.fortuneDiscard,...(state.activeFortune?[state.activeFortune]:[])];if(cards.length!==24||new Set(cards).size!==24)throw new Error("Fortune conservation violated");
}

export function stateHash(state: GameState): string {
  const text=serialize(state);let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,"0");
}
