import { useCallback, useEffect, useRef, useState } from "react";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Game, type Snapshot } from "./game/engine";
import { audio } from "./game/audio";
import { lastName, useHighScores } from "./hooks/useHighScores";
import { TouchControls } from "./ui/TouchControls";
import { PauseScreen, ResultScreen, StartScreen } from "./ui/Screens";

type Cmd = "pause" | "restart" | "mute";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [muted, setMuted] = useState(false);
  const [initials, setInitials] = useState("MARIO");
  const [saved, setSaved] = useState(false);
  const [touch, setTouch] = useState(false);
  const { scores, add } = useHighScores();
  const savedRef = useRef(false);

  useEffect(() => {
    setInitials(lastName());
    setTouch(
      window.matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window
    );
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      audio.setMuted(!m);
      return !m;
    });
  }, []);

  const handleCommand = useCallback(
    (c: Cmd) => {
      const g = gameRef.current;
      if (!g) return;
      if (c === "pause") {
        if (g.phase === "playing" || g.phase === "ready") g.pause();
        else if (g.phase === "paused") g.resume();
      } else if (c === "restart") {
        if (g.phase === "menu") return;
        savedRef.current = false;
        setSaved(false);
        g.restart();
      } else if (c === "mute") toggleMute();
    },
    [toggleMute]
  );

  const commandRef = useRef(handleCommand);
  commandRef.current = handleCommand;
  const stableCommand = useCallback((c: Cmd) => commandRef.current(c), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = new Game(canvas, setSnap, stableCommand);
    gameRef.current = g;
    const onResize = () => g.resize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      ro.disconnect();
      g.destroy();
      gameRef.current = null;
    };
  }, [stableCommand]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) gameRef.current?.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (!Capacitor.isNativePlatform()) {
      return () => document.removeEventListener("visibilitychange", onVisibility);
    }

    const listeners = [
      NativeApp.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) gameRef.current?.pause();
      }),
      NativeApp.addListener("backButton", () => {
        const game = gameRef.current;
        if (!game) return;
        if (game.phase === "paused") game.resume();
        else if (game.phase === "menu") void NativeApp.minimizeApp();
        else if (game.phase === "gameover" || game.phase === "victory" || game.phase === "finished") game.toMenu();
        else game.pause();
      }),
    ];
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      listeners.forEach((p) => void p.then((handle) => handle.remove()));
    };
  }, []);

  const startGame = useCallback((mode: "adventure" | "race") => {
    audio.unlock();
    audio.play("select");
    savedRef.current = false;
    setSaved(false);
    gameRef.current?.start(mode, 0);
  }, []);

  const saveScore = useCallback(() => {
    if (!snap || savedRef.current) return;
    savedRef.current = true;
    setSaved(true);
    audio.play("checkpoint");
    add({
      name: (initials || "MARIO").slice(0, 8),
      score: snap.totalScore,
      mode: snap.mode,
      label: snap.mode === "race" ? `Circuit ${snap.levelIndex + 1}` : `Niv. ${snap.levelIndex + 1}`,
      date: Date.now(),
    });
  }, [add, initials, snap]);

  const phase = snap?.phase ?? "menu";
  const playing = phase === "playing" || phase === "ready" || phase === "dead" || phase === "clear";
  const showResult = phase === "gameover" || phase === "victory" || phase === "finished";

  return (
    <div
      className="relative h-[100dvh] w-full select-none overflow-hidden bg-slate-950"
      style={{ touchAction: "none" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      {/* floating buttons */}
      <div className="absolute right-3 top-[84px] z-20 flex flex-col gap-2">
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            handleCommand("pause");
          }}
          disabled={phase === "menu" || showResult}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-slate-950/70 font-pixel text-[12px] text-white/85 backdrop-blur transition-colors disabled:opacity-30"
          style={{ touchAction: "none" }}
          aria-label="Pause"
        >
          {phase === "paused" ? "▶" : "II"}
        </button>
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            handleCommand("mute");
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-slate-950/70 font-pixel text-[13px] text-white/85 backdrop-blur"
          style={{ touchAction: "none" }}
          aria-label="Son"
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {touch && playing && (
        <TouchControls onPress={(k, v) => gameRef.current?.setTouch(k, v)} />
      )}

      {phase === "menu" && (
        <StartScreen onStart={startGame} scores={scores} muted={muted} onToggleMute={toggleMute} />
      )}

      {phase === "paused" && (
        <PauseScreen
          onResume={() => gameRef.current?.resume()}
          onRestart={() => handleCommand("restart")}
          onQuit={() => gameRef.current?.toMenu()}
        />
      )}

      {showResult && snap && (
        <ResultScreen
          snap={snap}
          initials={initials}
          setInitials={setInitials}
          onSave={saveScore}
          saved={saved}
          onRestart={() => handleCommand("restart")}
          onQuit={() => gameRef.current?.toMenu()}
          onNext={
            snap.mode === "race" && snap.levelIndex < 2
              ? () => {
                  savedRef.current = false;
                  setSaved(false);
                  gameRef.current?.advance();
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
