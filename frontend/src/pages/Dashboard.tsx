import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Competition,
  fetchCompetitions,
  joinCompetition,
  fetchJoinedCompetitions,
} from "../services/api";
import CompetitionCard from "../components/CompetitionCard";
import { useAuth } from "../hooks/useAuth";
import Loader from "../components/Loader";

export default function Dashboard() {
  const { username } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "not_started" | "finished"
  >("all");
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

  // Animate the join popup progress bar while in "progress" phase
  useEffect(() => {
    if (joinPopupPhase !== "progress") {
      setJoinProgress(0);
      return;
    }

    setJoinProgress(0);
    const startedAt = Date.now();
    const duration = 2000; // ms, matches the setTimeout delay

    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setJoinProgress(pct);
      if (pct >= 100) {
        clearInterval(timer);
      }
    }, 100);

    return () => {
      clearInterval(timer);
    };
  }, [joinPopupPhase]);

  const formatCountdown = (startAt: string, endAt: string) => {
    const startMs = new Date(startAt).getTime();
    const endMs = new Date(endAt).getTime();
    const n = now;

    if (n >= endMs) return { label: "Ended", isActive: false, hasStarted: true };

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
    return { label: `${labelPrefix} ${text}`, isActive: !isBeforeStart, hasStarted: !isBeforeStart };
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();

    const statusPriority: Record<"active" | "not_started" | "finished", number> = {
      active: 0,
      not_started: 1,
      finished: 2,
    };

    return competitions
      .map((c) => {
        const { isActive, hasStarted } = formatCountdown(c.startAt, c.endAt);
        const status: "active" | "not_started" | "finished" = isActive
          ? "active"
          : hasStarted
          ? "finished"
          : "not_started";
        return { competition: c, status };
      })
      .filter(({ competition, status }) => {
        if (!competition.name.toLowerCase().includes(q)) return false;
        if (statusFilter === "all") return true;
        return status === statusFilter;
      })
      .sort((a, b) => {
        const pa = statusPriority[a.status];
        const pb = statusPriority[b.status];
        if (pa !== pb) return pa - pb;
        return a.competition.name.localeCompare(b.competition.name);
      })
      .map((x) => x.competition);
  }, [competitions, query, statusFilter, now]);

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
          <select
            className="input max-w-[180px]"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "active" | "not_started" | "finished")
            }
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="not_started">Not started</option>
            <option value="finished">Finished</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((c) => {
            const { isActive, hasStarted } = formatCountdown(c.startAt, c.endAt);
            return (
              <CompetitionCard
                key={c.id}
                data={c}
                onJoin={handleJoinClick}
                isJoining={joiningId === c.id}
                isJoined={joinedIds.includes(c.id)}
                isActive={isActive}
                hasStarted={hasStarted}
              />
            );
          })}
        </div>
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
