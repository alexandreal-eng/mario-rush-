import type { ReactNode } from "react";
import type { ScoreEntry } from "../hooks/useHighScores";

export function Btn({
  children,
  onClick,
  tone = "gold",
  className = "",
  size = "md",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "gold" | "blue" | "ghost" | "red" | "green";
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const tones: Record<string, string> = {
    gold: "bg-amber-400 text-slate-900 shadow-[0_6px_0_#b45309] hover:bg-amber-300",
    blue: "bg-sky-400 text-slate-900 shadow-[0_6px_0_#0369a1] hover:bg-sky-300",
    green: "bg-emerald-400 text-slate-900 shadow-[0_6px_0_#047857] hover:bg-emerald-300",
    red: "bg-rose-500 text-white shadow-[0_6px_0_#9f1239] hover:bg-rose-400",
    ghost: "bg-white/10 text-white shadow-[0_6px_0_rgba(0,0,0,0.35)] hover:bg-white/20",
  };
  const sizes: Record<string, string> = {
    sm: "px-4 py-2 text-[10px]",
    md: "px-5 py-3 text-[11px]",
    lg: "px-7 py-4 text-[13px]",
  };
  return (
    <button
      onClick={onClick}
      className={`font-pixel select-none rounded-xl uppercase tracking-wider transition-all active:translate-y-[4px] active:shadow-none ${tones[tone]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/15 bg-slate-950/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

export function HighScoreTable({
  scores,
  mode,
  compact = false,
}: {
  scores: ScoreEntry[];
  mode: "adventure" | "race" | "all";
  compact?: boolean;
}) {
  const list = scores
    .filter((s) => mode === "all" || s.mode === mode)
    .slice(0, compact ? 4 : 8);
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between font-pixel text-[10px] text-amber-300">
        <span>MEILLEURS SCORES</span>
        <span className="text-white/40">{mode === "race" ? "COURSE" : mode === "adventure" ? "AVENTURE" : "TOUS"}</span>
      </div>
      {list.length === 0 ? (
        <p className="font-pixel text-[9px] leading-relaxed text-white/45">
          AUCUN SCORE...
          <br />
          SOIS LE PREMIER HÉROS !
        </p>
      ) : (
        <ol className="space-y-1">
          {list.map((s, i) => (
            <li
              key={`${s.date}-${i}`}
              className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1 font-pixel text-[9px] text-white/85"
            >
              <span className={`w-4 ${i === 0 ? "text-amber-300" : i === 1 ? "text-slate-300" : "text-orange-700"}`}>
                {i + 1}
              </span>
              <span className="flex-1 truncate text-sky-200">{s.name}</span>
              <span className="truncate text-white/40">{s.label}</span>
              <span className="text-amber-300">{s.score.toLocaleString("fr-FR")}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function InitialsInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-pixel text-[9px] text-white/60">TES INITIALES</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 8).toUpperCase())}
        className="w-32 rounded-lg border-2 border-amber-400/60 bg-slate-900 px-3 py-2 text-center font-pixel text-[12px] tracking-[0.2em] text-amber-300 outline-none focus:border-amber-300"
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
}


