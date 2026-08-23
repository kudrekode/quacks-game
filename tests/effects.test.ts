import { describe, expect, it } from "vitest";
import { ALL_CARD_IDS } from "../src/content.js";
import { createGame, dispatch } from "../src/engine.js";
import type { CardId, GameState, IngredientColor, TokenValue } from "../src/types.js";

const deckWith = (first: CardId) => [first, ...ALL_CARD_IDS.filter((id) => id !== first)];

function choose(state: GameState, choice: string): GameState {
  return dispatch(state,{type:"RESOLVE_DECISION",decisionId:state.pendingDecision!.id,choice});
}

function beginBrewing(seed: string, card: CardId): GameState {
  const state = createGame({ seed, fortuneDeck: deckWith(card) });
  expect(state.pendingDecision?.kind).toBe("FORTUNE_REVEAL");
  return choose(state, "continue");
}

function forceOnly(state: GameState, playerId: "human"|"ai", color: IngredientColor, value: TokenValue): void {
  const player=state.players[playerId];
  const wanted=[...player.bag,...state.supply].find((id)=>state.tokens[id]?.color===color&&state.tokens[id]?.value===value);
  if(!wanted)throw new Error("Missing forced token");
  for(const id of [...player.bag])if(id!==wanted){player.bag.splice(player.bag.indexOf(id),1);state.supply.push(id);}
  const supplyIndex=state.supply.indexOf(wanted);if(supplyIndex>=0){state.supply.splice(supplyIndex,1);player.bag.push(wanted);}
}

describe("set-one placement effects", () => {
  it("pumpkin festival moves orange one extra space", () => {
    let state=beginBrewing("pumpkin","F23");
    const actor=state.pendingDecision!.actor;forceOnly(state,actor,"orange",1);
    state=choose(state,"DRAW");
    expect(state.players[actor].pot[0]?.effectiveMovement).toBe(2);
  });

  it("first white reprieve returns the token without placing it", () => {
    let state=beginBrewing("reprieve","F19");
    const actor=state.pendingDecision!.actor;forceOnly(state,actor,"white",3);
    state=choose(state,"DRAW");
    expect(state.pendingDecision?.kind).toBe("WHITE_REPRIEVE");
    state=choose(state,"return");
    expect(state.players[actor].pot).toHaveLength(0);
    expect(state.players[actor].whiteTotal).toBe(0);
    expect(state.players[actor].bag).toHaveLength(1);
  });

  it("makes a reprieved token eligible for the very next live-bag draw", () => {
    let state=beginBrewing("reprieve-redraw","F19");
    const actor=state.pendingDecision!.actor;forceOnly(state,actor,"white",3);
    const returnedId=state.players[actor].bag[0]!;
    const beforeFirstDraw=state.rng.drawsConsumed;
    state=choose(state,"DRAW");
    expect(state.rng.drawsConsumed).toBe(beforeFirstDraw+1);
    state=choose(state,"return");
    expect(state.rng.drawsConsumed).toBe(beforeFirstDraw+1);
    expect(state.players[actor].bag).toContain(returnedId);
    while(state.pendingDecision?.actor!==actor)state=choose(state,"STOP");
    state=choose(state,"DRAW");
    expect(state.players[actor].pot.some((placed)=>placed.tokenId===returnedId)).toBe(true);
    expect(state.players[actor].bag).not.toContain(returnedId);
  });

  it("draws from bag contents as modified before the command", () => {
    let orange=beginBrewing("live-pool","F02");
    let green=beginBrewing("live-pool","F02");
    const actor=orange.pendingDecision!.actor;
    forceOnly(orange,actor,"orange",1);
    forceOnly(green,actor,"green",1);
    orange=choose(orange,"DRAW");
    green=choose(green,"DRAW");
    expect(orange.tokens[orange.players[actor].pot[0]!.tokenId]?.color).toBe("orange");
    expect(green.tokens[green.players[actor].pot[0]!.tokenId]?.color).toBe("green");
    expect(orange.rng.drawsConsumed).toBe(green.rng.drawsConsumed);
  });

  it("explodes only when white total exceeds seven", () => {
    let state=beginBrewing("threshold","F02");
    const actor=state.pendingDecision!.actor;
    const first=state.players[actor].bag.find((id)=>state.tokens[id]?.color==="white"&&state.tokens[id]?.value===3)!;
    const second=state.supply.find((id)=>state.tokens[id]?.color==="white"&&state.tokens[id]?.value===3)!;
    state.players[actor].bag.splice(state.players[actor].bag.indexOf(first),1);
    state.supply.splice(state.supply.indexOf(second),1);
    state.players[actor].pot=[
      {tokenId:first,trackIndex:3,ordinal:0,baseMovement:3,effectiveMovement:3,source:"draw"},
      {tokenId:second,trackIndex:6,ordinal:1,baseMovement:3,effectiveMovement:3,source:"draw"},
    ];
    state.players[actor].placementOrder=[first,second];
    state.players[actor].whiteTotal=6;
    state.players[actor].placementEvents=2;
    forceOnly(state,actor,"white",1);
    state=choose(state,"DRAW");
    expect(state.players[actor].exploded).toBe(false);
  });

  it("flask restores the pre-placement transaction", () => {
    let state=beginBrewing("flask","F02");
    const actor=state.pendingDecision!.actor;forceOnly(state,actor,"white",2);
    state=choose(state,"DRAW");
    while(state.pendingDecision?.actor!==actor) state=choose(state,"STOP");
    expect(state.pendingDecision?.options).toContain("USE_FLASK");
    state=choose(state,"USE_FLASK");
    expect(state.players[actor].pot).toHaveLength(0);
    expect(state.players[actor].whiteTotal).toBe(0);
    expect(state.players[actor].flaskFull).toBe(false);
  });
});
