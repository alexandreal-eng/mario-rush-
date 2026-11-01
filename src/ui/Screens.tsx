import { useState } from "react";
import type { Snapshot } from "../game/engine";
import type { ScoreEntry } from "../hooks/useHighScores";
import { Btn, HighScoreTable, InitialsInput, Panel } from "./widgets";

const fmtTime = (t: number) => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const cs = Math.floor((t * 100) % 100);
  return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
};

export function StartScreen({
  onStart,
  scores,
  muted,
  onToggleMute,
}: {
  onStart: (mode: "adventure" | "race") => void;
  scores: ScoreEntry[];
  muted: boolean;
  onToggleMute: () => void;
}) {
  const [tab, setTab] = useState<"adventure" | "race">("adventure");
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-gradient-to-b from-slate-950/80 via-indigo-950/70 to-slate-950/90 p-4 backdrop-blur-[3px]">
      <div className="flex w-full max-w-4xl flex-col items-center gap-5 py-6">
        <div className="text-center">
          <div className="font-pixel text-[10px] tracking-[0.35em] text-amber-300/80">SUPER PLUMBER</div>
          <h1 className="mt-2 font-pixel text-4xl leading-tight text-white drop-shadow-[0_6px_0_rgba(0,0,0,0.45)] sm:text-6xl">
            <span className="text-rose-500">MARIO</span> <span className="text-amber-300">RUSH</span>
          </h1>
          <p className="mt-3 font-pixel text-[9px] leading-relaxed text-sky-200 sm:text-[11px]">
            PLATEFORME JUTEUSE + GRAND PRIX SURPLOMBANT
          </p>
        </div>

        <div className="grid w-full gap-4 sm:grid-cols-2">
          <button
            onClick={() => onStart("adventure")}
            className="group relative overflow-hidden rounded-2xl border-2 border-emerald-300/40 bg-gradient-to-br from-emerald-500/25 to-sky-800/40 p-5 text-left transition-all hover:-translate-y-1 hover:border-emerald-300 active:translate-y-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🍄</span>
              <div>
                <div className="font-pixel text-[13px] text-emerald-300">AVENTURE</div>
                <div className="font-pixel text-[8px] text-white/60">3 NIVEAUX · 3 VIES</div>
              </div>
            </div>
            <p className="mt-3 font-pixel text-[8px] leading-relaxed text-white/70">
              COURS, SAUTE, ÉCRASE LES GOOMBAS, CASSE LES BLOCS ET ATTEINS LE DRAPEAU.
            </p>
            <div className="mt-4 inline-block rounded-lg bg-emerald-400 px-4 py-2 font-pixel text-[10px] text-slate-900 shadow-[0_5px_0_#047857] group-active:translate-y-[3px] group-active:shadow-none">
              JOUER ▶
            </div>
          </button>

          <button
            onClick={() => onStart("race")}
            className="group relative overflow-hidden rounded-2xl border-2 border-amber-300/40 bg-gradient-to-br from-amber-500/25 to-rose-900/40 p-5 text-left transition-all hover:-translate-y-1 hover:border-amber-300 active:translate-y-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏁</span>
              <div>
                <div className="font-pixel text-[13px] text-amber-300">GRAND PRIX</div>
                <div className="font-pixel text-[8px] text-white/60">3 CIRCUITS · 3 RIVAUX</div>
              </div>
            </div>
            <p className="mt-3 font-pixel text-[8px] leading-relaxed text-white/70">
              SPRINTE À TOUTE VITESSE, PRENDS LES BOOSTS, SAUTE LES RAMPES ET FINIS 1er.
            </p>
            <div className="mt-4 inline-block rounded-lg bg-amber-400 px-4 py-2 font-pixel text-[10px] text-slate-900 shadow-[0_5px_0_#b45309] group-active:translate-y-[3px] group-active:shadow-none">
              RACER ▶
            </div>
          </button>
        </div>

        <Panel className="w-full">
          <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-2 font-pixel text-[10px] text-amber-300">COMMANDES</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-pixel text-[8px] leading-relaxed text-white/75">
                <div>
                  <div className="text-sky-300">CLAVIER</div>
                  <div className="mt-1">← → / A D · BOUGER</div>
                  <div>ESPACE / W · SAUTER</div>
                  <div>MAJ · COURIR (TURBO)</div>
                  <div>P · PAUSE · R · REJOUER</div>
                </div>
                <div>
                  <div className="text-sky-300">TACTILE</div>
                  <div className="mt-1">◀ ▶ · BOUGER</div>
                  <div>A · SAUTER (MAINTIENS)</div>
                  <div>⚡ · TURBO</div>
                  <div>II · PAUSE</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setTab("adventure")}
                  className={`rounded-lg px-3 py-2 font-pixel text-[8px] transition-colors ${
                    tab === "adventure" ? "bg-emerald-400 text-slate-900" : "bg-white/10 text-white/70"
                  }`}
                >
                  AVENT.
                </button>
                <button
                  onClick={() => setTab("race")}
                  className={`rounded-lg px-3 py-2 font-pixel text-[8px] transition-colors ${
                    tab === "race" ? "bg-amber-400 text-slate-900" : "bg-white/10 text-white/70"
                  }`}
                >
                  COURSE
                </button>
              </div>
              <HighScoreTable scores={scores} mode={tab} compact />
            </div>
          </div>
        </Panel>

        <div className="flex items-center gap-3">
          <Btn tone="ghost" size="sm" onClick={onToggleMute}>
            {muted ? "🔇 SON OFF" : "🔊 SON ON"}
          </Btn>
          <span className="font-pixel text-[8px] text-white/35">ASTUCE : MAINTIENS LE SAUT POUR MONTER PLUS HAUT</span>
        </div>
      </div>
    </div>
  );
}

export function PauseScreen({
  onResume,
  onRestart,
  onQuit,
}: {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <Panel className="w-full max-w-sm text-center">
        <h2 className="font-pixel text-[18px] text-amber-300">PAUSE</h2>
        <p className="mt-2 font-pixel text-[8px] text-white/50">RESPIRE, LE CHAMPIGNON N&apos;ATTEND PAS</p>
        <div className="mt-6 flex flex-col gap-3">
          <Btn tone="green" onClick={onResume}>
            CONTINUER
          </Btn>
          <Btn tone="blue" onClick={onRestart}>
            RECOMMENCER
          </Btn>
          <Btn tone="ghost" onClick={onQuit}>
            MENU PRINCIPAL
          </Btn>
        </div>
      </Panel>
    </div>
  );
}

export function ResultScreen({
  snap,
  initials,
  setInitials,
  onSave,
  saved,
  onRestart,
  onQuit,
  onNext,
}: {
  snap: Snapshot;
  initials: string;
  setInitials: (v: string) => void;
  onSave: () => void;
  saved: boolean;
  onRestart: () => void;
  onQuit: () => void;
  onNext?: () => void;
}) {
  const race = snap.mode === "race";
  const win = snap.phase === "victory";
  const over = snap.phase === "gameover";
  const title = over ? "GAME OVER" : win ? "VICTOIRE !" : race ? "ARRIVÉE !" : "BRAVO !";
  const tone = over ? "text-rose-400" : win ? "text-amber-300" : race ? "text-cyan-300" : "text-emerald-300";
  const score = snap.totalScore;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-slate-950/78 p-4 backdrop-blur-sm">
      <Panel className="w-full max-w-md text-center">
        <h2 className={`font-pixel text-[20px] ${tone} drop-shadow-[0_4px_0_rgba(0,0,0,0.4)]`}>{title}</h2>

        {race && !over && (
          <div className="mt-4">
            <div className="font-pixel text-[9px] text-white/50">TON RANG</div>
            <div className="mt-1 font-pixel text-[34px] text-amber-300">
              {snap.placement}
              <span className="text-[16px]">{snap.placement === 1 ? "er" : "e"} / 4</span>
            </div>
            <div className="mt-2 font-pixel text-[11px] text-white">
              {fmtTime(snap.raceTime)}
              {snap.bestTime !== null && (
                <span className="ml-2 text-[8px] text-emerald-300">
                  RECORD {fmtTime(snap.bestTime)}
                </span>
              )}
            </div>
            <div className="mt-4 space-y-1 text-left">
              {snap.racers.map((r, i) => (
                <div
                  key={r.name}
                  className={`flex items-center justify-between rounded-lg px-3 py-1.5 font-pixel text-[9px] ${
                    r.name === "MARIO" ? "bg-rose-500/25 text-amber-200" : "bg-white/5 text-white/70"
                  }`}
                >
                  <span>
                    {i + 1}. {r.name}
                  </span>
                  <span>{r.time !== null ? fmtTime(r.time) : "—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!race && (
          <div className="mt-4 grid grid-cols-3 gap-2 font-pixel text-[8px] text-white/60">
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-white/40">SCORE</div>
              <div className="mt-1 text-[11px] text-amber-300">{score.toLocaleString("fr-FR")}</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-white/40">PIÈCES</div>
              <div className="mt-1 text-[11px] text-amber-300">{snap.coins}</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-white/40">VIES</div>
              <div className="mt-1 text-[11px] text-amber-300">{Math.max(0, snap.lives)}</div>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col items-center gap-3 border-t border-white/10 pt-4">
          {saved ? (
            <p className="font-pixel text-[9px] text-emerald-300">SCORE ENREGISTRÉ ★</p>
          ) : (
            <>
              <InitialsInput value={initials} onChange={setInitials} />
              <Btn tone="green" size="sm" onClick={onSave}>
                SAUVEGARDER
              </Btn>
            </>
          )}
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {onNext && !over && <Btn tone="green" onClick={onNext}>CIRCUIT SUIVANT ▶</Btn>}
          <Btn tone="blue" onClick={onRestart}>
            REJOUER (R)
          </Btn>
          <Btn tone="ghost" onClick={onQuit}>
            MENU
          </Btn>
        </div>
      </Panel>
    </div>
  );
}
