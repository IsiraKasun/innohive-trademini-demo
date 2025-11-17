import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import Leaderboard, { Trader } from "../components/Leaderboard";
import Loader from "../components/Loader";
import { useWebSocket } from "../hooks/useWebSocket";
import { ScoreUpdate } from "../services/ws";

interface LeaderboardResponse {
  id: string;
  name: string;
  traders: Trader[];
}

export default function CompetitionLeaderboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Missing competition id");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await api.get(`/competitions/${id}/leaderboard`);
        const payload = res.data as LeaderboardResponse;
        setData(payload);
        setTraders(payload.traders || []);
      } catch (e) {
        setError("Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleWsMessage = useCallback(
    (msg: ScoreUpdate) => {
      if (!id) return;
      if (msg.competitionId !== id) return;

      if (msg.type === "snapshot" && msg.traders) {
        const next = [...msg.traders].map((t) => ({
          name: t.name,
          score: t.score,
        }));
        next.sort((a, b) => b.score - a.score);
        setTraders(next);
      }

      if (msg.type === "score_update" && msg.updates) {
        setTraders((prev) => {
          const map = new Map(prev.map((t) => [t.name, t] as const));
          for (const u of msg.updates!) {
            map.set(u.name, { name: u.name, score: u.score });
          }
          const next = Array.from(map.values());
          next.sort((a, b) => b.score - a.score);
          return next;
        });
      }
    },
    [id]
  );

  useWebSocket(handleWsMessage);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 flex justify-center">
        <Loader />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <button className="btn mb-4" onClick={() => navigate(-1)}>
          Back
        </button>
        <div className="text-red-400 text-sm">
          {error || "Leaderboard not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
      <button className="btn" onClick={() => navigate(-1)}>
        Back
      </button>
      <h1 className="text-2xl font-semibold menu-title text-center">
        {data.name} - Leaderboard
      </h1>
      <Leaderboard traders={traders} />
    </div>
  );
}
