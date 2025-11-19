import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT from localStorage (set by useAuth) to all outgoing requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      // Cast to any to avoid AxiosHeaders vs plain object typing issues
      const headers: any = config.headers || {};
      headers['Authorization'] = `Bearer ${token}`;
      config.headers = headers;
    }
  }
  return config;
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
  const { data } = await api.post('/api/auth/login', { username, password });
  return data as { token: string; username: string; firstName: string; lastName: string };
}

export async function register(
  username: string,
  password: string,
  extra?: { firstName?: string; lastName?: string }
) {
  const { data } = await api.post('/api/auth/register', { username, password, ...extra });
  return data as { token: string; username: string; firstName: string; lastName: string };
}

export async function fetchCompetitions() {
  const { data } = await api.get('/api/competitions');
  return data as { competitions: Competition[] };
}

export async function joinCompetition(competitionId: string, username: string) {
  const { data } = await api.post(`/api/competitions/${competitionId}/join`);
  return data as { success: boolean; participants: number };
}

export async function fetchJoinedCompetitions(username: string) {
  const { data } = await api.get('/api/competitions/joined');
  return data as { competitionIds: string[] };
}
