import React from "react";
import { CORE_ASSET } from "./uiAssets.js";

export type GameIconName = "vp" | "coin" | "ruby" | "rat" | "flask" | "bag" | "explosion" | "droplet" | "round" | "fortune" | "ai" | "spark" | "stop" | "settings";

const paths: Record<GameIconName, React.ReactNode> = {
  vp: <path d="m12 2.5 2.7 5.6 6.2.9-4.5 4.4 1.1 6.2-5.5-3-5.5 3 1.1-6.2L3.1 9l6.2-.9Z"/>,
  coin: <><ellipse cx="12" cy="7" rx="7.5" ry="3.5"/><path d="M4.5 7v5c0 1.9 3.4 3.5 7.5 3.5s7.5-1.6 7.5-3.5V7M4.5 12v5c0 1.9 3.4 3.5 7.5 3.5s7.5-1.6 7.5-3.5v-5"/></>,
  ruby: <path d="m12 2.8 7.4 6.3L12 21.2 4.6 9.1Zm-7.4 6.3h14.8M8.2 9.1 12 21.2l3.8-12.1L12 2.8Z"/>,
  rat: <path d="M4 15.5c2.5-5.8 7.4-7.9 11.2-5.5 2.6 1.6 2.9 5.8.8 8.1-2.5 2.7-8 1.5-8-2.2 0-2 2.1-3 3.7-2.2 2 .9 1.5 4.1-1 4.1M15 10l2-4m-5 3-1-4"/>,
  flask: <path d="M9 2.5h6M10 2.5v6L4.8 18a2.3 2.3 0 0 0 2 3.5h10.4a2.3 2.3 0 0 0 2-3.5L14 8.5v-6M7.6 15h8.8"/>,
  bag: <path d="M8 4c.8 1.5 7.2 1.5 8 0l-1.5 4c3.6 2.4 5.3 6 4.4 9.2-.8 3-3.7 4.3-6.9 4.3s-6.1-1.3-6.9-4.3C4.2 14 5.9 10.4 9.5 8ZM8 8h8"/>,
  explosion: <path d="m12 2 1.9 5.1L19 4.8l-2.2 5.1L22 12l-5.2 2.1 2.2 5.1-5.1-2.3L12 22l-1.9-5.1L5 19.2l2.2-5.1L2 12l5.2-2.1L5 4.8l5.1 2.3Z"/>,
  droplet: <path d="M12 2.5S5.4 10.7 5.4 15a6.6 6.6 0 0 0 13.2 0C18.6 10.7 12 2.5 12 2.5Z"/>,
  round: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
  fortune: <><path d="M12 2.5 14 8l5.5-2-2.6 5.2 4.6 3.4-5.8.8.3 5.8-4-4-4 4 .3-5.8-5.8-.8 4.6-3.4L4.5 6 10 8Z"/><circle cx="12" cy="12" r="2.2"/></>,
  ai: <><path d="M7 8h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3ZM12 8V4m-2-1h4"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/><path d="M9 18h6"/></>,
  spark: <path d="m12 2 1.8 7.2L21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8Z"/>,
  stop: <path d="M8 3h8l5 5v8l-5 5H8l-5-5V8Z"/>,
  settings: <><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3m-16.2-6.7 2.1 2.1m9.2 9.2 2.1 2.1m0-13.4-2.1 2.1m-9.2 9.2-2.1 2.1"/></>,
};

export function GameIcon({ name, size = 22, label }: { name: GameIconName; size?: number; label?: string }) {
  const asset = CORE_ASSET[name as keyof typeof CORE_ASSET];
  if (asset) {
    return <img className={`game-icon game-icon-image icon-${name}`} width={size} height={size} src={asset} alt={label ?? ""} aria-hidden={label ? undefined : true}/>;
  }
  return <svg className={`game-icon icon-${name}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden={label ? undefined : true} aria-label={label}>{paths[name]}</svg>;
}
