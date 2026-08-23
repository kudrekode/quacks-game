import { describe, expect, it } from "vitest";
import { createDebugGame } from "../src/debugStates.js";
import { buildEffectChoiceModel, isFocusedEffectDecision, returnedTokensForChoice } from "../src/effectChoices.js";

describe("focused effect choice presentation", () => {
  it("renders only the exact engine-provided Crow Skull choices", () => {
    const game=createDebugGame("effect-crow-skull");
    const pending=game.pendingDecision!;
    const model=buildEffectChoiceModel(game,pending);
    expect(isFocusedEffectDecision(pending)).toBe(true);
    expect(model.type).toBe("TOKEN_CHOICE");
    expect(model.choices.map(choice=>choice.id)).toEqual(pending.options);
    expect(model.choices.filter(choice=>choice.token)).toHaveLength(3);
  });

  it("derives Mandrake risk outcomes from the current player state", () => {
    const game=createDebugGame("effect-mandrake");
    const model=buildEffectChoiceModel(game,game.pendingDecision!);
    expect(model.type).toBe("RETURN_TO_BAG");
    expect(model.choices.find(choice=>choice.id==="keep")?.description).toContain("2 / 7");
    expect(model.choices.find(choice=>choice.id==="remove")?.description).toContain("0 / 7");
  });

  it("reports only unselected preview tokens as returning to the bag", () => {
    const game=createDebugGame("effect-crow-skull");
    const selected=game.pendingDecision!.options.find(option=>option.startsWith("token:"))!;
    const returned=returnedTokensForChoice(game,game.pendingDecision!,selected);
    expect(returned).toHaveLength(2);
    expect(returned.map(token=>token.id)).not.toContain(selected.slice(6));
  });

  it("disables an engine option whose referenced token cannot be resolved", () => {
    const game=createDebugGame("effect-disabled");
    const model=buildEffectChoiceModel(game,game.pendingDecision!);
    expect(model.choices.find(choice=>choice.id==="token:missing-debug-token")?.disabledReason).toBeTruthy();
  });

  it("shows exact engine-derived explosion rewards", () => {
    const game=createDebugGame("brewing");
    game.players.human.roundBaseVP=4;game.players.human.roundCoins=17;
    game.pendingDecision={id:"explosion",actor:"human",kind:"EXPLOSION_CHOICE",prompt:"Choose",options:["score","buy"],data:{}};
    const model=buildEffectChoiceModel(game,game.pendingDecision);
    expect(model.choices.map(choice=>choice.label)).toEqual(["Take 4 victory points","Keep 17 buying power"]);
  });

  it("uses Fortune metadata while preserving the engine option list", () => {
    const game=createDebugGame("brewing");
    game.pendingDecision={id:"fortune",actor:"human",kind:"FORTUNE_CHOICE",prompt:"F05",options:["rubies:3","green:2"],data:{effect:"F05"}};
    const model=buildEffectChoiceModel(game,game.pendingDecision);
    expect(model.source).toBe("Fortune card");
    expect(model.title).toBe("One Fine Choice");
    expect(model.choices.map(choice=>choice.id)).toEqual(game.pendingDecision.options);
  });
});
