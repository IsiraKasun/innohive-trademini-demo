import { Competition } from "../services/api";
import StatusCountdown from "./StatusCountdown";
import { useNavigate } from "react-router-dom";

interface Props {
  data: Competition;
  onJoin: (id: string) => void;
  isJoining: boolean;
  isJoined: boolean;
  isActive: boolean;
  hasStarted: boolean;
}

export default function CompetitionCard({
  data,
  onJoin,
  isJoining,
  isJoined,
  isActive,
  hasStarted,
}: Props) {
  const navigate = useNavigate();
  const firstPrize = Math.round(data.prizePool * 0.5);
  const secondPrize = Math.round(data.prizePool * 0.3);
  const thirdPrize = Math.round(data.prizePool * 0.2);

  return (
    <div
      className="card p-6 flex flex-col gap-3 hover:-translate-y-1 transition-transform text-left w-full h-full cursor-pointer"
      onClick={() => {
        // If competition has started or finished, go to leaderboard; if not started, go to upcoming details.
        if (hasStarted) {
          navigate(`/dashboard/leaderboard/${data.id}`);
        } else {
          navigate(`/dashboard/competition/${data.id}`);
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xl font-semibold mb-1 menu-title">{data.name}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="space-y-1">
          <div className="menu-sub-title text-xl">
            Entry fee:{" "}
            <span className="text-red-500 font-medium bold">
              ${data.entryFee}
            </span>
          </div>
          <div className="menu-sub-title text-xl">
            Participants:{" "}
            <span className="menu-sub-title bold font-medium">
              {data.participants}
            </span>
          </div>
        </div>
        <div>
          <div className="menu-sub-title text-sm mb-1 text-xl text-center">
            Prize pool
          </div>
          <div className="text-2xl font-semibold text-emerald-400 text-center mb-2">
            ${data.prizePool.toLocaleString()}
          </div>
          <ul className="space-y-1 text-s">
            <li className="flex items-center justify-between bg-red-950/90 rounded px-2 py-1">
              <span className="text-red-300 font-medium">1st</span>
              <span className="text-red-400 font-semibold">${firstPrize}</span>
            </li>
            <li className="flex items-center justify-between bg-amber-950/90 rounded px-2 py-1">
              <span className="text-amber-300 font-medium">2nd</span>
              <span className="text-amber-400 font-semibold">
                ${secondPrize}
              </span>
            </li>
            <li className="flex items-center justify-between bg-green-950/90 rounded px-2 py-1">
              <span className="text-green-300 font-medium">3rd</span>
              <span className="text-green-400 font-semibold">
                ${thirdPrize}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3 gap-3">
        <div className="flex justify-start sm:justify-start">
          <StatusCountdown startAt={data.startAt} endAt={data.endAt} />
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 justify-start sm:justify-end">
          <button
            type="button"
            className="btn w-full sm:w-auto"
            disabled={isJoining || isJoined}
            onClick={(e) => {
              e.stopPropagation();
              if (!isJoined) {
                onJoin(data.id);
              }
            }}
          >
            {isJoined ? "Joined" : isJoining ? "Joining…" : "Join"}
          </button>
        </div>
      </div>
    </div>
  );
}
