import { playBaselineGame } from "./ai.js";
import { createGame } from "./engine.js";

const games = Number(process.argv[2] ?? 1000);
let humanWins = 0;
let aiWins = 0;
let ties = 0;
let decisions = 0;
for (let i = 0; i < games; i += 1) {
  const initial = createGame({ seed: `simulation-${i}`, startPlayerId: i % 2 ? "ai" : "human", controllers: { human: "ai", ai: "ai" } });
  const result = playBaselineGame(initial);
  decisions += result.revision;
  if (result.result?.winners.length === 2) ties += 1;
  else if (result.result?.winners[0] === "human") humanWins += 1;
  else aiWins += 1;
}
console.log(JSON.stringify({ games, humanWins, aiWins, ties, averageDecisions: decisions / games }, null, 2));
