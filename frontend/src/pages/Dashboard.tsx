import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Competition,
  fetchCompetitions,
  joinCompetition,
  fetchJoinedCompetitions,
} from "../services/api";
import { ScoreUpdate } from "../services/ws";
import CompetitionCard from "../components/CompetitionCard";
import CompetitionModal from "../components/CompetitionModal";
import { Trader } from "../components/Leaderboard";
import { useWebSocket } from "../hooks/useWebSocket";
import { useAuth } from "../hooks/useAuth";
import Loader from "../components/Loader";

export default function Dashboard() {
  const { username } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [leaderboards, setLeaderboards] = useState<Record<string, Trader[]>>(
    {}
  );
  const [now, setNow] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [joinPopupId, setJoinPopupId] = useState<string | null>(null);
  const [joinPopupPhase, setJoinPopupPhase] = useState<
    "idle" | "progress" | "success"
  >("idle");
  const [joinProgress, setJoinProgress] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchCompetitions();
        setCompetitions(res.competitions);
      } catch (e) {
        toast.error("Failed to load competitions");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!username) {
      setJoinedIds([]);
      return;
    }

    (async () => {
      try {
        const res = await fetchJoinedCompetitions(username);
        setJoinedIds(res.competitionIds || []);
      } catch (e) {
        // non-fatal: just log to console, app will behave as if not joined
        console.error("Failed to load joined competitions", e);
      }
    })();
  }, [username]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (joinPopupPhase !== "progress") return;

    setJoinProgress(0);
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const next = Math.min(100, (elapsed / 2000) * 100);
      setJoinProgress(next);
      if (next >= 100) {
        clearInterval(id);
      }
    }, 100);

    return () => clearInterval(id);
  }, [joinPopupPhase]);

  const handleWsMessage = useCallback((data: ScoreUpdate) => {
    if (data.type === "snapshot" && data.traders) {
      setLeaderboards((prev) => ({
        ...prev,
        [data.competitionId]: sortTraders(data.traders as Trader[]),
      }));
    }
    if (data.type === "score_update" && data.updates) {
      setLeaderboards((prev) => {
        const current = prev[data.competitionId] || [];
        const map = new Map(current.map((t) => [t.name, t] as const));
        for (const u of data.updates!) {
          map.set(u.name, { name: u.name, score: u.score });
        }
        const next = sortTraders(Array.from(map.values()));
        return { ...prev, [data.competitionId]: next };
      });
    }
  }, []);

  useWebSocket(handleWsMessage);

  const selected = useMemo(
    () => competitions.find((c) => c.id === selectedId) || null,
    [competitions, selectedId]
  );

  const formatCountdown = (startAt: string, endAt: string) => {
    const startMs = new Date(startAt).getTime();
    const endMs = new Date(endAt).getTime();
    const n = now;

    if (n >= endMs) return { label: "Ended", isActive: false };

    const isBeforeStart = n < startMs;
    const target = isBeforeStart ? startMs : endMs;
    const diff = Math.max(0, target - n);

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / (24 * 3600));
    const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (days) parts.push(`${days}d`);
    if (hours || parts.length) parts.push(`${hours}h`);
    if (minutes || parts.length) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    const text = parts.join(" ");
    const labelPrefix = isBeforeStart ? "Starts in" : "Ends in";
    return { label: `${labelPrefix} ${text}`, isActive: !isBeforeStart };
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return competitions.filter((c) => c.name.toLowerCase().includes(q));
  }, [competitions, query]);

  const doJoin = async (id: string) => {
    if (!username) {
      toast.error("Please login");
      return false;
    }
    if (joiningId === id) return false;
    if (joinedIds.includes(id)) return false;
    try {
      setJoiningId(id);
      const res = await joinCompetition(id, username);
      toast.success("Joined competition");
      setCompetitions((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, participants: res.participants } : c
        )
      );
      setJoinedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      return true;
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Join failed");
      return false;
    } finally {
      setJoiningId((current) => (current === id ? null : current));
    }
  };

  const handleJoinClick = (id: string) => {
    if (!username) {
      toast.error("Please login");
      return;
    }
    if (joiningId === id) return;
    if (joinedIds.includes(id)) return;

    setJoinPopupId(id);
    setJoinPopupPhase("progress");

    setTimeout(async () => {
      const ok = await doJoin(id);
      if (ok) {
        setJoinPopupPhase("success");
      } else {
        setJoinPopupPhase("idle");
        setJoinPopupId(null);
      }
    }, 2000);
  };

  const closeJoinPopup = () => {
    setJoinPopupId(null);
    setJoinPopupPhase("idle");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold menu-title">Competitions</h1>
        <div className="flex items-center gap-2">
          <input
            className="input"
            placeholder="Filter competitions..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((c) => {
            const { isActive } = formatCountdown(c.startAt, c.endAt);
            return (
              <CompetitionCard
                key={c.id}
                data={c}
                onJoin={handleJoinClick}
                isJoining={joiningId === c.id}
                isJoined={joinedIds.includes(c.id)}
                isActive={isActive}
                onOpenDetails={setSelectedId}
              />
            );
          })}
        </div>
      )}

      {selected && (
        <CompetitionModal
          competition={selected}
          isActive={formatCountdown(selected.startAt, selected.endAt).isActive}
          traders={leaderboards[selected.id] || []}
          joined={joinedIds.includes(selected.id)}
          joining={joiningId === selected.id}
          onJoin={handleJoinClick}
          onClose={() => setSelectedId(null)}
        />
      )}

      {joinPopupId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="card w-full max-w-sm p-6 text-center">
            {joinPopupPhase === "progress" && (
              <>
                <h2 className="text-lg font-semibold text-white mb-4">
                  Joining competition…
                </h2>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-sky-400 transition-all"
                    style={{ width: `${joinProgress}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  This will take about 2 seconds.
                </p>
              </>
            )}

            {joinPopupPhase === "success" && (
              <>
                <h2 className="text-lg font-semibold text-emerald-400 mb-2">
                  Successfully joined
                </h2>
                <p className="text-sm text-slate-300 mb-4">
                  You have joined the competition.
                </p>
                <button
                  type="button"
                  className="btn w-full"
                  onClick={closeJoinPopup}
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function sortTraders(arr: Trader[]) {
  return [...arr].sort((a, b) => b.score - a.score);
}
