export interface ScoreUpdate {
  type: 'score_update' | 'snapshot';
  competitionId: string;
  updates?: { name: string; score: number }[];
  traders?: { name: string; score: number }[];
}

export function createWS() {
  const url = (import.meta as any).env.VITE_WS_URL || 'ws://localhost:4000';
  return new WebSocket(url);
}
