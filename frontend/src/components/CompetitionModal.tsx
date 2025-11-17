import { Competition } from "../services/api";
import { Trader } from "./Leaderboard";
import StatusCountdown from "./StatusCountdown";
import { useNavigate } from "react-router-dom";

interface Props {
  competition: Competition;
  isActive: boolean;
  traders: Trader[];
  joined: boolean;
  joining: boolean;
  onJoin: (id: string) => void;
  onClose: () => void;
}

export default function CompetitionModal({
  competition,
  isActive,
  traders,
  joined,
  joining,
  onJoin,
  onClose,
}: Props) {
  const navigate = useNavigate();

  const firstPrize = Math.round(competition.prizePool * 0.5);
  const secondPrize = Math.round(competition.prizePool * 0.3);
  const thirdPrize = Math.round(competition.prizePool * 0.2);

  const top5 = traders.slice(0, 5);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="card w-full max-w-3xl p-8 relative">
        <button
          type="button"
          className="absolute right-4 top-4 text-slate-600 hover:text-white"
          onClick={onClose}
        >
          ✕
        </button>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold menu-title mb-2">
            {competition.name}
          </h2>
          <StatusCountdown
            startAt={competition.startAt}
            endAt={competition.endAt}
          />
        </div>
        <div className="mb-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2 text-sm">
            <div className="inline-flex items-center gap-2 text-sm">
              <span className="menu-sub-title text-xl">
                Entry fee:{" "}
                <span className="text-red-500 font-medium">
                  ${competition.entryFee}
                </span>
              </span>
            </div>
            <div className="menu-sub-title text-xl">
              Participants:{" "}
              <span className="menu-sub-title bold font-medium">
                {competition.participants}
              </span>
            </div>
            <div className="w-full md:w-56 mt-2 md:mt-2">
              <button
                type="button"
                className="btn w-full"
                disabled={joining || joined || !isActive}
                onClick={() => {
                  if (!joined && isActive && !joining) {
                    onJoin(competition.id);
                  }
                }}
              >
                {joined
                  ? "Joined"
                  : joining
                  ? "Joining…"
                  : "Join this competition"}
              </button>
              {joined && isActive && (
                <button
                  type="button"
                  className="btn w-full mt-2"
                  onClick={() =>
                    navigate(`/dashboard/leaderboard/${competition.id}`)
                  }
                >
                  View leaderboard
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="text-slate-300 text-sm mb-2">Prize pool</div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between bg-red-950/90 rounded px-3 py-2">
                <span className="text-red-300 font-medium">1st place</span>
                <span className="text-red-400 font-semibold">
                  ${firstPrize}
                </span>
              </li>
              <li className="flex items-center justify-between bg-amber-950/90 rounded px-3 py-2">
                <span className="text-amber-300 font-medium">2nd place</span>
                <span className="text-amber-400 font-semibold">
                  ${secondPrize}
                </span>
              </li>
              <li className="flex items-center justify-between bg-green-950/90 rounded px-3 py-2">
                <span className="text-green-300 font-medium">3rd place</span>
                <span className="text-green-300 font-semibold">
                  ${thirdPrize}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {isActive && (
          <div className="mt-2 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <div className="text-sm text-slate-300 mb-2">
                Current top 5 traders
              </div>
              {top5.length ? (
                <ul className="space-y-2">
                  {top5.map((t, idx) => (
                    <li
                      key={t.name}
                      className="flex items-center justify-between text-sm bg-sky-900/90 rounded px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center text-[10px] w-5 h-5 rounded-full bg-slate-800 text-slate-300">
                          {idx + 1}
                        </span>
                        <span className="text-white font-medium">{t.name}</span>
                      </div>
                      <span
                        className={
                          "font-bold " +
                          (t.score >= 0 ? "text-green-500" : "text-red-500")
                        }
                      >
                        {t.score.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-500">No traders yet.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
