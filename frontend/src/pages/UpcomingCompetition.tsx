import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, Competition, fetchCompetitions } from "../services/api";
import Loader from "../components/Loader";

interface Participant {
  username: string;
  firstName: string;
  lastName: string;
  roi: number;
  joinedAt?: string | null;
}

interface ParticipantsResponse {
  id: string;
  name: string;
  participants: Participant[];
}

export default function UpcomingCompetition() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ParticipantsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    if (!id) {
      setError("Missing competition id");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await api.get(`/api/competitions/${id}/participants`);
        const payload = res.data as ParticipantsResponse;
        setData(payload);
      } catch (e) {
        setError("Failed to load competition");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const res = await fetchCompetitions();
        const match = res.competitions.find((c) => c.id === id) || null;
        setCompetition(match || null);
      } catch {
        // non-fatal; we'll just show a generic label if we can't load times
      }
    })();
  }, [id]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const countdownLabel = useMemo(() => {
    if (!competition) return "";
    const startMs = new Date(competition.startAt).getTime();
    const n = now;

    if (n >= startMs) return "Started";

    const diff = Math.max(0, startMs - n);
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

    return `Starts in ${parts.join(" ")}`;
  }, [competition, now]);

  const pagedParticipants = useMemo(() => {
    if (!data) return [];
    const start = page * pageSize;
    return data.participants.slice(start, start + pageSize);
  }, [data, page]);

  const totalPages = data ? Math.ceil(data.participants.length / pageSize) : 0;

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
          {error || "Competition not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <button className="btn" onClick={() => navigate(-1)}>
        Back
      </button>
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold menu-title">{data.name}</h1>
        <div className="text-3xl font-bold text-sky-400">{countdownLabel}</div>
      </div>

      {competition && (
        <div className="card p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="menu-sub-title text-xl mb-1">Prize pool</div>
              <div className="text-3xl font-semibold text-emerald-400">
                ${competition.prizePool.toLocaleString()}
              </div>
            </div>
            <div className="flex-1 sm:max-w-xs sm:self-stretch">
              {(() => {
                const total = competition.prizePool;
                const first = Math.round(total * 0.5);
                const second = Math.round(total * 0.3);
                const third = Math.round(total * 0.2);
                return (
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center justify-between bg-red-950/90 rounded px-2 py-1">
                      <span className="text-red-300 font-medium">1st</span>
                      <span className="text-red-400 font-semibold">
                        ${first.toLocaleString()}
                      </span>
                    </li>
                    <li className="flex items-center justify-between bg-amber-950/90 rounded px-2 py-1">
                      <span className="text-amber-300 font-medium">2nd</span>
                      <span className="text-amber-400 font-semibold">
                        ${second.toLocaleString()}
                      </span>
                    </li>
                    <li className="flex items-center justify-between bg-green-950/90 rounded px-2 py-1">
                      <span className="text-green-300 font-medium">3rd</span>
                      <span className="text-green-400 font-semibold">
                        ${third.toLocaleString()}
                      </span>
                    </li>
                  </ul>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <div className="card p-4">
        <h2 className="text-lg font-semibold mb-3 text-center">Participants</h2>
        {data.participants.length === 0 ? (
          <div className="text-sm text-muted">No participants yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="py-2 pr-4 text-left">Trader</th>
                  <th className="py-2 pr-4 text-right">Joined at</th>
                </tr>
              </thead>
              <tbody>
                {pagedParticipants.map((p) => (
                  <tr key={p.username} className="border-b border-slate-800/60">
                    <td className="py-2 pr-4">
                      {[p.firstName, p.lastName].filter(Boolean).join(" ") ||
                        p.username}
                    </td>
                    <td className="py-2 pl-4 text-right">
                      {p.joinedAt ? new Date(p.joinedAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.participants.length > pageSize && (
          <div className="flex items-center justify-end gap-3 mt-4 text-xs">
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <button
              className="btn btn-sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </button>
            <button
              className="btn btn-sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
