import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface Trader {
  name: string;
  score: number;
}

interface Props {
  traders: Trader[];
}

const PAGE_SIZE = 10;

export default function Leaderboard({ traders }: Props) {
  const [page, setPage] = useState(1);

  const { top3, paged, totalPages, pageStartIndex } = useMemo(() => {
    const sorted = [...traders].sort((a, b) => b.score - a.score);
    const top3 = sorted.slice(0, 3);
    const rest = sorted.slice(3);

    const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
    const clampedPage = Math.min(page, totalPages);
    const start = (clampedPage - 1) * PAGE_SIZE;
    const paged = rest.slice(start, start + PAGE_SIZE);

    return { top3, paged, totalPages, pageStartIndex: start };
  }, [traders, page]);

  const changePage = (next: number) => {
    if (next < 1 || next > totalPages) return;
    setPage(next);
  };

  const formatRoi = (score: number) => {
    const sign = score > 0 ? "+" : score < 0 ? "-" : "";
    const abs = Math.abs(score).toFixed(2);
    return `${sign}${abs}%`;
  };

  return (
    <div className="space-y-4">
      {/* Top 3 with medals */}
      {top3.length > 0 && (
        <div className="space-y-4">
          {/* Rank 1 - highlighted large card */}
          {top3[0] && (
            <div className="flex justify-center">
              <div className="card p-6 sm:p-8 flex flex-col items-center text-center bg-orange-400 max-w-md w-full">
                <div className="text-4xl mb-2">🏆🥇</div>
                <div className="text-lg menu-sub-title mb-1 font-bold tracking-wide uppercase">
                  Champion
                </div>
                <div className="text-2xl menu-sub-title font-semibold mb-1">
                  {top3[0].name}
                </div>
                <div
                  className={
                    "font-bold text-lg " +
                    (top3[0].score >= 0 ? "text-green-400" : "text-red-700")
                  }
                >
                  {formatRoi(top3[0].score)}
                </div>
              </div>
            </div>
          )}

          {/* Rank 2 & 3 - smaller cards on second row */}
          {top3.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {top3.slice(1).map((t, idx) => {
                const rank = idx + 2; // 2 or 3
                const medal = rank === 2 ? "🥈" : "🥉";
                return (
                  <div
                    key={t.name}
                    className="card p-4 flex flex-col items-center text-center bg-orange-400/80"
                  >
                    <div className="text-2xl mb-1">{medal}</div>
                    <div className="text-sm menu-sub-title mb-1 font-bold">
                      Rank {rank}
                    </div>
                    <div className="text-lg menu-sub-title font-semibold mb-1">
                      {t.name}
                    </div>
                    <div
                      className={
                        "font-bold " +
                        (t.score >= 0
                          ? "text-green-400 text-sm"
                          : "text-red-400 text-sm")
                      }
                    >
                      {formatRoi(t.score)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main table with rank, name, ROI% */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/60">
              <tr>
                <th className="px-4 py-2 text-left text-slate-300">Rank</th>
                <th className="px-4 py-2 text-left text-slate-300">Trader</th>
                <th className="px-4 py-2 text-right text-slate-300">Score</th>
                <th className="px-4 py-2 text-right text-slate-300">ROI %</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((t, idx) => {
                const globalRank = 4 + pageStartIndex + idx; // global rank across all pages
                const roi = formatRoi(t.score);
                const colorClass =
                  t.score >= 0 ? "text-green-400" : "text-red-400";
                return (
                  <motion.tr
                    key={t.name}
                    layout
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                      mass: 0.5,
                    }}
                    className="border-t border-slate-800"
                  >
                    <td className="px-4 py-2 text-slate-200">{globalRank}</td>
                    <td className="px-4 py-2 text-white font-medium">
                      {t.name}
                    </td>
                    <td className={`px-4 py-2 text-right font-bold ${colorClass}`}>
                      {t.score.toFixed(2)}
                    </td>
                    <td className={`px-4 py-2 text-right font-bold ${colorClass}`}>
                      {roi}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-800 text-xs text-slate-400">
          <div className="menu-sub-title font-bold">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn px-2 py-1 text-xs"
              disabled={page <= 1}
              onClick={() => changePage(page - 1)}
            >
              Prev
            </button>
            <button
              type="button"
              className="btn px-2 py-1 text-xs"
              disabled={page >= totalPages}
              onClick={() => changePage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
