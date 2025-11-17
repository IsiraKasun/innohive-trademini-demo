import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

export interface Competition {
  id: string;
  name: string;
  entryFee: number;
  prizePool: number;
  participants: number;
  startAt: string;
  endAt: string;
}

export interface LeaderboardEntry { name: string; score: number }

export async function login(username: string, password: string) {
  const { data } = await api.post('/login', { username, password });
  return data as { token: string; username: string };
}

export async function register(
  username: string,
  password: string,
  extra?: { firstName?: string; lastName?: string; email?: string; dob?: string }
) {
  const { data } = await api.post('/register', { username, password, ...extra });
  return data as { token: string; username: string };
}

export async function fetchCompetitions() {
  const { data } = await api.get('/competitions');
  return data as { competitions: Competition[] };
}

export async function joinCompetition(competitionId: string, username: string) {
  const { data } = await api.post('/join', { competitionId, username });
  return data as { success: boolean; participants: number };
}

export async function fetchJoinedCompetitions(username: string) {
  const { data } = await api.post('/my-competitions', { username });
  return data as { competitionIds: string[] };
}
