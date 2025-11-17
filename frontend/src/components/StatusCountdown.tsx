import { useEffect, useState } from "react";

interface Props {
  startAt: string;
  endAt: string;
}

export default function StatusCountdown({ startAt, endAt }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const startMs = new Date(startAt).getTime();
  const endMs = new Date(endAt).getTime();

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return (
      <span className="px-2 py-1 rounded-full bg-slate-800 text-xs text-slate-400">
        Unknown
      </span>
    );
  }

  if (now >= endMs) {
    return (
      <span className="px-2 py-1 rounded-full bg-slate-900 text-xs text-slate-400">
        Ended
      </span>
    );
  }

  const isBeforeStart = now < startMs;
  const target = isBeforeStart ? startMs : endMs;
  const diff = Math.max(0, target - now);

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
  const label = `${labelPrefix} ${text}`;

  return (
    <span
      className={`px-2 py-3 rounded-lg w-100 min-w-32 text-center  whitespace-nowrap text-black ${
        isBeforeStart ? "bg-green-500" : "bg-red-600 "
      }`}
    >
      {label}
    </span>
  );
}
