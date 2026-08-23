import { evaluateMonteCarloDecision } from "./ai.js";
import type { Observation, PendingDecision } from "./types.js";

interface AIRequest {
  observation: Observation;
  pending: PendingDecision;
  seed: string;
}

self.onmessage = (event: MessageEvent<AIRequest>) => {
  const started = performance.now();
  try {
    const report = evaluateMonteCarloDecision(event.data.observation, event.data.pending, event.data.seed);
    self.postMessage({ decisionId: event.data.pending.id, report, latencyMs: Math.round(performance.now() - started) });
  } catch (error) {
    self.postMessage({ decisionId: event.data.pending.id, error: error instanceof Error ? error.message : String(error) });
  }
};

