import React from "react";
import { POT_TRACK } from "./content.js";
import type { PlacedToken, Token } from "./types.js";
import { INGREDIENT_META } from "./uiData.js";
import { ingredientAsset } from "./uiAssets.js";

type TrackSpace = (typeof POT_TRACK)[number];

interface HumanPotBoardProps {
  spaces: readonly TrackSpace[];
  tokenPlacements: readonly PlacedToken[];
  tokens: Record<string, Token>;
  currentPosition: number;
  dropletPosition: number;
  ratPosition?: number;
  highlightedSpace: number;
  whiteTotal: number;
  explosionThreshold: number;
  reward: Pick<TrackSpace, "coins" | "vp" | "ruby">;
  onInspect?: (token: Token) => void;
  variant?: "human" | "ai";
  actorLabel?: string;
}

interface Point { x: number; y: number }

function spiralPoint(index: number, count: number): Point {
  const progress = count <= 1 ? 0 : index / (count - 1);
  const angle = Math.PI / 2 + progress * Math.PI * 3.6;
  const radiusX = 150 + progress * 155;
  const radiusY = 112 + progress * 98;
  return {
    x: 370 + Math.cos(angle) * radiusX,
    y: 255 + Math.sin(angle) * radiusY,
  };
}

function pathThrough(points: readonly Point[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function tangentAngle(points: readonly Point[], index: number): number {
  const before = points[Math.max(0, index - 1)] ?? points[index]!;
  const after = points[Math.min(points.length - 1, index + 1)] ?? points[index]!;
  return Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
}

export function HumanPotBoard({
  spaces,
  tokenPlacements,
  tokens,
  currentPosition,
  dropletPosition,
  ratPosition,
  highlightedSpace,
  whiteTotal,
  explosionThreshold,
  reward,
  onInspect,
  variant = "human",
  actorLabel = "Human",
}: HumanPotBoardProps) {
  const points = spaces.map((_, index) => spiralPoint(index, spaces.length));
  const trackPath = pathThrough(points);
  const placedByIndex = new Map<number, PlacedToken[]>();
  for (const placement of tokenPlacements) {
    placedByIndex.set(placement.trackIndex, [...(placedByIndex.get(placement.trackIndex) ?? []), placement]);
  }
  const stateLabel = whiteTotal > explosionThreshold ? "Exploded" : whiteTotal >= explosionThreshold - 1 ? "Danger" : whiteTotal >= explosionThreshold - 2 ? "Caution" : "Safe";

  return <div className={`human-pot-wrap${variant === "ai" ? " ai-spiral-wrap" : ""}`}>
    <svg className={`human-pot-board${variant === "ai" ? " ai-spiral-board" : ""}`} viewBox="0 0 740 520" role="img" aria-label={`${actorLabel} cauldron. Current position ${currentPosition}. White risk ${whiteTotal} of ${explosionThreshold}. Next reward ${reward.coins} buying power and ${reward.vp} victory points.`}>
      <defs>
        <radialGradient id="human-well" cx="50%" cy="42%"><stop stopColor="#245349"/><stop offset=".68" stopColor="#102f2d"/><stop offset="1" stopColor="#071b1b"/></radialGradient>
        <linearGradient id="human-board-stone" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#9f8a63"/><stop offset=".55" stopColor="#67573e"/><stop offset="1" stopColor="#3d3021"/></linearGradient>
        <linearGradient id="human-brass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f0d58e"/><stop offset=".48" stopColor="#ad7330"/><stop offset="1" stopColor="#513016"/></linearGradient>
        <filter id="human-board-shadow"><feDropShadow dy="9" stdDeviation="8" floodOpacity=".72"/></filter>
        <filter id="human-space-glow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="human-token-shadow"><feDropShadow dy="3" stdDeviation="2.5" floodOpacity=".8"/></filter>
      </defs>

      <g filter="url(#human-board-shadow)">
        <path className="human-cauldron-shell" d="M55 105Q370 8 685 105L670 365Q656 460 370 488Q84 460 70 365Z"/>
        <path className="human-cauldron-rim" d="M53 107Q370 8 687 107"/>
        <path className="human-cauldron-lip" d="M80 112Q370 35 660 112"/>
        <path className="human-cauldron-foot" d="M130 436h82l-18 53h-84zM528 436h82l20 53h-84z"/>
      </g>

      <path d={trackPath} className="human-track-underlay"/>
      <path d={trackPath} className="human-track-band"/>

      {[9, 27, 44].map(index => {
        const point = points[index]!;
        return <path key={index} d="M-7-5 2 0-7 5" className="human-track-arrow" transform={`translate(${point.x} ${point.y}) rotate(${tangentAngle(points,index)})`}/>;
      })}

      {spaces.map((space, index) => {
        const point = points[index]!;
        const highlighted = space.trackIndex === highlightedSpace;
        const milestone = space.trackIndex === 0 || space.trackIndex % 10 === 0;
        return <g key={space.trackIndex} transform={`translate(${point.x} ${point.y})`} tabIndex={0} role="img" aria-label={`Space ${space.trackIndex}. ${space.coins} buying power, ${space.vp} victory points${space.ruby ? ", ruby" : ""}.`}>
          <title>{`Space ${space.trackIndex}\nBuying power: ${space.coins}\nVictory points: ${space.vp}\nRuby: ${space.ruby ? "Yes" : "No"}`}</title>
          {highlighted && <circle r="22" className="human-space-highlight" filter="url(#human-space-glow)"/>}
          <circle r="14" className={`human-track-space${space.ruby ? " ruby-space" : ""}${highlighted ? " current-space" : ""}`}/>
          {space.ruby && <path d="M0-6 6 0 0 6-6 0Z" className="human-space-ruby"/>}
          {milestone && <text y="-21" className="human-milestone">{space.trackIndex}</text>}
        </g>;
      })}

      <g className="human-centre-well">
        <ellipse cx="370" cy="255" rx="94" ry="76"/>
        <ellipse cx="370" cy="255" rx="85" ry="67" className="human-centre-inner"/>
        <text x="370" y="225" className="human-centre-label">WHITE RISK</text>
        <text x="370" y="264" className="human-centre-risk">{whiteTotal} / {explosionThreshold}</text>
        <text x="370" y="284" className={`human-centre-state state-${stateLabel.toLowerCase()}`}>{stateLabel}</text>
        <path d="M325 297h90" className="human-centre-rule"/>
        <text x="370" y="315" className="human-centre-label">NEXT OPEN SPACE</text>
        <text x="370" y="337" className="human-centre-reward">{reward.coins} BUY · {reward.vp} VP{reward.ruby ? " · RUBY" : ""}</text>
      </g>

      {dropletPosition >= 0 && (() => {
        const point = points[Math.min(dropletPosition, points.length - 1)]!;
        return <g transform={`translate(${point.x} ${point.y})`} className="human-droplet-marker"><path d="M0-17C10-6 11 3 0 13-11 3-10-6 0-17Z"/><circle cy="3" r="3"/></g>;
      })()}
      {ratPosition !== undefined && (() => {
        const point = points[Math.min(ratPosition, points.length - 1)]!;
        return <path transform={`translate(${point.x} ${point.y}) rotate(${tangentAngle(points,ratPosition)})`} d="M-12 7c5-13 18-13 22-5 3 7-5 13-12 8-3-3 0-7 4-5" className="human-rat-marker"/>;
      })()}

      {[...placedByIndex.entries()].flatMap(([trackIndex, entries]) => {
        const point = points[Math.min(trackIndex, points.length - 1)]!;
        return entries.map((placement, offset) => {
          const token = tokens[placement.tokenId];
          if (!token) return null;
          return <g key={placement.tokenId} className="human-placed-chip" transform={`translate(${point.x + offset * 5} ${point.y - offset * 5})`} filter="url(#human-token-shadow)" tabIndex={0} role="button" onClick={() => onInspect?.(token)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") onInspect?.(token); }} aria-label={`Inspect ${INGREDIENT_META[token.color].name} ${token.value}`}>
            <title>{`${INGREDIENT_META[token.color].name.toUpperCase()} ${token.value}\nPlaced at space ${placement.trackIndex}. Effective movement ${placement.effectiveMovement}.`}</title>
            <circle r="21" className="human-token-backplate"/>
            <image href={ingredientAsset(token.color, token.value)} x="-27" y="-29" width="54" height="54" className={`human-token-art ingredient-art-${token.color}`}/>
            <circle cy="19" r="8" className="svg-chip-value-disc"/>
            <text y="22" className="svg-chip-value">{token.value}</text>
          </g>;
        });
      })}

      <g className="human-position-badge" transform="translate(610 414)">
        <path d="M-46-21h92l10 10v32H14L0 36-14 21h-42v-32z"/>
        <text y="-4">CURRENT</text><text y="19">{currentPosition}</text>
      </g>
    </svg>
  </div>;
}
