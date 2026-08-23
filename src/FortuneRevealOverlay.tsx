import React, { useEffect, useState } from "react";
import { FORTUNE_CARDS } from "./content.js";
import { GameIcon } from "./GameIcon.js";
import type { GameState, PendingDecision } from "./types.js";
import { FORTUNE_COPY } from "./uiData.js";

type RevealStage = "drawing" | "flipping" | "revealed";

function requestedStage(decision: PendingDecision): RevealStage | undefined {
  const value = decision.data.presentationStage;
  return value === "drawing" || value === "flipping" || value === "revealed" ? value : undefined;
}

export function FortuneRevealOverlay({
  game,
  decision,
  reducedMotion,
  onContinue,
}: {
  game: GameState;
  decision: PendingDecision;
  reducedMotion: boolean;
  onContinue: () => void;
}) {
  const forcedStage = requestedStage(decision);
  const [stage, setStage] = useState<RevealStage>(forcedStage ?? "drawing");
  const [ready, setReady] = useState(forcedStage === "revealed");
  const fortune = FORTUNE_CARDS.find((card) => card.id === game.activeFortune);

  useEffect(() => {
    document.body.classList.add("fortune-reveal-open");
    return () => document.body.classList.remove("fortune-reveal-open");
  }, []);

  useEffect(() => {
    if (forcedStage) {
      setStage(forcedStage);
      setReady(forcedStage === "revealed");
      return;
    }
    setStage("drawing");
    setReady(false);
    const drawTimer = window.setTimeout(() => setStage(reducedMotion ? "revealed" : "flipping"), reducedMotion ? 100 : 560);
    const revealTimer = reducedMotion ? undefined : window.setTimeout(() => setStage("revealed"), 1_230);
    const readyTimer = window.setTimeout(() => setReady(true), reducedMotion ? 220 : 1_430);
    return () => {
      window.clearTimeout(drawTimer);
      if (revealTimer !== undefined) window.clearTimeout(revealTimer);
      window.clearTimeout(readyTimer);
    };
  }, [decision.id, forcedStage, reducedMotion]);

  if (!fortune) return null;
  const revealed = stage === "revealed";
  const durationLabel = fortune.timing === "ROUND" ? "Active this round" : "Resolves before brewing";

  return <div className="fortune-reveal-backdrop" data-stage={stage}>
    <section className="fortune-reveal-modal" data-stage={stage} role="dialog" aria-modal="true" aria-labelledby="fortune-reveal-title" aria-describedby="fortune-reveal-description">
      <header className="fortune-reveal-heading">
        <span className="eyebrow">Round {game.round} begins</span>
        <h1 id="fortune-reveal-title">Fortune-Telling Card</h1>
        <p id="fortune-reveal-description">Every brew begins with one card from the Fortune-Teller's deck.</p>
      </header>

      <div className="fortune-reveal-stage" aria-live="polite">
        <div className="fortune-deck" aria-hidden="true"><i/><i/><i/></div>
        <div className={`fortune-card-scene is-${stage}${forcedStage === "flipping" ? " is-debug-mid" : ""}`}>
          <div className="fortune-reveal-card">
            <article className="fortune-card-face fortune-card-back" aria-label="Face-down Fortune card">
              <div className="fortune-card-back-frame"><GameIcon name="fortune" size={74}/><span>Cauldron <i>&amp;</i> Chance</span><b>Fortune-Telling</b></div>
            </article>
            <article className="fortune-card-face fortune-card-front" aria-label={`${fortune.title} Fortune card`}>
              <span className="fortune-card-number">{fortune.id}</span>
              <div className="fortune-card-emblem"><GameIcon name="fortune" size={52}/></div>
              <span className="eyebrow">This round's fortune</span>
              <h2>{fortune.title}</h2>
              <p>{FORTUNE_COPY[fortune.id]}</p>
              <strong><GameIcon name="spark" size={16}/>{durationLabel}</strong>
            </article>
          </div>
        </div>
      </div>

      <div className="fortune-reveal-status">
        {!revealed
          ? <><span className="fortune-draw-spinner" aria-hidden="true"/><b>{stage === "drawing" ? "Drawing this round's fortune..." : "The card turns..."}</b></>
          : <><GameIcon name="spark" size={18}/><b>The fortune is revealed. Read it before brewing.</b></>}
      </div>
      <footer className="fortune-reveal-actions">
        {ready
          ? <button className="button-primary" onClick={onContinue} autoFocus>Continue to brewing</button>
          : <span>{revealed ? "Finishing the reveal..." : "Continue will become available when the card is face-up."}</span>}
      </footer>
    </section>
  </div>;
}
